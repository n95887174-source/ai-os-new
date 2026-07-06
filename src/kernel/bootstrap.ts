import type { IBootstrap, IEventBus } from './types/interfaces';
import { type IContainer } from './container';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { LoggerService } from './services/logger-service';
import { EVENTS } from './events/event-names';
import { getDexieDb } from './services/database-service';
import { AuditorTopology } from './state/topology-defaults';
import { ConfigService } from './services/config-service';
import { KeyService } from './services/key-management/key-service';
import { KeyStateStore } from './services/key-state-store';
import { ProviderRuntimeService } from './services/provider-runtime/provider-service';
import { RotationService } from './services/rotation-service';
import { EventRecorder } from './services/event-sourcing/event-recorder';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { registerServices } from './service-registration/index';
import { GroupManagerService } from './services/group-manager';
import type { ApiKey } from './types/metrics-types';
import { MemoryWatchdog } from './utils/memory-watchdog';
import { clearBootstrapSnapshot } from './bootstrap-state';
import {
    CRITICAL_SERVICES,
    RUNNING_DEBATE_PHASES,
    type InitPhase,
    type BootstrapReport,
} from './bootstrap-phases';
import { runKeyMigration, loadBootstrapSnapshot, hydrateKeyStorage } from './bootstrap-key-init';

export type { InitPhase, BootstrapReport };

export class SystemBootstrap implements IBootstrap {
    private isStarted = false;
    private phase: InitPhase = 'pending';
    private startTime = 0;
    private error: string | null = null;
    private container: IContainer;
    private eventBus: IEventBus;
    private lifecycle = new LifecycleManager();
    private logger: LoggerService;
    private memoryWatchdog?: MemoryWatchdog;

    constructor(container: IContainer, eventBus: IEventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.logger = new LoggerService('Bootstrap');
        this.container.register('logger', this.logger);
        this.container.register('container', this.container);
    }

    resolve<T>(name: string): T {
        return this.container.get<T>(name);
    }

    private registerMigratedServices() {
        registerServices(this.container, this.eventBus, this.registerWithLifecycle.bind(this));
    }

    async init(): Promise<BootstrapReport> {
        if (this.isStarted) return this.getReport();
        this.startTime = Date.now();
        this.lifecycle.clearStatuses();
        this.error = null;

        this.logger.info('Bootstrap', 'Initializing Super-Agents OS Runtime...');

        this.phase = 'kernel';

        this.memoryWatchdog = new MemoryWatchdog({
            intervalMs: 5000,
            thresholdMB: 100,
            absoluteThresholdMB: 1500,
        });
        this.memoryWatchdog.start();

        this.registerMigratedServices();

        const configService = this.container.get<ConfigService>('configService');
        await this.lifecycle.tryInit('configService', () => configService.init());

        // ── Key Migration (one-shot) ───────────────────────────────────────
        await runKeyMigration(this.container, this.logger);

        // ════════════════════════════════════════════════════════════════════
        //   BOOTSTRAP SNAPSHOT — read from KeyStore
        // ════════════════════════════════════════════════════════════════════
        await loadBootstrapSnapshot(this.container, this.logger);

        // ════════════════════════════════════════════════════════════════════
        //   HYDRATE KEY STORAGE — normalize keys in KeyStore
        // ════════════════════════════════════════════════════════════════════
        await hydrateKeyStorage(this.container, this.eventBus, this.logger);

        const servicesOk = await this.initServices();
        if (!servicesOk) {
            this.isStarted = true;
            return this.getReport();
        }

        const g = globalThis as unknown as {
            __BOOTSTRAP_PHASE__?: boolean;
            __BOOTSTRAP_KEY_COUNT__?: number;
        };
        g.__BOOTSTRAP_PHASE__ = false;
        g.__BOOTSTRAP_KEY_COUNT__ = 0;
        clearBootstrapSnapshot();

        this.isStarted = true;
        return this.getReport();
    }

