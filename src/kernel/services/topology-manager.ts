import type { ILifecycle } from '../contracts/lifecycle';
import type { IEventBus } from '../types/interfaces';
import { EVENTS } from '../events/event-names';
import type { OrchestrationService } from './orchestration-service';
import type { AgentHealthMonitor } from './agent-health-monitor';
import type { MetricsService } from './metrics-service';
import type { AgentService } from './agent-service';
import type { ISTopology, ISNode } from '../contracts/topology';

export interface TopologyManagerDeps {
  eventBus: IEventBus;
  orchestrator: OrchestrationService;
  agentHealthMonitor: AgentHealthMonitor;
  agentService: AgentService;
  metricsService: MetricsService;
}

export class TopologyManager implements ILifecycle {
  private deps: TopologyManagerDeps;
  private unsubs: Array<() => void> = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = true;

  constructor(deps: TopologyManagerDeps) {
    this.deps = deps;
  }

  async init() {}

  async start() {
    this.unsubs.push(
      this.deps.eventBus.onSafe(EVENTS.AGENT_HEALTH_CHANGE, () => {
        this.evaluateTopology();
      })
    );

    this.checkInterval = setInterval(() => {
      this.evaluateTopology();
    }, 60000); // Check every minute
  }

  destroy() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private evaluateTopology() {
    if (!this.enabled) return;

    const topology = this.deps.orchestrator.getActiveTopology();
    if (!topology) return;

    let modified = false;
    const newTopology: ISTopology = JSON.parse(JSON.stringify(topology));

    // Rule 1: failing_agents -> scale_up (replace or add clone)
    const unhealthyAgents = this.deps.agentHealthMonitor.getAllHealth().filter(h => h.health === 'unhealthy' || h.health === 'degraded');
    
    for (const health of unhealthyAgents) {
      const nodeIndex = newTopology.nodes.findIndex(n => n.id === health.agentId);
      if (nodeIndex !== -1) {
        // Find existing clones
        const cloneId = `${health.agentId}-clone-${Date.now()}`;
        const originalNode = newTopology.nodes[nodeIndex];
        
        // Add a clone to take over load
        const cloneNode: ISNode = {
          ...originalNode,
          id: cloneId,
          label: `${originalNode.label} (Failover)`,
          dynamic: true
        };
        newTopology.nodes.push(cloneNode);

        // Copy edges to/from original to clone
        const incomingEdges = newTopology.edges.filter(e => e.to === originalNode.id);
        const outgoingEdges = newTopology.edges.filter(e => e.from === originalNode.id);

        incomingEdges.forEach(e => {
          newTopology.edges.push({ ...e, id: `${e.id}-clone-in-${Date.now()}`, to: cloneId });
        });
        outgoingEdges.forEach(e => {
          newTopology.edges.push({ ...e, id: `${e.id}-clone-out-${Date.now()}`, from: cloneId });
        });

        modified = true;
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { type: 'warning', message: `Topology scaled up due to failing agent ${originalNode.id}` });
      }
    }

    // Rule 2: high_load -> add_agent (horizontal scaling)
    const metrics = this.deps.metricsService.generateAggregated();
    if (metrics.avgLatency > 2000 || metrics.errorRate > 0.1) {
      // Find bottleneck agent
      let bottleneckId = '';
      let highestP95 = 0;
      
      for (const node of newTopology.nodes) {
        const p = this.deps.metricsService.getAgentPercentiles(node.id);
        if (p.p95 > highestP95) {
          highestP95 = p.p95;
          bottleneckId = node.id;
        }
      }

      if (bottleneckId && highestP95 > 2000) {
        const node = newTopology.nodes.find(n => n.id === bottleneckId);
        if (node) {
          const cloneId = `${bottleneckId}-scale-${Date.now()}`;
          const cloneNode: ISNode = {
            ...node,
            id: cloneId,
            label: `${node.label} (Scaled)`,
            dynamic: true
          };
          newTopology.nodes.push(cloneNode);
          
          // Duplicate incoming edges as 'data_flow'
          const incomingEdges = newTopology.edges.filter(e => e.to === node.id);
          incomingEdges.forEach(e => {
            newTopology.edges.push({ ...e, id: `${e.id}-scale-${Date.now()}`, to: cloneId });
          });

          modified = true;
          this.deps.eventBus.emit(EVENTS.NOTIFICATION, { type: 'info', message: `Topology scaled horizontally for bottleneck ${bottleneckId}` });
        }
      }
    }

    if (modified) {
      this.deps.orchestrator.mount(newTopology);
    }
  }
}
