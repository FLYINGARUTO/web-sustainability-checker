// gatherer.js
import BaseGatherer from '../base-gatherer.js';
import DevtoolsLog from './devtools-log.js';
import {NetworkRequest} from '../../lib/network-request.js';
import { NetworkRecords } from '../../computed/network-records.js';
/**
 * @implements {LH.Gatherer.GathererInstance}
 */
class RefreshFrequencyGatherer extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['navigation'],
    dependencies: { DevtoolsLog: DevtoolsLog.symbol }, // 👈 declare dependency
  };

    /**
     * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
     * @return {Promise<LH.Artifacts['RefreshFrequency']>}
     */
    async getArtifact(context) {
        const devtoolsLog = context.dependencies.DevtoolsLog;
        // ① 直接过滤 WebSocket 相关事件
        const wsUrls = new Set();
        for (const entry of devtoolsLog) {
          if (entry.method === 'Network.webSocketCreated') {
            wsUrls.add(entry.params.url);
          } else if (
            entry.method === 'Network.responseReceived' &&
            entry.params.response.status === 101 &&               // 101 Switching Protocols
            entry.params.response.url.startsWith('ws')
          ) {
            wsUrls.add(entry.params.response.url);
          }
        }
        const networkRecords = await NetworkRecords.request(devtoolsLog, context, {includeUnfinished: true} )     // 👈 关键开关);
        // const session = context.driver.defaultSession;

        let urlCounts = {};
        // const pollingUrls = new Set();
        const pollingRequests = [];

        // await session.sendCommand('Network.enable');

        // // ✅ 实时监听 WebSocket 创建事件
        // session.on('Network.webSocketWillSendHandshakeRequest', () => {
        //   websocketCount++;

        // });
        for (const record of networkRecords) {
            console.log(`[${record.resourceType}] ${record.url}`);
            const url = record.url;
            //const initiatorType = record.initiator?.type;
            const type=record.resourceType
            const proto = record.protocol
            if (
              url.startsWith('ws://') || url.startsWith('wss://') || proto === 'ws'||
              (type === 'WebSocket' || type === 'Other' && url.includes('socket'))
            ) {
              websocketCount++;
              console.log('🧩 WebSocket found:', url, 'type:', type);
            }

            const isLikelyPolling =
            // ( type==NetworkRequest.TYPES.XHR || type===NetworkRequest.TYPES.Fetch )
            ( type==NetworkRequest.TYPES.XHR || type===NetworkRequest.TYPES.Fetch ) &&
            (/\/api\/|\/ajax\/|\/data|\/feed\/|\/v1\/|\/v2\/|\/v3\/|\/rest\/|\/service\//i.test(url) ||
                /\.(json|xml|txt)$/i.test(url));

            // if (isLikelyPolling) {
            // urlCounts[url] = (urlCounts[url] || 0) + 1;
            // if (urlCounts[url] > 3) {
            //     pollingUrls.add(url);
            // }
            // }
            if (isLikelyPolling) {
                urlCounts[url] = (urlCounts[url] || 0) + 1;
        
                const existing = pollingRequests.find(req => req.url === url);
                if (!existing && urlCounts[url] > 3) {
                pollingRequests.push({
                    url,
                    type: type,
                    count: urlCounts[url]
                });
                } else if (existing) {
                existing.count = urlCounts[url]; // Update
                }
            }
        }
        // ✅ 等待收集 WebSocket 数据
        // await new Promise(resolve => setTimeout(resolve, 30000)); // 你可以更长，比如 10s
        return {
            websocketCount: wsUrls.size,
            pollingRequests: [...pollingRequests],
            pollingCount: pollingRequests.length,
            refreshCount: 0 // optional
        };
        }
}
export default RefreshFrequencyGatherer