(function(root, factory){
  if(typeof module !== 'undefined' && module.exports){
    module.exports = factory();
  }
  if(typeof window !== 'undefined'){
    window.LiteStep = window.LiteStep || {};
    Object.assign(window.LiteStep, factory());
  }
})(this, function(){
  function renderCart(cart){
    const container = document.getElementById('cart-items');
    if(!container) return;
    if(!cart || !cart.items || cart.items.length===0){
      container.innerHTML = '<p>Your cart is empty</p>';
      const subtotalEl = document.getElementById('cart-subtotal'); if(subtotalEl) subtotalEl.textContent = '';
      const announcer = document.getElementById('cart-announcer'); if(announcer) announcer.textContent = 'Your cart is empty.';
      return;
    }
    container.innerHTML = '';
    cart.items.forEach(i=>{
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `<div class="cart-item-title">${i.product_title}</div><div class="cart-item-qty">${i.quantity}</div><div class="cart-item-price">${(i.line_price/100).toFixed(2)}</div>`;
      row.classList.add('cart-item-added');
      setTimeout(()=>row.classList.remove('cart-item-added'), 400);
      container.appendChild(row);
    });
    const subtotalEl = document.getElementById('cart-subtotal'); if(subtotalEl) subtotalEl.textContent = 'Subtotal: $' + (cart.total_price/100).toFixed(2);
    const announcer = document.getElementById('cart-announcer'); if(announcer) announcer.textContent = cart.items.length + ' items in cart. Subtotal ' + (cart.total_price/100).toFixed(2);
  }

  function refreshCartDrawer(){
    fetch('/cart.js').then(r=>r.json()).then(cart=>{ renderCart(cart); }).catch(err=>console.error(err));
  }

  function updateCartLine(key, quantity){
    fetch('/cart/change.js', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: key, quantity: quantity})})
      .then(r=>r.json())
      .then(cart=>{
        renderCart(cart);
        const pageContainer = document.getElementById('page-cart-items'); if(pageContainer) renderPageCart(cart);
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
    const pageSubtotal = document.getElementById('page-cart-subtotal'); if(pageSubtotal) pageSubtotal.textContent = 'Subtotal: $' + (cart.total_price/100).toFixed(2);
  }

  return { renderCart, refreshCartDrawer, updateCartLine, renderPageCart };
});
