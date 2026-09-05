#!/bin/bash
# ============================================
# Deploy ke GitHub Pages
# Prasyarat: repo sudah ada di GitHub, remote "origin" sudah di-set.
# Pakai: ./deploy.sh
# ============================================
set -e
cd "$(dirname "$0")"

echo "→ Memeriksa remote..."
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ Remote 'origin' belum ada. Jalankan:"
  echo "   git remote add origin git@github.com:USERNAME/REPO.git"
  exit 1
fi

echo "→ Pull terbaru (jika ada)..."
git pull origin main --rebase 2>/dev/null || true

echo "→ Push ke main (memicu GitHub Actions)..."
git add -A
git status
echo
read -p "Lanjut commit & push? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git commit -m "Update website" || { echo "Tidak ada perubahan."; exit 0; }
  git push origin main
  echo "✅ Terpush! Situs live di GitHub Pages + gh-pages branch."
else
  echo "Dibatalkan."
fi