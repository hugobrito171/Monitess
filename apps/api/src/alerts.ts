import { stmts } from './db.js';

// ==========================
// Thresholds configuráveis via env
// ==========================
const THRESHOLDS = {
  cpu: {
    warning:  parseInt(process.env.ALERT_CPU_WARNING  || '75'),
    critical: parseInt(process.env.ALERT_CPU_CRITICAL || '90'),
  },
  ram: {
    warning:  parseInt(process.env.ALERT_RAM_WARNING  || '80'),
    critical: parseInt(process.env.ALERT_RAM_CRITICAL || '92'),
  },
  temp: {
    warning:  parseInt(process.env.ALERT_TEMP_WARNING  || '70'),
    critical: parseInt(process.env.ALERT_TEMP_CRITICAL || '85'),
  },
  docker: {
    cpu:      parseInt(process.env.ALERT_DOCKER_CPU      || '80'),
    ram:      parseInt(process.env.ALERT_DOCKER_RAM      || '80'),
    restarts: parseInt(process.env.ALERT_DOCKER_RESTARTS || '5'),
  },
};

// Estado de alertas ativos em memória (para evitar duplicatas no DB)
const activeAlerts = new Map<string, { severity: string; since: number }>();

// Estado anterior dos containers Docker (para detectar mudanças de estado)
const prevDockerState = new Map<string, {
  state: string;
  restartCount: number;
  isKillingOthers: boolean;
  isUnhealthy: boolean;
}>();

function alertKey(type: string, source: string): string {
  return `${type}::${source}`;
}

function raiseAlert(params: {
  type: string;
  severity: 'warning' | 'critical';
  source: string;
  message: string;
  value: number;
}): void {
  const key = alertKey(params.type, params.source);
  const existing = activeAlerts.get(key);

  // Se já existe com mesma severidade, não duplica
  if (existing && existing.severity === params.severity) return;

  // Se existe com severidade diferente, resolve o anterior
  if (existing) {
    stmts.resolveAlert.run(Date.now(), params.type, params.source);
  }

  activeAlerts.set(key, { severity: params.severity, since: Date.now() });
  stmts.insertAlert.run({
    ts:       Date.now(),
    type:     params.type,
    severity: params.severity,
    source:   params.source,
    message:  params.message,
    value:    params.value,
  });

  console.log(`[ALERT] [${params.severity.toUpperCase()}] ${params.message}`);
}

function resolveAlert(type: string, source: string): void {
  const key = alertKey(type, source);
  if (!activeAlerts.has(key)) return;

  activeAlerts.delete(key);
  stmts.resolveAlert.run(Date.now(), type, source);
}

// ==========================
// Checagens de métricas do host
// ==========================
export function checkHostMetrics(metrics: {
  cpu: number;
  ram: number;
  temp: number | null;
}): void {
  // CPU
  if (metrics.cpu >= THRESHOLDS.cpu.critical) {
    raiseAlert({ type: 'cpu', severity: 'critical', source: 'host', message: `CPU crítica: ${metrics.cpu.toFixed(1)}%`, value: metrics.cpu });
  } else if (metrics.cpu >= THRESHOLDS.cpu.warning) {
    raiseAlert({ type: 'cpu', severity: 'warning', source: 'host', message: `CPU alta: ${metrics.cpu.toFixed(1)}%`, value: metrics.cpu });
  } else {
    resolveAlert('cpu', 'host');
  }

  // RAM
  if (metrics.ram >= THRESHOLDS.ram.critical) {
    raiseAlert({ type: 'ram', severity: 'critical', source: 'host', message: `RAM crítica: ${metrics.ram.toFixed(1)}%`, value: metrics.ram });
  } else if (metrics.ram >= THRESHOLDS.ram.warning) {
    raiseAlert({ type: 'ram', severity: 'warning', source: 'host', message: `RAM alta: ${metrics.ram.toFixed(1)}%`, value: metrics.ram });
  } else {
    resolveAlert('ram', 'host');
  }

  // Temperatura
  if (metrics.temp !== null) {
    if (metrics.temp >= THRESHOLDS.temp.critical) {
      raiseAlert({ type: 'temp', severity: 'critical', source: 'host', message: `Temperatura crítica: ${metrics.temp.toFixed(0)}°C`, value: metrics.temp });
    } else if (metrics.temp >= THRESHOLDS.temp.warning) {
      raiseAlert({ type: 'temp', severity: 'warning', source: 'host', message: `Temperatura alta: ${metrics.temp.toFixed(0)}°C`, value: metrics.temp });
    } else {
      resolveAlert('temp', 'host');
    }
  }
}

