// ============================================
// Landing Page Logic
// ============================================

const EMOJI = ['🌭', '🍢', '🧀', '🍖', '🥔', '🍟', '🧋', '🥤', '🍹', '🍡', '🍢', '🥩'];

let categories = [];
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

document.getElementById('year').textContent = new Date().getFullYear();
renderNavAuth();
renderCartCount();

// ---------- Auth navbar ----------
function renderNavAuth() {
  const user = getSession();
  const el = document.getElementById('navAuth');
  if (user) {
    el.textContent = '👤 ' + (user.full_name || user.email).split(' ')[0];
    el.href = 'admin.html';
    if (user.role === 'admin') el.href = 'admin.html';
    else el.href = 'my-orders.html';
    el.classList.add('btn-primary');
    el.classList.remove('btn-outline');
  }
}

// ---------- Menu ----------
async function loadMenu() {
  try {
    const [prodRes, catRes] = await Promise.all([
      API.get('/products'),
      API.get('/products/categories'),
    ]);
    products = prodRes.products;
    categories = catRes.categories;

    const filter = document.getElementById('menuFilter');
    filter.innerHTML = '<button class="filter-btn active" data-cat="all">Semua</button>' +
      categories.map(c => `<button class="filter-btn" data-cat="${c.slug}">${c.name}</button>`).join('');
    filter.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMenu(btn.dataset.cat);
      });
    });
    renderMenu('all');
  } catch (err) {
    document.getElementById('menuGrid').innerHTML =
      `<div style="text-align:center;grid-column:1/-1;color:var(--primary);padding:40px;">
        Gagal memuat menu: ${err.message}<br>
        <small>Pastikan backend server berjalan, lalu refresh halaman.</small>
      </div>`;
  }
}

