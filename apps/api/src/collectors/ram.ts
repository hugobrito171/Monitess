import si from 'systeminformation';

export interface RamData {
  total: number;
  used: number;
  free: number;
  available: number;
  usagePercent: number;
  swapTotal: number;
  swapUsed: number;
  swapUsagePercent: number;
}

export async function getRamData(): Promise<RamData> {
  const mem = await si.mem();
  return {
    total: mem.total,
    used: mem.used,
    free: mem.free,
    available: mem.available,
    usagePercent: Math.round((mem.used / mem.total) * 10000) / 100,
    swapTotal: mem.swaptotal,
    swapUsed: mem.swapused,
    swapUsagePercent: mem.swaptotal > 0
      ? Math.round((mem.swapused / mem.swaptotal) * 10000) / 100
      : 0,
  };
}
