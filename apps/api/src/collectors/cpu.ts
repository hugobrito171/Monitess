import si from 'systeminformation';

export interface CpuData {
  model: string;
  cores: number;
  physicalCores: number;
  speed: number;
  usage: number;
  perCore: number[];
}

export async function getCpuInfo(): Promise<CpuData> {
  const [cpu, load] = await Promise.all([si.cpu(), si.currentLoad()]);
  return {
    model: `${cpu.manufacturer} ${cpu.brand}`,
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    speed: cpu.speed,
    usage: Math.round(load.currentLoad * 100) / 100,
    perCore: load.cpus.map(c => Math.round(c.load * 100) / 100),
  };
}

export async function getCpuUsage(): Promise<{ usage: number; perCore: number[] }> {
  const load = await si.currentLoad();
  return {
    usage: Math.round(load.currentLoad * 100) / 100,
    perCore: load.cpus.map(c => Math.round(c.load * 100) / 100),
  };
}
