const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

router.post('/upload', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'Data gambar tidak ada' });
    const match = data.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Format gambar tidak valid (png/jpeg/webp base64)' });
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const filename = `qris_${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
    res.status(201).json({ url: `/uploads/${filename}` });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['store_name', 'tagline', 'whatsapp_number', 'qris_image', 'qris_merchant_id', 'address', 'instagram', 'tiktok'];
    for (const key of Object.keys(req.body)) {
      if (!allowed.includes(key)) continue;
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(req.body[key])]
      );
    }
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;