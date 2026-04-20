import { Container, AlertTriangle, RefreshCw } from 'lucide-react';
import { t, Lang } from '../../i18n.js';

interface ContainerStats {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  memPercent: number;
  netRx: number;
  netTx: number;
  blockRead: number;
  blockWrite: number;
  restartCount: number;
  isUnhealthy: boolean;
  isKillingOthers: boolean;
  alerts: string[];
  created: string;
  ports: string[];
}

interface Props { data: ContainerStats[] | null; lang: Lang; }

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}G`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)}M`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)}K`;
  return `${bytes}B`;
}

function StateBadge({ state }: { state: string }) {
  let cls = 'badge--neutral';
  const dot = { running: '🟢', exited: '🔴', stopped: '🟡', dead: '💀', paused: '⏸' } as Record<string, string>;
  if (state === 'running') cls = 'badge--success';
  else if (state === 'exited' || state === 'dead') cls = 'badge--danger';
  else if (state === 'paused') cls = 'badge--warning';
  return <span className={`badge ${cls}`}>{dot[state] ?? '●'} {state}</span>;
}

export function DockerWidget({ data, lang }: Props) {
  const containers = data ?? [];
  const killers = containers.filter(c => c.isKillingOthers);
  const unhealthy = containers.filter(c => c.isUnhealthy && !c.isKillingOthers);

  return (
    <div className="card animate-fade-in" style={{ gridColumn: 'span 2' }}>
      <div className="widget-header">
        <Container size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'docker')}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span className="badge badge--neutral">{containers.length} total</span>
          {killers.length > 0 && (
            <span className="badge badge--danger" style={{ animation: 'pulse-danger 1.5s infinite' }}>
              <AlertTriangle size={10} /> {killers.length} killer{killers.length > 1 ? 's' : ''}
            </span>
          )}
          {unhealthy.length > 0 && (
            <span className="badge badge--warning">{unhealthy.length} unhealthy</span>
          )}
        </div>
      </div>

      {containers.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t(lang, 'no_docker')}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {containers.map(c => (
          <div
            key={c.id}
            style={{
              background: c.isKillingOthers
                ? 'rgba(239, 68, 68, 0.07)'
                : c.isUnhealthy
                  ? 'rgba(245, 158, 11, 0.05)'
                  : 'rgba(255,255,255,0.02)',
              border: `1px solid ${c.isKillingOthers ? 'rgba(239,68,68,0.3)' : c.isUnhealthy ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <StateBadge state={c.state} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
              {c.isKillingOthers && (
                <span className="badge badge--danger" style={{ fontSize: 10 }}>
                  <AlertTriangle size={10} /> {t(lang, 'killing_others')}
                </span>
              )}
              {c.restartCount > 0 && (
                <span className="badge badge--warning" style={{ fontSize: 10 }}>
                  <RefreshCw size={9} /> {c.restartCount}x
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.id}</span>
            </div>

            {/* Image + ports */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
              {c.image}
              {c.ports.length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--info)' }}>{c.ports.join(', ')}</span>
              )}
            </div>

            {/* Stats row */}
            {c.state === 'running' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {/* CPU */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CPU</div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: c.cpuPercent > 80 ? 'var(--danger)' : c.cpuPercent > 50 ? 'var(--warning)' : 'var(--text-primary)' }}>
                    {c.cpuPercent.toFixed(1)}%
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(c.cpuPercent, 100)}%`, background: c.cpuPercent > 80 ? 'var(--danger)' : 'var(--accent)', borderRadius: 999 }} />
                  </div>
                </div>
                {/* MEM */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MEM</div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: c.memPercent > 80 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {formatBytes(c.memUsage)}{c.memLimit > 0 ? ` / ${formatBytes(c.memLimit)}` : ''}
                  </div>
                  {c.memLimit > 0 && (
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(c.memPercent, 100)}%`, background: c.memPercent > 80 ? 'var(--danger)' : 'var(--success)', borderRadius: 999 }} />
                    </div>
                  )}
                </div>
                {/* NET */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NET I/O</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    ↓{formatBytes(c.netRx)} ↑{formatBytes(c.netTx)}
                  </div>
                </div>
                {/* BLOCK */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DISK I/O</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    R:{formatBytes(c.blockRead)} W:{formatBytes(c.blockWrite)}
                  </div>
                </div>
              </div>
            )}

            {/* Alerts */}
            {c.alerts.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {c.alerts.map((alert, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--warning)', background: 'rgba(245,158,11,0.08)', borderRadius: 6, padding: '4px 8px' }}>
                    {alert}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
