#!/bin/bash
# ============================================
# PRODUCTION: backend + Cloudflare tunnel + deploy URL
# Pakai: ./start-production.sh
# ============================================
set -e
cd "$(dirname "$0")"

echo "→ Memulai backend API di port 3000..."
bash server.sh restart

echo "→ Membuka Cloudflare Tunnel (quick tunnel)..."
cloudflared tunnel --url http://localhost:3000 > /tmp/cf-tunnel.log 2>&1 &
CF_PID=$!
echo "   tunnel pid: $CF_PID"

# Tunggu sampai URL tunnel muncul
URL=""
for i in $(seq 1 30); do
  sleep 2
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cf-tunnel.log | head -1)
  [ -n "$URL" ] && break
done

if [ -z "$URL" ]; then
  echo "❌ Tunnel URL tidak ditemukan. Cek /tmp/cf-tunnel.log"
  exit 1
fi

echo "✅ Tunnel aktif: $URL"

echo "→ Update URL backend di frontend..."
sed -i "s#const BACKEND_URL = .*#const BACKEND_URL = '$URL';#g" public/js/config.js
grep -rl "window.BACKEND_URL='" public/*.html | while read -r f; do
  sed -i "s#window.BACKEND_URL='[^']*'#window.BACKEND_URL='$URL'#g" "$f"
done

echo "→ Deploy ulang ke GitHub Pages..."
./deploy.sh

echo
echo "=============================================="
echo "✅ PRODUCTION ON AIR"
echo "   Situs : https://mrlowpr.github.io/sosisbakar/"
echo "   Backend: $URL"
echo "   Catatan: quick-tunnel URL berubah setiap restart."
echo "=============================================="
echo
echo "Menjaga tunnel tetap jalan (pid $CF_PID). Tekan Ctrl+C untuk berhenti."
wait $CF_PID