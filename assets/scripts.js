document.addEventListener('DOMContentLoaded',function(){
  // Minimal JS: quickview and cart drawer handlers
  console.log('LiteStep theme loaded')

  function openModal(){
    const modal = document.getElementById('quickview-modal');
    modal.setAttribute('aria-hidden','false');
  }

  function closeModal(){
    const modal = document.getElementById('quickview-modal');
    modal.setAttribute('aria-hidden','true');
  }

  document.body.addEventListener('click',function(e){
    if(e.target.matches('.quickview-button')){
      const handle = e.target.dataset.handle;
      fetch(`/products/${handle}.js`).then(r=>r.json()).then(product=>{
        // populate modal fields
        document.getElementById('quickview-title').textContent = product.title;
        document.getElementById('quickview-price').textContent = (product.price/100).toFixed(2);
        document.getElementById('quickview-description').innerHTML = product.description;

        // media
        const media = document.getElementById('quickview-media');
        media.innerHTML = '';
        if(product.images && product.images.length){
          const img = document.createElement('img');
          img.src = product.images[0];
          img.alt = product.title;
          img.width = 600; img.height = 400; img.loading = 'eager';
          media.appendChild(img);
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
        addBtn.dataset.handle = handle;
        addBtn.dataset.product = JSON.stringify(product);

        openModal();
      }).catch(err=>{
        console.error(err);
        alert('Could not load product');
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
  })

  function renderCart(cart){
    const container = document.getElementById('cart-items');
    if(!container) return;
    if(!cart || !cart.items || cart.items.length===0){
      container.innerHTML = '<p>Your cart is empty</p>';
      document.getElementById('cart-subtotal').textContent = '';
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
  }

  function refreshCartDrawer(){
    fetch('/cart.js').then(r=>r.json()).then(cart=>{
      renderCart(cart);
    }).catch(err=>console.error(err));
  }

  // initial cart render
  refreshCartDrawer();
})
