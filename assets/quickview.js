// Minimal quickview runtime: delegated handlers to open a quickview modal,
// populate it from /products/<handle>.js and attempt an AJAX add-to-cart.
// Designed to be resilient for live preview and deterministic test fallback.
(function () {
  'use strict';



  function showModal(modal) {
    if (!modal) return;
    modal.style.display = '';
    modal.setAttribute('aria-hidden', 'false');
    // focus first actionable element
    const close = modal.querySelector('.quickview-close');
    if (close) close.focus();
  }

  function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
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

    // close on escape
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hideModal(modal);
    });
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
(function(root, factory){
  if(typeof module !== 'undefined' && module.exports){
    module.exports = factory();
  }
  if(typeof window !== 'undefined'){
    window.LiteStep = window.LiteStep || {};
    Object.assign(window.LiteStep, factory());
  }
})(this, function(){
  // quickview helpers (DOM-manipulating)
  function openModal(){
    const modal = document.getElementById('quickview-modal');
    if(!modal) return;
  modal.setAttribute('aria-hidden','false');
  // hide main content to assist screen readers when quickview is open
  const mains = document.querySelectorAll('#MainContent, main[role="main"], main');
  mains.forEach(m => m.setAttribute('aria-hidden', 'true'));
    modal.__previousActive = document.activeElement;
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(focusable) focusable.focus();
    document.addEventListener('focus', trapFocus, true);
    modal.__arrowHandler = function(e){
      const c = modal.__carousel;
      if(!c) return;
      if(e.key === 'ArrowLeft'){ e.preventDefault(); if(typeof c.prev === 'function') c.prev(); }
      if(e.key === 'ArrowRight'){ e.preventDefault(); if(typeof c.next === 'function') c.next(); }
    };
    document.addEventListener('keydown', modal.__arrowHandler);
  }

  function closeModal(){
    const modal = document.getElementById('quickview-modal');
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
  // restore main content to assistive tech
  const mains = document.querySelectorAll('#MainContent, main[role="main"], main');
  mains.forEach(m => m.removeAttribute('aria-hidden'));
    if(modal.__previousActive) modal.__previousActive.focus();
    document.removeEventListener('focus', trapFocus, true);
    if(modal && modal.__arrowHandler) document.removeEventListener('keydown', modal.__arrowHandler);
  }

  function trapFocus(e){
    const modal = document.getElementById('quickview-modal');
    if(!modal || modal.getAttribute('aria-hidden') === 'true') return;
    if(!modal.contains(e.target)){
      e.stopPropagation();
      const f = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(f) f.focus();
    }
  }

  function populateQuickview(product, handle){
    if(!product) return;
    const titleEl = document.getElementById('quickview-title'); if(titleEl) titleEl.textContent = product.title;
    const priceEl = document.getElementById('quickview-price'); if(priceEl) priceEl.textContent = (product.price/100).toFixed(2);
    const descEl = document.getElementById('quickview-description'); if(descEl) descEl.innerHTML = product.description || '';

    const media = document.getElementById('quickview-media');
    if(media) media.innerHTML = '';
    if(product.images && product.images.length){
      product.images.forEach(src=>{ const im = new Image(); im.src = src; });
      let index = 0;
      const showImage = (i)=>{
        if(!media) return;
        media.innerHTML = '';
        const img = document.createElement('img');
        img.src = product.images[i];
        img.alt = product.title + ' image ' + (i+1);
        img.loading = 'lazy';
        img.className = 'fade-in';
        media.appendChild(img);
        const thumbsEl = document.getElementById('quickview-thumbs');
        if(thumbsEl){
          Array.from(thumbsEl.children).forEach((b, idx)=>{
            if(idx === i){ b.setAttribute('aria-current','true'); b.classList.add('active-thumb'); }
            else { b.removeAttribute('aria-current'); b.classList.remove('active-thumb'); }
          });
        }
      };
      showImage(0);
      const prev = document.querySelector('.carousel-prev');
      const next = document.querySelector('.carousel-next');
      if(prev && next){
        prev.removeAttribute('aria-hidden'); next.removeAttribute('aria-hidden');
        prev.onclick = ()=>{ index = (index-1+product.images.length)%product.images.length; showImage(index); };
        next.onclick = ()=>{ index = (index+1)%product.images.length; showImage(index); };
      }
      const modal = document.getElementById('quickview-modal');
      if(modal){
        modal.__carousel = {
          next: ()=>{ index = (index+1)%product.images.length; showImage(index); },
          prev: ()=>{ index = (index-1+product.images.length)%product.images.length; showImage(index); },
          setIndex: (i)=>{ index = i % product.images.length; showImage(index); }
        };
        (function attachSwipe(){
          let startX = null; let moved = false;
          const mediaEl = document.getElementById('quickview-media');
          if(!mediaEl) return;
          const onStart = (ev)=>{ const t = ev.touches ? ev.touches[0] : ev; startX = t.clientX; moved = false; };
          const onMove = (ev)=>{ if(startX === null) return; const t = ev.touches ? ev.touches[0] : ev; const dx = t.clientX - startX; if(Math.abs(dx) > 10) moved = true; };
          const onEnd = (ev)=>{ if(!moved || startX === null) { startX = null; return; } const t = (ev.changedTouches && ev.changedTouches[0]) || ev; const dx = t.clientX - startX; if(Math.abs(dx) > 30){ if(dx < 0 && modal.__carousel && modal.__carousel.next) modal.__carousel.next(); if(dx > 0 && modal.__carousel && modal.__carousel.prev) modal.__carousel.prev(); } startX = null; moved = false; };
          mediaEl.addEventListener('touchstart', onStart, {passive:true});
          mediaEl.addEventListener('touchmove', onMove, {passive:true});
          mediaEl.addEventListener('touchend', onEnd);
          mediaEl.addEventListener('pointerdown', onStart);
          mediaEl.addEventListener('pointermove', onMove);
          mediaEl.addEventListener('pointerup', onEnd);
        })();
      }
      const thumbs = document.getElementById('quickview-thumbs');
      if(thumbs){
        thumbs.innerHTML = '';
        product.images.forEach((src, idx)=>{
          const btn = document.createElement('button');
          btn.type = 'button'; btn.setAttribute('role','listitem');
          btn.className = 'quickview-thumb';
          const im = document.createElement('img'); im.src = src; im.alt = product.title + ' thumbnail ' + (idx+1);
          btn.appendChild(im);
          btn.onclick = ()=>{ index = idx; showImage(index); };
          btn.onkeydown = (ev)=>{ if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); index = idx; showImage(index); } };
          thumbs.appendChild(btn);
        });
        thumbs.removeAttribute('aria-hidden');
      }
    }

    const variantsEl = document.getElementById('quickview-variants');
    if(variantsEl) variantsEl.innerHTML = '';
    if(product.variants && product.variants.length > 1){
      const select = document.createElement('select');
      select.id = 'quickview-variant-select';
      product.variants.forEach(v=>{
        const opt = document.createElement('option'); opt.value = v.id; opt.textContent = v.title + ' — ' + (v.price/100).toFixed(2); select.appendChild(opt);
      });
      variantsEl.appendChild(select);
    } else if(product.variants && product.variants.length === 1){
      const input = document.createElement('input'); input.type = 'hidden'; input.id = 'quickview-variant-select'; input.value = product.variants[0].id; variantsEl.appendChild(input);
    }

    const addBtn = document.getElementById('quickview-add');
    if(addBtn){ addBtn.dataset.handle = handle; try{ addBtn.dataset.product = JSON.stringify(product); }catch(e){ console.warn('Could not stringify product for dataset', e); } }
    openModal();
  }

  return {
    openModal,
    closeModal,
    populateQuickview,
    trapFocus
  };
});
