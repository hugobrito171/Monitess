import si from 'systeminformation';

export interface NetworkData {
  iface: string;
  rxSec: number;
  txSec: number;
  rxTotal: number;
  txTotal: number;
}

let lastNetStats: si.Systeminformation.NetworkStatsData[] = [];

export async function getNetworkData(): Promise<NetworkData[]> {
  const stats = await si.networkStats();
  lastNetStats = stats;
  return stats
    .filter(n => n.iface && n.rx_sec >= 0 && n.tx_sec >= 0)
    .map(n => ({
      iface: n.iface,
      rxSec: Math.max(0, n.rx_sec ?? 0),
      txSec: Math.max(0, n.tx_sec ?? 0),
      rxTotal: n.rx_bytes,
      txTotal: n.tx_bytes,
    }));
}