    getReport(): BootstrapReport {
        return {
            phase: this.phase,
            started: this.startTime,
            completed: Date.now(),
            duration: this.startTime ? Date.now() - this.startTime : 0,
            error: this.error,
            services: [...this.lifecycle.getStatuses()],
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
        this.logger.info('Bootstrap', 'Shutting down Super-Agents OS Runtime...');

        try {
            (this.container.get('causalScopeManager') as { destroy?: () => void })?.destroy?.();
        } catch {
            /* ignore */
        }
        try {
            (this.container.get('causalTimelineService') as { destroy?: () => void })?.destroy?.();
        } catch {
            /* ignore */
        }
        try {
            (this.container.get('eventBridge') as { stop?: () => void })?.stop?.();
        } catch {
            /* ignore */
        }

        this.memoryWatchdog?.stop();
        await this.lifecycle.shutdown();

        this.lifecycle.clearStatuses();
        this.error = null;
        this.isStarted = false;
        this.phase = 'pending';
        this.logger.info('Bootstrap', 'Shutdown complete.');
    }

    private async initServices(): Promise<boolean> {
        this.phase = 'services';

        await this.lifecycle.initAll();

        // Check for critical service failures
        for (const status of this.lifecycle.getStatuses()) {
            if (status.status === 'error') {
                if (CRITICAL_SERVICES.has(status.name)) {
                    this.logger.error(
                        'Bootstrap',
                        `Critical service ${status.name} failed — aborting`,
                        { error: status.error },
                    );
                    this.phase = 'failed';
                    this.error = `Critical service ${status.name} failed: ${status.error}`;
                    this.eventBus.emit(EVENTS.RUNTIME_FAILED, {
                        error: this.error,
                        phase: this.phase,
                    });
                    return false;
                }
                this.logger.warn(
                    'Bootstrap',
                    `Optional service ${status.name} failed — continuing`,
                    { error: status.error },
                );
                this.eventBus.emit(EVENTS.NOTIFICATION, {
                    message: `Service ${status.name} failed to init`,
                    type: 'warning',
                    source: 'bootstrap',
                });
            }
        }

        this.phase = 'topology';

        await this.lifecycle.tryInit('eventSourcingService', () => {
            return this.container
                .get<EventRecorder>('eventSourcingService')
                .init((cb: (payload: { event: string; data: unknown }) => void) =>
                    this.eventBus.subscribeAll(cb),
                );
        });

        await this.lifecycle.tryInit('providerRuntimeService', () => {
            const prs = this.container.get<ProviderRuntimeService>('providerRuntimeService');
            const ks = this.container.get<KeyService>('keyService');
            const keys: ApiKey[] = ks.getKeys?.() ?? [];
            for (const key of keys) {
                try {
                    prs.createInstance(key);
                } catch (e) {
                    this.logger.warn('Bootstrap', 'createInstance failed', {
                        provider: key.provider,
                        error: e,
                    });
                }
            }
        });

        await this.lifecycle.tryInit('rotationService', async () => {
            const svc = this.container.get<RotationService>('rotationService');
            return svc.init();
        });

        try {
            const orch = this.container.get<Orchestrator>('orchestrator');
            orch.mount(AuditorTopology);
            await orch.init();
        } catch (e) {
            console.error('[BOOTSTRAP] Failed to mount topology:', e);
            this.logger.error('Bootstrap', 'Failed to mount topology', { error: e });
        }

        // ── Init remaining services (created as deps but not explicitly tryInit'd) ──
        for (const entry of this.lifecycle.getEntries()) {
            const hasStatus = this.lifecycle
                .getStatuses()
                .some((s) => s.name === entry.name && s.status === 'ok');
            if (!hasStatus) {
                await this.lifecycle.tryInit(entry.name, () => entry.service.init());
            }
        }

        // ── Start all lifecycle services ───────────────────────────────
        try {
            await this.lifecycle.startAll();
        } catch (e) {
            this.logger.error('Bootstrap', 'startAll() failed — continuing in degraded mode', {
                error: e,
            });
            console.error('[BOOTSTRAP] startAll() failed — continuing:', e);
            this.phase = 'degraded';
        }

        // Group Manager — wraps all key lifecycle
        try {
            const gm = this.container.get<GroupManagerService>('groupManagerService');
            const keysBeforeSync = this.container.get<KeyService>('keyService').getKeys();
            if (import.meta.env.DEV)
                this.logger.debug('Bootstrap', 'GroupManager.syncExistingKeys — keys before sync', {
                    count: keysBeforeSync.length,
                });
            await gm.syncExistingKeys();
            const keysAfterSync = gm.getAllKeys();
            if (import.meta.env.DEV)
                this.logger.debug('Bootstrap', 'GroupManager.syncExistingKeys — keys after sync', {
                    count: keysAfterSync.length,
                });
            this.container.get<KeyService>('keyService').attachGroupManager(gm);
            this.logger.info('Bootstrap', 'Group Manager synced existing keys');
        } catch (e) {
            this.logger.warn('Bootstrap', 'GroupManager syncExistingKeys failed (non-critical)', {
                error: e,
            });
        }

        // Seed KeyStateStore with existing keys
        try {
            const ks = this.container.get<KeyService>('keyService');
            const kss = this.container.get<KeyStateStore>('keyStateStore');
            const existingKeys: ApiKey[] = ks.getKeys?.() ?? [];
            if (import.meta.env.DEV)
                this.logger.debug('Bootstrap', 'KeyStateStore seed', {
                    keyCount: existingKeys.length,
                });
            if (kss && existingKeys.length > 0) {
                kss.seedFromKeys(existingKeys);
                this.logger.info(
                    'Bootstrap',
                    `KeyStateStore seeded with ${existingKeys.length} key(s)`,
                );
            }
        } catch (e) {
            this.logger.warn('Bootstrap', 'KeyStateStore seed failed (non-critical)', { error: e });
        }

        // ── DebateService.init() — loads active session + registers event listeners ──
        try {
            const ds = this.container.get<{ init: () => Promise<void> }>('debateService');
            await ds.init();
            this.logger.info('Bootstrap', 'DebateService initialized');
        } catch (e) {
            this.logger.warn('Bootstrap', 'DebateService init failed (non-critical)', { error: e });
        }

        // Auto-resume interrupted debates found in Dexie after page reload
        try {
            const allSessions = await getDexieDb().debateSessions.toArray();
            let interruptedCount = 0;
            for (const s of allSessions) {
                if (RUNNING_DEBATE_PHASES.has(s.phase)) {
                    await getDexieDb().debateSessions.put({
                        ...s,
                        phase: 'failed',
                        updatedAt: Date.now(),
                        version: (s.version ?? 0) + 1,
                    });
                    interruptedCount++;
                }
            }
            if (interruptedCount > 0) {
                this.logger.info(
                    'Bootstrap',
                    `Marked ${interruptedCount} debate(s) as interrupted (page reload during active session)`,
                );
            }
        } catch (e) {
            this.logger.warn('Bootstrap', 'Auto-resume debate check failed (non-critical)', {
                error: e,
            });
        }

        this.eventBus.emit(EVENTS.NOTIFICATION, {
            message: 'Super-Agents OS Runtime ready',
            type: 'success',
        });
        this.eventBus.emit(EVENTS.RUNTIME_READY, { timestamp: Date.now() });

        this.phase = 'ready';
        return true;
    }

    private registerWithLifecycle(name: string, instance: unknown) {
        if (
            instance &&
            (typeof (instance as ILifecycle).init === 'function' ||
                typeof (instance as ILifecycle).destroy === 'function')
        ) {
            this.lifecycle.register(name, instance as ILifecycle);
        }
    }
}
