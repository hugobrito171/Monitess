#!/usr/bin/env bash
# MONITESS Standalone Installer for Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/voce/monitess/main/scripts/install.sh | bash
set -e

INSTALL_DIR="$HOME/.monitess"
REPO_URL="https://github.com/voce/monitess"
PORT=${MONITESS_PORT:-3001}
PASSWORD=${MONITESS_PASSWORD:-""}

echo ""
echo "╔══════════════════════════════════╗"
echo "║   MONITESS — Instalador Linux    ║"
echo "╚══════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "[!] Node.js não encontrado. Instalando via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 20
fi

NODE_VERSION=$(node --version)
echo "[✓] Node.js $NODE_VERSION"

# Check pm2
if ! command -v pm2 &> /dev/null; then
  echo "[→] Instalando pm2..."
  npm install -g pm2
fi
echo "[✓] pm2 instalado"

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "[→] Atualizando MONITESS em $INSTALL_DIR..."
  cd "$INSTALL_DIR"
  git pull
else
  echo "[→] Clonando MONITESS em $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install dependencies and build
echo "[→] Instalando dependências..."
npm install

echo "[→] Compilando..."
npm run build

# Set password if provided
if [ -n "$PASSWORD" ]; then
  export MONITESS_PASSWORD="$PASSWORD"
fi

# Start with pm2
pm2 delete monitess 2>/dev/null || true
pm2 start apps/api/dist/index.js \
  --name monitess \
  --env production \
  -- PORT=$PORT NODE_ENV=production

pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   MONITESS instalado com sucesso!    ║"
echo "║   Acesse: http://localhost:$PORT      ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Comandos úteis:"
echo "  pm2 status            → Ver status"
echo "  pm2 logs monitess     → Ver logs"
echo "  pm2 restart monitess  → Reiniciar"
echo "  pm2 stop monitess     → Parar"
echo ""
