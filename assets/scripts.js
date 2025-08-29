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
  }

  function closeModal(){
    const modal = document.getElementById('quickview-modal');
    modal.setAttribute('aria-hidden','true');
    // restore focus
    if(modal.__previousActive) modal.__previousActive.focus();
    document.removeEventListener('focus', trapFocus, true);
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
      };
      showImage(0);
      const prev = document.querySelector('.carousel-prev');
      const next = document.querySelector('.carousel-next');
      if(prev && next){
        prev.removeAttribute('aria-hidden'); next.removeAttribute('aria-hidden');
        prev.onclick = ()=>{ index = (index-1+product.images.length)%product.images.length; showImage(index); };
        next.onclick = ()=>{ index = (index+1)%product.images.length; showImage(index); };
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
