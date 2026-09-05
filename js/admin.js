// ============================================
// Admin Panel Logic
// ============================================

const STATUS_LABEL = { new: '🆕 Baru', processing: '👨‍🍳 Diproses', done: '✅ Selesai', cancelled: '❌ Dibatalkan' };
const PM_STATUS = { pending: '⏳ Belum Bayar', paid: '💳 Dibayar', confirmed: '✅ Dikonfirmasi' };

let adminOrders = [];
let adminProducts = [];
let adminCategories = [];
let editingOrder = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = getSession();
  if (!user || user.role !== 'admin') {
    showToast('Akses ditolak. Login sebagai admin.', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }
  document.getElementById('dashGreeting').textContent = 'Halo, ' + user.full_name + ' 👋';
  await Promise.all([loadStats(), loadOrders(), loadProducts(), loadCategories(), loadSettings()]);
});

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById('tab-' + tab).style.display = 'block';
  document.querySelectorAll('.side-link').forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
}

// ---------- Dashboard ----------
async function loadStats() {
  try {
    const s = await API.get('/admin/stats');
    document.getElementById('statCards').innerHTML = `
      <div class="stat-card"><div class="ic">📦</div><div class="val">${s.total_orders}</div><div class="lbl">Total Pesanan</div></div>
      <div class="stat-card"><div class="ic">💰</div><div class="val">${fmtRupiah(s.revenue)}</div><div class="lbl">Total Pendapatan</div></div>
      <div class="stat-card"><div class="ic" style="color:var(--accent);">🆕</div><div class="val">${s.pending_orders}</div><div class="lbl">Pesanan Baru</div></div>
      <div class="stat-card"><div class="ic">🌭</div><div class="val">${s.total_products}</div><div class="lbl">Produk</div></div>
      <div class="stat-card"><div class="ic">👥</div><div class="val">${s.total_users}</div><div class="lbl">Pengguna</div></div>`;
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadOrders() {
  try {
    const status = document.getElementById('orderFilter') ? document.getElementById('orderFilter').value : '';
    const res = await API.get('/admin/orders' + (status ? '?status=' + status : ''));
    adminOrders = res.orders;
    renderOrders();
    renderRecentOrders();
  } catch (err) { showToast(err.message, 'error'); }
}

function renderOrders() {
  const tbody = document.getElementById('ordersTable');
  if (!adminOrders.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">Tidak ada pesanan.</td></tr>'; return; }
  tbody.innerHTML = adminOrders.map(o => {
    const items = (Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]'));
    const first = items[0];
    const itemSummary = items.length === 1 ? `${first.quantity}x ${first.name}` : `${items.length} item`;
    return `
      <tr>
        <td><strong style="color:var(--primary);">${o.order_code}</strong><br><small style="color:var(--muted);">${new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small></td>
        <td>${o.customer_name}<br><small style="color:var(--muted);">${o.customer_phone}${o.user_email ? '<br>👤 ' + o.user_email : ''}</small></td>
        <td>${itemSummary}</td>
        <td><strong>${fmtRupiah(o.total)}</strong></td>
        <td>
          <select class="select-sm" onchange="updateOrderStatus('${o.order_code}', this.value)">
            ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${o.order_status === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td>
          <select class="select-sm" onchange="updatePaymentStatus('${o.order_code}', this.value)">
            ${Object.entries(PM_STATUS).map(([k, v]) => `<option value="${k}" ${o.payment_status === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-outline btn-sm" onclick='showOrderDetail(${JSON.stringify(o).replace(/'/g, "&#39;")})'>Detail</button></td>
      </tr>`;
  }).join('');
}

function renderRecentOrders() {
  const el = document.getElementById('dashRecentOrders');
  if (!adminOrders.length) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;">Belum ada pesanan.</div>'; return; }
  el.innerHTML = adminOrders.slice(0, 5).map(o => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:.88rem;flex-wrap:wrap;gap:6px;">
      <span><strong style="color:var(--primary);">${o.order_code}</strong> · ${o.customer_name}</span>
      <span><span class="track-status st-${o.order_status}">${STATUS_LABEL[o.order_status]}</span> <strong>${fmtRupiah(o.total)}</strong></span>
    </div>`).join('');
}

async function updateOrderStatus(code, status) {
  try { await API.patch('/admin/orders/' + code + '/status', { order_status: status }); showToast('Status diperbarui'); }
  catch (err) { showToast(err.message, 'error'); }
}
async function updatePaymentStatus(code, status) {
  try { await API.patch('/admin/orders/' + code + '/status', { payment_status: status }); showToast('Pembayaran diperbarui'); }
  catch (err) { showToast(err.message, 'error'); }
}

function showOrderDetail(o) {
  editingOrder = o;
  const items = (Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]'))
    .map(i => `<div class="track-item"><span>${i.quantity}x ${i.name}${i.note ? '<br><small style="color:var(--muted);">Catatan: ' + i.note + '</small>' : ''}</span><span>${fmtRupiah(i.price * i.quantity)}</span></div>`).join('');
  document.getElementById('orderDetailBody').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <strong style="color:var(--primary);font-size:1.1rem;">${o.order_code}</strong>
      <div>
        <span class="track-status st-${o.order_status}">${STATUS_LABEL[o.order_status]}</span>
        <span class="track-status st-${o.payment_status}">${PM_STATUS[o.payment_status]}</span>
      </div>
    </div>
    <div style="background:#f9f9fb;border-radius:10px;padding:14px;margin-bottom:14px;font-size:.9rem;">
      <strong>${o.customer_name}</strong><br>
      📞 ${o.customer_phone}${o.user_email ? '<br>📧 ' + o.user_email : ''}<br>
      📍 ${o.customer_address || '-'}
    </div>
    ${items}
    <div class="track-item"><span>Subtotal</span><span>${fmtRupiah(o.subtotal)}</span></div>
    <div class="track-item"><span>Ongkir</span><span>${o.shipping_cost === 0 ? 'Gratis' : fmtRupiah(o.shipping_cost)}</span></div>
    <div class="track-item" style="font-weight:800;color:var(--dark);border-bottom:none;"><span>Total</span><span>${fmtRupiah(o.total)}</span></div>
    ${o.notes ? `<div style="margin-top:12px;padding:10px;background:#fff3d6;border-radius:8px;font-size:.85rem;"><strong>Catatan:</strong> ${o.notes}</div>` : ''}
    ${o.payment_proof ? `<div style="margin-top:12px;text-align:center;"><a href="${o.payment_proof}" target="_blank" style="color:var(--primary);font-weight:700;">🖼️ Lihat Bukti Pembayaran</a></div>` : ''}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="btn btn-whatsapp" style="flex:1;" onclick="waCustomer('${o.customer_phone}', '${o.order_code}')">💬 WA Pelanggan</button>
    </div>`;
  document.getElementById('orderDetailModal').classList.add('show');
}
function closeOrderModal() { document.getElementById('orderDetailModal').classList.remove('show'); }

function waCustomer(phone, code) {
  const msg = `Halo! Ini admin SosisBakar.net terkait pesanan ${code}. Terima kasih sudah memesan 😊`;
  window.open(`https://wa.me/${phone.replace(/^\+/, '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------- Products ----------
async function loadProducts() {
  try {
    const res = await API.get('/admin/products');
    adminProducts = res.products;
    const catRes = await API.get('/admin/categories');
    adminCategories = catRes.categories;
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = adminProducts.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category_name || '-'}</td>
        <td><strong style="color:var(--primary);">${fmtRupiah(p.price)}</strong></td>
        <td>${p.old_price ? '<del style="color:var(--muted);">' + fmtRupiah(p.old_price) + '</del>' : '-'}</td>
        <td>${p.variant || '-'}</td>
        <td>${p.is_available ? '<span class="badge" style="background:#e2f9e9;color:#1f8a4c;">Tersedia</span>' : '<span class="badge" style="background:#fdecea;color:var(--primary);">Habis</span>'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
          <button class="btn btn-dark btn-sm" onclick="deleteProduct(${p.id}, '${p.name}')">Hapus</button>
        </td>
      </tr>`).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

function openProductModal(product) {
  const title = document.getElementById('productModalTitle');
  const catSelect = document.getElementById('p_category');
  catSelect.innerHTML = '<option value="">Tanpa kategori</option>' + adminCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (product) {
    title.textContent = '✏️ Edit Produk';
    document.getElementById('p_id').value = product.id;
    document.getElementById('p_name').value = product.name;
    document.getElementById('p_slug').value = product.slug;
    document.getElementById('p_category').value = product.category_id || '';
    document.getElementById('p_description').value = product.description || '';
    document.getElementById('p_price').value = product.price;
    document.getElementById('p_old_price').value = product.old_price || '';
    document.getElementById('p_variant').value = product.variant || '';
    document.getElementById('p_image_url').value = product.image_url || '';
    document.getElementById('p_available').checked = product.is_available;
  } else {
    title.textContent = '➕ Tambah Produk';
    ['p_id', 'p_slug', 'p_old_price', 'p_variant', 'p_image_url'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('p_name').value = '';
    document.getElementById('p_description').value = '';
    document.getElementById('p_price').value = '';
    document.getElementById('p_category').value = '';
    document.getElementById('p_available').checked = true;
  }
  document.getElementById('productModal').classList.add('show');
}
function closeProductModal() { document.getElementById('productModal').classList.remove('show'); }

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function saveProduct() {
  const id = document.getElementById('p_id').value;
  const name = document.getElementById('p_name').value.trim();
  const slug = document.getElementById('p_slug').value.trim() || slugify(name);
  const price = Number(document.getElementById('p_price').value);
  const body = {
    name, slug,
    description: document.getElementById('p_description').value.trim(),
    category_id: document.getElementById('p_category').value || null,
    price,
    old_price: document.getElementById('p_old_price').value ? Number(document.getElementById('p_old_price').value) : null,
    variant: document.getElementById('p_variant').value.trim(),
    image_url: document.getElementById('p_image_url').value.trim(),
    is_available: document.getElementById('p_available').checked,
  };
  if (!name) { showToast('Nama produk wajib diisi', 'error'); return; }
  if (!price || price < 0) { showToast('Harga tidak valid', 'error'); return; }
  try {
    if (id) await API.put('/admin/products/' + id, body);
    else await API.post('/admin/products', body);
    showToast(id ? 'Produk diperbarui' : 'Produk ditambahkan');
    closeProductModal();
    await loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteProduct(id, name) {
  if (!confirm(`Hapus produk "${name}"?`)) return;
  try {
    await API.del('/admin/products/' + id);
    showToast('Produk dihapus');
    await loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}

// ---------- Categories ----------
function openCategoryModal() { document.getElementById('categoryModal').classList.add('show'); }
function closeCategoryModal() { document.getElementById('categoryModal').classList.remove('show'); }

async function saveCategory() {
  const name = document.getElementById('cat_name').value.trim();
  const slug = document.getElementById('cat_slug').value.trim() || slugify(name);
  if (!name) { showToast('Nama kategori wajib diisi', 'error'); return; }
  try {
    await API.post('/admin/categories', { name, slug });
    showToast('Kategori ditambahkan');
    closeCategoryModal();
    document.getElementById('cat_name').value = '';
    document.getElementById('cat_slug').value = '';
    await loadProducts();
    renderCategories();
  } catch (err) { showToast(err.message, 'error'); }
}

async function renderCategories() {
  try {
    const res = await API.get('/admin/categories');
    adminCategories = res.categories;
    const tbody = document.getElementById('categoriesTable');
    tbody.innerHTML = adminCategories.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td style="color:var(--muted);">/ ${c.slug}</td>
        <td><button class="btn btn-dark btn-sm" onclick="deleteCategory(${c.id}, '${c.name}')">Hapus</button></td>
      </tr>`).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCategory(id, name) {
  if (!confirm(`Hapus kategori "${name}"? Produk di dalamnya tetap ada, hanya tidak terkategori.`)) return;
  try {
    await API.del('/admin/categories/' + id);
    showToast('Kategori dihapus');
    await Promise.all([renderCategories(), loadProducts()]);
  } catch (err) { showToast(err.message, 'error'); }
}

// ---------- Settings ----------
async function loadSettings() {
  try {
    const s = await API.get('/settings');
    document.getElementById('set_store_name').value = s.store_name || '';
    document.getElementById('set_tagline').value = s.tagline || '';
    document.getElementById('set_whatsapp_number').value = s.whatsapp_number || '';
    document.getElementById('set_qris_image').value = s.qris_image || '';
    document.getElementById('set_address').value = s.address || '';
    document.getElementById('set_instagram').value = s.instagram || '';
    document.getElementById('set_tiktok').value = s.tiktok || '';
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveSettings() {
  const body = {
    store_name: document.getElementById('set_store_name').value.trim(),
    tagline: document.getElementById('set_tagline').value.trim(),
    whatsapp_number: document.getElementById('set_whatsapp_number').value.trim(),
    qris_image: document.getElementById('set_qris_image').value.trim(),
    address: document.getElementById('set_address').value.trim(),
    instagram: document.getElementById('set_instagram').value.trim(),
    tiktok: document.getElementById('set_tiktok').value.trim(),
  };
  try { await API.put('/settings', body); showToast('Pengaturan tersimpan'); }
  catch (err) { showToast(err.message, 'error'); }
}

document.getElementById('qrisUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await API.request('/settings/upload', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({ data: reader.result }),
      });
      document.getElementById('set_qris_image').value = res.url;
      showToast('QRIS berhasil di-upload');
      e.target.value = '';
    } catch (err) { showToast(err.message, 'error'); }
  };
  reader.readAsDataURL(file);
});

// ---------- Admin Track ----------
function adminTrack() {
  const code = document.getElementById('adminTrackCode').value.trim();
  const el = document.getElementById('adminTrackResult');
  if (!code) return;
  const order = adminOrders.find(o => o.order_code === code);
  if (!order) { el.innerHTML = '<div style="color:var(--primary);padding:20px;text-align:center;">Order tidak ditemukan.</div>'; return; }
  showOrderDetail(order);
}

// ---------- Init tabs ----------
showTab('dashboard');