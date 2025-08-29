const { test, expect } = require('@playwright/test');

const shouldRun = process.env.RUN_E2E === '1' || process.env.RUN_E2E === 'true';
// Skip the file unless RUN_E2E is explicitly enabled
test.skip(!shouldRun, 'RUN_E2E not enabled');

// Thumbnail keyboard navigation: open quickview, navigate thumbnails with arrow keys, activate via Enter/Space

test('thumbnail keyboard navigation in quickview', async ({ page }) => {
  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:9292';
  const { ensureStorefront, findQuickviewTrigger } = require('./helpers');
  const ok = await ensureStorefront(page, base);
  if (!ok) test.skip(true, `Storefront not reachable at ${base}`);
  const trigger = await findQuickviewTrigger(page);
  if (!trigger) test.skip(true, 'No quickview trigger found on the page');
  await trigger.click();

  const modal = '#quickview-modal';
  await page.waitForSelector(modal, { timeout: 6000 });

  // Identify main image and thumbnails using multiple selector fallbacks
  const mainImgSelector = `${modal} img[data-main], ${modal} .quickview-main img, ${modal} img.quickview-main`;
  const thumbSelector = `${modal} [data-quickview-thumb] img, ${modal} .quickview-thumbs img, ${modal} img[data-thumb]`;

  await page.waitForSelector(thumbSelector, { timeout: 6000 });

  // Get initial main image src
  const initialSrc = await page.$eval(mainImgSelector, img => img.src).catch(() => null);
  if (!initialSrc) throw new Error('Main image not found in quickview');

  // Get all thumbnail elements
  const thumbs = await page.$$(thumbSelector);
  if (thumbs.length < 2) {
    test.fail(true, 'Not enough thumbnails to test keyboard navigation');
  }

  // Focus the first thumbnail
  await thumbs[0].focus();

  // Press ArrowRight to move focus to next thumbnail, then activate with Enter
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  // Allow time for image swap animation
  await page.waitForTimeout(500);

  // After selection, ensure main image src changed to include thumbnail src
  const selectedThumbSrc = await page.evaluate(el => el.getAttribute('data-large-src') || el.src || el.getAttribute('data-src'), thumbs[1]);
  const newMainSrc = await page.$eval(mainImgSelector, img => img.src).catch(() => null);
  expect(newMainSrc).not.toBeNull();
  expect(newMainSrc).not.toEqual(initialSrc);
  if (selectedThumbSrc) expect(newMainSrc.includes(selectedThumbSrc.split('/').pop())).toBeTruthy();

  // Now press ArrowLeft to return focus to the first thumbnail and activate with Space
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const finalMainSrc = await page.$eval(mainImgSelector, img => img.src).catch(() => null);
  expect(finalMainSrc).not.toBeNull();
  expect(finalMainSrc).not.toEqual(newMainSrc);
});
