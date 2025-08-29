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
