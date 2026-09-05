# 🌭 SosisBakar.net — Website Jualan Sosis Bakar

Online ordering platform: landing page + keranjang + checkout QRIS/WhatsApp + login/register + admin CMS.

## Stack

| Layer | Tech | Lokasi |
|-------|------|--------|
| Frontend | HTML/CSS/JS (statis) | `public/` → GitHub Pages |
| Backend | Node.js + Express | komputer lokal (port 3000) |
| Database | PostgreSQL 16 | komputer lokal (via DBeaver) |
| Tunnel | Cloudflare Tunnel | komputer lokal → URL publik |
| Auth | JWT + bcrypt | backend |

> Database **tetap di komputer lokal**. Backend di-expose lewat Cloudflare Tunnel agar bisa diakses website dari GitHub Pages.

## Fitur

- 🌭 Landing page + menu (di-load dari database)
- 🛒 Keranjang & checkout
- 📱 Pembayaran QRIS (scan QR / upload gambar QRIS via admin)
- 💬 Pembayaran WhatsApp (otomatis buka wa.me dengan rincian order)
- 👤 Register / Login (JWT)
- 🛡️ Admin panel: CRUD produk & kategori, kelola pesanan, ubah status, upload QRIS, pengaturan toko
- 📦 Lacak pesanan via kode (tanpa login)

## Cara Menjalankan (Local Development)

```bash
npm install
# .env sudah siap, sesuaikan DB_PASSWORD dengan password postgres Anda
npm run db:init     # buat database + schema
npm run db:seed     # seed produk + admin
npm start           # server: http://localhost:3000
```

Buka `http://localhost:3000` untuk landing page.

**Login Admin:** `admin@sosisbakar.net` / `admin123`

## Struktur

```
├── public/            # frontend (di-deploy ke GitHub Pages)
│   ├── index.html     # landing page
│   ├── login.html     # login
│   ├── register.html  # register
│   ├── admin.html     # admin CMS
│   ├── track.html     # lacak pesanan
│   ├── my-orders.html # riwayat pesanan user
│   └── js/ css/
├── server/            # Express API
│   ├── index.js
│   ├── routes/        # auth, products, orders, admin, settings
│   ├── config/db.js   # koneksi PostgreSQL (pool)
│   └── middleware/auth.js
├── database/
│   ├── schema.sql     # schema lengkap
│   ├── init.js        # buat db + apply schema
│   └── seed.js        # data awal
├── .github/workflows/deploy.yml  # auto-deploy ke Pages
├── server.sh          # start/stop/restart backend
├── start-production.sh          # backend + cloudflare tunnel
└── deploy.sh          # push ke GitHub
```

## Deploy ke GitHub Pages

1. Repo sudah dibuat: `https://github.com/MrLowPr/sosisbakar`
2. Remote sudah di-set. Setiap mau update situs tinggal:
   ```bash
   ./deploy.sh
   ```
3. Situs live di `https://mrlowpr.github.io/sosisbakar/` (branch `gh-pages`)

`deploy.sh` otomatis: sync kode ke `main`, lalu bangun `public/` → push ke `gh-pages`. Aman (pakai git worktree terisolasi, tidak menghapus file lokal).

> Alternatif auto-deploy via GitHub Actions: lihat `docs/deploy.yml.example` — butuh scope `workflow` pada token (`gh auth refresh -h github.com -s workflow`) lalu pindahkan ke `.github/workflows/`.

## Production: Hubungkan Website ke Backend Lokal

Backend komputer lokal tidak dapat diakses publik secara langsung. Solusi: Cloudflare Tunnel.

```bash
./start-production.sh
```

Script ini otomatis:
1. Menjalankan backend di port 3000.
2. Membuka Cloudflare Tunnel.
3. Mendeteksi URL tunnel (contoh `https://xxxx.trycloudflare.com`).
4. Meng-update `public/js/config.js` + semua HTML ke URL tersebut.
5. Menjalankan `./deploy.sh` → situs online.

> ⚠️ Quick-tunnel (trycloudflare.com) URL-nya berubah setiap restart. Untuk URL permanen, gunakan named tunnel + domain Anda di Cloudflare. Selama proses tunnel hidup, URL tetap sama.

## Database di DBeaver

Koneksi `postgres` sudah ada di DBeaver. Database: `sosisbakar`.
Tabel: `categories`, `products`, `users`, `orders`, `settings`.

## API (ringkas)

```
POST  /api/auth/register         daftar akun
POST  /api/auth/login            login → { token, user }
GET   /api/auth/me               profil (auth)
GET   /api/products              daftar produk + kategori
GET   /api/products/categories   daftar kategori
POST  /api/orders                buat pesanan
GET   /api/orders/track/:code    lacak pesanan
GET   /api/orders/my             pesanan user (auth)
PATCH /api/orders/:code/pay      konfirmasi bayar (auth)

# Admin (token admin):
GET    /api/admin/stats          dashboard summary
GET    /api/admin/orders         daftar semua pesanan
PATCH  /api/admin/orders/:code/status   ubah status
POST   /api/admin/products       tambah produk
PUT    /api/admin/products/:id   edit produk
DELETE /api/admin/products/:id   hapus produk
POST/GET /api/admin/categories   kelola kategori
GET/PUT /api/settings            pengaturan toko
POST   /api/settings/upload      upload gambar QRIS
```

## Keamanan

- Password di-hash dengan bcrypt.
- JWT expire 7 hari, server-only (tidak ada di GitHub).
- `.env` tidak di-commit (di `.gitignore`).
- Endpoint admin dilindungi `requireAuth` + `requireAdmin`.

---

Lisensi: MIT