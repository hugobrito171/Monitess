# MONITESS 🚀

> Dashboard de monitoramento de servidor moderno — CPU, RAM, Disco, Rede, Temperatura, Processos, Docker.

![MONITESS Screenshot](https://img.shields.io/badge/MONITESS-v1.0.0-6366f1?style=for-the-badge)

## ✨ Features

| Widget | Descrição |
|--------|-----------|
| 🖥️ CPU | Uso total, por núcleo, modelo, frequência, gráfico histórico |
| 💾 RAM | Uso atual, swap, gráfico histórico |
| 💿 Disco | Por ponto de montagem, % livre |
| 🌐 Rede | Upload/download em tempo real, todas as interfaces |
| 🌡️ Temperatura | CPU por núcleo, GPU |
| 🔄 Processos | Top 15 por CPU, com estado, PID, usuário |
| 🐳 Docker | Todos os containers, CPU/RAM/NET/DISK por container |
| 🔴 Killer Detection | Detecta containers consumindo recursos excessivos |
| 📊 Histórico | 1h / 6h / 24h de dados acumulados |
| 🔐 Autenticação | Senha via env ou arquivo de config |
| 🌐 Multi-idioma | PT-BR, EN, ES |
| 📱 PWA | Instalável como app mobile |

## 🚀 Quick Start

### Docker (recomendado)

```bash
docker run -it \
  -p 3001:3001 \
  -v /:/mnt/host:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --privileged \
  --pid=host \
  -e MONITESS_PASSWORD=suasenha \
  monitess/monitess
```

### Docker Compose

```bash
cd docker/
# Edite MONITESS_PASSWORD no docker-compose.yml
docker compose up -d
```

### Coolify

1. Crie um novo serviço do tipo **Docker Compose**
2. Cole o conteúdo de `docker/docker-compose.yml`
3. Configure a variável `MONITESS_PASSWORD`
4. Deploy!

### Standalone Linux

```bash
curl -fsSL https://raw.githubusercontent.com/voce/monitess/main/scripts/install.sh | bash
```

### Desenvolvimento local

```bash
npm install
npm run dev
# Frontend: http://localhost:5173
# API: http://localhost:3001
```

## ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3001` | Porta do servidor |
| `MONITESS_PASSWORD` | — | Senha de acesso (opcional) |
| `MONITESS_JWT_SECRET` | `monitess-secret-change-me` | Secret JWT |
| `NODE_ENV` | `development` | Modo de execução |

## 🐳 Detecção de Container "Killer"

MONITESS detecta automaticamente containers que estão prejudicando o host:

- **CPU > 80%** — alto consumo de CPU
- **Memória > 80%** do limite alocado
- **Reinicializações > 5x** — crash-loop
- **Estado unhealthy** — healthcheck falhando

Containers problemáticos aparecem no topo da lista com badge `🔴 MATANDO O HOST` e borda vermelha pulsante.

## 📁 Estrutura

```
monitess/
├── apps/
│   ├── api/         # Node.js + Express + WebSocket
│   └── dash/        # React + Vite + Recharts
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/
│   ├── install.sh   # Linux standalone
│   └── install.ps1  # Windows standalone
└── package.json
```

## 📜 Licença

MIT — Desenvolvido com ❤️ como fork espiritual do [dashdot](https://github.com/MauriceNino/dashdot)
