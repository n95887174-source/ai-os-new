import type { IBootstrap, IEventBus } from './types/interfaces';
import { type IContainer } from './container';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { LoggerService } from './services/logger-service';
import { EVENTS } from './events/event-names';
import { getDexieDb } from './services/database-service';
import { AuditorTopology } from './state/topology-defaults';
import { SystemKernel } from './kernel';
import { ConfigService } from './services/config-service';
import { KeyService } from './services/key-management/key-service';
import { KeyStateStore } from './services/key-state-store';
import type { ToolService } from './services/tool-executor';
import type { CognitiveService } from './services/cognitive-service';
import type { PolicyService } from './services/policy-service';
import { ProviderRuntimeService } from './services/provider-runtime/provider-service';
import { RotationService } from './services/rotation-service';
import { EventRecorder } from './services/event-sourcing/event-recorder';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { registerServices } from './service-registration/index';
import { ProjectionRegistry } from './services/event-bridge/projection-registry';
import { EventBridge } from './services/event-bridge/event-bridge';
import { RouterProjection } from './services/projections/router-projection';
import { CausalScopeManager } from './services/causal-scope-manager';
import { CausalTimelineService } from './services/causal-timeline-service';
import { CounterfactualEngine } from './services/counterfactual-engine';
import { CounterfactualExplanationService } from './services/counterfactual-explanation-service';
import { CounterfactualNarrativeService } from './services/counterfactual-narrative-service';
import { TemporalReplayService } from './services/temporal-replay-service';
import { TruthConsistencyMonitor } from './services/truth-consistency-monitor';
import { GroupManagerService } from './services/group-manager';
import type { RouterService } from './services/provider-router';
import type { ICausalScopeManager } from './contracts/causal-debugger';
import type { ApiKey } from './types/metrics-types';
import { MemoryWatchdog } from './utils/memory-watchdog';
import { clearBootstrapSnapshot } from './bootstrap-state';
import {
    SERVICE_PHASES,
    CRITICAL_SERVICES,
    RUNNING_DEBATE_PHASES,
    type InitPhase,
    type BootstrapReport,
} from './bootstrap-phases';
import { runKeyMigration, hydrateKeyStorage, loadBootstrapSnapshot } from './bootstrap-key-init';

function getHeapMB(): number {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;
}

export class SystemBootstrap implements IBootstrap {
    private isStarted = false;
    private phase: InitPhase = 'pending';
    private startTime = 0;
    private error: string | null = null;
    private container: IContainer;
    private eventBus: IEventBus;
    private lifecycle = new LifecycleManager();
    private logger: LoggerService;
    private eventBridge: EventBridge | null = null;
    private causalTimeline: CausalTimelineService | null = null;
    private memoryWatchdog = new MemoryWatchdog({
        intervalMs: 5000,
        thresholdMB: 100,
        absoluteThresholdMB: 1500,
    });

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

        this.registerMigratedServices();

        // ── EventBridge (must start BEFORE any events are emitted) ──────────
        if (true) {
            try {
                const registry = new ProjectionRegistry();
                const routerProjection = new RouterProjection();
                registry.register(routerProjection);
                const bridge = new EventBridge(this.eventBus, registry);
                bridge.start();
                this.eventBridge = bridge;
                this.container.register('projectionRegistry', registry);
                this.container.register('routerProjection', routerProjection);
            } catch (e) {
                this.logger.warn('Bootstrap', 'EventBridge init failed (non-critical)', {
                    error: e,
                });
            }
        }

        const kernel = this.container.get<SystemKernel>('kernel');
        await this.lifecycle.tryInit('kernel', () => kernel.init());

        const configService = this.container.get<ConfigService>('configService');
        await this.lifecycle.tryInit('configService', () => configService.init());

        // ── Key Migration (one-shot) ───────────────────────────────────────
        await runKeyMigration(this.container, this.logger);

        // Hydrate: read KeyStore and push to KeyRegistry.
        await hydrateKeyStorage(this.container, this.eventBus, this.logger);

        // ════════════════════════════════════════════════════════════════════
        //   BOOTSTRAP SNAPSHOT — read from KeyStore
        // ════════════════════════════════════════════════════════════════════
        await loadBootstrapSnapshot(this.container, this.logger);

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

