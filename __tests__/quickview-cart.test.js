/** @jest-environment jsdom */
/**
 * jsdom-based tests for quickview populate and cart rendering.
 */
const fs = require('fs');

beforeEach(()=>{
  // setup minimal DOM used by scripts.js
  document.body.innerHTML = `
    <div id="quickview-modal" aria-hidden="true">
      <div id="quickview-media"></div>
      <div id="quickview-thumbs" aria-hidden="true"></div>
      <h1 id="quickview-title"></h1>
      <div id="quickview-price"></div>
      <div id="quickview-description"></div>
      <div id="quickview-variants"></div>
      <button id="quickview-add" class="add-to-cart-button">Add</button>
    </div>
    <div id="cart-drawer" aria-hidden="true">
      <div id="cart-items"></div>
      <div id="cart-subtotal"></div>
      <div id="cart-announcer" aria-live="polite"></div>
    </div>
    <div id="page-cart-items"></div>
    <div id="page-cart-subtotal"></div>
  `;

  // add main content and cart-count used by accessibility helpers
  const main = document.createElement('main'); main.id = 'MainContent'; document.body.appendChild(main);
  const headerCount = document.createElement('span'); headerCount.id = 'cart-count'; headerCount.textContent = '(0)'; document.body.appendChild(headerCount);

  // Ensure the module runs its DOMContentLoaded handler in tests.
  // Clear cache so require will re-run the module per test.
  const modPath = require.resolve('../assets/scripts.js');
  delete require.cache[modPath];
  // Provide a fetch mock that does not resolve immediately so the initial background refresh
  // (triggered during module initialization) doesn't overwrite explicit test renders.
  global.fetch = jest.fn().mockImplementation(() => new Promise(()=>{}));
  require('../assets/scripts.js');
  // Dispatch DOMContentLoaded so the script's listener executes and attaches window.LiteStep
  document.dispatchEvent(new Event('DOMContentLoaded'));
});

test('populateQuickview fills modal and thumbnails', ()=>{
  const demo = JSON.parse(fs.readFileSync('assets/demo-products.json','utf8'));
  const p = demo.products[0];
  // call populateQuickview
  window.LiteStep.populateQuickview(p, p.handle);
  const modal = document.getElementById('quickview-modal');
  expect(modal.getAttribute('aria-hidden')).toBe('false');
  expect(document.getElementById('quickview-title').textContent).toBe(p.title);
  expect(document.getElementById('quickview-price').textContent).toBe((p.price/100).toFixed(2));
  const thumbs = document.getElementById('quickview-thumbs');
  expect(thumbs.children.length).toBe(p.images.length);
  // thumbnails should be visible
  expect(thumbs.getAttribute('aria-hidden')).toBe(null);
  // main should be hidden when modal open
  expect(document.getElementById('MainContent').getAttribute('aria-hidden')).toBe('true');
});

test('renderCart shows items and updates announcer', ()=>{
  const cart = {
    items: [
      { product_title: 'Demo Tee', quantity: 2, line_price: 4000 },
      { product_title: 'Demo Mug', quantity: 1, line_price: 1500 }
    ],
    total_price: 5500
  };
  // call renderCart
  window.LiteStep.renderCart(cart);
  const container = document.getElementById('cart-items');
  expect(container.children.length).toBe(2);
  const subtotal = document.getElementById('cart-subtotal').textContent;
  expect(subtotal).toMatch('Subtotal: $55.00');
  const announcer = document.getElementById('cart-announcer').textContent;
  expect(announcer).toMatch('2 items in cart');
  // cart count updated
  expect(document.getElementById('cart-count').textContent).toBe('(2)');
});
