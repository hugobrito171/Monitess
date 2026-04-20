import { Server, Clock, Globe, Cpu } from 'lucide-react';
import { t, Lang } from '../../i18n.js';

interface SystemInfo {
  hostname: string;
  os: string;
  platform: string;
  arch: string;
  kernel: string;
  uptime: number;
  timezone: string;
  bootTime: string;
}

interface Props { data: SystemInfo | null; lang: Lang; }

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

interface InfoRowProps { icon: React.ReactNode; label: string; value: string; }

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'var(--accent-light)', opacity: 0.7 }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export function SystemWidget({ data, lang }: Props) {
  if (!data) return null;

  return (
    <div className="card animate-fade-in">
      <div className="widget-header">
        <Server size={16} className="widget-icon" />
        <span className="widget-title">{data.hostname}</span>
      </div>

      <InfoRow icon={<Globe size={12} />} label={t(lang, 'os')} value={data.os} />
      <InfoRow icon={<Cpu size={12} />} label={t(lang, 'arch')} value={`${data.arch} / ${data.kernel}`} />
      <InfoRow icon={<Clock size={12} />} label={t(lang, 'uptime')} value={formatUptime(data.uptime)} />
      <InfoRow icon={<Globe size={12} />} label={t(lang, 'timezone')} value={data.timezone} />
      <InfoRow icon={<Clock size={12} />} label={t(lang, 'boot_time')} value={new Date(data.bootTime).toLocaleString()} />
    </div>
  );
}
