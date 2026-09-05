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

1. Buat repo GitHub (mis. `sosisbakar` atau `<username>.github.io`).
2. Tambahkan remote:
   ```bash
   git remote add origin git@github.com:MrLowPr/sosisbakar.git
   ```
   *Ganti dengan username/repo Anda.*
3. Push:
   ```bash
   ./deploy.sh
   ```
4. Situs live di `https://<username>.github.io/<repo>/` (cek Settings → Pages, pilih source: **GitHub Actions**).

Setiap `git push` ke `main` otomatis memicu GitHub Actions → build `public/` → deploy ke Pages.

## Production: Hubungkan Website ke Backend Lokal

Backend komputer lokal tidak dapat diakses publik secara langsung. Solusi: Cloudflare Tunnel.

1. Jalankan semuanya:
   ```bash
   ./start-production.sh
   ```
   Ini menjalankan backend di port 3000 dan membuka tunnel. Akan muncul URL seperti `https://xxxx.trycloudflare.com`.

2. Set URL tunnel itu sebagai variabel `BACKEND_URL` di GitHub:
   - Repo → **Settings → Secrets and variables → Actions → Variables → New**
   - Name: `BACKEND_URL`, Value: `https://xxxx.trycloudflare.com`

3. Push lagi / jalankan workflow. HTML & config otomatis diisi URL tunnel tersebut.

> Catatan: URL quick-tunnel berubah tiap restart. Untuk URL permanen, gunakan named tunnel dengan domain Anda di Cloudflare (lihat `docs/tunnel-permanen.md`).

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