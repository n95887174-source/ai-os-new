import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import { kernel } from '../core/Kernel';
import { orchestrator } from './OrchestrationService';
import { settingsService } from './SettingsService';
import { agentService } from './AgentService';
import { metricsService } from './MetricsService';
import { runtime } from '../core/runtime';
import { toolService } from './ToolService';
import { roleService } from './RoleService';
import { snapshotService } from './SnapshotService';

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

class AdminService {
  private startTime = Date.now();
  private auditLog: AdminAuditEntry[] = [];
  private unsubs: Array<() => void> = [];
  private readonly buildVersion: string;

  constructor() {
    this.buildVersion = pkg.version || '0.0.0';
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('system:notification', (data) => {
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
    const state = kernel.getState();
    const activeKeys = keyService.getKeys().filter(k => k.status === 'active');
    const runtimeStatus = runtime.getStatus();

    const recentRequests = state.history?.filter(h => h.timestamp > Date.now() - 60000).length || 0;
    const totalReq = state.totalRequests;
    const loadFactor = totalReq > 0 ? Math.min(1, recentRequests / Math.max(1, totalReq * 0.01)) : 0;
    const cpuEstimate = Math.round(5 + loadFactor * 85);

    const aggregated = metricsService.generateAggregated();
    const alerts = metricsService.getAlerts(false);

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
        { name: 'Orchestrator', status: orchestrator.getActiveTopology() ? 'online' : 'idle' },
        { name: 'Persistence', status: 'online' },
        { name: 'Runtime', status: runtimeStatus.phase },
      ],
      runtime: runtimeStatus,
      alerts: alerts.map(a => ({ metric: a.metric, severity: a.severity, value: a.value })),
    };
  }

  getEventStream() {
    return eventBus;
  }

  getProviders() {
    return keyService.getKeys();
  }

  getMetrics() {
    return metricsService.getAllMetrics();
  }

  getDecisionHistory() {
    return kernel.getState().decisions;
  }

  getAuditLog(limit = 50): AdminAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  getAgents() {
    const topology = orchestrator.getActiveTopology();
    if (!topology) return [];

    return topology.nodes
      .filter(n => n.type === 'agent' || n.type === 'router')
      .map(n => ({
        id: n.id,
        name: n.label,
        type: n.type,
        status: orchestrator.isNodeDisabled(n.id) ? 'paused' : 'active',
        config: n.config,
      }));
  }

  updateAgentConfig(id: string, config: Record<string, unknown>) {
    const topology = orchestrator.getActiveTopology();
    if (topology) {
      const node = topology.nodes.find(n => n.id === id);
      if (node) {
        node.config = { ...node.config, ...config };
        orchestrator.mount({ ...topology });
        this.logAudit({ action: 'agent:config_updated', actor: 'admin', target: id, details: JSON.stringify(config), severity: 'info' });
      }
    }
    eventBus.emit('agent:config_updated', { id, config });
  }

  async createBackup() {
    const backup = await snapshotService.capture('admin', 'backup', `Manual backup ${new Date().toISOString()}`);
    eventBus.emit('system:notification', { message: `Backup created: ${backup?.id || 'unknown'}`, type: 'success' });
    return backup;
  }

  async restoreFromBackup(backupId: string) {
    const result = await snapshotService.restoreById(backupId);
    eventBus.emit('system:notification', { message: result ? 'Backup restored successfully' : 'Backup restore failed', type: result ? 'success' : 'error' });
    return result;
  }

  initializeRequest() {
    const requestId = `ctrl-${crypto.randomUUID().slice(0, 8)}`;
    eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: 'auto',
      model: 'auto',
      messages: [{ role: 'user', content: 'System health check: run diagnostics.' }],
      requestId,
    });
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Control plane request initialized (${requestId})`, type: 'info' });
  }

  manualRoute() {
    const keys = keyService.getKeys().filter(k => k.status === 'active');
    if (keys.length === 0) {
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'No active providers for manual routing.', type: 'warning' });
      return;
    }
    const best = keys.reduce((a, b) => (a.stats.avgLatency || Infinity) <= (b.stats.avgLatency || Infinity) ? a : b);
    eventBus.emit('router:signal', { provider: best.provider, success: true, wasRaceWinner: true, wasFallback: false, ttft: best.stats.avgLatency || 0 });
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Manual route: ${best.provider} (${best.stats.avgLatency || 0}ms)`, type: 'info' });
  }

  reloadRuntime() {
    kernel.resetRuntime();
    eventBus.emit('system:reload', { timestamp: Date.now() });
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Runtime engine reloaded, state reset', type: 'info' });
    this.logAudit({ action: 'system:reload', actor: 'admin', target: 'runtime', details: 'State reset', severity: 'warning' });
  }

  clearLogs() {
    const prev = kernel.getState().history?.length || 0;
    kernel.resetRuntime();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `System logs cleared (${prev} entries)`, type: 'info' });
  }

  resetAllStats() {
    agentService.resetAllStats();
    metricsService.resetHistory();
    kernel.resetMetrics();
    this.logAudit({ action: 'stats:reset', actor: 'admin', target: 'all', details: 'All statistics reset', severity: 'warning' });
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'All statistics have been reset', type: 'info' });
  }

  getSystemConfig() {
    return {
      settings: settingsService.getSettings(),
      slaLatency: kernel.getState().activeSLA,
      explorationFactor: kernel.getState().explorationFactor,
      tools: toolService.getTools ? toolService.getTools() : [],
      roles: roleService.getAllRoles ? roleService.getAllRoles() : [],
      topology: orchestrator.getActiveTopology(),
      runtime: runtime.getStatus(),
    };
  }
}

export const adminService = new AdminService();
