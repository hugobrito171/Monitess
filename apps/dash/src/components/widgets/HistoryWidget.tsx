import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { useState } from 'react';
import { t, Lang } from '../../i18n.js';

interface HistoryPoint {
  ts: number;
  cpu: number;
  ram: number;
  netRx: number;
  netTx: number;
  temp: number | null;
}

type Range = '1h' | '6h' | '24h';

interface Props { data: HistoryPoint[]; lang: Lang; }

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)}M`;
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(0)}K`;
  return `${bytesPerSec.toFixed(0)}B`;
}

const RANGE_MINUTES: Record<Range, number> = { '1h': 60, '6h': 360, '24h': 1440 };

export function HistoryWidget({ data, lang }: Props) {
  const [range, setRange] = useState<Range>('1h');
  const since = Date.now() - RANGE_MINUTES[range] * 60 * 1000;
  const filtered = data.filter(p => p.ts >= since);

  // Downsample to max 300 points for performance
  const step = Math.max(1, Math.floor(filtered.length / 300));
  const sampled = filtered.filter((_, i) => i % step === 0);

  return (
    <div className="card animate-fade-in" style={{ gridColumn: 'span 2' }}>
      <div className="widget-header">
        <BarChart2 size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'history')}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['1h', '6h', '24h'] as Range[]).map(r => (
            <button
              key={r}
              className={range === r ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setRange(r)}
            >
              {t(lang, r)}
            </button>
          ))}
        </div>
      </div>

      {sampled.length < 2 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 40 }}>
          Acumulando dados... ({data.length} amostras)
        </div>
      ) : (
        <>
          {/* CPU + RAM chart */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CPU & RAM %</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={sampled}>
                <defs>
                  <linearGradient id="hCpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hRamGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="ts" tickFormatter={formatTime} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" width={32} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,10,26,0.95)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  labelFormatter={formatTime}
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="var(--accent)" strokeWidth={1.5} fill="url(#hCpuGrad)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="ram" name="RAM" stroke="var(--success)" strokeWidth={1.5} fill="url(#hRamGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Network chart */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rede</div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={sampled}>
                <defs>
                  <linearGradient id="hRxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-light)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-light)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hTxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="ts" tickFormatter={formatTime} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                <YAxis tickFormatter={formatSpeed} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,10,26,0.95)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  labelFormatter={formatTime}
                  formatter={(v: number) => [formatSpeed(v) + '/s']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="netRx" name="↓ Download" stroke="var(--accent-light)" strokeWidth={1.5} fill="url(#hRxGrad)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="netTx" name="↑ Upload" stroke="var(--info)" strokeWidth={1.5} fill="url(#hTxGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