        this.memoryWatchdog.start();

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
        if (this.causalTimeline) {
            try {
                this.causalTimeline.destroy();
            } catch (e) {
                this.logger.warn('Bootstrap', 'CausalTimeline destroy failed during shutdown', {
                    error: e,
                });
            }
            this.causalTimeline = null;
        }
        if (this.eventBridge) {
            try {
                this.eventBridge.stop();
            } catch (e) {
                this.logger.warn('Bootstrap', 'EventBridge stop failed during shutdown', {
                    error: e,
                });
            }
            this.eventBridge = null;
        }

        this.memoryWatchdog.stop();
        await this.lifecycle.shutdown();

        this.lifecycle.clearStatuses();
        this.error = null;
        this.isStarted = false;
        this.phase = 'pending';
        this.logger.info('Bootstrap', 'Shutdown complete.');
    }

    private async initServices(): Promise<boolean> {
        this.phase = 'services';

        let criticalFailed = false;
        for (let pIdx = 0; pIdx < SERVICE_PHASES.length; pIdx++) {
            const phaseServices = SERVICE_PHASES[pIdx];
            const memBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } })
                .memory?.usedJSHeapSize;
            this.logger.info(
                'Bootstrap',
                `Phase ${pIdx + 1}/${SERVICE_PHASES.length} starting: ${phaseServices.join(', ')}`,
                { memMB: memBefore ? Math.round(memBefore / 1024 / 1024) : 'n/a' },
            );
            const results = await this.lifecycle.initAllSequential(phaseServices);
            const memAfter = (performance as unknown as { memory?: { usedJSHeapSize: number } })
                .memory?.usedJSHeapSize;
            this.logger.info('Bootstrap', `Phase ${pIdx + 1}/${SERVICE_PHASES.length} done`, {
                memMB: memAfter ? Math.round(memAfter / 1024 / 1024) : 'n/a',
                deltaMB:
                    memBefore && memAfter
                        ? Math.round((memAfter - memBefore) / 1024 / 1024)
                        : 'n/a',
            });
            const entryNames = this.lifecycle
                .getEntries()
                .filter((e) => phaseServices.includes(e.name))
                .map((e) => e.name);

            for (let i = 0; i < results.length; i++) {
                if (!results[i]) {
                    const name = entryNames[i] ?? `unknown-${i}`;
                    if (CRITICAL_SERVICES.has(name)) {
                        this.logger.error(
                            'Bootstrap',
                            `Critical service ${name} failed — aborting`,
                        );
                        criticalFailed = true;
                    } else {
                        this.logger.warn(
                            'Bootstrap',
                            `Optional service ${name} failed — continuing`,
                        );
                        this.eventBus.emit(EVENTS.NOTIFICATION, {
                            message: `Service ${name} failed to init`,
                            type: 'warning',
                            source: 'bootstrap',
                        });
                    }
                }
            }
            if (criticalFailed) break;
            this.eventBus.emit(EVENTS.KERNEL_UPDATED, {
                bootstrapPhase: pIdx + 1,
                totalPhases: SERVICE_PHASES.length,
                phase: this.phase,
            } as Record<string, unknown>);
        }

        if (criticalFailed) {
            this.phase = 'failed';
            this.error = 'One or more critical services failed to initialize';
            this.eventBus.emit(EVENTS.RUNTIME_FAILED, { error: this.error, phase: this.phase });
            return false;
        }

        this.phase = 'topology';

        const memPreEventSourcing = (
            performance as unknown as { memory?: { usedJSHeapSize: number } }
        ).memory?.usedJSHeapSize;
        this.logger.info(
            'Bootstrap',
            `Before eventSourcing init, memMB: ${memPreEventSourcing ? Math.round(memPreEventSourcing / 1024 / 1024) : 'n/a'}`,
        );

        await this.lifecycle.tryInit('eventSourcingService', () => {
            return this.container
                .get<EventRecorder>('eventSourcingService')
                .init((cb: (payload: { event: string; data: Record<string, unknown> }) => void) =>
                    this.eventBus.subscribeAll(cb),
                );
        });

        const memPreProviderRuntime = (
            performance as unknown as { memory?: { usedJSHeapSize: number } }
        ).memory?.usedJSHeapSize;
        this.logger.info(
            'Bootstrap',
            `After eventSourcing, before providerRuntime, memMB: ${memPreProviderRuntime ? Math.round(memPreProviderRuntime / 1024 / 1024) : 'n/a'}`,
        );

        await this.lifecycle.tryInit('providerRuntime', () => {
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

        const memPreRotation = (performance as unknown as { memory?: { usedJSHeapSize: number } })
            .memory?.usedJSHeapSize;
        this.logger.info(
            'Bootstrap',
            `After providerRuntime, before rotation, memMB: ${memPreRotation ? Math.round(memPreRotation / 1024 / 1024) : 'n/a'}`,
        );

        await this.lifecycle.tryInit('rotationService', async () => {
            const svc = this.container.get<RotationService>('rotationService');
            return svc.init();
        });

        const memPostRotation = (performance as unknown as { memory?: { usedJSHeapSize: number } })
            .memory?.usedJSHeapSize;
        this.logger.info(
            'Bootstrap',
            `After rotation, before orchestrator, memMB: ${memPostRotation ? Math.round(memPostRotation / 1024 / 1024) : 'n/a'}`,
        );

        const memBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize;
        this.logger.info(
            'Bootstrap',
            `Before orchestrator + topology, memMB: ${memBefore ? Math.round(memBefore / 1024 / 1024) : 'n/a'}`,
        );

        try {
            const toolService = this.container.get<ToolService>('toolService');
            const cognitiveService = this.container.get<CognitiveService>('cognitiveService');
            const policyService = this.container.get<PolicyService>('policyService');

            const orch = new Orchestrator({
                eventBus: this.eventBus as unknown as {
                    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
                    emit: (event: string, data?: unknown) => void;
                },
                toolService,
                cognitiveService,
                policyService,
            });
            this.container.register('orchestrator', orch);

            const memAfterOrch = (performance as unknown as { memory?: { usedJSHeapSize: number } })
                .memory?.usedJSHeapSize;
            this.logger.info(
                'Bootstrap',
                `After orchestrator created, memMB: ${memAfterOrch ? Math.round(memAfterOrch / 1024 / 1024) : 'n/a'}`,
            );

            orch.mount(AuditorTopology);
            await orch.init();
            await this.lifecycle.tryInit('orchestrator', () => Promise.resolve());

            const memAfterMount = (
                performance as unknown as { memory?: { usedJSHeapSize: number } }
            ).memory?.usedJSHeapSize;
            this.logger.info(
                'Bootstrap',
                `After topology mount, memMB: ${memAfterMount ? Math.round(memAfterMount / 1024 / 1024) : 'n/a'}`,
            );
        } catch (e) {
            this.logger.error('Bootstrap', 'Failed to mount topology', { error: e });
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

        // ── Causal Debugger Layer ────────────────────────────────────────
        {
            const memBefore = getHeapMB();
            this.logger.info('Bootstrap', '[MODULE START] CausalTimelineService');
            try {
                const causalScopeManager = new CausalScopeManager();
                const kss = this.container.get<KeyStateStore>('keyStateStore');
                const routerProjection = this.container.get<RouterProjection>('routerProjection');
                const causalTimelineService = new CausalTimelineService(
                    causalScopeManager,
                    kss,
                    routerProjection,
                    this.eventBus,
                    this.logger,
                );
                causalTimelineService.start();
                this.causalTimeline = causalTimelineService;
                this.container.register('causalScopeManager', causalScopeManager);
                this.container.register('causalTimelineService', causalTimelineService);
                const memAfter = getHeapMB();
                this.logger.info(
                    'Bootstrap',
                    `[MODULE END] CausalTimelineService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB`,
                );
            } catch (e) {
                if (this.causalTimeline) {
                    try {
                        (this.causalTimeline as { destroy?: () => void }).destroy?.();
                    } catch (destroyErr) {
                        this.logger.warn(
                            'Bootstrap',
                            'CausalTimeline destroy failed during cleanup',
                            { error: destroyErr },
                        );
                    }
                }
                this.logger.warn('Bootstrap', 'CausalTimelineService failed (non-critical)', {
                    error: e,
                });
            }
        }

        // ── Counterfactual Engine ────────────────────────────────────────
        {
            const memBefore = getHeapMB();
            this.logger.info('Bootstrap', '[MODULE START] CounterfactualEngine');
            try {
                const routerService = this.container.get<RouterService>('routerService');
                const counterfactualEngine = new CounterfactualEngine(routerService);
                this.container.register('counterfactualEngine', counterfactualEngine);
                const memAfter1 = getHeapMB();
                this.logger.info(
                    'Bootstrap',
                    `[MODULE END] CounterfactualEngine [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter1}MB [MEMORY DELTA] ${memAfter1 - memBefore > 0 ? '+' : ''}${memAfter1 - memBefore}MB`,
                );
            } catch (e) {
                this.logger.warn('Bootstrap', 'CounterfactualEngine failed (non-critical)', {
                    error: e,
                });
            }

            this.logger.info('Bootstrap', '[MODULE START] CounterfactualExplanationService');
            try {
                const explanationService = new CounterfactualExplanationService();
                this.container.register('counterfactualExplanationService', explanationService);
                const memAfter2 = getHeapMB();
                this.logger.info(
                    'Bootstrap',
                    `[MODULE END] CounterfactualExplanationService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter2}MB [MEMORY DELTA] ${memAfter2 - memBefore > 0 ? '+' : ''}${memAfter2 - memBefore}MB`,
                );
            } catch (e) {
                this.logger.warn(
                    'Bootstrap',
                    'CounterfactualExplanationService failed (non-critical)',
                    { error: e },
                );
            }

            this.logger.info('Bootstrap', '[MODULE START] CounterfactualNarrativeService');
            try {
                const narrativeService = new CounterfactualNarrativeService();
                this.container.register('counterfactualNarrativeService', narrativeService);
                const memAfter3 = getHeapMB();
                this.logger.info(
                    'Bootstrap',
                    `[MODULE END] CounterfactualNarrativeService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter3}MB [MEMORY DELTA] ${memAfter3 - memBefore > 0 ? '+' : ''}${memAfter3 - memBefore}MB`,
                );
            } catch (e) {
                this.logger.warn(
                    'Bootstrap',
                    'CounterfactualNarrativeService failed (non-critical)',
                    { error: e },
                );
            }
        }

        // ── Temporal Replay Service (needs EventBridge) ──────────────────
        {
            const memBefore = getHeapMB();
            this.logger.info('Bootstrap', '[MODULE START] TemporalReplayService');
            try {
                const routerService = this.container.get<RouterService>('routerService');
                const eventSourcing = this.container.get<EventRecorder>('eventSourcingService');
                const scopeManager = this.container.get<ICausalScopeManager>('causalScopeManager');
                const temporalReplayService = new TemporalReplayService(
                    eventSourcing,
                    routerService,
                    scopeManager,
                );
                this.container.register('temporalReplayService', temporalReplayService);
                const memAfter = getHeapMB();
                this.logger.info(
                    'Bootstrap',
                    `[MODULE END] TemporalReplayService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB`,
                );
            } catch (e) {
                this.logger.warn('Bootstrap', 'TemporalReplayService failed (non-critical)', {
                    error: e,
                });
            }
        }

        // ── Truth Consistency Monitor ────────────────────────────────────
        {
            const memBefore = getHeapMB();
            this.logger.info('Bootstrap', '[MODULE START] TruthConsistencyMonitor');
            try {
                const monitor = new TruthConsistencyMonitor();
                this.container.register('truthConsistencyMonitor', monitor);
                const memAfter = getHeapMB();
                this.logger.info(
                    'Bootstrap',
                    `[MODULE END] TruthConsistencyMonitor [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB`,
                );
            } catch (e) {
                this.logger.warn('Bootstrap', 'TruthConsistencyMonitor failed (non-critical)', {
                    error: e,
                });
            }
        }

        // Group Manager — wraps all key lifecycle
        try {
            const gm = this.container.get<GroupManagerService>('groupManagerService');
            const keysBeforeSync = this.container.get<KeyService>('keyService').getKeys();
            if (import.meta.env.DEV)
                console.log('[KEY_FLOW] GroupManager.syncExistingKeys — keys before sync:', {
                    count: keysBeforeSync.length,
                });
            await gm.syncExistingKeys();
            const keysAfterSync = gm.getAllKeys();
            if (import.meta.env.DEV)
                console.log('[KEY_FLOW] GroupManager.syncExistingKeys — keys after sync:', {
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
                console.log('[KEY_FLOW] KeyStateStore seed:', { keyCount: existingKeys.length });
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
            typeof (instance as ILifecycle).init === 'function' &&
            typeof (instance as ILifecycle).destroy === 'function'
        ) {
            this.lifecycle.register(name, instance as ILifecycle);
        }
    }
}