function renderMenu(cat = 'all') {
  const grid = document.getElementById('menuGrid');
  const list = products.filter(p => cat === 'all' || p.category_slug === cat);
  if (list.length === 0) {
    grid.innerHTML = `<div style="text-align:center;grid-column:1/-1;color:var(--muted);padding:40px;">Menu kosong.</div>`;
    return;
  }
  grid.innerHTML = list.map((p, i) => {
    const inCart = cart.find(c => c.product_id === p.id);
    return `
      <div class="menu-card ${!p.is_available ? 'unavailable' : ''}">
        <div class="menu-card-img">${EMOJI[(p.id % EMOJI.length)]}</div>
        <div class="menu-card-body">
          <div class="menu-cat">${p.category_name || 'Menu'}</div>
          <div class="menu-name">${p.name}</div>
          ${p.variant ? `<div class="menu-variant">🍴 ${p.variant}</div>` : ''}
          <div class="menu-desc">${p.description || ''}</div>
          <div class="menu-price-row">
            <div class="price">
              ${p.old_price ? `<span class="old">${fmtRupiah(p.old_price)}</span>` : ''}
              ${fmtRupiah(p.price)}
            </div>
            <button class="btn-add" onclick="addToCart(${p.id})" ${!p.is_available ? 'disabled' : ''} aria-label="Tambah">+</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ---------- Cart ----------
function addToCart(productId, qty = 1) {
  const p = products.find(x => x.id === productId);
  if (!p || !p.is_available) return;
  const existing = cart.find(c => c.product_id === productId);
  if (existing) existing.quantity += qty;
  else cart.push({ product_id: productId, quantity: qty });
  saveCart();
  renderCartCount();
  showToast(`✓ ${p.name} ditambahkan`);
}

function changeQty(productId, delta) {
  const item = cart.find(c => c.product_id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(c => c.product_id !== productId);
  saveCart();
  renderCartCount();
  renderCart();
}

function setCartNote(productId, note) {
  const item = cart.find(c => c.product_id === productId);
  if (item) { item.note = note; saveCart(); }
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  renderCartCount();
}

function renderCartCount() {
  const count = cart.reduce((s, c) => s + c.quantity, 0);
  document.getElementById('cartCount').textContent = count;
}

function cartTotal() {
  return cart.reduce((s, c) => {
    const p = products.find(x => x.id === c.product_id);
    return s + (p ? p.price * c.quantity : 0);
  }, 0);
}

function renderCart() {
  const body = document.getElementById('cartItems');
  if (cart.length === 0) {
    body.innerHTML = `<div class="cart-empty"><div class="big">🛒</div>Keranjang masih kosong.<br>Yuk pilih menu dulu!</div>`;
  } else {
    body.innerHTML = cart.map((c, i) => {
      const p = products.find(x => x.id === c.product_id);
      if (!p) return '';
      return `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-price">${fmtRupiah(p.price)}</div>
            <div class="qty-ctrl">
              <button class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
              <span style="font-weight:700;min-width:22px;text-align:center;">${c.quantity}</span>
              <button class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
            </div>
            <input class="cart-item-note" placeholder="Catatan (level pedas, dsb)" value="${(c.note || '').replace(/"/g, '&quot;')}" onchange="setCartNote(${p.id}, this.value)">
          </div>
        </div>`;
    }).join('');
  }
  document.getElementById('cartTotal').textContent = fmtRupiah(cartTotal());
}

function openCart() {
  renderCart();
  document.getElementById('cartDrawer').classList.add('show');
  document.getElementById('drawerOverlay').classList.add('show');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('show');
  document.getElementById('drawerOverlay').classList.remove('show');
}

// ---------- Checkout ----------
let selectedPay = 'qris';
let currentOrder = null;

function openCheckout() {
  if (cart.length === 0) { showToast('Keranjang kosong!', 'warn'); return; }
  const user = getSession();
  const subtotal = cartTotal();
  const shipping = subtotal >= 50000 ? 0 : 5000;
  document.getElementById('coSubtotal').textContent = fmtRupiah(subtotal);
  document.getElementById('coShipping').textContent = shipping === 0 ? 'Gratis' : fmtRupiah(shipping);
  document.getElementById('coTotal').textContent = fmtRupiah(subtotal + shipping);
  if (user) {
    if (!document.getElementById('coName').value) document.getElementById('coName').value = user.full_name || '';
    if (!document.getElementById('coPhone').value) document.getElementById('coPhone').value = user.phone || '';
  }
  document.getElementById('checkoutOverlay').classList.add('show');
  closeCart();
}
function closeCheckout() { document.getElementById('checkoutOverlay').classList.remove('show'); }

function selectPay(method) {
  selectedPay = method;
  document.querySelectorAll('.pay-method').forEach(m => m.classList.toggle('selected', m.dataset.pay === method));
}

async function submitOrder() {
  const name = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const address = document.getElementById('coAddress').value.trim();
  const notes = document.getElementById('coNotes').value.trim();
  const user = getSession();

  if (!name || name.length < 2) { showToast('Nama lengkap wajib diisi', 'error'); return; }
  if (!phone || phone.replace(/\D/g, '').length < 8) { showToast('No. WhatsApp tidak valid', 'error'); return; }

  const btn = document.getElementById('coSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  try {
    const items = cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, note: c.note || '' }));
    const res = await API.post('/orders', {
      user_id: user ? user.id : null,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      items,
      payment_method: selectedPay,
      notes,
    });
    currentOrder = res.order;
    localStorage.removeItem('cart');
    cart = [];
    renderCartCount();
    closeCheckout();

    if (selectedPay === 'qris') openQrisPayment(currentOrder);
    else openWhatsAppPayment(currentOrder);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buat Pesanan';
  }
}

// ---------- QRIS ----------
function openQrisPayment(order) {
  document.getElementById('qrisOrderCode').textContent = 'Kode Pesanan: ' + order.order_code;
  document.getElementById('qrisTotal').textContent = fmtRupiah(order.total);
  const img = document.getElementById('qrisImage');
  const fb = document.getElementById('qrisFallback');
  const wa = document.getElementById('qrisWaBtn');
  wa.dataset.orderCode = order.order_code;

  API.get('/settings').then(s => {
    if (s.qris_image) {
      img.src = s.qris_image.startsWith('http') ? s.qris_image : BACKEND_URL + s.qris_image;
      img.style.display = 'block';
      fb.style.display = 'none';
    }
  }).catch(() => {});

  document.getElementById('qrisOverlay').classList.add('show');
}
function closeQris() { document.getElementById('qrisOverlay').classList.remove('show'); }

function qrisSendProof() {
  const order = currentOrder;
  if (!order) return;
  const items = (Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]'))
    .map(i => `• ${i.quantity}x ${i.name} = Rp ${(i.price * i.quantity).toLocaleString('id-ID')}`)
    .join('%0A');
  const msg = `Halo Admin SosisBakar.net!%0A%0A` +
    `Saya sudah melakukan pembayaran QRIS.%0A` +
    `*Kode Pesanan:* ${order.order_code}%0A` +
    `*Total Bayar:* Rp ${order.total.toLocaleString('id-ID')}%0A%0A` +
    `*Detail Pesanan:*%0A${items}%0A%0A` +
    `Nama: ${order.customer_name}%0A` +
    `No. WA: ${order.customer_phone}%0A` +
    `Alamat: ${order.customer_address || '-'}%0A%0A` +
    `Mohon dikonfirmasi ya. Terima kasih! 🙏`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

// ---------- WhatsApp ----------
function openWhatsAppPayment(order) {
  const items = order.items.map(i => `• ${i.quantity}x ${i.name} = Rp ${(i.price * i.quantity).toLocaleString('id-ID')}`).join('%0A');
  const msg = `Halo Admin SosisBakar.net!%0A%0A` +
    `Saya ingin memesan:%0A${items}%0A%0A` +
    `*Kode Pesanan:* ${order.order_code}%0A` +
    `*Total:* Rp ${order.total.toLocaleString('id-ID')}%0A%0A` +
    `Nama: ${order.customer_name}%0A` +
    `No. WA: ${order.customer_phone}%0A` +
    `Alamat: ${order.customer_address || '-'}%0A%0A` +
    `Mohon konfirmasi dan info pembayaran ya. Terima kasih!`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

// ---------- Nav ----------
function toggleMenu() { document.getElementById('navLinks').classList.toggle('open'); }

// ---------- Init ----------
loadMenu();