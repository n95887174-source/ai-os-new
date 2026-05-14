import { eventBus } from '../core/events';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import { estimateTokens } from '../utils/tokenEstimate';

export interface AgentStats {
  calls: number;
  tokens: number;
  latency: number;
  errors: number;
  avgTokensPerCall: number;
  lastActive: number;
}

export interface AgentGroup {
  id: string;
  name: string;
  agentIds: string[];
  description?: string;
  created: number;
}

const STATS_KEY = 'super_agents_agent_stats';
const GROUPS_KEY = 'super_agents_agent_groups';

export class AgentService {
  private stats: Map<string, AgentStats> = new Map();
  private groups: AgentGroup[] = [];
  private unsubs: Array<() => void> = [];

  constructor() {
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  async init() {
    await this.load();
    await this.loadGroups();
  }

  private async load() {
    try {
      const parsed = await db.getKv<Record<string, AgentStats>>(STATS_KEY);
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
      const parsed = await db.getKv<AgentGroup[]>(GROUPS_KEY);
      if (parsed) this.groups = parsed;
    } catch (e) {
      console.error('[AgentService] Failed to load groups', e);
    }
  }

  private persist() {
    db.setKv(STATS_KEY, Object.fromEntries(this.stats)).catch(e => console.error('[AgentService] Failed to persist stats:', e));
    db.setKv(GROUPS_KEY, this.groups).catch(e => console.error('[AgentService] Failed to persist groups:', e));
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        if (!(data as { nodeId?: string }).nodeId) return;
        const { nodeId, duration, status, output } = data as { nodeId: string; duration?: number; status?: string; output?: string };
        const cur = this.stats.get(nodeId) || { calls: 0, tokens: 0, latency: 0, errors: 0, avgTokensPerCall: 0, lastActive: 0 };
        const tokens = output ? estimateTokens(output) : 0;
        const newCalls = cur.calls + 1;
        this.stats.set(nodeId, {
          calls: newCalls,
          tokens: cur.tokens + tokens,
          latency: duration ? Math.round((cur.latency * cur.calls + duration) / newCalls) : cur.latency,
          errors: status === 'error' ? cur.errors + 1 : cur.errors,
          avgTokensPerCall: Math.round((cur.avgTokensPerCall * cur.calls + tokens) / newCalls),
          lastActive: Date.now(),
        });
        this.persist();
      }),
      eventBus.on('chat:stream:end', (data) => {
        const d = data as { requestId?: string; provider?: string; tokens?: number };
        if (!d.requestId) return;
        const cur = this.stats.get(d.provider || 'unknown') || { calls: 0, tokens: 0, latency: 0, errors: 0, avgTokensPerCall: 0, lastActive: 0 };
        cur.calls++;
        if (d.tokens) cur.tokens += d.tokens;
        cur.lastActive = Date.now();
        this.stats.set(d.provider || 'unknown', cur);
        this.persist();
      })
    );
  }

  getStats(nodeId: string): AgentStats {
    return this.stats.get(nodeId) || { calls: 0, tokens: 0, latency: 0, errors: 0, avgTokensPerCall: 0, lastActive: 0 };
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
    const top = orchestrator.getActiveTopology();
    if (!top) return [];
    return top.nodes.filter(n => n.type === 'agent' || n.type === 'router').map(n => ({
      id: n.id,
      name: n.label,
      role: n.type === 'router' ? 'Semantic Router' : ((n.config.roleName as string) || 'Autonomous Agent'),
      status: orchestrator.isNodeDisabled(n.id) ? 'paused' : 'active',
      stats: this.getStats(n.id),
    }));
  }

  spawnAgent(name: string, roleId?: string) {
    const top = orchestrator.getActiveTopology();
    if (!top) return null;
    const newId = `agent-${crypto.randomUUID().slice(0, 8)}`;
    top.nodes.push({
      id: newId, type: 'agent', label: name,
      config: { roleId, roleName: 'General Assistant', prompt: 'You are a helpful AI assistant.', model: 'auto', tools: [], temperature: 0.7 }
    });
    const entry = top.nodes.find(n => n.type === 'router' || n.id === 'entry');
    if (entry) top.edges.push({ id: `edge-${crypto.randomUUID().slice(0, 8)}`, from: entry.id, to: newId, trigger: 'on_success' });
    orchestrator.mount({ ...top });
    eventBus.emit('system:node:spawn', { id: newId, name });
    return newId;
  }

  updateAgent(agentId: string, updates: Record<string, unknown>) {
    const top = orchestrator.getActiveTopology();
    if (!top) throw new Error('No active topology');
    const node = top.nodes.find(n => n.id === agentId);
    if (!node) throw new Error(`Agent ${agentId} not found`);
    const { label, ...configUpdates } = updates;
    node.config = { ...node.config, ...configUpdates };
    if (label) node.label = label as string;
    orchestrator.mount({ ...top });
  }

  deleteAgent(agentId: string) {
    const top = orchestrator.getActiveTopology();
    if (!top) return;
    top.nodes = top.nodes.filter(n => n.id !== agentId);
    top.edges = top.edges.filter(e => e.from !== agentId && e.to !== agentId);
    orchestrator.mount({ ...top });
    for (const group of this.groups) {
      group.agentIds = group.agentIds.filter(id => id !== agentId);
    }
    this.persist();
    eventBus.emit('system:node:removed', { id: agentId });
  }

  toggleAgent(id: string) {
    orchestrator.setNodeDisabled(id, !orchestrator.isNodeDisabled(id));
  }

  pauseAllAgents() {
    const top = orchestrator.getActiveTopology();
    if (!top) return;
    top.nodes.filter(n => n.type === 'agent' || n.type === 'router').forEach(n => {
      orchestrator.setNodeDisabled(n.id, true);
    });
  }

  resumeAllAgents() {
    const top = orchestrator.getActiveTopology();
    if (!top) return;
    top.nodes.filter(n => n.type === 'agent' || n.type === 'router').forEach(n => {
      orchestrator.setNodeDisabled(n.id, false);
    });
  }

  exportAgents() {
    const top = orchestrator.getActiveTopology();
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
      const top = orchestrator.getActiveTopology();
      if (!top) return 0;
      let count = 0;
      for (const item of imported) {
        const exists = top.nodes.some(n => n.id === item.id);
        if (!exists) {
          top.nodes.push({ id: item.id, type: item.type, label: item.label, config: item.config });
          count++;
        }
      }
      orchestrator.mount({ ...top });
      return count;
    } catch (e) {
      console.error('[AgentService] Failed to import agents', e);
      throw new Error('Failed to import agents', { cause: e });
    }
  }

  resetStats(nodeId: string) {
    this.stats.set(nodeId, { calls: 0, tokens: 0, latency: 0, errors: 0, avgTokensPerCall: 0, lastActive: 0 });
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

export const agentService = new AgentService();
