const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/products', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
    `);
    res.json({ products: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const { name, slug, description, price, old_price, category_id, is_available, image_url, variant } = req.body;
    if (!name || !slug || price === undefined) {
      return res.status(400).json({ error: 'name, slug, dan price wajib diisi' });
    }
    const result = await pool.query(
      `INSERT INTO products (category_id, name, slug, description, price, old_price, is_available, image_url, variant)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         category_id = EXCLUDED.category_id, name = EXCLUDED.name,
         description = EXCLUDED.description, price = EXCLUDED.price,
         old_price = EXCLUDED.old_price, is_available = EXCLUDED.is_available,
         image_url = EXCLUDED.image_url, variant = EXCLUDED.variant,
         updated_at = NOW()
       RETURNING *`,
      [category_id || null, name, slug, description || null, Number(price), old_price ? Number(old_price) : null, is_available !== false, image_url || null, variant || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    const { name, slug, description, price, old_price, category_id, is_available, image_url, variant } = req.body;
    const result = await pool.query(
      `UPDATE products SET
         category_id = COALESCE($2, category_id),
         name = COALESCE($3, name),
         slug = COALESCE($4, slug),
         description = COALESCE($5, description),
         price = COALESCE($6, price),
         old_price = COALESCE($7, old_price),
         is_available = COALESCE($8, is_available),
         image_url = COALESCE($9, image_url),
         variant = COALESCE($10, variant),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, category_id, name, slug, description, price, old_price, is_available, image_url, variant]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const { status } = req.query;
    let queryText = `
      SELECT o.*, u.email AS user_email
      FROM orders o LEFT JOIN users u ON u.id = o.user_id
    `;
    const params = [];
    if (status) {
      queryText += ` WHERE o.order_status = $1`;
      params.push(status);
    }
    queryText += ` ORDER BY o.created_at DESC`;
    const result = await pool.query(queryText, params);
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:orderCode/status', async (req, res, next) => {
  try {
    const { order_status, payment_status } = req.body;
    const updates = [];
    const params = [req.params.orderCode];
    let idx = 2;
    if (order_status && ['new', 'processing', 'done', 'cancelled'].includes(order_status)) {
      updates.push(`order_status = $${idx++}`);
      params.push(order_status);
    }
    if (payment_status && ['pending', 'paid', 'confirmed'].includes(payment_status)) {
      updates.push(`payment_status = $${idx++}`);
      params.push(payment_status);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada status yang valid' });
    updates.push(`updated_at = NOW()`);
    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE order_code = $1 RETURNING *`,
      params
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name dan slug wajib diisi' });
    const result = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
      [name, slug]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const orders = await pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::int AS revenue FROM orders`);
    const pending = await pool.query(`SELECT COUNT(*)::int AS count FROM orders WHERE order_status = 'new'`);
    const products = await pool.query(`SELECT COUNT(*)::int AS count FROM products`);
    const users = await pool.query(`SELECT COUNT(*)::int AS count FROM users`);
    res.json({
      total_orders: orders.rows[0].count,
      revenue: orders.rows[0].revenue,
      pending_orders: pending.rows[0].count,
      total_products: products.rows[0].count,
      total_users: users.rows[0].count,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;