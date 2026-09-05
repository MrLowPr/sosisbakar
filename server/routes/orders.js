const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const PHONE_RE = /^[0-9+\-\s]{8,20}$/;

function generateOrderCode() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${ymd}${rand}`;
}

router.post('/', async (req, res, next) => {
  try {
    const {
      user_id, customer_name, customer_phone, customer_address,
      items, payment_method = 'qris', notes,
    } = req.body;

    if (!customer_name || customer_name.trim().length < 2) {
      return res.status(400).json({ error: 'Nama pemesan wajib diisi' });
    }
    if (!customer_phone || !PHONE_RE.test(customer_phone)) {
      return res.status(400).json({ error: 'Nomor telepon tidak valid' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Pesanan kosong' });
    }
    if (!['qris', 'whatsapp'].includes(payment_method)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid' });
    }

    let subtotal = 0;
    const validatedItems = [];
    for (const item of items) {
      const prod = await pool.query('SELECT id, name, price, is_available FROM products WHERE id = $1', [item.product_id]);
      if (prod.rowCount === 0) return res.status(400).json({ error: `Produk ID ${item.product_id} tidak ditemukan` });
      if (!prod.rows[0].is_available) return res.status(400).json({ error: `Produk ${prod.rows[0].name} sedang tidak tersedia` });
      const qty = Math.max(1, Number(item.quantity) || 1);
      subtotal += prod.rows[0].price * qty;
      validatedItems.push({
        product_id: prod.rows[0].id,
        name: prod.rows[0].name,
        price: prod.rows[0].price,
        quantity: qty,
        note: item.note || '',
      });
    }

    let orderCode = generateOrderCode();
    let dup = true;
    while (dup) {
      const check = await pool.query('SELECT 1 FROM orders WHERE order_code = $1', [orderCode]);
      dup = check.rowCount > 0;
      if (dup) orderCode = generateOrderCode();
    }

    const shippingCost = subtotal >= 50000 ? 0 : 5000;
    const total = subtotal + shippingCost;

    const result = await pool.query(
      `INSERT INTO orders
        (order_code, user_id, customer_name, customer_phone, customer_address,
         items, subtotal, shipping_cost, total, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        orderCode,
        user_id || null,
        customer_name.trim(),
        customer_phone.trim(),
        customer_address ? customer_address.trim() : null,
        JSON.stringify(validatedItems),
        subtotal,
        shippingCost,
        total,
        payment_method,
        notes ? notes.trim() : null,
      ]
    );

    res.status(201).json({ order: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/track/:orderCode', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, order_code, customer_name, customer_phone, items, subtotal,
              shipping_cost, total, payment_method, payment_status, order_status,
              notes, created_at
       FROM orders WHERE order_code = $1`,
      [req.params.orderCode]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, order_code, items, total, payment_method, payment_status,
              order_status, created_at
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/:orderCode/pay', requireAuth, async (req, res, next) => {
  try {
    const { payment_proof } = req.body;
    const result = await pool.query(
      `UPDATE orders
         SET payment_status = 'paid',
             payment_proof = COALESCE($2, payment_proof),
             updated_at = NOW()
       WHERE order_code = $1 AND user_id = $3
       RETURNING *`,
      [req.params.orderCode, payment_proof || null, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:orderCode', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM orders WHERE order_code = $1 AND user_id = $2`,
      [req.params.orderCode, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;