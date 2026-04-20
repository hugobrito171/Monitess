import { useState } from 'react';
import { Lock, Eye, EyeOff, Activity } from 'lucide-react';
import { t, Lang } from '../i18n.js';

interface Props {
  onLogin: (token: string) => void;
  lang: Lang;
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export function LoginScreen({ onLogin, lang }: Props) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('monitess_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Erro desconhecido');
      }
    } catch {
      setError('Não foi possível conectar ao servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-accent)',
            borderRadius: 20,
            marginBottom: 20,
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Activity size={32} color="var(--accent-light)" />
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent-light), var(--success))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            MONITESS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t(lang, 'auth_desc')}</p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleLogin}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="loginPassword"
                type={showPass ? 'text' : 'password'}
                placeholder={t(lang, 'password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 36, paddingRight: 44 }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-muted)', padding: 4 }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <button
              id="loginSubmit"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !password}
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span>
              ) : (
                t(lang, 'login')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
