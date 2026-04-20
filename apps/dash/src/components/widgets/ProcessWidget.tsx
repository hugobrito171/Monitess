import { Activity } from 'lucide-react';
import { t, Lang } from '../../i18n.js';

interface ProcessEntry {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  user: string;
  state: string;
  command: string;
}

interface Props { data: ProcessEntry[] | null; lang: Lang; }

function getStateColor(state: string) {
  if (state === 'running') return 'var(--success)';
  if (state === 'sleeping') return 'var(--text-muted)';
  if (state === 'stopped') return 'var(--warning)';
  if (state === 'zombie') return 'var(--danger)';
  return 'var(--text-muted)';
}

export function ProcessWidget({ data, lang }: Props) {
  const procs = data ?? [];

  return (
    <div className="card animate-fade-in" style={{ gridColumn: 'span 2' }}>
      <div className="widget-header">
        <Activity size={16} className="widget-icon" />
        <span className="widget-title">{t(lang, 'processes')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>top {procs.length}</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{t(lang, 'pid')}</th>
              <th>{t(lang, 'name')}</th>
              <th>{t(lang, 'cpu_usage')}</th>
              <th>{t(lang, 'mem_usage')}</th>
              <th>{t(lang, 'user')}</th>
              <th>{t(lang, 'state')}</th>
            </tr>
          </thead>
          <tbody>
            {procs.map(p => (
              <tr key={p.pid}>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.pid}</td>
                <td style={{ fontWeight: 500 }}>
                  <span
                    data-tip={p.command}
                    className="tooltip"
                    style={{ cursor: 'default' }}
                  >
                    {p.name}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(p.cpu, 100)}%`,
                        background: p.cpu > 50 ? 'var(--danger)' : 'var(--accent)',
                        borderRadius: 999,
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: p.cpu > 50 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {p.cpu.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{p.mem.toFixed(1)}%</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.user}</td>
                <td>
                  <span style={{ color: getStateColor(p.state), fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {p.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
