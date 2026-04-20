// In-memory circular buffer for metric history
// 1 sample/2s → 1800 points = 1h; 10800 = 6h; 43200 = 24h

export interface HistoryPoint {
  ts: number; // unix ms
  cpu: number;
  ram: number;
  netRx: number;
  netTx: number;
  temp: number | null;
}

const MAX_POINTS = 43200; // 24h @ 2s intervals
const history: HistoryPoint[] = [];

export function pushHistory(point: HistoryPoint): void {
  history.push(point);
  if (history.length > MAX_POINTS) {
    history.shift();
  }
}

export function getHistory(minutes: number): HistoryPoint[] {
  const since = Date.now() - minutes * 60 * 1000;
  return history.filter(p => p.ts >= since);
}

export function getHistoryRaw(): HistoryPoint[] {
  return [...history];
}
