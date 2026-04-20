import si from 'systeminformation';

export interface ProcessEntry {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  memBytes: number;
  state: string;
  user: string;
  command: string;
}

export async function getTopProcesses(limit = 15): Promise<ProcessEntry[]> {
  const procs = await si.processes();
  return procs.list
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, limit)
    .map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: Math.round(p.cpu * 100) / 100,
      mem: Math.round(p.mem * 100) / 100,
      memBytes: p.memVsz * 1024,
      state: p.state,
      user: p.user,
      command: p.command,
    }));
}
