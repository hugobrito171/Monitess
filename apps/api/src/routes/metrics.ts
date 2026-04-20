import { Router, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { getCpuInfo, getCpuUsage } from '../collectors/cpu.js';
import { getRamData } from '../collectors/ram.js';
import { getDiskData } from '../collectors/disk.js';
import { getNetworkData } from '../collectors/network.js';
import { getTemperatureData } from '../collectors/temperature.js';
import { getTopProcesses } from '../collectors/processes.js';
import { getDockerContainers } from '../collectors/docker.js';
import { getSystemInfo } from '../collectors/system.js';
import { getHistory } from '../history.js';

export const metricsRouter = Router();

metricsRouter.use(requireAuth);

metricsRouter.get('/system', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getSystemInfo());
});

metricsRouter.get('/cpu', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getCpuInfo());
});

metricsRouter.get('/ram', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getRamData());
});

metricsRouter.get('/disk', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getDiskData());
});

metricsRouter.get('/network', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getNetworkData());
});

metricsRouter.get('/temperature', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getTemperatureData());
});

metricsRouter.get('/processes', async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 15;
  res.json(await getTopProcesses(limit));
});

metricsRouter.get('/docker', async (_req: Request, res: Response): Promise<void> => {
  res.json(await getDockerContainers());
});

metricsRouter.get('/history', (req: Request, res: Response): void => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  res.json(getHistory(minutes));
});

// Snapshot: all metrics at once
metricsRouter.get('/snapshot', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [system, cpu, ram, disk, network, temperature, processes, docker] =
      await Promise.all([
        getSystemInfo(),
        getCpuUsage(),
        getRamData(),
        getDiskData(),
        getNetworkData(),
        getTemperatureData(),
        getTopProcesses(10),
        getDockerContainers(),
      ]);
    res.json({ system, cpu, ram, disk, network, temperature, processes, docker, ts: Date.now() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
