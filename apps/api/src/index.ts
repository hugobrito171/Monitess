import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/auth.js';
import { metricsRouter } from './routes/metrics.js';
import { logsRouter } from './routes/logs.js';
import { setupWebSocket } from './websocket.js';
import './db.js'; // inicializa o banco


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'MONITESS', version: '1.0.0' });
});

// Serve built frontend in production
const publicPath = path.join(__dirname, '../../public');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// WebSocket
setupWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════╗
║       MONITESS v1.0.0 🚀             ║
║  http://${HOST}:${PORT}              ║
╚══════════════════════════════════════╝
  `);
});

export default app;
