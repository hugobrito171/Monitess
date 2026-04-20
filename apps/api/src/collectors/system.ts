import si from 'systeminformation';

export interface SystemInfo {
  hostname: string;
  os: string;
  platform: string;
  arch: string;
  kernel: string;
  uptime: number;
  timezone: string;
  bootTime: string;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const [osInfo, time] = await Promise.all([si.osInfo(), si.time()]);
  return {
    hostname: osInfo.hostname,
    os: `${osInfo.distro} ${osInfo.release}`,
    platform: osInfo.platform,
    arch: osInfo.arch,
    kernel: osInfo.kernel,
    uptime: Math.floor(time.uptime),
    timezone: osInfo.timezone ?? time.timezone,
    bootTime: new Date(Date.now() - time.uptime * 1000).toISOString(),
  };
}
