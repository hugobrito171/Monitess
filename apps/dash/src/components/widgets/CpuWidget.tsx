import { Cpu } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { t, Lang } from '../../i18n.js';

interface CpuData {
  usage: number;
  perCore: number[];
  model?: string;
  cores?: number;
  speed?: number;
}

interface HistoryPoint { ts: number; cpu: number; }

interface Props {
  data: CpuData | null;
  history: HistoryPoint[];
  lang: Lang;
}

function getColor(usage: number) {
  if (usage > 85) return 'var(--danger)';
  if (usage > 65) return 'var(--warning)';
  return 'var(--accent)';
}

function getProgressClass(usage: number) {
  if (usage > 85) return 'progress-fill--danger';
  if (usage > 65) return 'progress-fill--warning';
  return '';
}

export function CpuWidget({ data, history, lang }: Props) {
  const usage = data?.usage ?? 0;
  const color = getColor(usage);

  return (
    <div className={`card animate-fade-in ${usage > 85 ? 'card--danger' : ''}`}>
      <div className="widget-header">
        <Cpu size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'cpu')}</span>
      </div>

      {data?.model && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
          {data.model}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div className="value-big" style={{ color }}>{usage.toFixed(1)}<span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>%</span></div>
        {data && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', paddingBottom: 4 }}>
            {data.cores} {t(lang, 'cores')} @ {data.speed?.toFixed(1)} GHz
          </div>
        )}
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${getProgressClass(usage)}`}
          style={{ width: `${usage}%`, background: usage <= 65 ? undefined : undefined }}
        />
      </div>

      {/* Mini chart */}
      <div style={{ height: 60, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="cpu" stroke={color} strokeWidth={2} fill="url(#cpuGrad)" dot={false} isAnimationActive={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(10,10,26,0.9)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              labelFormatter={() => ''}
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'CPU']}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-core grid */}
      {data?.perCore && data.perCore.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(lang, 'per_core')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 6 }}>
            {data.perCore.map((v, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>C{i}</div>
                <div
                  style={{
                    height: 32,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${v}%`,
                      background: getColor(v),
                      borderRadius: 4,
                      transition: 'height 0.4s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{v.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
