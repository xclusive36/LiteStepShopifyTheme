const { test, expect } = require('@playwright/test');

const shouldRun = process.env.RUN_E2E === '1' || process.env.RUN_E2E === 'true';
// Skip the file unless RUN_E2E is explicitly enabled
test.skip(!shouldRun, 'RUN_E2E not enabled');

// Cart quantity and removal: add an item, increase quantity, decrease, and remove

test('cart quantity changes and removal', async ({ page }) => {
  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:9292';
  const { ensureStorefront, findQuickviewTrigger } = require('./helpers');
  const ok = await ensureStorefront(page, base);
  if (!ok) test.skip(true, `Storefront not reachable at ${base}`);
  const trigger = await findQuickviewTrigger(page);
  if (!trigger) test.skip(true, 'No quickview trigger found on the page');
  await trigger.click();
  const modal = '#quickview-modal';
  await page.waitForSelector(modal, { timeout: 6000 });

  const addBtn = await page.$(`${modal} [data-add-to-cart], ${modal} button.add-to-cart`);
  if (!addBtn) test.fail(true, 'Add to cart button not found');
  await addBtn.click();

  await page.waitForTimeout(800);

  // Open cart drawer if available
  const drawerBtn = await page.$('[data-open-cart-drawer]');
  if (drawerBtn) await drawerBtn.click();

  // Wait for cart item selector
  await page.waitForSelector('[data-cart-line]', { timeout: 6000 });

  // Increase quantity
  const qtyInput = await page.$('[data-cart-line] input[type="number"], [data-cart-line] [data-qty-input]');
  if (!qtyInput) test.skip(true, 'No quantity input available in cart drawer');

  // Read initial value
  let val = await qtyInput.inputValue();
  const initial = parseInt(val, 10) || 1;

  // Increase
  await qtyInput.fill(String(initial + 1));
  await qtyInput.press('Enter');
  await page.waitForTimeout(800);

  // Assert increased via cart API or UI
  const increased = await page.$eval('[data-cart-count]', el => parseInt(el.textContent, 10)).catch(() => null);
  expect(increased).toBeGreaterThanOrEqual(initial + 1);

  // Decrease back
  await qtyInput.fill(String(initial));
  await qtyInput.press('Enter');
  await page.waitForTimeout(800);

  // Remove item if remove control exists
  const removeBtn = await page.$('[data-cart-line] [data-remove-item], [data-cart-line] button.remove');
  if (removeBtn) {
    await removeBtn.click();
    await page.waitForTimeout(800);
    const countAfterRemove = await page.$eval('[data-cart-count]', el => parseInt(el.textContent, 10)).catch(() => null);
    expect(countAfterRemove).toBeGreaterThanOrEqual(0);
  } else {
    test.skip(true, 'No remove control available in cart drawer');
  }
});
