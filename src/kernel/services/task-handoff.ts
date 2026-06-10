import { EVENTS } from '../events/event-names';

const MAX_HANDOFFS = 200; // B10-144: Cap handoffs to prevent unbounded growth

export interface HandoffRequest {
  id: string;
  fromAgent: string;
  toAgent: string;
  description: string;
  context: string;
  expectedOutput?: string;
  deadline?: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'pending' | 'accepted' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  completedAt?: number;
  result?: string;
}

export interface TaskHandoffServiceDeps {
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
}

export class TaskHandoffService {
  private deps: TaskHandoffServiceDeps;
  private handoffs: Map<string, HandoffRequest> = new Map();

  constructor(deps: TaskHandoffServiceDeps) {
    this.deps = deps;
  }

  handoff(opts: {
    fromAgent: string;
    toAgent: string;
    description: string;
    context: string;
    expectedOutput?: string;
    deadline?: number;
    priority?: 'critical' | 'high' | 'normal' | 'low';
  }): HandoffRequest {
    const req: HandoffRequest = {
      id: `handoff-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
      fromAgent: opts.fromAgent,
      toAgent: opts.toAgent,
      description: opts.description,
      context: opts.context,
      expectedOutput: opts.expectedOutput,
      deadline: opts.deadline,
      priority: opts.priority || 'normal',
      status: 'pending',
      createdAt: Date.now(),
    };
    this.handoffs.set(req.id, req);
    // B10-144: Cap handoffs map to prevent unbounded growth
    if (this.handoffs.size > MAX_HANDOFFS) {
      const oldestKey = this.handoffs.keys().next().value;
      if (oldestKey) this.handoffs.delete(oldestKey);
    }
    this.deps.eventBus.emit(EVENTS.AGENT_HANDOFF_INITIATED, {
      id: req.id,
      fromAgent: req.fromAgent,
      toAgent: req.toAgent,
      description: req.description,
      priority: req.priority,
    });
    return req;
  }

  accept(id: string) {
    const req = this.handoffs.get(id);
    if (req && req.status === 'pending') req.status = 'accepted';
  }

  complete(id: string, result: string) {
    const req = this.handoffs.get(id);
    if (req) { req.status = 'completed'; req.result = result; req.completedAt = Date.now(); }
  }

  fail(id: string, error: string) {
    const req = this.handoffs.get(id);
    if (req) { req.status = 'failed'; req.result = error; req.completedAt = Date.now(); }
  }

  cancel(id: string) {
    const req = this.handoffs.get(id);
    if (req && (req.status === 'pending' || req.status === 'accepted')) req.status = 'cancelled';
  }

  getHandoffs(agentId?: string): HandoffRequest[] {
    const all = Array.from(this.handoffs.values());
    if (agentId) return all.filter(h => h.fromAgent === agentId || h.toAgent === agentId);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  getPendingFor(agentId: string): HandoffRequest[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.toAgent === agentId && h.status === 'pending')
      .sort((a, b) => {
        const prio: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
        return (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2);
      });
  }
}
