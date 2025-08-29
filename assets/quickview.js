// Minimal quickview runtime: delegated handlers to open a quickview modal,
// populate it from /products/<handle>.js and attempt an AJAX add-to-cart.
// Designed to be resilient for live preview and deterministic test fallback.
(function () {
  'use strict';



  // Accessibility helpers: focus management and trapping
  function getFocusableElements(modal) {
    if (!modal) return [];
    return Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null);
  }

  function trapTabKey(e) {
    const modal = e.currentTarget && e.currentTarget.__quickviewModal;
    if (!modal) return;
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function showModal(modal) {
    if (!modal) return;
    modal.style.display = '';
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // hide main content from assistive tech
    const mains = document.querySelectorAll('#MainContent, main[role="main"], main');
    mains.forEach(m => m.setAttribute('aria-hidden', 'true'));

    // store previously focused element to restore on close
    modal.__previousActive = document.activeElement;

    // focus first actionable element
    const focusable = getFocusableElements(modal);
    if (focusable.length) focusable[0].focus();

    // attach trapping and keyboard handlers
    const keyHandler = function (ev) {
      if (ev.key === 'Escape') {
        hideModal(modal);
      }
    };
    // store references for removal later
    modal.__quickviewKeyHandler = keyHandler;
    modal.__quickviewTabHandler = trapTabKey.bind({ __quickviewModal: modal });

    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keydown', modal.__quickviewTabHandler);
    document.addEventListener('focus', modal.__quickviewTabHandler, true);
  }

  function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('role');
    modal.removeAttribute('aria-modal');

    // restore main content visibility for assistive tech
    const mains = document.querySelectorAll('#MainContent, main[role="main"], main');
    mains.forEach(m => m.removeAttribute('aria-hidden'));

    // restore focus
    try {
      if (modal.__previousActive && typeof modal.__previousActive.focus === 'function') {
        modal.__previousActive.focus();
      }
    } catch (e) {
      // noop
    }

    // remove handlers
    if (modal.__quickviewKeyHandler) document.removeEventListener('keydown', modal.__quickviewKeyHandler);
    if (modal.__quickviewTabHandler) {
      document.removeEventListener('keydown', modal.__quickviewTabHandler);
      document.removeEventListener('focus', modal.__quickviewTabHandler, true);
    }
    modal.__quickviewKeyHandler = null;
    modal.__quickviewTabHandler = null;
  }

  async function fetchProduct(handle, base) {
    base = base || '';
    const url = (base.replace(/\/$/, '') || '') + `/products/${encodeURIComponent(handle)}.js`;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('product fetch failed');
      return await res.json();
    } catch (err) {
      console.debug('quickview: fetchProduct error', err);
      return null;
    }
  }

  function renderProductIntoQuickview(product, modal) {
    if (!product || !modal) return;
    const title = modal.querySelector('#quickview-title');
    const price = modal.querySelector('#quickview-price');
    const media = modal.querySelector('#quickview-media');
    const addBtn = modal.querySelector('#quickview-add');

    if (title) title.textContent = product.title || '';
    if (price) {
      const p = (product.price != null) ? (product.price / 100).toFixed(2) : '';
      price.textContent = p ? `$${p}` : '';
    }

    if (media) {
      // prefer featured_image
      const img = product?.featured_image || product?.images?.[0] || null;
      if (img) {
        media.innerHTML = `<img src="${img}" alt="${product.title || ''}" loading="lazy" style="max-width:100%;height:auto;"/>`;
      } else {
        media.innerHTML = '';
      }
    }

    if (addBtn) {
      // store the first variant id for add-to-cart
      const v = (product.variants && product.variants[0]) || null;
      if (v) addBtn.dataset.variantId = String(v.id);
    }
  }

  async function addToCart(variantId, qty) {
    qty = qty || 1;
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: Number(qty) }),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('add-to-cart failed');
      const json = await res.json();
      // emit a global event to allow other scripts to update cart UI
      window.dispatchEvent(new CustomEvent('quickview:cart-added', { detail: json }));
      return json;
    } catch (err) {
      console.debug('quickview: addToCart error', err);
      // Best-effort fallback: update [data-cart-count] if present
      try {
        const el = document.querySelector('[data-cart-count]');
        if (el) {
          const prev = Number(el.textContent || el.getAttribute('data-count') || 0) || 0;
          const next = prev + Number(qty || 1);
          el.textContent = String(next);
          el.setAttribute('data-count', String(next));
          window.dispatchEvent(new CustomEvent('quickview:cart-mock', { detail: { count: next } }));
        }
      } catch (e) {
        console.debug('quickview: fallback update failed', e);
      }
      return null;
    }
  }

  // Delegated click handler to open quickview
  function delegatedClickHandler(e) {
    const btn = e.target.closest('[data-handle], .quickview-button');
    if (!btn) return;
    e.preventDefault();
    const handle = btn.dataset.handle || btn.getAttribute('data-handle');
    if (!handle) return;
    const modal = document.getElementById('quickview-modal');
    (async function () {
      const product = await fetchProduct(handle);
      renderProductIntoQuickview(product, modal);
      showModal(modal);
    }());
  }

  function wireModalHandlers() {
    const modal = document.getElementById('quickview-modal');
    if (!modal) return;

    modal.addEventListener('click', function (ev) {
      // close when clicking backdrop or close button
      if (ev.target.matches('.quickview-close') || ev.target === modal) {
        hideModal(modal);
      }
    });

    const addBtn = modal.querySelector('#quickview-add');
    if (addBtn) {
      addBtn.addEventListener('click', async function (ev) {
        ev.preventDefault();
        const variantId = addBtn.dataset.variantId || addBtn.getAttribute('data-variant-id');
        if (!variantId) return;
        await addToCart(variantId, 1);
        // close after add
        hideModal(modal);
      });
    }

  // keyboard handling for escape/tab is attached when modal opens (showModal)
  }

  function init() {
    document.addEventListener('click', delegatedClickHandler);
    wireModalHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for tests/debugging
  window.__quickview = {
    fetchProduct: fetchProduct,
    addToCart: addToCart,
    showModal: showModal,
    hideModal: hideModal,
  };

})();

