const config = {
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure'
  },
  testDir: './e2e'
};
module.exports = config;
