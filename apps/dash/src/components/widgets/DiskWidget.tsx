import { HardDrive } from 'lucide-react';
import { t, Lang } from '../../i18n.js';

interface DiskEntry {
  fs: string;
  mount: string;
  size: number;
  used: number;
  available: number;
  use: number;
}

interface Props { data: DiskEntry[] | null; lang: Lang; }

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

function getColor(pct: number) {
  if (pct > 90) return 'var(--danger)';
  if (pct > 75) return 'var(--warning)';
  return 'var(--accent)';
}

function getProgressClass(pct: number) {
  if (pct > 90) return 'progress-fill--danger';
  if (pct > 75) return 'progress-fill--warning';
  return '';
}

export function DiskWidget({ data, lang }: Props) {
  const disks = data ?? [];

  return (
    <div className="card animate-fade-in">
      <div className="widget-header">
        <HardDrive size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'disk')}</span>
      </div>

      {disks.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t(lang, 'loading')}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {disks.map((d, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{d.mount}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{d.fs}</span>
              </div>
              <span style={{ fontSize: 12, color: getColor(d.use), fontFamily: 'var(--font-mono)' }}>{d.use.toFixed(1)}%</span>
            </div>
            <div className="progress-track" style={{ height: 8 }}>
              <div className={`progress-fill ${getProgressClass(d.use)}`} style={{ width: `${d.use}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              <span>{t(lang, 'used')}: {formatBytes(d.used)}</span>
              <span>{t(lang, 'free')}: {formatBytes(d.available)}</span>
              <span>{t(lang, 'total')}: {formatBytes(d.size)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
