import { container } from './Container';
import { SettingsService } from '../services/SettingsService';
import { AgentService } from '../services/AgentService';
import { ToolService } from '../services/ToolService';
import { AdvisorService } from '../services/AdvisorService';
import { SandboxService } from '../services/SandboxService';
import { SystemKernel } from './Kernel';
import { MemoryService } from '../services/MemoryService';
import { CognitiveService } from '../services/CognitiveService';
import { ChatService } from '../services/ChatService';
import { HealthCheckService } from '../services/HealthCheckService';
import { KeyService } from '../services/KeyService';
import { PolicyService } from '../services/PolicyService';
import { RoleService } from '../services/RoleService';
import { SnapshotService } from '../services/SnapshotService';
import { DebateService } from '../services/DebateService';
import { MetricsService } from '../services/MetricsService';
import { CacheService } from '../services/CacheService';
import { RouterService } from '../services/RouterService';
import { PricingService } from '../services/PricingService';
import { db, dexieDb } from './DatabaseService';
import { securityService } from './SecurityService';
import { eventBus } from './events';
import { runtime } from './runtime';
import { OrchestrationService } from '../services/OrchestrationService';
import { AdminService } from '../services/AdminService';
import { AuditorTopology } from './IntelligenceDSL';

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

  private async tryInit<T>(name: string, fn: () => Promise<T> | T, retries = 2): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await fn();
        this.serviceStatus.push({ name, status: 'ok' });
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt < retries) {
          console.warn(`[Bootstrap] Service '${name}' attempt ${attempt}/${retries} failed, retrying...`);
          await new Promise(r => setTimeout(r, 500 * attempt));
        } else {
          this.serviceStatus.push({ name, status: 'error', error: msg });
          console.error(`[Bootstrap] Service '${name}' failed after ${retries} attempts:`, e);
        }
      }
    }
    return false;
  }

  async init(): Promise<BootstrapReport> {
    if (this.isStarted) return this.getReport();
    this.isStarted = true;
    this.startTime = Date.now();
    this.serviceStatus = [];
    this.error = null;

    console.log('[Bootstrap] Initializing Super-Agents OS Runtime...');

    this.phase = 'kernel';
    
    // Ensure IndexedDB is open
    try {
      await dexieDb.open();
    } catch (e) {
      console.warn('[Bootstrap] Dexie open failed, will retry later:', e instanceof Error ? `${e.name}: ${e.message}` : e);
    }

    // Register Core/Foundation
    container.register('eventBus', eventBus);
    container.register('database', db);
    container.register('securityService', securityService);
    container.register('runtime', runtime);
    container.register('kernel', new SystemKernel());

    await this.tryInit('kernel', () => container.get<any>('kernel').init());

    this.phase = 'services';
    
    // Register Business Services
    container.registerFactory('pricingService', () => new PricingService());
    container.registerFactory('metricsService', () => new MetricsService());
    container.registerFactory('toolService', () => new ToolService());
    container.registerFactory('agentService', () => new AgentService());
    container.registerFactory('orchestrator', () => new OrchestrationService());
    container.registerFactory('cacheService', () => new CacheService());
    container.registerFactory('memoryService', () => new MemoryService());
    container.registerFactory('cognitiveService', () => new CognitiveService());
    container.registerFactory('policyService', () => new PolicyService());
    container.registerFactory('roleService', () => new RoleService());
    container.registerFactory('snapshotService', () => new SnapshotService());
    container.registerFactory('debateService', () => new DebateService());
    container.registerFactory('advisorService', () => new AdvisorService());

    container.registerFactory('keyService', (c) => new KeyService({
      eventBus: c.get('eventBus'),
      securityService: c.get('securityService'),
      pricingService: c.get('pricingService'),
      database: c.get('database')
    }));
    container.registerFactory('routerService', (c) => new RouterService({
      kernel: c.get('kernel'),
      keyService: c.get('keyService'),
      pricingService: c.get('pricingService'),
      eventBus: c.get('eventBus')
    }));
    container.registerFactory('settingsService', (c) => new SettingsService(
      c.get('routerService'),
      c.get('kernel'),
      c.get('database')
    ));
    container.registerFactory('adminService', (c) => new AdminService({
      keyService: c.get('keyService'),
      kernel: c.get('kernel'),
      orchestrator: c.get('orchestrator'),
      settingsService: c.get('settingsService'),
      agentService: c.get('agentService'),
      metricsService: c.get('metricsService'),
      toolService: c.get('toolService'),
      roleService: c.get('roleService'),
      snapshotService: c.get('snapshotService'),
      runtime: c.get('runtime'),
      eventBus: c.get('eventBus')
    }));

    const results = await Promise.all([
      this.tryInit('settings', () => container.get<any>('settingsService').init()),
      this.tryInit('keyService', () => container.get<any>('keyService').init()),
      this.tryInit('toolService', () => container.get<any>('toolService').init()),
      this.tryInit('agentService', () => container.get<any>('agentService').init()),
      this.tryInit('memoryService', () => container.get<any>('memoryService').init()),
      this.tryInit('cognitiveService', () => container.get<any>('cognitiveService').init()),
      this.tryInit('policyService', () => container.get<any>('policyService').init()),
      this.tryInit('roleService', () => container.get<any>('roleService').init()),
      this.tryInit('snapshotService', () => container.get<any>('snapshotService').init()),
      this.tryInit('debateService', () => container.get<any>('debateService').init()),
      this.tryInit('metricsService', () => container.get<any>('metricsService').init()),
      this.tryInit('advisorService', () => container.get<any>('advisorService').init()),
      this.tryInit('cacheService', () => container.get<any>('cacheService').init()),
    ]);

    if (results.every(Boolean)) {
      this.phase = 'topology';
      try {
        container.get<any>('orchestrator').mount(AuditorTopology);
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

  async shutdown() {
    if (!this.isStarted) return;
    console.log('[Bootstrap] Shutting down Super-Agents OS Runtime...');

    const get = <T>(key: string) => { try { return container.get<T>(key); } catch { return undefined as any; } };
    const services: { name: string; destroy: () => void }[] = [
      { name: 'kernel', destroy: () => get<any>('kernel').destroy() },
      { name: 'advisorService', destroy: () => get<any>('advisorService')?.destroy() },
      { name: 'agentService', destroy: () => get<any>('agentService')?.destroy() },
      { name: 'sandboxService', destroy: () => get<any>('sandboxService')?.() },
      { name: 'memoryService', destroy: () => get<any>('memoryService')?.destroy() },
      { name: 'cognitiveService', destroy: () => get<any>('cognitiveService')?.destroy() },
      { name: 'chatService', destroy: () => get<any>('chatService')?.() },
      { name: 'healthCheckService', destroy: () => get<any>('healthCheckService')?.destroy() },
      { name: 'keyService', destroy: () => get<any>('keyService')?.destroy() },
      { name: 'orchestrator', destroy: () => get<any>('orchestrator')?.destroy() },
      { name: 'policyService', destroy: () => get<any>('policyService')?.destroy() },
      { name: 'roleService', destroy: () => get<any>('roleService')?.destroy() },
      { name: 'snapshotService', destroy: () => get<any>('snapshotService')?.destroy() },
      { name: 'debateService', destroy: () => get<any>('debateService')?.destroy?.() },
      { name: 'metricsService', destroy: () => get<any>('metricsService')?.destroy?.() },
    ];

    for (const svc of services) {
      try { svc.destroy(); } catch (e) { console.warn(`[Bootstrap] Error shutting down ${svc.name}:`, e); }
    }

    this.serviceStatus = [];
    this.error = null;
    this.isStarted = false;
    this.phase = 'pending';

    console.log('[Bootstrap] Shutdown complete.');
  }
}

export const bootstrapper = new SystemBootstrap();
