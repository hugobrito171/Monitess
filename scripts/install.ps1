# MONITESS Standalone Installer for Windows
# Usage: irm https://raw.githubusercontent.com/voce/monitess/main/scripts/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$InstallDir = "$env:USERPROFILE\.monitess"
$Port = $env:MONITESS_PORT ?? "3001"

Write-Host ""
Write-Host "╔══════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MONITESS — Instalador Windows   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[✓] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[!] Node.js não encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    Start-Process "https://nodejs.org"
    exit 1
}

# Check/install pm2
try {
    pm2 --version | Out-Null
    Write-Host "[✓] pm2 instalado" -ForegroundColor Green
} catch {
    Write-Host "[→] Instalando pm2..." -ForegroundColor Yellow
    npm install -g pm2
}

# Clone or update
if (Test-Path $InstallDir) {
    Write-Host "[→] Atualizando MONITESS..." -ForegroundColor Yellow
    Set-Location $InstallDir
    git pull
} else {
    Write-Host "[→] Clonando MONITESS..." -ForegroundColor Yellow
    git clone "https://github.com/voce/monitess" $InstallDir
    Set-Location $InstallDir
}

# Build
Write-Host "[→] Instalando dependências..." -ForegroundColor Yellow
npm install

Write-Host "[→] Compilando..." -ForegroundColor Yellow
npm run build

# Start
pm2 delete monitess 2>&1 | Out-Null
pm2 start apps/api/dist/index.js `
    --name monitess `
    --env production

pm2 save

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  MONITESS instalado com sucesso!     ║" -ForegroundColor Green
Write-Host "║  Acesse: http://localhost:$Port       ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos úteis:"
Write-Host "  pm2 status            → Ver status"
Write-Host "  pm2 logs monitess     → Ver logs"
Write-Host "  pm2 restart monitess  → Reiniciar"