// ==========================
// Checagens de containers Docker
// ==========================
export function checkDockerMetrics(containers: Array<{
  id: string;
  name: string;
  image: string;
  state: string;
  cpuPercent: number;
  memPercent: number;
  restartCount: number;
  isKillingOthers: boolean;
  isUnhealthy: boolean;
}>): void {
  const ts = Date.now();

  for (const c of containers) {
    const prev = prevDockerState.get(c.name);

    // --- Alertas de recurso ---
    if (c.state === 'running') {
      if (c.cpuPercent >= THRESHOLDS.docker.cpu) {
        raiseAlert({
          type: 'docker', severity: c.cpuPercent >= 95 ? 'critical' : 'warning',
          source: c.name,
          message: `Container "${c.name}" consumindo ${c.cpuPercent.toFixed(1)}% CPU`,
          value: c.cpuPercent,
        });
      } else {
        resolveAlert('docker', c.name);
      }
    }

    // --- Eventos de mudança de estado ---
    if (!prev) {
      // Primeiro snapshot — registra estado inicial
      prevDockerState.set(c.name, {
        state: c.state,
        restartCount: c.restartCount,
        isKillingOthers: c.isKillingOthers,
        isUnhealthy: c.isUnhealthy,
      });
      continue;
    }

    // Detecta crash (rodando → exited com restart)
    if (prev.state === 'running' && c.state === 'exited') {
      stmts.insertDockerEvent.run({
        ts, container_id: c.id, container_name: c.name, image: c.image,
        event: 'crash',
        cpu_at_event:   c.cpuPercent,
        mem_at_event:   c.memPercent,
        restart_count:  c.restartCount,
        details: JSON.stringify({ prev_state: prev.state }),
      });
      stmts.insertAlert.run({
        ts, type: 'docker', severity: 'critical', source: c.name,
        message: `Container "${c.name}" crashou (exited)`,
        value: c.restartCount,
      });
      console.log(`[DOCKER EVENT] crash: ${c.name}`);
    }

    // Detecta reinicialização (restart count aumentou)
    if (c.restartCount > prev.restartCount) {
      stmts.insertDockerEvent.run({
        ts, container_id: c.id, container_name: c.name, image: c.image,
        event: 'restart',
        cpu_at_event:   c.cpuPercent,
        mem_at_event:   c.memPercent,
        restart_count:  c.restartCount,
        details: JSON.stringify({ previous_count: prev.restartCount }),
      });
      console.log(`[DOCKER EVENT] restart: ${c.name} (${prev.restartCount} → ${c.restartCount})`);
    }

    // Detecta novo "killer" (passou a matar o host)
    if (c.isKillingOthers && !prev.isKillingOthers) {
      stmts.insertDockerEvent.run({
        ts, container_id: c.id, container_name: c.name, image: c.image,
        event: 'killer',
        cpu_at_event:   c.cpuPercent,
        mem_at_event:   c.memPercent,
        restart_count:  c.restartCount,
        details: JSON.stringify({ cpu: c.cpuPercent, mem: c.memPercent }),
      });
      stmts.insertAlert.run({
        ts, type: 'docker', severity: 'critical', source: c.name,
        message: `Container "${c.name}" está matando o host (CPU ${c.cpuPercent.toFixed(1)}%, RAM ${c.memPercent.toFixed(1)}%)`,
        value: c.cpuPercent,
      });
    }

    // Detecta unhealthy
    if (c.isUnhealthy && !prev.isUnhealthy) {
      stmts.insertDockerEvent.run({
        ts, container_id: c.id, container_name: c.name, image: c.image,
        event: 'unhealthy',
        cpu_at_event:   c.cpuPercent,
        mem_at_event:   c.memPercent,
        restart_count:  c.restartCount,
        details: null,
      });
    }

    // Atualiza estado
    prevDockerState.set(c.name, {
      state: c.state,
      restartCount: c.restartCount,
      isKillingOthers: c.isKillingOthers,
      isUnhealthy: c.isUnhealthy,
    });
  }

  // Remove containers que desapareceram
  for (const [name] of prevDockerState) {
    if (!containers.find(c => c.name === name)) {
      prevDockerState.delete(name);
    }
  }
}

export function getThresholds() {
  return THRESHOLDS;
}
