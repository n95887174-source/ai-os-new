import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import type { CanonicalHealthStatus } from '../contracts/health';

export interface AdminAuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error';
}

export interface SystemHealthReport {
  status: CanonicalHealthStatus;
  version: string;
  uptime: number;
  vitals: {
    cpu: number;
    memory: number;
    throughput: number;
    totalRequests: number;
    totalTokens: number;
    avgLatency: number;
    activeConnections: number;
  };
  services: { name: string; status: string }[];
  runtime: { phase: string; uptime: number; version: string };
  alerts: { metric: string; severity: string; value: number }[];
}

interface KeyInfo {
  id: string;
  provider: string;
  key: string;
  status: string;
  stats: { avgLatency: number; extended?: { usageToday?: { requests: number } } };
  createdAt?: number;
  availableModels?: string[];
  label?: string;
}

interface AdminAggregatedMetrics {
  avgLatency: number;
  errorRate: number;
  successRate: number;
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
}

interface MetricAlert {
  metric: string;
  severity: string;
  value: number;
}

export interface AdminServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; onSafe: <T>(event: string, cb: (data: T) => void) => () => void; emit: (event: string, data?: unknown) => void };
  keyService: {
    getKeys: () => KeyInfo[];
    updateKeyStatus: (id: string, status: string, latency?: number) => void;
    handleProviderError: (id: string, error: string) => void;
    setLatencyThreshold?: (ms: number) => void;
  };
  kernel: {
    getState: () => { totalRequests: number; totalTokens: number; estimatedCost: number; decisions: unknown[]; violations: string[]; history?: { timestamp: number }[]; activeSLA?: string; explorationFactor?: number };
    loadState: (json: string) => void;
    resetRuntime: () => void;
    resetMetrics: () => void;
  };
  orchestrator: {
    getActiveTopology: () => { nodes: { id: string; label: string; type: string; config: Record<string, unknown> }[]; name?: string } | null;
    mount: (topology: unknown) => void;
    isNodeDisabled: (id: string) => boolean;
    clearCache?: () => void;
  };
  settingsService: { getSettings: () => Record<string, unknown>; updateSettings: (args: Record<string, unknown>) => void };
  agentService: { resetAllStats: () => void; restartAgent: (agentId: string) => Promise<void> };
  metricsService: {
    generateAggregated: () => AdminAggregatedMetrics;
    getAlerts: (includeResolved?: boolean) => MetricAlert[];
    resetHistory: () => void;
  };
  toolService: { getTools: () => { id: string; name: string; enabled: boolean }[]; toggleTool: (toolId: string) => void };
  roleService: { getAllRoles: () => { id: string; name: string }[]; getRoles?: () => { id: string; name: string }[] };
  snapshotService: { capture: (traceId: string, stepId: string, label?: string) => { id: string } | null; restoreById: (id: string) => boolean; createSnapshot?: (label: string) => { id: string } };
  runtime: { getStatus: () => { phase: string; uptime: number; startTime: number; servicesReady: number; servicesTotal: number; lastError: string | null; memoryUsage: number } };
}

const APP_VERSION = '2.1.0';

export class AdminService {
  private startTime = Date.now();
  private auditLog: AdminAuditEntry[] = [];
  private unsubs: Array<() => void> = [];
  private readonly buildVersion: string = APP_VERSION;
  private deps: AdminServiceDeps;

