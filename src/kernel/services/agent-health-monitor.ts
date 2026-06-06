import type { ILifecycle } from '../contracts/lifecycle';
import type { IEventBus } from '../types/interfaces';
import { EVENTS } from '../events/event-names';
import type { AgentHealth, AgentHealthSnapshot } from '../contracts/agent-health';

export type { AgentHealth, AgentHealthSnapshot } from '../contracts/agent-health';

const WINDOW_MS = 3600000;
const MAX_ENTRIES = 1000;

interface StepRecord {
  agentId: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

export interface AgentHealthMonitorDeps {
  eventBus: IEventBus;
}

export class AgentHealthMonitor implements ILifecycle {
  private deps: AgentHealthMonitorDeps;
  private records: StepRecord[] = [];
  private healthCache = new Map<string, AgentHealthSnapshot>();
  private unsubs: Array<() => void> = [];

  constructor(deps: AgentHealthMonitorDeps) {
    this.deps = deps;
  }

  async init() {}

  async start() {
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ nodeId: string; duration: number; status: string }>(EVENTS.COGNITIVE_STEP_COMPLETED, (data) => {
        this.ingest(data.nodeId, data.duration, data.status !== 'error');
      }),
    );
  }

  destroy() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.records = [];
    this.healthCache.clear();
  }

  ingest(agentId: string, duration: number, success: boolean) {
    this.records.push({ agentId, duration, success, timestamp: Date.now() });
    if (this.records.length > MAX_ENTRIES) this.records.shift();
    this.recompute(agentId);
  }

  getHealth(agentId: string): AgentHealthSnapshot {
    const cached = this.healthCache.get(agentId);
    if (cached) return cached;
    return {
      agentId, health: 'healthy', errorRate: 0, avgLatency: 0, p95Latency: 0,
      consecutiveErrors: 0, totalCalls: 0, lastUpdated: Date.now(),
    };
  }

  getAllHealth(): AgentHealthSnapshot[] {
    return Array.from(this.healthCache.values());
  }

  private recompute(agentId: string) {
    const cutoff = Date.now() - WINDOW_MS;
    const agentRecords = this.records.filter(r => r.agentId === agentId && r.timestamp >= cutoff);

    if (agentRecords.length === 0) return;

    const totalCalls = agentRecords.length;
    const errors = agentRecords.filter(r => !r.success).length;
    const errorRate = totalCalls > 0 ? errors / totalCalls : 0;
    const totalDuration = agentRecords.reduce((s, r) => s + r.duration, 0);
    const avgLatency = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const sorted = agentRecords.map(r => r.duration).sort((a, b) => a - b);
    const p95Idx = Math.ceil(sorted.length * 0.95) - 1;
    const p95Latency = p95Idx >= 0 ? sorted[p95Idx] : 0;

    let consecutiveErrors = 0;
    for (let i = agentRecords.length - 1; i >= 0; i--) {
      if (!agentRecords[i].success) consecutiveErrors++;
      else break;
    }

    let health: AgentHealth = 'healthy';
    if (errorRate > 0.8 || consecutiveErrors >= 5) health = 'unhealthy';
    else if (errorRate > 0.5) health = 'degraded';

    const prev = this.healthCache.get(agentId);
    this.healthCache.set(agentId, { agentId, health, errorRate, avgLatency, p95Latency, consecutiveErrors, totalCalls, lastUpdated: Date.now() });

    if (!prev || prev.health !== health) {
      this.deps.eventBus.emit(EVENTS.AGENT_HEALTH_CHANGE, {
        id: agentId,
        from: prev?.health ?? 'healthy',
        to: health,
        errorRate,
        consecutiveErrors,
      });
    }
  }
}
