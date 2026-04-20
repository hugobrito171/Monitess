import { useState, useEffect } from 'react';
import { Bell, Container, TrendingUp, Database, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Lang, t } from '../../i18n.js';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

interface Alert {
  id: number;
  ts: number;
  type: string;
  severity: 'warning' | 'critical';
  source: string;
  message: string;
  value: number;
  resolved_at: number | null;
}

interface DockerEvent {
  id: number;
  ts: number;
  container_name: string;
  image: string;
  event: string;
  cpu_at_event: number;
  mem_at_event: number;
  restart_count: number;
  details: string;
}

interface DbStats {
  rows: { metrics: number; alerts: number };
  db_size_human: string;
  oldest_metric: string | null;
  newest_metric: string | null;
  thresholds: Record<string, Record<string, number>>;
}

interface Props { token: string | null; lang: Lang; }

type Tab = 'alerts' | 'docker' | 'stats';

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--danger)',
  warning:  'var(--warning)',
};

const EVENT_EMOJI: Record<string, string> = {
  crash:     '💀',
  restart:   '🔁',
  killer:    '🔴',
  unhealthy: '❌',
  start:     '▶️',
  stop:      '⏹️',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `há ${d}d`;
  if (h > 0) return `há ${h}h`;
  if (m > 0) return `há ${m}min`;
  return 'agora';
}

export function LogsPanel({ token, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [dockerEvents, setDockerEvents] = useState<DockerEvent[]>([]);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);

  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  async function loadData() {
    setLoading(true);
    try {
      const [alertsRes, activeRes, dockerRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/logs/alerts?hours=24&limit=50`, { headers }),
        fetch(`${API_BASE}/api/logs/alerts?active=true`, { headers }),
        fetch(`${API_BASE}/api/logs/docker?hours=24&limit=30`, { headers }),
        fetch(`${API_BASE}/api/logs/stats`, { headers }),
      ]);
      setAlerts(await alertsRes.json());
      setActiveAlerts(await activeRes.json());
      setDockerEvents(await dockerRes.json());
      setStats(await statsRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    if (open) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Refresh a cada 30s quando aberto
  useEffect(() => {
    if (!open) return;
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount  = activeAlerts.filter(a => a.severity === 'warning').length;

  return (
    <div style={{ marginTop: 24 }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 20px',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border)',
          borderRadius: open ? '16px 16px 0 0' : 16,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <Database size={16} color="var(--accent-light)" />
        <span style={{ fontWeight: 600, fontSize: 13 }}>Logs & Alertas</span>

        <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
          {criticalCount > 0 && (
            <span className="badge badge--danger" style={{ animation: 'pulse-danger 1.5s infinite' }}>
              <Bell size={10} /> {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="badge badge--warning">
              {warningCount} aviso{warningCount > 1 ? 's' : ''}
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="badge badge--success">✓ Tudo normal</span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Panel body */}
      {open && (
        <div style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
            {([
              { id: 'alerts' as Tab,  icon: <Bell size={13} />,      label: `Alertas (${alerts.length})` },
              { id: 'docker' as Tab,  icon: <Container size={13} />, label: `Docker Events (${dockerEvents.length})` },
              { id: 'stats'  as Tab,  icon: <TrendingUp size={13} />, label: 'Banco de Dados' },
            ]).map(tab_ => (
              <button
                key={tab_.id}
                onClick={() => setTab(tab_.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 16px',
                  background: 'none',
                  borderBottom: tab === tab_.id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: tab === tab_.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 500,
                  transition: 'color 0.15s',
                  marginBottom: -1,
                }}
              >
                {tab_.icon} {tab_.label}
              </button>
            ))}

            <button onClick={loadData} style={{ marginLeft: 'auto', background: 'none', color: 'var(--text-muted)', padding: '12px 8px', fontSize: 11 }}>
              {loading ? '⟳' : '↻ Atualizar'}
            </button>
          </div>

          <div style={{ padding: 20, maxHeight: 480, overflowY: 'auto' }}>

            {/* ===== ALERTS TAB ===== */}
            {tab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.length === 0 && !loading && (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
                    Nenhum alerta nas últimas 24h 🎉
                  </div>
                )}
                {alerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 14px',
                    background: a.severity === 'critical'
                      ? 'rgba(239,68,68,0.06)'
                      : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    borderRadius: 10,
                    opacity: a.resolved_at ? 0.5 : 1,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLOR[a.severity], flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: SEVERITY_COLOR[a.severity] }}>
                          {a.severity === 'critical' ? 'CRÍTICO' : 'AVISO'}
                        </span>
                        <span className="badge badge--neutral" style={{ fontSize: 10 }}>{a.type}</span>
                        {a.source !== 'host' && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.source}</span>
                        )}
                        {a.resolved_at && (
                          <span style={{ fontSize: 10, color: 'var(--success)', marginLeft: 'auto' }}>✓ resolvido</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{a.message}</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {timeAgo(a.ts)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ===== DOCKER EVENTS TAB ===== */}
            {tab === 'docker' && (
              <div>
                {dockerEvents.length === 0 && !loading && (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
                    Nenhum evento Docker nas últimas 24h
                  </div>
                )}
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Evento</th>
                        <th>Container</th>
                        <th>Imagem</th>
                        <th>CPU</th>
                        <th>MEM</th>
                        <th>Reinícios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dockerEvents.map(ev => (
                        <tr key={ev.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(ev.ts).toLocaleTimeString()}
                          </td>
                          <td>
                            <span style={{ fontSize: 12 }}>
                              {EVENT_EMOJI[ev.event] ?? '●'} {ev.event}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{ev.container_name}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ev.image}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ev.cpu_at_event > 80 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {ev.cpu_at_event?.toFixed(1)}%
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ev.mem_at_event > 80 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {ev.mem_at_event?.toFixed(1)}%
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{ev.restart_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== STATS TAB ===== */}
            {tab === 'stats' && stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Banco SQLite</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Row label="Arquivo" value={stats.db_size_human} />
                    <Row label="Métricas" value={stats.rows.metrics.toLocaleString() + ' linhas'} />
                    <Row label="Alertas" value={stats.rows.alerts.toLocaleString() + ' registros'} />
                    <Row label="Mais antigo" value={stats.oldest_metric ? new Date(stats.oldest_metric).toLocaleDateString() : '—'} />
                    <Row label="Retenção" value="30 dias" />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Thresholds de Alerta</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Row label="CPU Warning"     value={`${stats.thresholds.cpu?.warning}%`} />
                    <Row label="CPU Critical"    value={`${stats.thresholds.cpu?.critical}%`} />
                    <Row label="RAM Warning"     value={`${stats.thresholds.ram?.warning}%`} />
                    <Row label="RAM Critical"    value={`${stats.thresholds.ram?.critical}%`} />
                    <Row label="Temp Warning"    value={`${stats.thresholds.temp?.warning}°C`} />
                    <Row label="Docker CPU"      value={`${stats.thresholds.docker?.cpu}%`} />
                    <Row label="Docker Restarts" value={`${stats.thresholds.docker?.restarts}x`} />
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
