import { MemoryStick } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { t, Lang } from '../../i18n.js';

interface RamData {
  total: number;
  used: number;
  usagePercent: number;
  swapTotal: number;
  swapUsed: number;
  swapUsagePercent: number;
}

interface HistoryPoint { ts: number; ram: number; }

interface Props { data: RamData | null; history: HistoryPoint[]; lang: Lang; }

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function getColor(pct: number) {
  if (pct > 85) return 'var(--danger)';
  if (pct > 65) return 'var(--warning)';
  return 'var(--success)';
}

function getProgressClass(pct: number) {
  if (pct > 85) return 'progress-fill--danger';
  if (pct > 65) return 'progress-fill--warning';
  return '';
}

export function RamWidget({ data, history, lang }: Props) {
  const pct = data?.usagePercent ?? 0;
  const color = getColor(pct);

  return (
    <div className={`card animate-fade-in ${pct > 85 ? 'card--danger' : ''}`}>
      <div className="widget-header">
        <MemoryStick size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'ram')}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div className="value-big" style={{ color }}>{pct.toFixed(1)}<span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>%</span></div>
        {data && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', paddingBottom: 4 }}>
            {formatBytes(data.used)} / {formatBytes(data.total)}
          </div>
        )}
      </div>

      <div className="progress-track">
        <div className={`progress-fill ${getProgressClass(pct)}`} style={{ width: `${pct}%` }} />
      </div>

      <div style={{ height: 60, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="ram" stroke={color} strokeWidth={2} fill="url(#ramGrad)" dot={false} isAnimationActive={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(10,10,26,0.9)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              labelFormatter={() => ''}
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'RAM']}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Swap */}
      {data && data.swapTotal > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(lang, 'swap')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {formatBytes(data.swapUsed)} / {formatBytes(data.swapTotal)}
            </span>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${getProgressClass(data.swapUsagePercent)}`} style={{ width: `${data.swapUsagePercent}%`, background: 'var(--info)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
