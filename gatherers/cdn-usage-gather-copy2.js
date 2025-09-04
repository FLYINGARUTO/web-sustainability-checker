import BaseGatherer from '../base-gatherer.js';
import { NetworkRecords } from '../../computed/network-records.js';
import DevtoolsLog from './devtools-log.js';

/**
 * @implements {LH.Gatherer.GathererInstance}
 */
class CdnUsageGatherer extends BaseGatherer {
   /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'} */
  meta = {
    supportedModes: ['navigation'],
    dependencies: { DevtoolsLog: DevtoolsLog.symbol }, // 👈 declare dependency
  };
  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context 
   * @return {Promise<LH.Artifacts['CdnUsage']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    const cdnHostPattern = /(?:cdn[^.]*|cdn|static|assets|upload|cloudfront|cloudimg|akamai|fastly|googleusercontent|edgekey|muscache|fonts|stackpath)\./i;
    const staticPattern = /\.(js|css|png|jpe?g|webp|gif|svg|woff2?|ttf|eot|otf|ico)(\?|$)/i;

    const cdnResources = networkRecords
      .filter(r => r.url && staticPattern.test(r.url))
      .map(r => {
        const url = r.url;
        const hostname = new URL(url).hostname;
        const xCache = r.responseHeaders?.['x-cache'] || '';
        const via = r.responseHeaders?.['via'] || '';
        const cdnHit = /hit/i.test(xCache) || cdnHostPattern.test(hostname);
        return { url, cdnHit, xCache, via };
      });

    return { cdnResources };
  }
}

export default CdnUsageGatherer;
