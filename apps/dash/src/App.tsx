import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket.js';
import { LoginScreen } from './components/LoginScreen.js';
import { Header } from './components/Header.js';
import { CpuWidget } from './components/widgets/CpuWidget.js';
import { RamWidget } from './components/widgets/RamWidget.js';
import { DiskWidget } from './components/widgets/DiskWidget.js';
import { NetworkWidget } from './components/widgets/NetworkWidget.js';
import { TempWidget } from './components/widgets/TempWidget.js';
import { ProcessWidget } from './components/widgets/ProcessWidget.js';
import { DockerWidget } from './components/widgets/DockerWidget.js';
import { HistoryWidget } from './components/widgets/HistoryWidget.js';
import { SystemWidget } from './components/widgets/SystemWidget.js';
import { LogsPanel } from './components/LogsPanel.js';
import { Lang, t } from './i18n.js';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
const MAX_HISTORY = 43200; // 24h @ 2s

interface HistoryPoint { ts: number; cpu: number; ram: number; netRx: number; netTx: number; temp: number | null; }

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('monitess_lang');
    return (stored as Lang) || 'pt-BR';
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('monitess_token'));
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Metrics state
  const [cpu, setCpu] = useState<any>(null);
  const [ram, setRam] = useState<any>(null);
  const [disk, setDisk] = useState<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [temperature, setTemperature] = useState<any>(null);
  const [processes, setProcesses] = useState<any>(null);
  const [docker, setDocker] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const historyRef = useRef<HistoryPoint[]>([]);

  // Check auth status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/status`);
        const data = await res.json();
        setAuthEnabled(data.authEnabled);
        if (!data.authEnabled) {
          // No auth needed, get a token anyway
          const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: '' }),
          });
          const loginData = await loginRes.json();
          setToken(loginData.token);
          localStorage.setItem('monitess_token', loginData.token);
        }
      } catch { /* ignore */ }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  // Load disk + system info once (they don't change often)
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/metrics/disk`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/api/metrics/system`, { headers }).then(r => r.json()),
    ]).then(([d, s]) => {
      setDisk(d);
      setSystemInfo(s);
    }).catch(() => {});

    // Refresh disk every 30s
    const timer = setInterval(() => {
      fetch(`${API_BASE}/api/metrics/disk`, { headers }).then(r => r.json()).then(setDisk).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [token]);

  const handleMessage = useCallback((msg: any) => {
    if (msg.type === 'auth') {
      if (msg.status === 'required') {
        // Token invalid, force re-login
        setToken(null);
        localStorage.removeItem('monitess_token');
      }
      return;
    }
    if (msg.type === 'metrics') {
      if (msg.cpu) setCpu(msg.cpu);
      if (msg.ram) setRam(msg.ram);
      if (msg.network) setNetwork(msg.network);
      if (msg.temperature) setTemperature(msg.temperature);
      if (msg.processes) setProcesses(msg.processes);
      if (msg.docker !== undefined) setDocker(msg.docker);

      // Accumulate history
      if (msg.cpu && msg.ram) {
        const point: HistoryPoint = {
          ts: msg.ts || Date.now(),
          cpu: msg.cpu.usage,
          ram: msg.ram.usagePercent,
          netRx: msg.network?.[0]?.rxSec ?? 0,
          netTx: msg.network?.[0]?.txSec ?? 0,
          temp: msg.temperature?.main ?? null,
        };
        historyRef.current = [
          ...historyRef.current.slice(-MAX_HISTORY + 1),
          point,
        ];
        setHistory([...historyRef.current]);
      }
    }
  }, []);

  const shouldConnect = authChecked && (token !== null || !authEnabled);
  const { status } = useWebSocket({
    token: shouldConnect ? token : null,
    onMessage: handleMessage,
  });

  function handleLogin(newToken: string) {
    setToken(newToken);
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem('monitess_token');
  }

  function handleLangChange(l: Lang) {
    setLang(l);
    localStorage.setItem('monitess_lang', l);
  }

  // Show login if auth required and no token
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ animation: 'spin 1s linear infinite', fontSize: 24 }}>⟳</div>
      </div>
    );
  }

  if (authEnabled && !token) {
    return <LoginScreen onLogin={handleLogin} lang={lang} />;
  }

  return (
    <div>
      <Header
        status={status}
        lang={lang}
        onLangChange={handleLangChange}
        onLogout={handleLogout}
        authEnabled={authEnabled}
        hostname={systemInfo?.hostname}
      />

      <main style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
        {/* Loading state */}
        {!cpu && !ram && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 24, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⟳</div>
            <div>{t(lang, 'connecting')}</div>
          </div>
        )}

        {(cpu || ram) && (
          <div className="dashboard-grid">
            {/* Row 1: System info */}
            <SystemWidget data={systemInfo} lang={lang} />

            {/* CPU */}
            <CpuWidget
              data={cpu}
              history={history.map(h => ({ ts: h.ts, cpu: h.cpu }))}
              lang={lang}
            />

            {/* RAM */}
            <RamWidget
              data={ram}
              history={history.map(h => ({ ts: h.ts, ram: h.ram }))}
              lang={lang}
            />

            {/* Temperature */}
            <TempWidget data={temperature} lang={lang} />

            {/* Network */}
            <NetworkWidget
              data={network}
              history={history.map(h => ({ ts: h.ts, netRx: h.netRx, netTx: h.netTx }))}
              lang={lang}
            />

            {/* Disk */}
            <DiskWidget data={disk} lang={lang} />

            {/* History — wide */}
            <HistoryWidget data={history} lang={lang} />

            {/* Processes — wide */}
            <ProcessWidget data={processes} lang={lang} />

            {/* Docker — wide */}
            <DockerWidget data={docker} lang={lang} />
          </div>
        )}

        {/* Logs & Alerts panel — expande abaixo de tudo */}
        {(cpu || ram) && (
          <LogsPanel token={token} lang={lang} />
        )}
      </main>
    </div>
  );
}
