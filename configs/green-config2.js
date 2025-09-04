import defaultConfig from './default-config.js';

export default {
  ...defaultConfig,
  audits: [
    ...defaultConfig.audits,
    { path: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/audits/custom/cdn-usage-audit.js' },
    { path: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/audits/custom/green-host2.js' },
    { path: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/audits/custom/refresh-frequency.js' },
    { path: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/audits/custom/server-data-retention-audit.js'},
  ],
  settings: {
    ...defaultConfig.settings,
    maxWaitForFcp: 60 * 1000,
    maxWaitForLoad: 75 * 1000,
    pauseAfterFcpMs: 40*1000,
    pauseAfterLoadMs: 3000,
    
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
    emulatedUserAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  },
  artifacts: [
    ...defaultConfig.artifacts,
    // 👇 加入这行，告诉 Lighthouse 收集 devtoolsLog
    // { id: 'DevtoolsLog', gatherer: 'devtools-log'},
    // { id: 'DevtoolsLog', gatherer: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/gather/gatherers/devtools-log.js' },
    { id: 'CdnUsage', gatherer: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/gather/gatherers/cdn-usage-gather-copy2.js' },
    {
      id: 'RefreshFrequency',
      gatherer: '/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/gather/gatherers/refresh-frequency2.js',
    },
    // { id: 'DevtoolsLog', gatherer: 'devtools-log' },
    // { id: 'URL',        gatherer: 'lighthouse/core/gather/gatherers/url.js' },
    {id: 'ServerDataRetention' , gatherer:'/Users/flyingbuta/Desktop/UofG/lighthouse/lighthouse/core/gather/gatherers/server-data-retention-gatherer2.js',
    dependencies: { DevtoolsLog: 'DevtoolsLog', URL: 'URL' },
    }
  ],
  categories: {
    ...defaultConfig.categories,
    hosting: {
        title: 'Hosting',
        description: 'Evaluates hosting and content delivery sustainability practices.', 
        auditRefs: [
          { id: 'green-host-audit', weight: 1 },
          { id: 'cdn-usage-audit', weight: 1 },
          { id: 'refresh-frequency-audit' , weight : 1},
          { id: 'server-data-retention' , weight : 1}
        ],
      },
  },
};
