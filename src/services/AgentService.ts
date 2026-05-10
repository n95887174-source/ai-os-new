import { eventBus } from '../core/events';
import { orchestrator } from './OrchestrationService';

export interface AgentStats {
  calls: number;
  tokens: number;
  latency: number;
}

const STATS_KEY = 'super_agents_agent_stats';

class AgentService {
  private stats: Map<string, AgentStats> = new Map();

  constructor() {
    this.load();
    this.setupListeners();
  }

  private async load() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          for (const [nodeId, s] of Object.entries(parsed)) {
            this.stats.set(nodeId, s as AgentStats);
          }
        } catch (e) {
          console.error('[AgentService] Failed to load stats from localStorage', e);
        }
      }
    } catch (e) {
      console.error('[AgentService] Failed to load stats', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(Object.fromEntries(this.stats)));
    } catch (e) {
      console.error('[AgentService] Failed to persist stats', e);
    }
  }

  private setupListeners() {
    eventBus.on('cognitive:step:completed', (data: any) => {
      if (!data?.nodeId) return;
      const cur = this.stats.get(data.nodeId) || { calls: 0, tokens: 0, latency: 0 };
      const tokens = data.output ? Math.ceil(data.output.length / 4) : 0;
      this.stats.set(data.nodeId, {
        calls: cur.calls + 1,
        tokens: cur.tokens + tokens,
        latency: data.duration ? Math.round((cur.latency * cur.calls + data.duration) / (cur.calls + 1)) : cur.latency,
      });
      this.persist();
    });
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
      role: n.type === 'router' ? 'Semantic Router' : (n.config.roleName || 'Autonomous Agent'),
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
}

export const agentService = new AgentService();
