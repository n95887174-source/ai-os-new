import { orchestrator } from '../services/OrchestrationService';
import { AuditorTopology } from './IntelligenceDSL';
import { eventBus } from './events';
import { settingsService } from '../services/SettingsService';
import { agentService } from '../services/AgentService';
import { toolService } from '../services/ToolService';
import { advisorService } from '../services/AdvisorService';
import { sandboxService } from '../services/SandboxService';
import { kernel } from './Kernel';
import { memoryService } from '../services/MemoryService';
import { cognitiveService } from '../services/CognitiveService';
import { chatService } from '../services/ChatService';
import { healthCheckService } from '../services/HealthCheckService';
import { keyService } from '../services/KeyService';
import { policyService } from '../services/PolicyService';
import { roleService } from '../services/RoleService';
import { snapshotService } from '../services/SnapshotService';
import { debateService } from '../services/DebateService';
import { metricsService } from '../services/MetricsService';

export type InitPhase = 'pending' | 'kernel' | 'services' | 'topology' | 'ready' | 'failed';

export interface BootstrapReport {
  phase: InitPhase;
  started: number;
  completed: number;
  duration: number;
  error: string | null;
  services: { name: string; status: 'ok' | 'error' | 'skipped'; error?: string }[];
}

class SystemBootstrap {
  private isStarted = false;
  private phase: InitPhase = 'pending';
  private startTime = 0;
  private serviceStatus: BootstrapReport['services'] = [];
  private error: string | null = null;

  private async tryInit<T>(name: string, fn: () => Promise<T> | T): Promise<boolean> {
    try {
      await fn();
      this.serviceStatus.push({ name, status: 'ok' });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.serviceStatus.push({ name, status: 'error', error: msg });
      console.error(`[Bootstrap] Service '${name}' failed:`, e);
      return false;
    }
  }

  async init(): Promise<BootstrapReport> {
    if (this.isStarted) return this.getReport();
    this.isStarted = true;
    this.startTime = Date.now();
    this.serviceStatus = [];
    this.error = null;

    console.log('[Bootstrap] Initializing Super-Agents OS Runtime...');

    this.phase = 'kernel';
    await this.tryInit('kernel', () => kernel.init());

    this.phase = 'services';
    const results = await Promise.all([
      this.tryInit('settings', () => settingsService.init()),
      this.tryInit('agentService', () => agentService.init()),
      this.tryInit('toolService', () => toolService.init()),
      this.tryInit('advisorService', () => advisorService.init()),
    ]);

    if (results.every(Boolean)) {
      this.phase = 'topology';
      try {
        orchestrator.mount(AuditorTopology);
        this.serviceStatus.push({ name: 'topology', status: 'ok' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.serviceStatus.push({ name: 'topology', status: 'error', error: msg });
      }

      eventBus.emit('system:command', { action: 'run_health_checks' });

      eventBus.emit('system:notification', {
        message: 'Kernel initialized. AuditorTopology v1.0.0 mounted.',
        type: 'success',
      });

      this.phase = 'ready';
      eventBus.emit('system:notification', {
        message: 'All core services running. Ready for inputs.',
        type: 'info',
      });
    } else {
      this.phase = 'failed';
      this.error = 'One or more core services failed to initialize';
      eventBus.emit('system:notification', {
        message: 'Bootstrap completed with errors. Some services may be unavailable.',
        type: 'error',
      });
    }

    return this.getReport();
  }

  getReport(): BootstrapReport {
    return {
      phase: this.phase,
      started: this.startTime,
      completed: Date.now(),
      duration: this.startTime ? Date.now() - this.startTime : 0,
      error: this.error,
      services: [...this.serviceStatus],
    };
  }

  getPhase(): InitPhase {
    return this.phase;
  }

  isReady(): boolean {
    return this.phase === 'ready';
  }

  shutdown() {
    console.log('[Bootstrap] Shutting down Super-Agents OS Runtime...');

    this.serviceStatus = [];
    this.error = null;

    kernel.destroy();
    advisorService.destroy();
    agentService.destroy();
    sandboxService.destroy();
    memoryService.destroy();
    cognitiveService.destroy();
    chatService.destroy();
    healthCheckService.destroy();
    keyService.destroy();
    orchestrator.destroy();
    policyService.destroy();
    roleService.destroy();
    snapshotService.destroy();
    (debateService as { destroy?: () => void }).destroy?.();
    (metricsService as { destroy?: () => void }).destroy?.();

    this.isStarted = false;
    this.phase = 'pending';

    console.log('[Bootstrap] Shutdown complete.');
  }
}

export const bootstrapper = new SystemBootstrap();
