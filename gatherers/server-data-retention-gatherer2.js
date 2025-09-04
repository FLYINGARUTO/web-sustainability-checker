'use strict';

import {NetworkRecords} from 'lighthouse/core/computed/network-records.js';
import BaseGatherer from '../base-gatherer.js';
import DevtoolsLog from './devtools-log.js';

/** 小工具：解析 eTLD+1 */
function getETLDPlusOne(hostname) {
  const parts = (hostname || '').split('.');
  return parts.slice(-2).join('.') || hostname || '';
}

/** 解析 Cache-Control */
function parseCacheControl(cc) {
  const out = { noStore: false, maxAge: null, sMaxage: null, immutable: false };
  if (!cc) return out;
  const tokens = cc.toLowerCase().split(',').map(s => s.trim());
  for (const t of tokens) {
    if (t === 'no-store') out.noStore = true;
    if (t === 'immutable') out.immutable = true;
    if (t.startsWith('max-age=')) out.maxAge = Number(t.split('=')[1]) || null;
    if (t.startsWith('s-maxage=')) out.sMaxage = Number(t.split('=')[1]) || null;
  }
  return out;
}

/**
 * @implements {LH.Gatherer.GathererInstance}
 */
class ServerDataRetentionGatherer extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['navigation'],
    dependencies: { DevtoolsLog: DevtoolsLog.symbol }, // 只依赖 DevtoolsLog
  };

  async startInstrumentation() {}
  async stopInstrumentation() {}

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'} context
   * @return {Promise<LH.Artifacts['ServerDataRetention']>}
   */
  async getArtifact(context) {
    const { driver, dependencies } = context;
    const devtoolsLog = dependencies.DevtoolsLog;

    // 获取网络请求记录
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    // 自动推断主文档 URL（优先找 Document 类型）
    const docRec = networkRecords.find(r => r.resourceType === 'Document') || networkRecords[0];
    const mainDocumentUrl = docRec?.url || '';
    const firstPartyHost = mainDocumentUrl ? new URL(mainDocumentUrl).hostname : '';

    /** 1) Cookies（通过 CDP 获取） */
    const allCookies = (await driver.defaultSession.sendCommand('Network.getAllCookies')).cookies || [];
    const now = Date.now() / 1000;
    const cookies = allCookies.map(c => {
      const sizeBytes = Buffer.byteLength(`${c.name}=${c.value || ''}`, 'utf8');
      const lifetimeSec = (typeof c.expires === 'number' && c.expires > 0)
        ? Math.max(0, c.expires - now)
        : null;
      const isFirstParty = getETLDPlusOne(c.domain.replace(/^\./, '')) === getETLDPlusOne(firstPartyHost);
      return { 
        name: c.name,
        domain: c.domain,
        path: c.path,
        sizeBytes,
        httpOnly: !!c.httpOnly,
        secure: !!c.secure,
        sameSite: c.sameSite || 'Unspecified',
        expiresEpoch: c.expires || null,
        lifetimeSec,
        firstParty: isFirstParty,
      };
    });

    /** 2) 可缓存资源 */
    const resources = networkRecords
    //   .filter(r => (r.resourceType && r.resourceType !== 'Document') ||
    //                (r.mimeType && !/text\/html/i.test(r.mimeType))) // HTML 通常不应长缓存
      // 只排除主文档，其它一律保留做评估（避免误伤）
      .filter(r => r !== docRec)
      .map(r => {
        const urlObj = new URL(r.url);
        // const headers = r.responseHeaders || {};
        // const h = {};
        // for (const k of Object.keys(headers)) h[k.toLowerCase()] = headers[k];
        const raw = r.responseHeaders || {};
        const h = {};
        // 兼容两种形态：数组([{name,value}]) 或 对象({k:v})
        if (Array.isArray(raw)) {
            for (const {name, value} of raw) {
            if (name) h[String(name).toLowerCase()] = String(value ?? '');
            }
        } else {
            for (const k of Object.keys(raw)) h[k.toLowerCase()] = String(raw[k] ?? '');
        }
        const cc = parseCacheControl(h['cache-control']);
        const dateHeader = h['date'] ? new Date(h['date']).getTime() : null;
        const expiresHeader = h['expires'] ? new Date(h['expires']).getTime() : null;

        // let ttlSec = 0;
        // if (cc.noStore) ttlSec = 0;
        // else if (typeof cc.maxAge === 'number') ttlSec = Math.max(0, cc.maxAge);
        // else if (expiresHeader && dateHeader) ttlSec = Math.max(0, Math.floor((expiresHeader - dateHeader) / 1000));
        let ttlSec = 0;
        if (cc.noStore) {
            ttlSec = 0;
        } else if (typeof cc.sMaxage === 'number') {
            ttlSec = Math.max(0, cc.sMaxage);
        } else if (typeof cc.maxAge === 'number') {
            ttlSec = Math.max(0, cc.maxAge);
        } else if (cc.immutable) {
            ttlSec = 31536000; // 以一年作为保守回退
        } else if (expiresHeader && dateHeader) {
            ttlSec = Math.max(0, Math.floor((expiresHeader - dateHeader) / 1000));
        } else {
            // 简单启发式（没有任何缓存头时给少量 TTL，避免全部为0）
            const path = urlObj.pathname || '';
            if (/\.(js|css|png|jpe?g|gif|svg|webp|ico|woff2?|mp4|webm)$/i.test(path)) {
            ttlSec = 3600; // 1 小时
            }
        }
        const sizeBytes = r.transferSize > 0 ? r.transferSize
          : (r.resourceSize > 0 ? Math.ceil(r.resourceSize)
          : (h['content-length'] ? Number(h['content-length']) : 0));


        const fp = getETLDPlusOne(urlObj.hostname) === getETLDPlusOne(firstPartyHost);

        return {
          url: r.url,
          hostname: urlObj.hostname,
          mimeType: r.mimeType || '',
          statusCode: r.statusCode,
          cacheControl: h['cache-control'] || null,
          expires: h['expires'] || null,
          etag: h['etag'] || null,
          lastModified: h['last-modified'] || null,
          immutable: !!cc.immutable,
          ttlSec,
          sizeBytes,
          firstParty: fp,
        };
      });

    /** 3) Service Worker Cache Storage（同源可访问） */
    let swCaches = { enabled: false, caches: [], totalItems: 0, totalSizeBytes: null };
    try {
      const hasCaches = await driver.executionContext.evaluate(() => 'caches' in window);
      if (hasCaches) {
        swCaches.enabled = true;
        const result = await driver.executionContext.evaluate(async () => {
          const names = await caches.keys();
          const out = [];
          let totalItems = 0;
          for (const name of names) {
            const cache = await caches.open(name);
            const reqs = await cache.keys();
            out.push({ name, items: reqs.length });
            totalItems += reqs.length;
          }
          return { caches: out, totalItems };
        });
        swCaches.caches = result.caches;
        swCaches.totalItems = result.totalItems;
      }
    } catch {
      // 忽略跨域或 CSP 限制
    }

    /** 4) 汇总统计 */
    const cookieTotalBytes = cookies.reduce((s, c) => s + c.sizeBytes, 0);
    const resourceCacheableBytes = resources
      .filter(r => r.ttlSec > 0 || r.immutable)
      .reduce((s, r) => s + (r.sizeBytes || 0), 0);

    return {
      url: mainDocumentUrl,
      summary: {
        cookieTotalBytes,
        resourceCacheableBytes,
        cookieCount: cookies.length,
        resourceCount: resources.length,
        swCaches,
      },
      cookies,
      resources,
      generatedAt: new Date().toISOString(),
    };
  }

  static get meta() {
    return { supportedModes: ['navigation'] };
  }
}

export default ServerDataRetentionGatherer;
