import si from 'systeminformation';

export interface DiskEntry {
  fs: string;
  type: string;
  size: number;
  used: number;
  available: number;
  use: number;
  mount: string;
}

export async function getDiskData(): Promise<DiskEntry[]> {
  const fsData = await si.fsSize();
  return fsData
    .filter(d => d.size > 0)
    .map(d => ({
      fs: d.fs,
      type: d.type,
      size: d.size,
      used: d.used,
      available: d.size - d.used,
      use: Math.round(d.use * 100) / 100,
      mount: d.mount,
    }));
}
