// path: core/audits/green-host-audit.js
import {Audit} from '../audit.js';
import fetch from 'node-fetch'; // 你可能需要安装 node-fetch：npm install node-fetch

class GreenHostAudit extends Audit {
  static get meta() {
    return {
      id: 'green-host-audit',
      title: 'Site uses a green hosting provider',
      failureTitle: 'Site does not use a green hosting provider',
      description: 'Green hosting helps reduce the environmental impact of your website.',
      requiredArtifacts: ['URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const pageUrl = artifacts.URL.finalDisplayedUrl;
    const hostname = new URL(pageUrl).hostname;

    try {
      const res = await fetch(`https://api.thegreenwebfoundation.org/api/v3/greencheck/${hostname}`);
      const data = await res.json();
      const green = data.green;

    //   return {
    //     score: green ? 1 : 0,
    //     displayValue: green
    //       ? `Green hosted by ${data.hosted_by}`
    //       : `Not green hosted (${data.hosted_by || 'Unknown'})`,
    //     details: {
    //       type: 'debugdata',
    //       items: [{hostname, green, hosted_by: data.hosted_by || ''}],
    //     },
    //   };
    // return {
    //     score: data.green ? 1 : 0,
    //     displayValue: data.green ? 'Green hosting detected' : 'Non-green hosting',
    //     details: {
    //       type: 'table',
    //       headings: [
    //         { key: 'host', valueType: 'text', label: 'Hosting Provider' },
    //         { key: 'green', valueType: 'text', label: 'Is Green?' },
    //         { key: 'url', valueType: 'url', label: 'Check Link' }
    //       ],
    //       items: [
    //         {
    //           host: data.hosted_by || 'Unknown',
    //           green: data.green ? 'Yes' : 'No',
    //           url: `https://www.thegreenwebfoundation.org/green-web-check/?url=${hostname}`
    //         }
    //       ]
    //     }
    //   };    
      return{
        score: data.green ? 1 : 0,
        displayValue: data.green ? 'Green hosting detected' : 'Not hosted green',
        details: {
          type: 'table',
          headings: [
            {key: 'url', valueType: 'url', label: 'Website'},
            {key: 'hosted_by', valueType: 'text', label: 'Hosting Provider'},
            {key: 'listed_provider', valueType: 'text', label: 'Listed as Green?'},
            {key: 'hosted_by_website', valueType: 'url', label: 'Provider Website'},
          ],
          items: [
            {
              url: data.url,
              hosted_by: data.hosted_by || 'Unknown',
              listed_provider: data.listed_provider ? 'Yes' : 'No',
              hosted_by_website: data.hosted_by_website || '',
            }
          ]
        }
      }
        
    } catch (err) {
      return {
        score: 0,
        displayValue: `Error checking green host: ${err.message}`,
        details: {
          type: 'debugdata',
          items: [{hostname, green: false, error: err.message}],
        },
      };
    }
  }
}

export default GreenHostAudit;
