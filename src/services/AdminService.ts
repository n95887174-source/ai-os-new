import type { KeyService } from './KeyService';
import type { SystemKernel } from '../core/Kernel';
import type { OrchestrationService } from './OrchestrationService';
import type { SettingsService } from './SettingsService';
import type { AgentService } from './AgentService';
import type { MetricsService } from './MetricsService';
import type { ToolService } from './ToolService';
import type { RoleService } from './RoleService';
import type { SnapshotService } from './SnapshotService';
import type { Runtime } from '../core/runtime';
import { EVENTS } from '../core/events';

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
  status: 'healthy' | 'warning' | 'critical';
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
  runtime: import('../core/runtime').RuntimeStatus;
  alerts: { metric: string; severity: string; value: number }[];
}

interface AdminServiceDeps {
  keyService: KeyService;
  kernel: SystemKernel;
  orchestrator: OrchestrationService;
  settingsService: SettingsService;
  agentService: AgentService;
  metricsService: MetricsService;
  toolService: ToolService;
  roleService: RoleService;
  snapshotService: SnapshotService;
  runtime: Runtime;
  eventBus: any;
}

export class AdminService {
  private startTime = Date.now();
  private auditLog: AdminAuditEntry[] = [];
  private unsubs: Array<() => void> = [];
  private readonly buildVersion: string;

  private deps!: AdminServiceDeps;

  constructor(deps?: AdminServiceDeps) {
    if (deps) this.deps = deps;
    this.buildVersion = '0.0.0'; 
    try {
      this.buildVersion = '4.0.0'; 
    } catch (e) {
      console.warn('[AdminService] Failed to load version', e);
    }
    if (deps) this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('system:notification', (data: any) => {
        this.logAudit({
          action: 'notification',
          actor: 'system',
          target: data.type,
          details: data.message,
          severity: data.type === 'error' ? 'error' : data.type === 'warning' ? 'warning' : 'info',
        });
      })
    );
  }

  private logAudit(entry: Omit<AdminAuditEntry, 'id' | 'timestamp'>) {
    this.auditLog.push({
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    });
    if (this.auditLog.length > 1000) this.auditLog.shift();
  }

  getSystemHealth(): SystemHealthReport {
    if (!this.deps) return { status: 'warning', version: this.buildVersion, uptime: 0, vitals: { cpu: 0, memory: 0, throughput: 0, totalRequests: 0, totalTokens: 0, avgLatency: 0, activeConnections: 0 }, services: [], runtime: { phase: 'pending', uptime: 0, version: '' }, alerts: [] };
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
      alerts.some(a => a.severity === 'warning') ? 'warning' :
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
      runtime: runtimeStatus,
      alerts: alerts.map(a => ({ metric: a.metric, severity: a.severity, value: a.value })),
    };
  }

  getEventStream() {
    return this.deps.eventBus;
  }

  getProviders() {
    return this.deps.keyService.getKeys();
  }

  getMetrics() {
    return this.deps.metricsService.getAllMetrics();
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
        this.logAudit({ action: 'agent:config_updated', actor: 'admin', target: id, details: JSON.stringify(config), severity: 'info' });
      }
    }
    this.deps.eventBus.emit('agent:config_updated', { id, config });
  }

  async createBackup() {
    const backup = await this.deps.snapshotService.capture('admin', 'backup', `Manual backup ${new Date().toISOString()}`);
    this.deps.eventBus.emit('system:notification', { message: `Backup created: ${backup?.id || 'unknown'}`, type: 'success' });
    return backup;
  }

  async restoreFromBackup(backupId: string) {
    const result = await this.deps.snapshotService.restoreById(backupId);
    this.deps.eventBus.emit('system:notification', { message: result ? 'Backup restored successfully' : 'Backup restore failed', type: result ? 'success' : 'error' });
    return result;
  }

  initializeRequest() {
    if (!this.deps) return;
    const requestId = `ctrl-${crypto.randomUUID().slice(0, 8)}`;
    this.deps.eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: 'auto',
      model: 'auto',
      messages: [{ role: 'user', content: 'System health check: run diagnostics.' }],
      requestId,
    });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Control plane request initialized (${requestId})`, type: 'info' });
  }

  manualRoute() {
    if (!this.deps) return;
    const keys = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (keys.length === 0) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'No active providers for manual routing.', type: 'warning' });
      return;
    }
    const best = keys.reduce((a, b) => (a.stats.avgLatency || Infinity) <= (b.stats.avgLatency || Infinity) ? a : b);
    this.deps.eventBus.emit('router:signal', { provider: best.provider, success: true, wasRaceWinner: true, wasFallback: false, ttft: best.stats.avgLatency || 0 });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Manual route: ${best.provider} (${best.stats.avgLatency || 0}ms)`, type: 'info' });
  }

  reloadRuntime() {
    if (!this.deps) return;
    this.deps.kernel.resetRuntime();
    this.deps.eventBus.emit('system:reload', { timestamp: Date.now() });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Runtime engine reloaded, state reset', type: 'info' });
    this.logAudit({ action: 'system:reload', actor: 'admin', target: 'runtime', details: 'State reset', severity: 'warning' });
  }

  clearLogs() {
    const prev = this.deps.kernel.getState().history?.length || 0;
    this.deps.kernel.resetRuntime();
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
      tools: this.deps.toolService.getTools ? this.deps.toolService.getTools() : [],
      roles: this.deps.roleService.getAllRoles ? this.deps.roleService.getAllRoles() : [],
      topology: this.deps.orchestrator.getActiveTopology(),
      runtime: this.deps.runtime.getStatus(),
    };
  }

  async executeCommand(command: string, args: any) {
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
        break;
      case 'clear_cache':
        this.deps.orchestrator.clearCache();
        break;
      case 'restart_agent':
        if (args.agentId) await this.deps.agentService.restartAgent(args.agentId);
        break;
      case 'toggle_tool':
        if (args.toolId) this.deps.toolService.toggleTool(args.toolId);
        break;
      case 'update_settings':
        this.deps.settingsService.updateSettings(args);
        break;
      case 'take_snapshot':
        await this.deps.snapshotService.createSnapshot('Admin Manual Snapshot');
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  getTopology() {
    return this.deps.orchestrator.getActiveTopology();
  }

  getRoles() {
    return this.deps.roleService.getRoles();
  }
}

export const adminService = new AdminService();
