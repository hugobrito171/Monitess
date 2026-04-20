import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Banco fica em /data/monitess.db dentro do container (volume) ou $HOME/.monitess/ no standalone
const DATA_DIR = process.env.MONITESS_DATA_DIR
  || (process.env.NODE_ENV === 'production' ? '/data' : path.join(process.cwd(), 'data'));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'monitess.db');

console.log(`[DB] Usando banco em: ${DB_PATH}`);

export const db = new Database(DB_PATH);

// Performance: WAL mode é muito mais rápido para writes frequentes
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -16000');     // 16MB cache
db.pragma('temp_store = memory');

// ==========================
// Schema
// ==========================
db.exec(`

  -- Série temporal de métricas do host (write a cada 2s)
  CREATE TABLE IF NOT EXISTS metrics_history (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      INTEGER NOT NULL,   -- unix ms
    cpu     REAL,               -- % uso total
    ram     REAL,               -- % uso
    net_rx  REAL,               -- bytes/s download
    net_tx  REAL,               -- bytes/s upload
    temp    REAL                -- °C (null se indisponível)
  );

  -- Índice no timestamp para queries rápidas por período
  CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics_history(ts);

  -- Alertas automáticos (CPU alta, Docker killer, etc)
  CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          INTEGER NOT NULL,   -- quando ocorreu
    type        TEXT NOT NULL,      -- 'cpu' | 'ram' | 'temp' | 'docker' | 'process'
    severity    TEXT NOT NULL,      -- 'warning' | 'critical'
    source      TEXT,               -- nome do container, processo, etc
    message     TEXT NOT NULL,      -- descrição humana
    value       REAL,               -- valor que causou o alerta (ex: 95.2)
    resolved_at INTEGER             -- quando resolveu (null = ainda ativo)
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(ts);
  CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

  -- Eventos de containers Docker
  CREATE TABLE IF NOT EXISTS docker_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              INTEGER NOT NULL,
    container_id    TEXT,
    container_name  TEXT,
    image           TEXT,
    event           TEXT NOT NULL,  -- 'start' | 'stop' | 'crash' | 'killer' | 'unhealthy' | 'restart'
    cpu_at_event    REAL,
    mem_at_event    REAL,
    restart_count   INTEGER,
    details         TEXT            -- JSON livre para dados extras
  );

  CREATE INDEX IF NOT EXISTS idx_docker_events_ts ON docker_events(ts);
  CREATE INDEX IF NOT EXISTS idx_docker_events_name ON docker_events(container_name);

`);

// ==========================
// Prepared Statements (reutilizados para performance)
// ==========================

export const stmts = {
  insertMetric: db.prepare(`
    INSERT INTO metrics_history (ts, cpu, ram, net_rx, net_tx, temp)
    VALUES (@ts, @cpu, @ram, @net_rx, @net_tx, @temp)
  `),

  getMetrics: db.prepare(`
    SELECT ts, cpu, ram, net_rx, net_tx, temp
    FROM metrics_history
    WHERE ts >= ?
    ORDER BY ts ASC
  `),

  getMetricsDownsampled: db.prepare(`
    SELECT
      ROUND(ts / ?) * ? AS bucket,
      AVG(cpu)    AS cpu,
      AVG(ram)    AS ram,
      AVG(net_rx) AS net_rx,
      AVG(net_tx) AS net_tx,
      AVG(temp)   AS temp
    FROM metrics_history
    WHERE ts >= ?
    GROUP BY bucket
    ORDER BY bucket ASC
  `),

  insertAlert: db.prepare(`
    INSERT INTO alerts (ts, type, severity, source, message, value)
    VALUES (@ts, @type, @severity, @source, @message, @value)
  `),

  resolveAlert: db.prepare(`
    UPDATE alerts SET resolved_at = ? WHERE type = ? AND source = ? AND resolved_at IS NULL
  `),

  getActiveAlerts: db.prepare(`
    SELECT * FROM alerts WHERE resolved_at IS NULL ORDER BY ts DESC
  `),

  getAlerts: db.prepare(`
    SELECT * FROM alerts WHERE ts >= ? ORDER BY ts DESC LIMIT ?
  `),

  insertDockerEvent: db.prepare(`
    INSERT INTO docker_events (ts, container_id, container_name, image, event, cpu_at_event, mem_at_event, restart_count, details)
    VALUES (@ts, @container_id, @container_name, @image, @event, @cpu_at_event, @mem_at_event, @restart_count, @details)
  `),

  getDockerEvents: db.prepare(`
    SELECT * FROM docker_events WHERE ts >= ? ORDER BY ts DESC LIMIT ?
  `),

  getDockerEventsByContainer: db.prepare(`
    SELECT * FROM docker_events WHERE container_name = ? ORDER BY ts DESC LIMIT ?
  `),

  // Limpeza de dados antigos (chamada periodicamente)
  purgeOldMetrics: db.prepare(`
    DELETE FROM metrics_history WHERE ts < ?
  `),

  purgeOldAlerts: db.prepare(`
    DELETE FROM alerts WHERE ts < ? AND resolved_at IS NOT NULL
  `),

  purgeOldDockerEvents: db.prepare(`
    DELETE FROM docker_events WHERE ts < ?
  `),

  countMetrics: db.prepare(`SELECT COUNT(*) as count FROM metrics_history`),
  countAlerts:  db.prepare(`SELECT COUNT(*) as count FROM alerts`),
  dbSize:       db.prepare(`SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`),
};

// ==========================
// Manutenção automática
// ==========================
const RETENTION_DAYS = parseInt(process.env.MONITESS_RETENTION_DAYS || '30');

export function runMaintenance(): void {
  const cutoff30d = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoff90d = Date.now() - 90 * 24 * 60 * 60 * 1000;

  const m = stmts.purgeOldMetrics.run(cutoff30d);
  const a = stmts.purgeOldAlerts.run(cutoff30d);
  const d = stmts.purgeOldDockerEvents.run(cutoff90d);

  if (m.changes > 0 || a.changes > 0 || d.changes > 0) {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    console.log(`[DB] Manutenção: removidas ${m.changes} métricas, ${a.changes} alertas, ${d.changes} eventos Docker`);
  }
}

// Roda manutenção a cada 6h
setInterval(runMaintenance, 6 * 60 * 60 * 1000);
// E uma vez ao iniciar (depois de 30s)
setTimeout(runMaintenance, 30_000);

export default db;
