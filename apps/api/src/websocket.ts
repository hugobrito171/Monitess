import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { verifyToken } from './auth.js';
import { isAuthEnabled } from './auth.js';
import { getCpuUsage } from './collectors/cpu.js';
import { getRamData } from './collectors/ram.js';
import { getNetworkData } from './collectors/network.js';
import { getTemperatureData } from './collectors/temperature.js';
import { getDockerContainers } from './collectors/docker.js';
import { getTopProcesses } from './collectors/processes.js';
import { pushHistory } from './history.js';
import { stmts } from './db.js';
import { checkHostMetrics, checkDockerMetrics } from './alerts.js';

const BROADCAST_INTERVAL_MS = 2000;

interface MonitessClient extends WebSocket {
  isAlive: boolean;
  authenticated: boolean;
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const client = ws as MonitessClient;
    client.isAlive = true;
    client.authenticated = false;

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!isAuthEnabled() || (token && verifyToken(token))) {
      client.authenticated = true;
      client.send(JSON.stringify({ type: 'auth', status: 'ok' }));
    } else {
      client.send(JSON.stringify({ type: 'auth', status: 'required' }));
    }

    client.on('pong', () => { client.isAlive = true; });

    client.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth' && msg.token) {
          if (!isAuthEnabled() || verifyToken(msg.token)) {
            client.authenticated = true;
            client.send(JSON.stringify({ type: 'auth', status: 'ok' }));
          } else {
            client.send(JSON.stringify({ type: 'auth', status: 'invalid' }));
          }
        }
      } catch { /* ignore */ }
    });
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as MonitessClient;
      if (!client.isAlive) { client.terminate(); return; }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  // ==========================
  // Broadcast loop principal
  // ==========================
  let tick = 0;

  const broadcast = setInterval(async () => {
    try {
      const [cpu, ram, network, temperature] = await Promise.all([
        getCpuUsage(),
        getRamData(),
        getNetworkData(),
        getTemperatureData(),
      ]);

      const ts = Date.now();
      const netRx = network[0]?.rxSec ?? 0;
      const netTx = network[0]?.txSec ?? 0;

      // ------ 1. Salvar no buffer em memória (para o mini-chart) ------
      pushHistory({
        ts,
        cpu: cpu.usage,
        ram: ram.usagePercent,
        netRx,
        netTx,
        temp: temperature.main,
      });

      // ------ 2. Persistir no SQLite (cada 2s) ------
      stmts.insertMetric.run({
        ts,
        cpu:    cpu.usage,
        ram:    ram.usagePercent,
        net_rx: netRx,
        net_tx: netTx,
        temp:   temperature.main,
      });

      // ------ 3. Verificar alertas do host ------
      checkHostMetrics({
        cpu:  cpu.usage,
        ram:  ram.usagePercent,
        temp: temperature.main,
      });

      // ------ 4. Docker + Processos (a cada 10s = 5 ticks) ------
      let dockerData: Awaited<ReturnType<typeof getDockerContainers>> | undefined;
      let processData: Awaited<ReturnType<typeof getTopProcesses>> | undefined;

      if (tick % 5 === 0) {
        [dockerData, processData] = await Promise.all([
          getDockerContainers(),
          getTopProcesses(10),
        ]);
        // Verificar alertas dos containers
        if (dockerData.length > 0) {
          checkDockerMetrics(dockerData);
        }
      }
      tick++;

      // ------ 5. Broadcast para clientes WebSocket ------
      if (wss.clients.size === 0) return;

      const payload = JSON.stringify({
        type: 'metrics',
        cpu, ram, network, temperature,
        ts,
        ...(dockerData  !== undefined ? { docker: dockerData }    : {}),
        ...(processData !== undefined ? { processes: processData } : {}),
      });

      wss.clients.forEach((ws) => {
        const client = ws as MonitessClient;
        if (client.authenticated && client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

    } catch (err) {
      console.error('[WS] Broadcast error:', err);
    }
  }, BROADCAST_INTERVAL_MS);

  wss.on('close', () => clearInterval(broadcast));

  console.log(`[WS] WebSocket server ready on /ws`);
}
