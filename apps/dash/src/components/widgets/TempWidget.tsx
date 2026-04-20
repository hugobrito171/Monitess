import { Thermometer } from 'lucide-react';
import { t, Lang } from '../../i18n.js';

interface TempData {
  main: number | null;
  cores: number[];
  gpu: number | null;
  max: number | null;
}

interface Props { data: TempData | null; lang: Lang; }

function getColor(temp: number) {
  if (temp > 85) return 'var(--danger)';
  if (temp > 70) return 'var(--warning)';
  return 'var(--success)';
}

function TempBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = getColor(value);
  return (
    <div style={{ height: 40, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: 6, transition: 'height 0.5s ease' }} />
    </div>
  );
}

export function TempWidget({ data, lang }: Props) {
  const available = data && (data.main !== null || data.cores.length > 0);

  return (
    <div className={`card animate-fade-in ${data?.main !== null && (data?.main ?? 0) > 85 ? 'card--danger' : ''}`}>
      <div className="widget-header">
        <Thermometer size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'temperature')}</span>
      </div>

      {!available ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t(lang, 'no_temp')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
            {data?.main !== null && (
              <>
                <div className="value-big" style={{ color: getColor(data!.main!) }}>
                  {data!.main!.toFixed(0)}<span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>°C</span>
                </div>
                {data?.max && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', paddingBottom: 4 }}>
                    max {data.max.toFixed(0)}°C
                  </span>
                )}
              </>
            )}
          </div>

          {/* Per-core temps */}
          {data?.cores && data.cores.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(lang, 'per_core')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 6 }}>
                {data.cores.map((temp, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>C{i}</div>
                    <TempBar value={temp} max={100} />
                    <div style={{ fontSize: 9, color: getColor(temp), marginTop: 2, fontFamily: 'var(--font-mono)' }}>{temp.toFixed(0)}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GPU temp */}
          {data?.gpu !== null && data?.gpu !== undefined && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GPU</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: getColor(data.gpu), fontFamily: 'var(--font-mono)' }}>{data.gpu.toFixed(0)}°C</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
