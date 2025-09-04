
import {Audit} from 'lighthouse/core/audits/audit.js';
/** 工具：格式化时长与体量 */
function fmtBytes(n) {
  if (n == null) return '';
  const u = ['B','KB','MB','GB'];
  let i = 0, x = n;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
}
function fmtTTL(sec) {
  if (sec == null) return 'session';
  if (sec === 0) return '0s';
  const d = Math.floor(sec/86400);
  const h = Math.floor((sec%86400)/3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

class ServerDataRetentionAudit extends Audit{
  static get meta() {
    return {
      id: 'server-data-retention',
      title: 'Server-side data retention (client-observable)',
      description: 'Estimates client-observable data volume and retention via cookies and HTTP caching.',
      requiredArtifacts: ['ServerDataRetention'],
      scoreDisplayMode: 'numeric',
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, context) {
    const art = artifacts.ServerDataRetention;
    const {cookies, resources, summary} = art;

    // 评分逻辑（示例阈值，可按项目调参）
    const longCookie = cookies.filter(c => (c.lifetimeSec ?? 0) > 180*24*3600 && !c.firstParty);
    const heavyLongCache = resources.filter(r => (r.ttlSec > 30*24*3600 || r.immutable) && (r.sizeBytes||0) > 200*1024);
    const htmlCached = resources.filter(r => /text\/html/i.test(r.mimeType||'') && r.ttlSec > 0);

    let penalties = 0;
    penalties += Math.min(1, longCookie.length * 0.2);      // 多个长期第三方 cookie
    penalties += Math.min(1, heavyLongCache.length * 0.1);  // 大体量长期缓存
    penalties += htmlCached.length ? 0.3 : 0;

    // 总体体量对分数的影响
    const kbCookies = summary.cookieTotalBytes / 1024;
    const mbCache = summary.resourceCacheableBytes / (1024*1024);
    if (kbCookies > 32) penalties += 0.1;
    if (mbCache > 50) penalties += 0.2;

    const score = Math.max(0, 1 - penalties);

    // 明细表：Cookies（TOP N 按寿命和体量）
    const cookieRows = cookies
      .sort((a,b) => (b.lifetimeSec??0) - (a.lifetimeSec??0))
      .slice(0, 20)
      .map(c => ({
        type: 'cookie',
        name: c.name,
        domain: c.domain,
        firstParty: c.firstParty ? '1P' : '3P',
        size: fmtBytes(c.sizeBytes),
        expires: c.expiresEpoch ? new Date(c.expiresEpoch*1000).toISOString() : 'session',
        ttl: fmtTTL(c.lifetimeSec),
        flags: [
          c.secure ? 'Secure' : '',
          c.httpOnly ? 'HttpOnly' : '',
          String(c.sameSite || ''),
        ].filter(Boolean).join(', ')
      }));

    // 明细表：资源（TOP N 按 TTL 与体量）
    const resRows = resources
      .filter(r => r.ttlSec > 0 || r.immutable)
      .sort((a,b) => (b.ttlSec - a.ttlSec) || ((b.sizeBytes||0)-(a.sizeBytes||0)))
      .slice(0, 30)
      .map(r => ({
        type: 'resource',
        url: r.url,
        domain: r.hostname,
        firstParty: r.firstParty ? '1P' : '3P',
        mime: r.mimeType,
        size: fmtBytes(r.sizeBytes || 0),
        ttl: r.immutable ? 'immutable' : fmtTTL(r.ttlSec),
        cacheControl: r.cacheControl || '',
      }));

    const headings = [
      {key: 'type', valueType: 'text', label: 'Type'},
      {key: 'name', valueType: 'text', label: 'Name/URL'},
      {key: 'domain', valueType: 'text', label: 'Domain'},
      {key: 'firstParty', valueType: 'text', label: 'Party'},
      {key: 'mime', valueType: 'text', label: 'MIME'},
      {key: 'size', valueType: 'text', label: 'Size'},
      {key: 'ttl', valueType: 'text', label: 'TTL'},
      {key: 'expires', valueType: 'text', label: 'Expires'},
      {key: 'cacheControl', valueType: 'text', label: 'Cache-Control'},
      {key: 'flags', valueType: 'text', label: 'Flags'},
    ];

    const items = [
      ...cookieRows.map(c => ({...c, name: c.name})),
      ...resRows.map(r => ({...r, name: r.url})),
    ];

    // 建议
    const warnings = [];
    if (longCookie.length) warnings.push(`Detected ${longCookie.length} long-term third-party cookie（>180 days）。`);
    if (heavyLongCache.length) warnings.push(`detected ${heavyLongCache.length} large and long-term cached resources（>200KB and >30 days / immutable）。`);
    if (htmlCached.length) warnings.push(`HTML files have been cached（It is better that HTML uses no-store/no-cache）。`);

    return {
      score,
      numericValue: summary.resourceCacheableBytes + summary.cookieTotalBytes,
      numericUnit: 'bytes',
      displayValue: `Cookies: ${fmtBytes(summary.cookieTotalBytes)}, Cacheable: ${fmtBytes(summary.resourceCacheableBytes)}`,
      details: {
        type: 'table',
        headings,
        items,
        cookieTotalBytes: fmtBytes(summary.cookieTotalBytes),
        resourceCacheableBytes: fmtBytes(summary.resourceCacheableBytes),
        heavyLongCache: heavyLongCache.length ,
      },

      warnings,
    };
  }
}

export default ServerDataRetentionAudit;
