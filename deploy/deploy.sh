#!/usr/bin/env bash
# ============================================================
# Deploy do Sistema do Colegio (VPS Ubuntu)
# ============================================================
# Uso (na VPS, dentro de /opt/colegio):
#   ./deploy/deploy.sh
#
# O que faz:
# 1. git pull para atualizar o codigo
# 2. npm install --omit=dev
# 3. pm2 reload colegio (zero-downtime)
# ============================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "==> Diretorio do app: $APP_DIR"
echo "==> Atualizando codigo do GitHub..."
git pull --ff-only

echo "==> Instalando dependencias de producao..."
npm ci --omit=dev || npm install --omit=dev

echo "==> Recarregando PM2 (zero-downtime)..."
if pm2 describe colegio > /dev/null 2>&1; then
  pm2 reload colegio
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "==> Pronto. Status:"
pm2 status colegio
