require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sosisbakar',
});

const products = [
  { category: 'menu-utama', name: 'Sosis Bakar Original', slug: 'sosis-bakar-original', description: 'Sosis bakar klasik dengan bumbu spesial.', price: 10000, old_price: 12000, variant: 'Pedas / Tidak Pedas' },
  { category: 'menu-utama', name: 'Sosis Bakar Keju', slug: 'sosis-bakar-keju', description: 'Sosis bakar dengan saus keju mozzarella melimpah.', price: 15000, old_price: null, variant: 'Keju Mozzarella' },
  { category: 'menu-utama', name: 'Sosis Bakar BBQ', slug: 'sosis-bakar-bbq', description: 'Sosis bakar dengan saus BBQ smoky.', price: 12000, old_price: null, variant: 'Saus BBQ' },
  { category: 'snack', name: 'Kentang Goreng', slug: 'kentang-goreng', description: 'Kentang goreng renyah pendamping sosis.', price: 10000, old_price: 15000, variant: 'Size M' },
  { category: 'snack', name: 'Mushroom Cheese Bites', slug: 'mushroom-cheese-bites', description: 'Camilan jamur crispy isi keju.', price: 18000, old_price: null, variant: null },
  { category: 'minuman', name: 'Es Teh Manis', slug: 'es-teh-manis', description: 'Segarnya teh manis dingin.', price: 5000, old_price: null, variant: null },
  { category: 'minuman', name: 'Es Jeruk', slug: 'es-jeruk', description: 'Jeruk peras segar.', price: 7000, old_price: null, variant: null },
  { category: 'paket', name: 'Paket Hemat Berdua', slug: 'paket-hemat-berdua', description: '2 sosis bakar original + 2 es teh manis.', price: 25000, old_price: 30000, variant: 'Untuk 2 Orang' },
  { category: 'paket', name: 'Paket Family', slug: 'paket-family', description: '4 sosis bakar pilihan + 2 kentang + 4 es teh.', price: 55000, old_price: 65000, variant: 'Untuk 4 Orang' },
];

const categories = [
  { name: 'Menu Utama', slug: 'menu-utama' },
  { name: 'Snack', slug: 'snack' },
  { name: 'Minuman', slug: 'minuman' },
  { name: 'Paket Hemat', slug: 'paket' },
];

async function seed() {
  try {
    await client.connect();

    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [c.name, c.slug]
      );
    }

    for (const p of products) {
      const catRes = await client.query(`SELECT id FROM categories WHERE slug = $1`, [p.category]);
      const categoryId = catRes.rowCount > 0 ? catRes.rows[0].id : null;
      await client.query(
        `INSERT INTO products (category_id, name, slug, description, price, old_price, variant)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           old_price = EXCLUDED.old_price,
           variant = EXCLUDED.variant`,
        [categoryId, p.name, p.slug, p.description, p.price, p.old_price, p.variant]
      );
    }

    const adminPass = bcrypt.hashSync('admin123', 10);
    await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin Sosis Bakar', 'admin@sosisbakar.net', '6281234567890', adminPass, 'admin']
    );

    console.log(`[DB] Seeded ${categories.length} categories, ${products.length} products, and admin user.`);
    console.log('[DB] Admin login: admin@sosisbakar.net / admin123');
    await client.end();
  } catch (err) {
    console.error('[DB] Seed error:', err.message);
    process.exit(1);
  }
}

seed();