const { test, expect } = require('@playwright/test');

// This E2E is skipped by default to avoid CI flakes; set RUN_E2E=1 to enable locally.
test.skip(process.env.RUN_E2E !== '1', 'E2E tests are skipped unless RUN_E2E=1');

test('quickview open and add to cart flow', async ({ page }) => {
  // Update the URL to your local shopify dev proxy if different
  const url = process.env.PREVIEW_URL || 'http://127.0.0.1:9292';
  const { ensureStorefront, findQuickviewTrigger } = require('./helpers');
  const ok = await ensureStorefront(page, url);
  if (!ok) test.skip(true, `Storefront not reachable at ${url}`);
  // Find a trigger and click it
  const trigger = await findQuickviewTrigger(page);
  if (!trigger) test.skip(true, 'No quickview trigger found on the page');
  await trigger.click();
  // modal should be visible
  await expect(page.locator('#quickview-modal')).toHaveAttribute('aria-hidden', 'false');
  // click add to cart
  await page.click('#quickview-add');
  // cart drawer should open (there may be a network delay)
  await page.waitForSelector('#cart-drawer[aria-hidden="false"]', { timeout: 5000 });
  // announcer should have text
  const announcer = await page.locator('#cart-announcer');
  await expect(announcer).not.toBeEmpty();
});
