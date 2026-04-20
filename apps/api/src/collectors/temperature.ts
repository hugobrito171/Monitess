import si from 'systeminformation';

export interface TempData {
  main: number | null;
  cores: number[];
  gpu: number | null;
  max: number | null;
}

export async function getTemperatureData(): Promise<TempData> {
  try {
    const temps = await si.cpuTemperature();
    return {
      main: temps.main ?? null,
      cores: temps.cores ?? [],
      gpu: temps.gpu ?? null,
      max: temps.max ?? null,
    };
  } catch {
    return { main: null, cores: [], gpu: null, max: null };
  }
}
