import { useState, useEffect, useRef, useCallback } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

interface UseWebSocketOptions {
  token?: string | null;
  onMessage: (data: unknown) => void;
}

const WS_BASE = (() => {
  if (import.meta.env.DEV) return 'ws://localhost:3001/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
})();

export function useWebSocket({ token, onMessage }: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    const url = token ? `${WS_BASE}?token=${token}` : WS_BASE;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setStatus('connected');
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage(data);
      } catch { /* ignore */ }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      if (!isMounted.current) return;
      setStatus('disconnected');
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, [token, onMessage]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { status };
}
