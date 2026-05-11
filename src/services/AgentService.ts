import { eventBus } from '../core/events';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import { estimateTokens } from '../utils/tokenEstimate';

export interface AgentStats {
  calls: number;
  tokens: number;
  latency: number;
}

const STATS_KEY = 'super_agents_agent_stats';

class AgentService {
  private stats: Map<string, AgentStats> = new Map();
  private unsubs: Array<() => void> = [];

  constructor() {
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  async init() {
    await this.load();
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

  private persist() {
    db.setKv(STATS_KEY, Object.fromEntries(this.stats)).catch(e => console.error(e));
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        if (!data?.nodeId) return;
        const cur = this.stats.get(data.nodeId) || { calls: 0, tokens: 0, latency: 0 };
        const tokens = data.output ? estimateTokens(data.output) : 0;
        this.stats.set(data.nodeId, {
          calls: cur.calls + 1,
          tokens: cur.tokens + tokens,
          latency: data.duration ? Math.round((cur.latency * cur.calls + data.duration) / (cur.calls + 1)) : cur.latency,
        });
        this.persist();
      })
    );
  }

  getStats(nodeId: string): AgentStats {
    return this.stats.get(nodeId) || { calls: 0, tokens: 0, latency: 0 };
  }

  getAllStats(): Record<string, AgentStats> {
    return Object.fromEntries(this.stats);
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
    const newId = `agent-${Date.now()}`;
    top.nodes.push({
      id: newId, type: 'agent', label: name,
      config: { roleId, roleName: 'General Assistant', prompt: 'You are a helpful AI assistant.', model: 'auto', tools: [], temperature: 0.7 }
    });
    const entry = top.nodes.find(n => n.type === 'router' || n.id === 'entry');
    if (entry) top.edges.push({ id: `edge-${Date.now()}`, from: entry.id, to: newId, trigger: 'on_success' });
    orchestrator.mount({ ...top });
    return newId;
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
      id: n.id,
      type: n.type,
      label: n.label,
      config: n.config
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
          top.nodes.push({
            id: item.id,
            type: item.type,
            label: item.label,
            config: item.config
          });
          count++;
        }
      }
      
      orchestrator.mount({ ...top });
      return count;
    } catch (e) {
      console.error('[AgentService] Failed to import agents', e);
      throw new Error('Failed to import agents');
    }
  }
}

export const agentService = new AgentService();
