import { Network } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { t, Lang } from '../../i18n.js';

interface NetworkEntry {
  iface: string;
  rxSec: number;
  txSec: number;
}

interface HistoryPoint { ts: number; netRx: number; netTx: number; }

interface Props { data: NetworkEntry[] | null; history: HistoryPoint[]; lang: Lang; }

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(2)} MB/s`;
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(1)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
}

export function NetworkWidget({ data, history, lang }: Props) {
  const primary = data?.[0];

  return (
    <div className="card animate-fade-in">
      <div className="widget-header">
        <Network size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'network')}</span>
        {primary && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{primary.iface}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>↓ {t(lang, 'download')}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}>
            {formatSpeed(primary?.rxSec ?? 0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>↑ {t(lang, 'upload')}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            {formatSpeed(primary?.txSec ?? 0)}
          </div>
        </div>
      </div>

      <div style={{ height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="netRxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-light)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent-light)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="netTxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="netRx" stroke="var(--accent-light)" strokeWidth={1.5} fill="url(#netRxGrad)" dot={false} isAnimationActive={false} name="↓" />
            <Area type="monotone" dataKey="netTx" stroke="var(--success)" strokeWidth={1.5} fill="url(#netTxGrad)" dot={false} isAnimationActive={false} name="↑" />
            <Tooltip
              contentStyle={{ background: 'rgba(10,10,26,0.9)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              labelFormatter={() => ''}
              formatter={(v: number, name: string) => [formatSpeed(v), name]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* All interfaces */}
      {data && data.length > 1 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {data.slice(1).map((n, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', padding: '3px 0' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{n.iface}</span>
              <span>↓ {formatSpeed(n.rxSec)} ↑ {formatSpeed(n.txSec)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
