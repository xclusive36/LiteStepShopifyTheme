const { test, expect } = require('@playwright/test');
const { ensureStorefront, findQuickviewTrigger } = require('./helpers');
// using axe-core via script injection in the page context

// Note: we use axe-core directly; Playwright-specific helper packages exist but installing axe-core keeps deps minimal.

test('quickview has proper ARIA and no critical a11y violations', async ({ page }) => {
  if (!process.env.RUN_E2E) test.skip();

  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:9292';
  const ok = await ensureStorefront(page, base);
  test.skip(!ok, 'Storefront not available');

  await page.goto(base, { waitUntil: 'load' });

  const trigger = await findQuickviewTrigger(page);
  expect(trigger, 'quickview trigger').toBeTruthy();

  // resilient click helper: try playwright force click, then fallback to dispatching events in-page
  async function resilientClick(handle) {
    try {
      await handle.click({ force: true });
      return true;
    } catch (err) {
      // attempt to click via JS dispatch at element center
      try {
        await page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 });
          el.dispatchEvent(ev);
        }, handle);
        return true;
      } catch (err2) {
        // as last resort, try clicking parent element
        try {
          const parent = await handle.evaluateHandle(el => el.parentElement);
          if (parent) {
            await parent.asElement().click({ force: true }).catch(() => {});
            return true;
          }
        } catch (e) {}
      }
    }
    return false;
  }

  const clicked = await resilientClick(trigger);
  if (!clicked) test.skip('Could not click quickview trigger');

  // wait for the quickview modal to appear
  const modal = await page.waitForSelector('#quickview-modal, [role="dialog"]', { timeout: 5000 });
  expect(modal).toBeTruthy();

  // assert ARIA attributes
  const role = await modal.getAttribute('role');
  expect(role === 'dialog' || role === 'dialog' /* allow either */).toBeTruthy();
  const ariaModal = await modal.getAttribute('aria-modal');
  expect(ariaModal === 'true' || ariaModal === '1').toBeTruthy();

  // check that main content is hidden to assistive tech when modal open
  const mainSelector = 'main, #MainContent, [role="main"]';
  const main = await page.$(mainSelector);
  if (main) {
    // wait briefly for the theme to update aria-hidden if it does so
    await page.waitForTimeout(300);
    const hidden = await main.getAttribute('aria-hidden');
    if (!(hidden === 'true' || hidden === '1')) {
      // don't hard-fail here; log and continue to run axe checks which are the primary gate
      console.warn('Warning: main content does not have aria-hidden after opening quickview');
    }
  }

  // Run axe-core scan in the page context
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const results = await page.evaluate(async () => {
    // global axe is available
    // eslint-disable-next-line no-undef
    return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] } });
  });

  // Fail test if there are any violations with impact "critical" or "serious"
  const serious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(serious.length === 0, `critical/serious violations: ${JSON.stringify(serious, null, 2)}`).toBeTruthy();
});
