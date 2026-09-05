const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../middleware/auth');
const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{8,20}$/;

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || full_name.trim().length < 2) return res.status(400).json({ error: 'Nama lengkap minimal 2 karakter' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email tidak valid' });
    if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: 'Nomor telepon tidak valid' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'Email sudah terdaftar' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, full_name, email, phone, role`,
      [full_name.trim(), email.toLowerCase(), phone.trim(), passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const result = await pool.query(
      'SELECT id, full_name, email, phone, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rowCount === 0) return res.status(401).json({ error: 'Email atau password salah' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email atau password salah' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    next(err);
  }
});

const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;