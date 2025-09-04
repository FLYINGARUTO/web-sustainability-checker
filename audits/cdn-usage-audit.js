import {Audit} from 'lighthouse/core/audits/audit.js';

class CdnUsageAudit extends Audit {
  static get meta() {
    return {
      id: 'cdn-usage-audit',
      title: 'Static assets are served via CDN with cache hits',
      failureTitle: 'Static assets are not efficiently served via CDN',
      description: 'Checks if static resources (JS, CSS, images) are fetched via CDN and hit cache.',
      requiredArtifacts: ['CdnUsage'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const cdnResources = artifacts.CdnUsage?.cdnResources || [];
    if (!cdnResources.length) {
      return {
        score: 0,
        displayValue: 'No static assets found.',
        details: {
          type: 'table',
          headings: [
            {key: 'url', valueType: 'url', label: 'URL'},
            {key: 'cdnHit', valueType: 'text', label: 'CDN Cache Hit'},
            {key: 'xCache', valueType: 'text', label: 'X-Cache Header'},
            {key: 'via', valueType: 'text', label: 'Via Header'},
          ],
          items: [],

        },
      };
    }

    const hitCount = cdnResources.filter(r => r.cdnHit).length;
    const score = hitCount / cdnResources.length;

    return {
      score,
      displayValue: `${hitCount} / ${cdnResources.length} resources hit cache`,
      details: {
        type: 'table',
        headings: [
          {key: 'url', valueType: 'url', label: 'URL'},
          {key: 'cdnHit', valueType: 'text', label: 'CDN Cache Hit'},
          {key: 'xCache', valueType: 'text', label: 'X-Cache Header'},
          {key: 'via', valueType: 'text', label: 'Via Header'},
        ],
        items: cdnResources,
      },
    };
  }
}

export default CdnUsageAudit;
