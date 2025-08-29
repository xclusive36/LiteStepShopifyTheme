document.addEventListener('DOMContentLoaded',function(){
  // Minimal JS: quickview and cart drawer handlers
  console.log('LiteStep theme loaded')

  function openModal(){
    const modal = document.getElementById('quickview-modal');
    modal.setAttribute('aria-hidden','false');
  // focus management: save active element and move focus into modal
  modal.__previousActive = document.activeElement;
  const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(focusable) focusable.focus();
  // trap focus
  document.addEventListener('focus', trapFocus, true);
  // add keyboard left/right handlers for carousel navigation
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
    modal.setAttribute('aria-hidden','true');
    // restore focus
    if(modal.__previousActive) modal.__previousActive.focus();
    document.removeEventListener('focus', trapFocus, true);
  // remove arrow key handler if present
  if(modal && modal.__arrowHandler) document.removeEventListener('keydown', modal.__arrowHandler);
  }

  function trapFocus(e){
    const modal = document.getElementById('quickview-modal');
    if(!modal || modal.getAttribute('aria-hidden') === 'true') return;
    if(!modal.contains(e.target)){
      e.stopPropagation();
      modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').focus();
    }
  }

  // helper to populate quickview modal from a product object
  function populateQuickview(product, handle){
    // populate modal fields
    document.getElementById('quickview-title').textContent = product.title;
    document.getElementById('quickview-price').textContent = (product.price/100).toFixed(2);
    document.getElementById('quickview-description').innerHTML = product.description || '';

    // media
    const media = document.getElementById('quickview-media');
    media.innerHTML = '';
      if(product.images && product.images.length){
  // preload images for smoother carousel
      product.images.forEach(src=>{ const im = new Image(); im.src = src; });
      let index = 0;
      const showImage = (i)=>{
        media.innerHTML = '';
        const img = document.createElement('img');
        img.src = product.images[i];
        img.alt = product.title + ' image ' + (i+1);
        img.loading = 'lazy';
        img.className = 'fade-in';
        media.appendChild(img);
        // mark active thumbnail
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
      // expose carousel controls on the modal for keyboard handler
      const modal = document.getElementById('quickview-modal');
      if(modal){
        modal.__carousel = {
          next: ()=>{ index = (index+1)%product.images.length; showImage(index); },
          prev: ()=>{ index = (index-1+product.images.length)%product.images.length; showImage(index); },
          setIndex: (i)=>{ index = i % product.images.length; showImage(index); }
        };
        // add touch/swipe support scoped to this modal
        (function attachSwipe(){
          let startX = null; let moved = false;
          const mediaEl = document.getElementById('quickview-media');
          if(!mediaEl) return;
          const onStart = (ev)=>{
            const t = ev.touches ? ev.touches[0] : ev;
            startX = t.clientX; moved = false;
          };
          const onMove = (ev)=>{
            if(startX === null) return;
            const t = ev.touches ? ev.touches[0] : ev;
            const dx = t.clientX - startX;
            if(Math.abs(dx) > 10) moved = true;
          };
          const onEnd = (ev)=>{
            if(!moved || startX === null) { startX = null; return; }
            const t = (ev.changedTouches && ev.changedTouches[0]) || ev;
            const dx = t.clientX - startX;
            if(Math.abs(dx) > 30){
              if(dx < 0 && modal.__carousel && modal.__carousel.next) modal.__carousel.next();
              if(dx > 0 && modal.__carousel && modal.__carousel.prev) modal.__carousel.prev();
            }
            startX = null; moved = false;
          };
          mediaEl.addEventListener('touchstart', onStart, {passive:true});
          mediaEl.addEventListener('touchmove', onMove, {passive:true});
          mediaEl.addEventListener('touchend', onEnd);
          // pointer events fallback
          mediaEl.addEventListener('pointerdown', onStart);
          mediaEl.addEventListener('pointermove', onMove);
          mediaEl.addEventListener('pointerup', onEnd);
        })();
      }
      // render thumbnails
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
          // keyboard accessibility for thumbnails
          btn.onkeydown = (ev)=>{ if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); index = idx; showImage(index); } };
          thumbs.appendChild(btn);
        });
        thumbs.removeAttribute('aria-hidden');
      }
    }

    // variants
    const variantsEl = document.getElementById('quickview-variants');
    variantsEl.innerHTML = '';
    if(product.variants && product.variants.length > 1){
      const select = document.createElement('select');
      select.id = 'quickview-variant-select';
      product.variants.forEach(v=>{
        const opt = document.createElement('option');
        opt.value = v.id; opt.textContent = v.title + ' — ' + (v.price/100).toFixed(2);
        select.appendChild(opt);
      });
      variantsEl.appendChild(select);
    } else if(product.variants && product.variants.length === 1){
      // single variant
      const input = document.createElement('input');
      input.type = 'hidden'; input.id = 'quickview-variant-select'; input.value = product.variants[0].id;
      variantsEl.appendChild(input);
    }

    // set add button data
    const addBtn = document.getElementById('quickview-add');
    if(addBtn){
      addBtn.dataset.handle = handle;
      try{ addBtn.dataset.product = JSON.stringify(product); }catch(e){ console.warn('Could not stringify product for dataset', e); }
    }

    openModal();
  }

  document.body.addEventListener('click',function(e){
    if(e.target.matches('.quickview-button')){
      const handle = e.target.dataset.handle;
      // Try fetching real product JSON, otherwise fallback to demo JSON in assets
      fetch(`/products/${handle}.js`).then(r=>{
        if(!r.ok) throw new Error('Product fetch failed');
        return r.json();
      }).then(product=>{
        populateQuickview(product, handle);
      }).catch(err=>{
        // fallback to demo products bundled with the theme for preview
        fetch('/assets/demo-products.json').then(r=>r.json()).then(j=>{
          const prod = (j && j.products) ? j.products.find(p=>p.handle === handle) : null;
          if(prod) populateQuickview(prod, handle);
          else { console.error(err); alert('Could not load product'); }
        }).catch(e=>{ console.error(e); alert('Could not load product'); });
      });
    }
    if(e.target.matches('.modal-close')) closeModal();
    if(e.target.matches('.cart-link')){
      const drawer = document.getElementById('cart-drawer');
      drawer.setAttribute('aria-hidden','false');
    }
    if(e.target.matches('.cart-close')){
      const drawer = document.getElementById('cart-drawer');
      drawer.setAttribute('aria-hidden','true');
    }
    if(e.target.matches('.add-to-cart-button')){
      // handle from quickview or product buttons
      const btn = e.target;
      const variantSelect = document.getElementById('quickview-variant-select');
      const variantId = variantSelect ? variantSelect.value : btn.dataset.variantId;
      if(!variantId){ alert('Please select a variant'); return; }

      fetch('/cart/add.js', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: parseInt(variantId,10), quantity:1})})
        .then(r=>r.json())
  .then(()=>{
          // refresh cart drawer
          refreshCartDrawer();
          // announce
          btn.setAttribute('aria-disabled','true');
          setTimeout(()=>btn.removeAttribute('aria-disabled'),1000);
        })
        .catch(err=>{ console.error(err); alert('Could not add to cart'); });
    }
    // quantity change buttons
    if(e.target.matches('.qty-increase') || e.target.matches('.qty-decrease')){
      const id = e.target.dataset.key;
      const change = e.target.matches('.qty-increase') ? 1 : -1;
      // find current qty from DOM
      const row = e.target.closest('.cart-item');
      const qtyEl = row.querySelector('.cart-item-qty-value');
      const current = parseInt(qtyEl.textContent,10) || 1;
      const newQty = Math.max(0, current + change);
      updateCartLine(id, newQty);
    }
    if(e.target.matches('.remove-button')){
      const id = e.target.dataset.key;
      updateCartLine(id, 0);
    }
  })

  // keyboard handling: Escape to close modal/drawer
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      const modal = document.getElementById('quickview-modal');
      const drawer = document.getElementById('cart-drawer');
      if(modal && modal.getAttribute('aria-hidden') === 'false') closeModal();
      if(drawer && drawer.getAttribute('aria-hidden') === 'false') drawer.setAttribute('aria-hidden','true');
    }
  });

  function renderCart(cart){
    const container = document.getElementById('cart-items');
    if(!container) return;
    if(!cart || !cart.items || cart.items.length===0){
      container.innerHTML = '<p>Your cart is empty</p>';
      document.getElementById('cart-subtotal').textContent = '';
  const announcer = document.getElementById('cart-announcer'); if(announcer) announcer.textContent = 'Your cart is empty.';
      return;
    }
    container.innerHTML = '';
    cart.items.forEach(i=>{
      const row = document.createElement('div');
      row.className = 'cart-item';
    row.innerHTML = `<div class="cart-item-title">${i.product_title}</div><div class="cart-item-qty">${i.quantity}</div><div class="cart-item-price">${(i.line_price/100).toFixed(2)}</div>`;
    // add small highlight animation for recently added items
    row.classList.add('cart-item-added');
    setTimeout(()=>row.classList.remove('cart-item-added'), 400);
      container.appendChild(row);
    });
    document.getElementById('cart-subtotal').textContent = 'Subtotal: $' + (cart.total_price/100).toFixed(2);
  const announcer = document.getElementById('cart-announcer'); if(announcer) announcer.textContent = cart.items.length + ' items in cart. Subtotal ' + (cart.total_price/100).toFixed(2);
  }

  function refreshCartDrawer(){
    fetch('/cart.js').then(r=>r.json()).then(cart=>{
      renderCart(cart);
    }).catch(err=>console.error(err));
  }

  function updateCartLine(key, quantity){
    fetch('/cart/change.js', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: key, quantity: quantity})})
      .then(r=>r.json())
      .then(cart=>{
        renderCart(cart);
        // also update page cart if present
        const pageContainer = document.getElementById('page-cart-items');
        if(pageContainer) renderPageCart(cart);
      }).catch(err=>console.error(err));
  }

  function renderPageCart(cart){
    const container = document.getElementById('page-cart-items');
    if(!container) return;
    container.innerHTML = '';
    cart.items.forEach(i=>{
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `<div class="cart-item-title">${i.product_title}</div>
        <div class="cart-item-qty">
          <button class="qty-button qty-decrease" data-key="${i.key}">-</button>
          <div class="cart-item-qty-value">${i.quantity}</div>
          <button class="qty-button qty-increase" data-key="${i.key}">+</button>
        </div>
        <div class="cart-item-price">${(i.line_price/100).toFixed(2)}</div>
        <button class="remove-button" data-key="${i.key}">Remove</button>`;
      container.appendChild(row);
    });
    document.getElementById('page-cart-subtotal').textContent = 'Subtotal: $' + (cart.total_price/100).toFixed(2);
  }

  // initial cart render
  refreshCartDrawer();
})
