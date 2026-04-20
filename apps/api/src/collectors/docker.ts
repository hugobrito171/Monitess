import Dockerode from 'dockerode';

export interface ContainerStats {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  memPercent: number;
  netRx: number;
  netTx: number;
  blockRead: number;
  blockWrite: number;
  restartCount: number;
  isUnhealthy: boolean;
  isKillingOthers: boolean; // HIGH resource hog flag
  alerts: string[];
  created: string;
  ports: string[];
}

// Thresholds for "killing others" detection
const CPU_KILLER_THRESHOLD = 80;   // % CPU
const MEM_KILLER_THRESHOLD = 80;   // % of host RAM limit
const RESTART_KILLER_THRESHOLD = 5; // restart count

function parseCpuPercent(stats: any): number {
  try {
    const cpu = stats.cpu_stats;
    const preCpu = stats.precpu_stats;
    const cpuDelta = cpu.cpu_usage.total_usage - preCpu.cpu_usage.total_usage;
    const systemDelta = cpu.system_cpu_usage - preCpu.system_cpu_usage;
    const numCpus = cpu.online_cpus || cpu.cpu_usage.percpu_usage?.length || 1;
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numCpus * 100.0;
    }
    return 0;
  } catch {
    return 0;
  }
}

function parseNetworkIO(stats: any): { rx: number; tx: number } {
  try {
    const networks = stats.networks || {};
    let rx = 0;
    let tx = 0;
    for (const iface of Object.values(networks) as any[]) {
      rx += iface.rx_bytes || 0;
      tx += iface.tx_bytes || 0;
    }
    return { rx, tx };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function parseBlockIO(stats: any): { read: number; write: number } {
  try {
    const blk = stats.blkio_stats?.io_service_bytes_recursive || [];
    let read = 0;
    let write = 0;
    for (const entry of blk) {
      if (entry.op === 'Read') read += entry.value;
      if (entry.op === 'Write') write += entry.value;
    }
    return { read, write };
  } catch {
    return { read: 0, write: 0 };
  }
}

export async function getDockerContainers(): Promise<ContainerStats[]> {
  let docker: Dockerode;

  try {
    // Try Docker socket paths (Linux first, then Windows)
    const socketPath = process.platform === 'win32'
      ? '//./pipe/docker_engine'
      : '/var/run/docker.sock';
    docker = new Dockerode({ socketPath });
  } catch {
    return [];
  }

  try {
    const containers = await docker.listContainers({ all: true });
    const results: ContainerStats[] = [];

    for (const cInfo of containers) {
      try {
        const container = docker.getContainer(cInfo.Id);
        const inspect = await container.inspect();

        let cpuPercent = 0;
        let memUsage = 0;
        let memLimit = 0;
        let memPercent = 0;
        let netRx = 0;
        let netTx = 0;
        let blockRead = 0;
        let blockWrite = 0;

        // Only fetch stats for running containers
        if (cInfo.State === 'running') {
          try {
            const stats = await new Promise<any>((resolve, reject) => {
              container.stats({ stream: false }, (err: Error | null, data: any) => {
                if (err) reject(err);
                else resolve(data);
              });
            });

            cpuPercent = Math.round(parseCpuPercent(stats) * 100) / 100;
            memUsage = stats.memory_stats?.usage || 0;
            memLimit = stats.memory_stats?.limit || 0;
            memPercent = memLimit > 0
              ? Math.round((memUsage / memLimit) * 10000) / 100
              : 0;
            const net = parseNetworkIO(stats);
            netRx = net.rx;
            netTx = net.tx;
            const blk = parseBlockIO(stats);
            blockRead = blk.read;
            blockWrite = blk.write;
          } catch {
            // Stats not available
          }
        }

        const restartCount = inspect.RestartCount || 0;
        const alerts: string[] = [];

        // Killer detection logic
        if (cpuPercent > CPU_KILLER_THRESHOLD) {
          alerts.push(`⚠️ CPU alta: ${cpuPercent.toFixed(1)}%`);
        }
        if (memPercent > MEM_KILLER_THRESHOLD) {
          alerts.push(`⚠️ Memória alta: ${memPercent.toFixed(1)}%`);
        }
        if (restartCount > RESTART_KILLER_THRESHOLD) {
          alerts.push(`🔁 Reinicializações frequentes: ${restartCount}x`);
        }
        const health = inspect.State?.Health?.Status;
        if (health === 'unhealthy') {
          alerts.push('❌ Container UNHEALTHY');
        }
        if (cInfo.State === 'exited') {
          const exitCode = inspect.State?.ExitCode;
          if (exitCode && exitCode !== 0) {
            alerts.push(`💀 Saiu com código de erro: ${exitCode}`);
          }
        }

        const isKillingOthers =
          cpuPercent > CPU_KILLER_THRESHOLD ||
          memPercent > MEM_KILLER_THRESHOLD ||
          restartCount > RESTART_KILLER_THRESHOLD;

        const isUnhealthy = health === 'unhealthy' || cInfo.State === 'dead';

        const ports = (cInfo.Ports || [])
          .filter((p: any) => p.PublicPort)
          .map((p: any) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`);

        results.push({
          id: cInfo.Id.substring(0, 12),
          name: (cInfo.Names[0] || '').replace(/^\//, ''),
          image: cInfo.Image,
          status: cInfo.Status,
          state: cInfo.State,
          cpuPercent,
          memUsage,
          memLimit,
          memPercent,
          netRx,
          netTx,
          blockRead,
          blockWrite,
          restartCount,
          isUnhealthy,
          isKillingOthers,
          alerts,
          created: new Date(cInfo.Created * 1000).toISOString(),
          ports,
        });
      } catch {
        // Skip this container if inspection fails
      }
    }

    // Sort: problematic first, then by CPU usage
    return results.sort((a, b) => {
      const scoreA = (a.isKillingOthers ? 100 : 0) + (a.isUnhealthy ? 50 : 0);
      const scoreB = (b.isKillingOthers ? 100 : 0) + (b.isUnhealthy ? 50 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.cpuPercent - a.cpuPercent;
    });
  } catch {
    return [];
  }
}
