// Lightweight helpers for E2E tests: probe storefront and locate quickview triggers
module.exports = {
  ensureStorefront: async (page, base) => {
    try {
      const resp = await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 7000 });
      if (!resp) return false;
      const status = resp.status ? resp.status() : 200;
      return status < 400;
    } catch (e) {
      return false;
    }
  },

  // Try several selectors for quickview triggers and wait briefly if none present immediately
  findQuickviewTrigger: async (page) => {
    const selectors = [
      '[data-quickview-trigger]',
      '.quickview-button',
      '[data-open-quickview]',
      '[data-quickview]'
    ];

    for (const s of selectors) {
      const el = await page.$(s);
      if (el) return el;
    }

    // Wait a short time for any of the selectors to appear (some themes load buttons async)
    for (const s of selectors) {
      try {
        const el = await page.waitForSelector(s, { timeout: 3000 });
        if (el) return el;
      } catch (e) {
        // ignore
      }
    }
    return null;
  }
};
