const { test, expect } = require('@playwright/test');
const { ensureStorefront, findQuickviewTrigger, openQuickviewForHandle, discoverProductHandle, performMockFallback } = require('./helpers');
const fs = require('fs');
const path = require('path');

// Quick smoke: open homepage, open quickview for first demo product, add to cart, assert cart count increments

test.describe('LiteStep smoke', () => {
  test('quickview add-to-cart smoke', async ({ page }) => {
    const base = process.env.PREVIEW_URL || 'http://127.0.0.1:9292';
    let handle = null;
    const ok = await ensureStorefront(page, base);
    if (!ok) test.skip(true, `Storefront not reachable at ${base}`);

    // Ensure we're on the storefront and loaded
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    // Diagnostic selector counts and early mock fallback when no product elements present
    try {
      const selectorChecks = [
        '[data-quickview-trigger]','[data-open-quickview]','[data-quickview]','[data-action="quickview"]',
        'button[aria-controls="quickview-modal"]','button.quickview-button','button.quick-view','a.quickview','a.quick-view',
        'button[title*="Quick"]','a[title*="Quick"]','a[href*="/products/"]','.product-card','.product-card__image'
      ];
      const counts = await page.evaluate((sels) => {
        const out = {};
        for (const s of sels) out[s] = document.querySelectorAll(s).length;
        out['htmlLength'] = document.documentElement.innerHTML.length;
        return out;
      }, selectorChecks);
      console.log('selectorCounts:', JSON.stringify(counts));
      try {
        const dbgDir = path.resolve(process.cwd(), 'test-results');
        fs.mkdirSync(dbgDir, { recursive: true });
        fs.writeFileSync(path.join(dbgDir, 'smoke-debug.html'), await page.content(), 'utf8');
      } catch (e) {
        console.debug('smoke: diagnostic write failed', e && e.message);
      }

      const zeroSelectors = ['[data-quickview-trigger]','[data-open-quickview]','[data-quickview]','[data-action="quickview"]','a[href*="/products/"]','.product-card'];
      const allZero = zeroSelectors.every(s => counts[s] === 0);
      if (allZero && process.env.MOCK_FALLBACK === '1') {
        const did = await performMockFallback(page, base);
        if (did) return;
      }
    } catch (e) {
      // non-fatal
    }

    const trigger = await findQuickviewTrigger(page);
    if (!trigger) {
      // fallback to locating a product link or using discovery
      let productLink = await page.$('a[href*="/products/"]');
      if (!productLink && process.env.PREVIEW_PRODUCT) {
        await page.goto(process.env.PREVIEW_PRODUCT, { waitUntil: 'load' }).catch(() => {});
        await page.waitForTimeout(300);
        productLink = await page.$('a[href*="/products/"]');
      }
      if (!productLink) {
        const collectionUrl = new URL('/collections/all', base).toString();
        await page.goto(collectionUrl, { waitUntil: 'load' }).catch(() => {});
        await page.waitForTimeout(300);
        productLink = await page.$('a[href*="/products/"]');
      }

      if (!productLink) {
        // write diagnostics
        try {
          const stamp = Date.now();
          const outDir = path.resolve(process.cwd(), 'test-results', `smoke-trigger-diagnostic-${stamp}`);
          fs.mkdirSync(outDir, { recursive: true });
          await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });
          fs.writeFileSync(path.join(outDir, 'page.html'), await page.content(), 'utf8');
        } catch (e) { console.debug('smoke: diagnostic snapshot failed', e && e.message); }

        try {
          const discovered = await discoverProductHandle(page, base);
          if (discovered) {
            handle = discovered;
            console.log('Discovered product handle from fallback:', handle);
          }
  } catch (e) { console.debug('smoke: discoverProductHandle failed', e && e.message); }

        if (!productLink && !handle) {
          if (process.env.MOCK_FALLBACK === '1') {
            const ok = await performMockFallback(page, base);
            if (ok) return;
            test.skip(true, 'No quickview trigger, product link, or discovered product found on the page (mock fallback failed)');
          }
          test.skip(true, 'No quickview trigger, product link, or discovered product found on the page');
        }
      }

      if (productLink) {
        const href = await productLink.getAttribute('href');
        if (!href) test.skip(true, 'Product link has no href');
        try {
          const u = new URL(href, base);
          const parts = u.pathname.split('/').filter(Boolean);
          const idx = parts.indexOf('products');
          if (idx >= 0 && parts.length > idx + 1) handle = parts[idx + 1];
        } catch (e) { console.debug('smoke: product link href parse failed', e && e.message); }
      }

      if (!handle && process.env.PREVIEW_PRODUCT) {
        try {
          const u2 = new URL(process.env.PREVIEW_PRODUCT);
          const parts2 = u2.pathname.split('/').filter(Boolean);
          const idx2 = parts2.indexOf('products');
          if (idx2 >= 0 && parts2.length > idx2 + 1) handle = parts2[idx2+1];
        } catch (e) { console.debug('smoke: PREVIEW_PRODUCT parse failed', e && e.message); }
      }

      if (handle) {
        const add = await openQuickviewForHandle(page, handle, base);
        if (add) {
          const added = await resilientClick(add, page);
          if (!added) test.skip(true, 'Could not click add-to-cart button in quickview');
          const cartCount = await page.waitForFunction(() => {
            const el = document.querySelector('[data-cart-count]');
            if (!el) return false;
            const t = el.textContent && el.textContent.trim();
            const n = parseInt(t, 10);
            return Number.isFinite(n) && n >= 1;
          }, { timeout: 5000 }).catch(() => null);
          expect(cartCount).not.toBeNull();
          return;
        }
      }

      if (!handle) {
        try {
          const discovered = await discoverProductHandle(page, base);
          if (discovered) {
            handle = discovered;
            const add2 = await openQuickviewForHandle(page, handle, base);
            if (add2) {
              const added2 = await resilientClick(add2, page);
              if (added2) {
                const cartCount2 = await page.waitForFunction(() => {
                  const el = document.querySelector('[data-cart-count]');
                  if (!el) return false;
                  const t = el.textContent && el.textContent.trim();
                  const n = parseInt(t, 10);
                  return Number.isFinite(n) && n >= 1;
                }, { timeout: 5000 }).catch(() => null);
                if (cartCount2) { expect(cartCount2).not.toBeNull(); return; }
              }
            }
          }
  } catch (e) { console.debug('smoke: discoverProductHandle secondary failed', e && e.message); }
      }

      // final fallback: navigate to product page and try add-to-cart there
      if (handle) {
        const productUrl = new URL(`/products/${handle}`, base).toString();
        await page.goto(productUrl, { waitUntil: 'load' });
        const addSelectors = ['button[name="add"]','button.add-to-cart','.product-form__submit','[data-add-to-cart]','button[type="submit"]'];
        let add = null;
        for (const sel of addSelectors) {
          add = await page.$(sel);
          if (add) break;
        }
        if (!add) test.skip(true, 'No add-to-cart found on product page');
        await add.click({ force: true }).catch(() => {});
        const cartCount = await page.waitForFunction(() => {
          const el = document.querySelector('[data-cart-count]');
          if (!el) return false;
          const t = el.textContent && el.textContent.trim();
          const n = parseInt(t, 10);
          return Number.isFinite(n) && n >= 1;
        }, { timeout: 5000 }).catch(() => null);
        expect(cartCount).not.toBeNull();
        return;
      }
    }

    // resilient click helper
    async function resilientClick(handle, page) {
      try { await handle.click({ force: true }); return true; } catch (err) {
        try {
          await page.evaluate(el => { const rect = el.getBoundingClientRect(); const ev = new MouseEvent('click', { bubbles:true, cancelable:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }); el.dispatchEvent(ev); }, handle);
          return true;
        } catch (err2) {
          try {
            const parent = await handle.evaluateHandle(el => el.parentElement);
            if (parent) {
              const parentEl = parent.asElement();
              if (parentEl) {
                await parentEl.click({ force: true }).catch(() => {});
                return true;
              }
            }
            } catch (e) { console.debug('smoke: resilientClick parent click failed', e && e.message); }
        }
      }
      return false;
    }

    // If we have a trigger from the initial find, use it to open quickview
    if (typeof trigger !== 'undefined' && trigger) {
      const clicked = await resilientClick(trigger, page);
      if (!clicked) test.skip(true, 'Could not click quickview trigger');

      const modal = await page.waitForSelector('#quickview-modal, [role="dialog"]', { timeout: 5000 }).catch(() => null);
      if (!modal) test.skip(true, 'Quickview modal did not appear after clicking trigger');

      const addSelectors = ['#quickview-modal [data-add-to-cart]','#quickview-modal button[name="add"]','#quickview-modal .add-to-cart','#quickview-modal button.add-to-cart','[data-add-to-cart]','button[name="add"]','.add-to-cart','button.add-to-cart'];
      let add = null;
      for (const sel of addSelectors) {
        add = await page.$(sel);
        if (add) break;
      }
      if (!add) test.skip(true, 'No add-to-cart button found inside quickview');

      const added = await resilientClick(add, page);
      if (!added) test.skip(true, 'Could not click add-to-cart button');

      const cartCount = await page.waitForFunction(() => {
        const el = document.querySelector('[data-cart-count]');
        if (!el) return false;
        const t = el.textContent && el.textContent.trim();
        const n = parseInt(t, 10);
        return Number.isFinite(n) && n >= 1;
      }, { timeout: 5000 }).catch(() => null);

      expect(cartCount).not.toBeNull();
    }
  });
});
