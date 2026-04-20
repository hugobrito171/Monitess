import { Activity, Wifi, WifiOff, Globe, LogOut } from 'lucide-react';
import { WsStatus } from '../hooks/useWebSocket.js';
import { Lang, t } from '../i18n.js';

interface Props {
  status: WsStatus;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  onLogout?: () => void;
  authEnabled: boolean;
  hostname?: string;
}

const LANGS: { code: Lang; label: string }[] = [
  { code: 'pt-BR', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

export function Header({ status, lang, onLangChange, onLogout, authEnabled, hostname }: Props) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(5, 5, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={20} color="var(--accent-light)" />
        <span style={{
          fontSize: 17,
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--accent-light), var(--success))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>
          MONITESS
        </span>
        {hostname && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', paddingLeft: 8 }}>
            {hostname}
          </span>
        )}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* WS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: status === 'connected' ? 'var(--success)' : status === 'connecting' ? 'var(--warning)' : 'var(--danger)' }}>
          {status === 'connected' ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span style={{ display: 'none' }}>{t(lang, status)}</span>
        </div>

        {/* Language */}
        <div style={{ display: 'flex', gap: 2 }}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => onLangChange(l.code)}
              style={{
                padding: '3px 7px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: lang === l.code ? 'var(--accent)' : 'transparent',
                color: lang === l.code ? 'white' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        {authEnabled && onLogout && (
          <button
            onClick={onLogout}
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <LogOut size={12} />
            {t(lang, 'logout')}
          </button>
        )}
      </div>
    </header>
  );
}
