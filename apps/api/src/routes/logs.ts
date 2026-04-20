import { Router, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { stmts, db } from '../db.js';
import { getThresholds } from '../alerts.js';

export const logsRouter = Router();
logsRouter.use(requireAuth);

// ==========================
// GET /api/logs/metrics?minutes=60&points=300
// Retorna série temporal com downsampling automático
// ==========================
logsRouter.get('/metrics', (req: Request, res: Response): void => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const maxPoints = parseInt(req.query.points as string) || 500;
  const since = Date.now() - minutes * 60 * 1000;

  // Conta quantos pontos temos no período
  const count = (db.prepare('SELECT COUNT(*) as c FROM metrics_history WHERE ts >= ?').get(since) as any).c;

  let rows: unknown[];
  if (count <= maxPoints) {
    // Retorna resolução completa
    rows = stmts.getMetrics.all(since);
  } else {
    // Downsample: divide em buckets para não passar de maxPoints
    const bucketMs = Math.ceil((minutes * 60 * 1000) / maxPoints);
    rows = stmts.getMetricsDownsampled.all(bucketMs, bucketMs, since);
  }

  res.json({
    minutes,
    count: (rows as any[]).length,
    resolution: count <= maxPoints ? 'full' : 'downsampled',
    data: rows,
  });
});

// ==========================
// GET /api/logs/alerts?hours=24&limit=100&active=true
// ==========================
logsRouter.get('/alerts', (req: Request, res: Response): void => {
  if (req.query.active === 'true') {
    res.json(stmts.getActiveAlerts.all());
    return;
  }
  const hours = parseInt(req.query.hours as string) || 24;
  const limit = parseInt(req.query.limit as string) || 100;
  const since = Date.now() - hours * 60 * 60 * 1000;
  res.json(stmts.getAlerts.all(since, limit));
});

// ==========================
// GET /api/logs/docker?hours=24&limit=50&container=nome
// ==========================
logsRouter.get('/docker', (req: Request, res: Response): void => {
  const hours = parseInt(req.query.hours as string) || 24;
  const limit = parseInt(req.query.limit as string) || 50;
  const container = req.query.container as string | undefined;

  if (container) {
    res.json(stmts.getDockerEventsByContainer.all(container, limit));
    return;
  }
  const since = Date.now() - hours * 60 * 60 * 1000;
  res.json(stmts.getDockerEvents.all(since, limit));
});

// ==========================
// GET /api/logs/stats — estatísticas do banco
// ==========================
logsRouter.get('/stats', (_req: Request, res: Response): void => {
  const metrics = (stmts.countMetrics.get() as any).count;
  const alerts  = (stmts.countAlerts.get()  as any).count;
  const size    = (stmts.dbSize.get()        as any)?.size ?? 0;

  const oldest = db.prepare('SELECT MIN(ts) as ts FROM metrics_history').get() as any;
  const newest = db.prepare('SELECT MAX(ts) as ts FROM metrics_history').get() as any;

  res.json({
    rows: { metrics, alerts },
    db_size_bytes: size,
    db_size_human: formatBytes(size),
    oldest_metric: oldest?.ts ? new Date(oldest.ts).toISOString() : null,
    newest_metric: newest?.ts ? new Date(newest.ts).toISOString() : null,
    thresholds: getThresholds(),
  });
});

function formatBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}
