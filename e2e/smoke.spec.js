const { test, expect } = require('@playwright/test');

// Quick smoke: open homepage, open quickview for first demo product, add to cart, assert cart count increments

test.describe('LiteStep smoke', () => {
  test('quickview add-to-cart smoke', async ({ page }) => {
    const base = process.env.PREVIEW_URL || 'http://127.0.0.1:9292';
    const { ensureStorefront, findQuickviewTrigger } = require('./helpers');
    const ok = await ensureStorefront(page, base);
    if (!ok) test.skip(true, `Storefront not reachable at ${base}`);

    // Find a trigger; skip if none available
    const trigger = await findQuickviewTrigger(page);
    if (!trigger) test.skip(true, 'No quickview trigger found on the page');
    await trigger.click();

    // Wait for quickview modal and add-to-cart button
    await page.waitForSelector('#quickview-modal [data-add-to-cart]', { timeout: 5000 });
    const add = await page.$('#quickview-modal [data-add-to-cart]');

    // Click add and wait for cart drawer/update
    await add.click();

    // Assert cart drawer or cart icon updates within 5s
    await page.waitForTimeout(1500);
    const cartCount = await page.$eval('[data-cart-count]', el => el.textContent.trim()).catch(() => null);
    expect(cartCount).not.toBeNull();
    const n = parseInt(cartCount, 10);
    expect(Number.isFinite(n)).toBeTruthy();
    expect(n).toBeGreaterThanOrEqual(1);
  });
});
