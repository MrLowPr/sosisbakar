#!/bin/bash
# ============================================
# Jalankan backend + Cloudflare Tunnel (production link)
# Pakai: ./start-production.sh
# ============================================
cd "$(dirname "$0")"

echo "→ Memulai backend API di port 3000..."
bash server.sh restart

echo "→ Membuka Cloudflare Tunnel..."
echo "   (tunnel URL akan tampil sebentar lagi)"
echo "   Setelah tunnel jalan, salin URL-nya ke variabel BACKEND_URL"
echo "   di GitHub repo Settings → Variables, lalu push ulang."
echo
cloudflared tunnel --url http://localhost:3000