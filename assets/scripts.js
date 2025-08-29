document.addEventListener('DOMContentLoaded',function(){
  // Minimal JS: quickview and cart drawer handlers
  console.log('LiteStep theme loaded')

  function openModal(content){
    const modal = document.getElementById('quickview-modal');
    document.getElementById('quickview-content').innerHTML = content;
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
        openModal(`<h3>${product.title}</h3><p>${product.description}</p>`);
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
      const id = e.target.dataset.variantId;
      fetch('/cart/add.js', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: id, quantity:1})})
        .then(()=>alert('Added to cart'))
    }
  })
})
