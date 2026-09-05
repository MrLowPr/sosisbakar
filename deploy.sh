#!/bin/bash
# ============================================
# Deploy situs ke GitHub Pages (branch gh-pages)
# Pakai: ./deploy.sh
# ============================================
set -e
cd "$(dirname "$0")"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ Remote 'origin' belum ada. Jalankan:"
  echo "   git remote add origin https://github.com/USERNAME/REPO.git"
  exit 1
fi

# 1) Sync source ke main
echo "→ Sinkronkan kode ke main..."
git add -A
if git diff --cached --quiet; then
  echo "   (tidak ada perubahan di main)"
else
  git -c user.name=deploy -c user.email=deploy@local commit -m "Update source $(date +'%Y-%m-%d %H:%M')" --quiet
  git push origin main
  echo "   main ter-push."
fi

# 2) Siapkan isi situs
STAGE=$(mktemp -d)
cp -r public/* "$STAGE/"
touch "$STAGE/.nojekyll"

# 3) Bangun branch gh-pages di worktree terisolasi (aman)
WT=$(mktemp -d)
rm -rf "$WT"/*
git worktree add --detach "$WT" 2>/dev/null || true
(
  cd "$WT"
  git checkout --orphan site-build >/dev/null 2>&1 || true
  git rm -rf . --quiet 2>/dev/null || true
  git clean -fd --quiet 2>/dev/null || true
  cp -r "$STAGE"/* .
  git add -A
  git -c user.name=deploy -c user.email=deploy@local commit -m "Deploy site $(date +'%Y-%m-%d %H:%M')" --quiet
  git branch -M gh-pages
  git push origin gh-pages --force
)
git worktree remove --force "$WT" 2>/dev/null || true
rm -rf "$STAGE"

echo "✅ Situs ter-deploy: https://mrlowpr.github.io/sosisbakar/"
echo "   Tunggu 1-2 menit sampai GitHub Pages membangun ulang."