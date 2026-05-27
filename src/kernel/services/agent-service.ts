import type { ISTopology } from '../contracts/topology';
import { EVENTS } from '../events/event-names';
import { estimateTokens } from '../../utils/tokenEstimate';

export interface AgentStats {
  calls: number;
  tokens: number;
  latency: number;
  errors: number;
  avgTokensPerCall: number;
  lastActive: number;
  estimatedCost: number;
}

export interface AgentGroup {
  id: string;
  name: string;
  agentIds: string[];
  description?: string;
  created: number;
}

export interface AgentServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  orchestrator: {
    getActiveTopology: () => ISTopology | null;
    isNodeDisabled: (nodeId: string) => boolean;
    mount: (topology: ISTopology) => void;
    setNodeDisabled: (nodeId: string, disabled: boolean) => void;
  };
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  pricingService: {
    calculateCost: (model: string, inputTokens: number, outputTokens: number) => number;
  };
}

const STATS_KEY = 'super_agents_agent_stats';
const GROUPS_KEY = 'super_agents_agent_groups';

export class AgentService {
  private deps: AgentServiceDeps;
  private stats: Map<string, AgentStats> = new Map();
  private groups: AgentGroup[] = [];
  private unsubs: Array<() => void> = [];

  constructor(deps: AgentServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupListeners();
    await this.load();
    await this.loadGroups();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private async load() {
    try {
      const parsed = await this.deps.database.getKv<Record<string, AgentStats>>(STATS_KEY);
      if (parsed) {
        for (const [nodeId, s] of Object.entries(parsed)) {
          this.stats.set(nodeId, s);
        }
      }
    } catch (e) {
      console.error('[AgentService] Failed to load stats', e);
    }
  }

  private async loadGroups() {
    try {
      const parsed = await this.deps.database.getKv<AgentGroup[]>(GROUPS_KEY);
      if (parsed) this.groups = parsed;
    } catch (e) {
      console.error('[AgentService] Failed to load groups', e);
    }
  }

  private persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private persist() {
    if (this.persistDebounceTimer) clearTimeout(this.persistDebounceTimer);
    this.persistDebounceTimer = setTimeout(() => {
      this.deps.database.setKv(STATS_KEY, Object.fromEntries(this.stats)).catch(e => console.error('[AgentService] Failed to persist stats:', e));
      this.deps.database.setKv(GROUPS_KEY, this.groups).catch(e => console.error('[AgentService] Failed to persist groups:', e));
      this.persistDebounceTimer = null;
    }, 2000);
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ nodeId: string; duration?: number; status?: string; output?: string; provider?: string }>(EVENTS.COGNITIVE_STEP_COMPLETED, (d) => {
        if (!d.nodeId) return;
        const cur = this.stats.get(d.nodeId) || this.emptyStats();
        const tokens = d.output ? estimateTokens(d.output) : 0;
        const cost = this.deps.pricingService.calculateCost('gpt-4o-mini', Math.round(tokens * 0.3), tokens);
        const newCalls = cur.calls + 1;
        this.stats.set(d.nodeId, {
          calls: newCalls,
          tokens: cur.tokens + tokens,
          latency: d.duration ? Math.round((cur.latency * cur.calls + d.duration) / newCalls) : cur.latency,
          errors: d.status === 'error' ? cur.errors + 1 : cur.errors,
          avgTokensPerCall: Math.round((cur.avgTokensPerCall * cur.calls + tokens) / newCalls),
          lastActive: Date.now(),
          estimatedCost: cur.estimatedCost + cost,
        });
        this.persist();
      }),
      this.deps.eventBus.onSafe<{ requestId?: string; provider?: string; tokens?: number; model?: string; fullContent?: string }>(EVENTS.STREAM_END, (d) => {
        if (!d.requestId) return;
        const cur = this.stats.get(d.provider || 'unknown') || this.emptyStats();
        const tokens = d.tokens || estimateTokens(d.fullContent || '');
        const cost = this.deps.pricingService.calculateCost(d.model || 'gpt-4o-mini', Math.round(tokens * 0.3), tokens);
        cur.calls++;
        if (d.tokens) cur.tokens += d.tokens;
        cur.estimatedCost += cost;
        cur.lastActive = Date.now();
        this.stats.set(d.provider || 'unknown', cur);
        this.persist();
      })
    );
  }

  private emptyStats(): AgentStats {
    return { calls: 0, tokens: 0, latency: 0, errors: 0, avgTokensPerCall: 0, lastActive: 0, estimatedCost: 0 };
  }

  getStats(nodeId: string): AgentStats {
    return this.stats.get(nodeId) || this.emptyStats();
  }

  getAllStats(): Record<string, AgentStats> {
    return Object.fromEntries(this.stats);
  }

  getTopAgents(limit = 5, sortBy: 'calls' | 'tokens' | 'latency' = 'calls'): Array<{ id: string; name: string; stats: AgentStats }> {
    const agents = this.getAgents();
    return agents
      .sort((a, b) => (b.stats[sortBy] || 0) - (a.stats[sortBy] || 0))
      .slice(0, limit);
  }

  getAgents(): Array<{ id: string; name: string; role: string; status: string; stats: AgentStats }> {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) return [];
    return top.nodes.filter(n => n.type === 'agent' || n.type === 'router').map(n => ({
      id: n.id,
      name: n.label,
      role: n.type === 'router' ? 'Semantic Router' : ((n.config.roleName as string) || 'Autonomous Agent'),
      status: this.deps.orchestrator.isNodeDisabled(n.id) ? 'paused' : 'active',
      stats: this.getStats(n.id),
    }));
  }

  spawnAgent(name: string, roleId?: string, config?: Record<string, unknown>) {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) {
      console.warn('[AgentService] spawnAgent failed: no active topology. Try mounting a topology first.');
      return null;
    }
    const newId = `agent-${crypto.randomUUID().slice(0, 8)}`;
    top.nodes.push({
      id: newId, type: 'agent', label: name,
      config: { roleId, roleName: 'General Assistant', prompt: 'You are a helpful AI assistant.', model: 'auto', tools: [], temperature: 0.7, ...config }
    });
    const entry = top.nodes.find(n => n.type === 'router' || n.id === 'entry');
    if (entry) top.edges.push({ id: `edge-${crypto.randomUUID().slice(0, 8)}`, from: entry.id, to: newId, trigger: 'on_success' });
    this.deps.orchestrator.mount({ ...top });
    this.deps.eventBus.emit(EVENTS.SYSTEM_NODE_SPAWN, { id: newId, name });
    return newId;
  }

  updateAgent(agentId: string, updates: Record<string, unknown>) {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) throw new Error('No active topology');
    const node = top.nodes.find(n => n.id === agentId);
    if (!node) throw new Error(`Agent ${agentId} not found`);
    const { label, ...configUpdates } = updates;
    node.config = { ...node.config, ...configUpdates };
    if (label) node.label = label as string;
    this.deps.orchestrator.mount({ ...top });
  }

  deleteAgent(agentId: string) {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) return;
    top.nodes = top.nodes.filter(n => n.id !== agentId);
    top.edges = top.edges.filter(e => e.from !== agentId && e.to !== agentId);
    this.deps.orchestrator.mount({ ...top });
    for (const group of this.groups) {
      group.agentIds = group.agentIds.filter(id => id !== agentId);
    }
    this.persist();
    this.deps.eventBus.emit(EVENTS.SYSTEM_NODE_REMOVED, { id: agentId });
  }

  toggleAgent(id: string) {
    this.deps.orchestrator.setNodeDisabled(id, !this.deps.orchestrator.isNodeDisabled(id));
  }

  pauseAllAgents() {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) return;
    top.nodes.filter(n => n.type === 'agent' || n.type === 'router').forEach(n => {
      this.deps.orchestrator.setNodeDisabled(n.id, true);
    });
  }

  resumeAllAgents() {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) return;
    top.nodes.filter(n => n.type === 'agent' || n.type === 'router').forEach(n => {
      this.deps.orchestrator.setNodeDisabled(n.id, false);
    });
  }

  exportAgents() {
    const top = this.deps.orchestrator.getActiveTopology();
    if (!top) return JSON.stringify([]);
    const agents = top.nodes.filter(n => n.type === 'agent' || n.type === 'router').map(n => ({
      id: n.id, type: n.type, label: n.label, config: n.config,
    }));
    return JSON.stringify(agents, null, 2);
  }

  importAgents(jsonData: string) {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      const top = this.deps.orchestrator.getActiveTopology();
      if (!top) return 0;
      let count = 0;
      for (const item of imported) {
        if (typeof item.id !== 'string' || typeof item.type !== 'string') continue;
        const exists = top.nodes.some(n => n.id === item.id);
        if (!exists) {
          top.nodes.push({ id: item.id, type: item.type, label: item.label ?? '', config: item.config ?? {} });
          count++;
        }
      }
      this.deps.orchestrator.mount({ ...top });
      return count;
    } catch (e) {
      console.error('[AgentService] Failed to import agents', e);
      throw new Error('Failed to import agents', { cause: e as Error });
    }
  }

  resetStats(nodeId: string) {
    this.stats.set(nodeId, this.emptyStats());
    this.persist();
  }

  resetAllStats() {
    this.stats.clear();
    this.persist();
  }

  createGroup(name: string, agentIds: string[], description?: string): AgentGroup {
    const group: AgentGroup = {
      id: `group-${crypto.randomUUID().slice(0, 8)}`,
      name,
      agentIds,
      description,
      created: Date.now(),
    };
    this.groups.push(group);
    this.persist();
    return group;
  }

  deleteGroup(id: string) {
    this.groups = this.groups.filter(g => g.id !== id);
    this.persist();
  }

  getGroups(): AgentGroup[] {
    return [...this.groups];
  }

  addToGroup(groupId: string, agentId: string) {
    const group = this.groups.find(g => g.id === groupId);
    if (group && !group.agentIds.includes(agentId)) {
      group.agentIds.push(agentId);
      this.persist();
    }
  }

  removeFromGroup(groupId: string, agentId: string) {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      group.agentIds = group.agentIds.filter(id => id !== agentId);
      this.persist();
    }
  }
}