  constructor(deps: AdminServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ type: string; message: string }>(EVENTS.NOTIFICATION, (d) => {
        this.logAudit({
          action: 'notification',
          actor: 'system',
          target: d.type,
          details: d.message,
          severity: d.type === 'error' ? 'error' : d.type === 'warning' ? 'warning' : 'info',
        });
      })
    );
  }

  private logAudit(entry: Omit<AdminAuditEntry, 'id' | 'timestamp'>) {
    this.auditLog.push({
      ...entry,
      id: `audit-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: Date.now(),
    });
    if (this.auditLog.length > (CONFIG?.services?.admin?.maxAuditEntries ?? 5000)) this.auditLog.shift();
  }

  getSystemHealth(): SystemHealthReport {
    const state = this.deps.kernel.getState();
    const activeKeys = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    const runtimeStatus = this.deps.runtime.getStatus();

    const recentRequests = state.history?.filter(h => h.timestamp > Date.now() - 60000).length || 0;
    const totalReq = state.totalRequests;
    const loadFactor = totalReq > 0 ? Math.min(1, recentRequests / Math.max(1, totalReq * 0.01)) : 0;
    const cpuEstimate = Math.round(5 + loadFactor * 85);

    const aggregated = this.deps.metricsService.generateAggregated();
    const alerts = this.deps.metricsService.getAlerts(false);

    const status: SystemHealthReport['status'] =
      runtimeStatus.phase === 'error' ? 'critical' :
      alerts.some(a => a.severity === 'critical') ? 'critical' :
      alerts.some(a => a.severity === 'warning') ? 'degraded' :
      'healthy';

    return {
      status,
      version: this.buildVersion,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      vitals: {
        cpu: cpuEstimate,
        memory: Math.round(32 + loadFactor * 48),
        throughput: recentRequests,
        totalRequests: state.totalRequests,
        totalTokens: state.totalTokens,
        avgLatency: aggregated.avgLatency,
        activeConnections: activeKeys.length,
      },
      services: [
        { name: 'Kernel', status: runtimeStatus.phase === 'ready' ? 'ready' : 'degraded' },
        { name: 'EventBus', status: 'active' },
        { name: 'Orchestrator', status: this.deps.orchestrator.getActiveTopology() ? 'online' : 'idle' },
        { name: 'Persistence', status: 'online' },
        { name: 'Runtime', status: runtimeStatus.phase },
      ],
      runtime: { ...runtimeStatus, version: '4.2.0' },
      alerts: alerts.map(a => ({ metric: a.metric, severity: a.severity, value: a.value })),
    };
  }

  getProviders() {
    return this.deps.keyService.getKeys().map(({ key, ...rest }) => rest);
  }

  getMetrics() {
    return this.deps.metricsService.generateAggregated();
  }

  getDecisionHistory() {
    return this.deps.kernel.getState().decisions;
  }

  getAuditLog(limit = 50): AdminAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  getAgents() {
    const topology = this.deps.orchestrator.getActiveTopology();
    if (!topology) return [];

    return topology.nodes
      .filter(n => n.type === 'agent' || n.type === 'router')
      .map(n => ({
        id: n.id,
        name: n.label,
        type: n.type,
        status: this.deps.orchestrator.isNodeDisabled(n.id) ? 'paused' : 'active',
        config: n.config,
      }));
  }

  updateAgentConfig(id: string, config: Record<string, unknown>) {
    const topology = this.deps.orchestrator.getActiveTopology();
    if (topology) {
      const node = topology.nodes.find(n => n.id === id);
      if (node) {
        node.config = { ...node.config, ...config };
        this.deps.orchestrator.mount({ ...topology });
        this.logAudit({ action: 'agent:config:updated', actor: 'admin', target: id, details: JSON.stringify(config), severity: 'info' });
      }
    }
    this.deps.eventBus.emit(EVENTS.AGENT_CONFIG_UPDATED, { id, config });
  }

  async createBackup() {
    const backup = this.deps.snapshotService.capture('admin', 'backup', `Manual backup ${new Date().toISOString()}`);
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Backup created: ${backup?.id || 'unknown'}`, type: 'success' });
    return backup;
  }

  async restoreFromBackup(backupId: string) {
    const result = await this.deps.snapshotService.restoreById(backupId);
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: result ? 'Backup restored successfully' : 'Backup restore failed', type: result ? 'success' : 'error' });
    return result;
  }

  initializeRequest() {
    const requestId = `ctrl-${crypto.randomUUID()}`;
    this.deps.eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: 'auto',
      model: 'auto',
      messages: [{ role: 'user', content: 'System health check: run diagnostics.' }],
      requestId,
    });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Control plane request initialized (${requestId})`, type: 'info' });
  }

  manualRoute() {
    const keys = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (keys.length === 0) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'No active providers for manual routing.', type: 'warning' });
      return;
    }
    const best = keys.reduce((a, b) => (a.stats.avgLatency || Number.MAX_SAFE_INTEGER) <= (b.stats.avgLatency || Number.MAX_SAFE_INTEGER) ? a : b);
    this.deps.eventBus.emit(EVENTS.ROUTER_SIGNAL, { provider: best.provider, success: true, wasRaceWinner: true, wasFallback: false, ttft: best.stats.avgLatency || 0 });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Manual route: ${best.provider} (${best.stats.avgLatency || 0}ms)`, type: 'info' });
  }

  reloadRuntime() {
    this.deps.kernel.resetRuntime();
    this.deps.eventBus.emit(EVENTS.RELOAD, { timestamp: Date.now() });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Runtime engine reloaded, state reset', type: 'info' });
    this.logAudit({ action: 'system:reload', actor: 'admin', target: 'runtime', details: 'State reset', severity: 'warning' });
  }

  clearLogs() {
    const prev = this.auditLog.length;
    this.auditLog = [];
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `System logs cleared (${prev} entries)`, type: 'info' });
  }

  resetAllStats() {
    this.deps.agentService.resetAllStats();
    this.deps.metricsService.resetHistory();
    this.deps.kernel.resetMetrics();
    this.logAudit({ action: 'stats:reset', actor: 'admin', target: 'all', details: 'All statistics reset', severity: 'warning' });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'All statistics have been reset', type: 'info' });
  }

  getSystemConfig() {
    return {
      settings: this.deps.settingsService.getSettings(),
      slaLatency: this.deps.kernel.getState().activeSLA,
      explorationFactor: this.deps.kernel.getState().explorationFactor,
      tools: this.deps.toolService.getTools(),
      roles: (this.deps.roleService.getAllRoles || this.deps.roleService.getRoles || (() => []))(),
      topology: this.deps.orchestrator.getActiveTopology(),
      runtime: this.deps.runtime.getStatus(),
    };
  }

  // C-7: Auth token check before destructive operations.
  // Clients must pass a valid session token matching the configured admin secret.
  private verifyAdminToken(token?: string): boolean {
    const expected = CONFIG.security?.adminToken;
    if (!expected) return false;
    return token === expected;
  }

  async executeCommand(command: string, args: Record<string, unknown>, adminToken?: string) {
    // C-7: Require admin token for destructive commands
    if (!this.verifyAdminToken(adminToken)) {
      throw new Error('Unauthorized: invalid admin token');
    }
    this.logAudit({
      action: 'command_execution',
      actor: 'admin',
      target: command,
      details: JSON.stringify(args),
      severity: 'info',
    });

    switch (command) {
      case 'reset_metrics':
        this.deps.kernel.resetMetrics();
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Admin: metrics reset`, type: 'info' });
        break;
      case 'clear_cache':
        this.deps.orchestrator.clearCache?.();
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Admin: cache cleared`, type: 'info' });
        break;
      case 'restart_agent': {
        const agentId = args.agentId;
        if (typeof agentId !== 'string') throw new Error('restart_agent requires string agentId');
        await this.deps.agentService.restartAgent(agentId);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Admin: agent ${agentId} restarted`, type: 'info' });
        break;
      }
      case 'toggle_tool': {
        const toolId = args.toolId;
        if (typeof toolId !== 'string') throw new Error('toggle_tool requires string toolId');
        this.deps.toolService.toggleTool(toolId);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Admin: tool ${toolId} toggled`, type: 'info' });
        break;
      }
      case 'update_settings':
        this.deps.settingsService.updateSettings(args);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Admin: settings updated`, type: 'info' });
        break;
      case 'take_snapshot':
        this.deps.snapshotService.capture('admin', 'snapshot', 'Admin Manual Snapshot');
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Admin: snapshot taken`, type: 'info' });
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  getTopology() {
    return this.deps.orchestrator.getActiveTopology();
  }

  getRoles() {
    return (this.deps.roleService.getAllRoles || this.deps.roleService.getRoles || (() => []))();
  }
}
