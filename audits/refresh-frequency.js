import { Audit } from 'lighthouse/core/audits/audit.js';

class RefreshFrequencyAudit extends Audit {
  static get meta() {
    return {
      id: 'refresh-frequency-audit',
      title: 'Refresh Frequency Analysis',
      failureTitle: 'Unreasonably Frequent Refresh Has Been Detected',
      description: 'Analyzes refresh behavior including WebSocket usage and polling API frequency.',
      requiredArtifacts: ['RefreshFrequency'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const {
      refreshCount,
      websocketCount,
      pollingRequests,
      pollingCount
    } = artifacts.RefreshFrequency;

    // Define thresholds
    const excessivePollingThreshold = 15; // e.g., >15 requests in 30s
    const websocketUsed = websocketCount > 0;
    const pollingTooFrequent = pollingCount > excessivePollingThreshold;

    const displayValue = `Detected ${pollingCount} polling requests, ${websocketCount} WebSocket connections, ${refreshCount} page reloads`;

    const details = {
      type: 'table',
      headings: [
        { key: 'url' , valueType: 'url', label: 'Polled URL' },
        { key: 'type' , valueType: 'text' , label: 'Type'},
        { key: 'count', valueType: 'numeric', label: 'Count' }, // ✅ 添加 count 列
      ],
      items: pollingRequests.map(request => ({
        url: request.url,
        type: request.type,
        count: request.count,
      })),
      websocketCount: websocketCount
    };

    // Only provide a pass/fail if polling is clearly excessive and site is not realtime
    const score = websocketUsed || pollingTooFrequent ? 0 : 1;

    return {
      score,
      displayValue,
      details,
    };
  }
}

export default RefreshFrequencyAudit;
