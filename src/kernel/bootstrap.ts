import type { IBootstrap, IEventBus, IDatabaseService } from './types/interfaces';
import { type IContainer } from './container';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { LoggerService, rootLogger } from './services/logger-service';

function getLogger() {
    return rootLogger?.child('Bootstrap');
}
import { EVENTS } from './events/event-names';
import { dexieDb } from './services/database-service';
import { logDexieIdentityWithCount, verifyDexieInstance } from './services/dexie-identity';
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
import { KeyStateProjection } from './services/projections/key-state-projection';
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
import type { DebatePhase } from './contracts/debate-runtime';
import type { ApiKey } from './types/metrics-types';
import type { StorageLayer } from './contracts/storage/storage-layer';
import { MemoryWatchdog } from './utils/memory-watchdog';
import { setBootstrapSnapshot, clearBootstrapSnapshot } from './bootstrap-state';

// Services whose failure should abort bootstrap entirely
// Debug flag: disable all intervals to find OOM cause
void false;

// Feature flags — toggle subsystems independently for memory profiling
const ENABLE_EVENT_BRIDGE = true; // EventBridge + projections
const ENABLE_CAUSAL_DEBUGGER = true; // CausalScopeManager + CausalTimelineService
const ENABLE_COUNTERFACTUAL = true; // CounterfactualEngine + Explanation + Narrative
const ENABLE_TEMPORAL_REPLAY = true; // TemporalReplayService (needs EventBridge)
const ENABLE_TRUTH_MONITOR = true; // TruthConsistencyMonitor

function getHeapMB(): number {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;
}

// Patch setInterval to track all intervals

const CRITICAL_SERVICES = new Set(['configService', 'keyService', 'pricingService']);

export type InitPhase = 'pending' | 'kernel' | 'services' | 'topology' | 'ready' | 'failed';

export interface BootstrapReport {
    phase: InitPhase;
    started: number;
    completed: number;
    duration: number;
    error: string | null;
    services: { name: string; status: 'ok' | 'error' | 'skipped'; error?: string }[];
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
        if (ENABLE_EVENT_BRIDGE) {
            try {
                const registry = new ProjectionRegistry();
                const keyStateProjection = new KeyStateProjection();
                const routerProjection = new RouterProjection();
                registry.register(keyStateProjection);
                registry.register(routerProjection);
                const bridge = new EventBridge(this.eventBus, registry);
                bridge.start();
                this.eventBridge = bridge;
                this.container.register('projectionRegistry', registry);
                this.container.register('keyStateProjection', keyStateProjection);
                this.container.register('routerProjection', routerProjection);
            } catch (e) {
                this.logger.warn('Bootstrap', 'EventBridge init failed (non-critical)', {
                    error: e,
                });
            }
        }

        const kernel = this.container.get<SystemKernel>('kernel');
        await this.lifecycle.tryInit('kernel', () => kernel.init());

        // Boot configService immediately to restore configuration overlays from database
        const configService = this.container.get<ConfigService>('configService');
        await this.lifecycle.tryInit('configService', () => configService.init());

        // ── Key Migration (one-shot) ───────────────────────────────────────
        // Reads all old sources (localStorage, existing Dexie), deduplicates,
        // writes to KeyStore. Idempotent — checks flag.
        try {
            const { runOnce } = await import('./dal/key-migration');
            const db = this.container.get<IDatabaseService>('database');
            const storageMig = this.container.get<StorageLayer>('storageLayer');
            await runOnce({ db, keyStore: storageMig.keys });
        } catch (e) {
            this.logger.warn('Bootstrap', 'Key migration failed (non-critical)', { error: e });
        }

        // Hydrate: read KeyStore and push to KeyRegistry.
        // No merge, no SQLite blob, no cross-source combination.
        try {
            const { hydrateKeyStorage } = await import('./services/key-storage-hydrator');
            const keyService = this.container.get<KeyService>('keyService');
            const storageHyd = this.container.get<StorageLayer>('storageLayer');
            await hydrateKeyStorage({
                eventBus: this.eventBus,
                keyService,
                keyStore: storageHyd.keys,
            });
        } catch (e) {
            this.logger.warn('Bootstrap', 'Key storage hydration failed (non-critical)', {
                error: e,
            });
        }

        // ════════════════════════════════════════════════════════════════════
        //   BOOTSTRAP SNAPSHOT — read from KeyStore
        // ════════════════════════════════════════════════════════════════════
        // DEXIE_IDENTITY: verify the bootstrap module sees the same Dexie
        // instance as the hydration + KeyRegistry layers.
        const bootstrapDexie = verifyDexieInstance(
            'bootstrap:step3',
            dexieDb as unknown as Parameters<typeof verifyDexieInstance>[1],
        );
        await logDexieIdentityWithCount('bootstrap:step3', bootstrapDexie);

        // Primary source: storageLayer.keys (KeyStore)
        const storage = this.container.get<StorageLayer>('storageLayer');
        const repoKeys = await storage.keys.listKeys();
        if (import.meta.env.DEV)
            getLogger()?.info('Bootstrap', 'Snapshot repo count', { count: repoKeys.length });

        let snapshotKeys: ApiKey[] = repoKeys;
        let snapshotSource = repoKeys.length > 0 ? 'keystore' : 'unknown';

        // Fallback: if KeyStore returned empty, try alternative sources
        if (snapshotKeys.length === 0) {
            const dexieRaw = await dexieDb.apiKeys.toArray();
            if (import.meta.env.DEV)
                console.log('[BOOTSTRAP_SNAPSHOT_RAW] dexie count:', dexieRaw.length);

            // Priority 1: dexieDb.apiKeys (hydration output)
            if (dexieRaw.length > 0) {
                snapshotKeys = [...dexieRaw];
                snapshotSource = 'dexie';
            }

            // Priority 2: sqlite blob (for forward compat with sql.js re-enable)
            if (snapshotKeys.length === 0) {
                try {
                    const blob = await dexieDb.keyValue.get('sqlite_db_blob');
                    if (blob?.value && Array.isArray(blob.value)) {
                        const bytes = new Uint8Array(blob.value as number[]);
                        const SQLITE_MAGIC = new Uint8Array([
                            83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0,
                        ]);
                        let validMagic = bytes.length >= 100;
                        for (let i = 0; validMagic && i < 16; i++) {
                            if (bytes[i] !== SQLITE_MAGIC[i]) validMagic = false;
                        }
                        if (validMagic) {
                            // sql.js is disabled (ENABLE_SQLJS=false) so actual row extraction
                            // requires WASM runtime. Currently returns 0 — falls through to
                            // localStorage. For forward-compat: if extraction ever succeeds,
                            // the source attribution is preserved.
                        }
                    }
                } catch {
                    /* non-critical */
                }
            }

            // Priority 3: localStorage (the canonical store)
            if (snapshotKeys.length === 0) {
                try {
                    const raw = localStorage.getItem('super_agents_api_keys');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            snapshotKeys = parsed;
                            snapshotSource = 'localStorage';
                        }
                    }
                } catch {
                    /* non-critical */
                }
            }
        }

        // C-01: Always clear localStorage immediately after reading
        try {
            localStorage.removeItem('super_agents_api_keys');
            localStorage.removeItem('superagents:providers:super_agents_api_keys');
            localStorage.removeItem('superagents:providers:super_agents_kernel_state');
        } catch (e) {
            getLogger()?.warn('Bootstrap', 'Failed to remove legacy state', { error: String(e) });
        }

        // GUARD: if snapshot ended up 0 but dexie has data, force re-read
        if (snapshotKeys.length === 0) {
            try {
                const dexieGuard = await dexieDb.apiKeys.toArray();
                if (dexieGuard.length > 0) {
                    getLogger()?.warn(
                        'Bootstrap',
                        'Snapshot guard: snapshot is 0 but dexie has entries',
                        { dexieCount: dexieGuard.length },
                    );
                    snapshotKeys = [...dexieGuard];
                    snapshotSource = 'dexie';
                }
            } catch {
                /* non-critical */
            }
        }

        if (import.meta.env.DEV)
            console.log('[BOOTSTRAP_SNAPSHOT_FINAL] count:', snapshotKeys.length);
        if (import.meta.env.DEV) console.log('[BOOTSTRAP_SNAPSHOT_SOURCE]', snapshotSource);

        // Diagnostic-only globals (counts + flags, NO actual key material).
        interface BootstrapGlobals {
            __BOOTSTRAP_PHASE__?: boolean;
            __BOOTSTRAP_KEYS_SOURCE__?: string;
            __BOOTSTRAP_KEY_COUNT__?: number;
        }
        const g = globalThis as unknown as BootstrapGlobals;
        g.__BOOTSTRAP_PHASE__ = true;
        g.__BOOTSTRAP_KEYS_SOURCE__ = snapshotSource;
        g.__BOOTSTRAP_KEY_COUNT__ = snapshotKeys.length;

        // Hand the actual snapshot to key-registry via module-scoped closure
        // (NOT globalThis) — this keeps raw key material off `globalThis`
        // where XSS / extensions / devtools could read it.
        setBootstrapSnapshot(snapshotKeys);

        const servicesOk = await this.initServices();
        if (!servicesOk) {
            this.isStarted = true;
            return this.getReport();
        }

        // C-01: localStorage already cleared immediately after read above.
        // No need for duplicate cleanup here.

        // Clear bootstrap phase — post-init operations read from storage normally.
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

        const PHASES: string[][] = [
            ['configService', 'settingsService', 'keyService', 'cacheService', 'pricingService'],
            [
                'keyStateStore',
                'routerService',
                'sessionAffinityStore',
                'llmClientService',
                'providerRuntimeService',
                'virtualKeyService',
                'raceExecutor',
                'groupManagerService',
            ],
            [
                'toolService',
                'sandboxService',
                'memoryService',
                'cognitiveService',
                'policyService',
                'roleService',
                'snapshotService',
                'agentService',
                'agentHealthMonitor',
            ],
            [
                'chatService',
                'debateService',
                'debateApiService',
                'debateKnowledgeSync',
                'debateEngine',
                'debateModeManager',
                'debateWorkspace',
                'hypothesisService',
                'metricsService',
                'advisorService',
                'budgetService',
                'usageTracker',
                'timelineService',
                'adminService',
            ],
            [
                'healthCheckService',
                'monitoringService',
                'traceService',
                'diagnosticService',
                'whatIfService',
                'pressureMapService',
                'cognitiveIntelligenceService',
                'blackboardService',
                'topologyManager',
                'workforceFederation',
                'routingPolicyService',
                'notificationWebhookService',
                'compromiseWebhookService',
                'externalSecretsService',
                'workspaceService',
                'skillService',
                'mcpService',
                'agentMarketplace',
                'probeService',
                'consistencyChecker',
                'systemStatusService',
            ],
        ];

        let criticalFailed = false;
        for (let pIdx = 0; pIdx < PHASES.length; pIdx++) {
            const phaseServices = PHASES[pIdx];
            const memBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } })
                .memory?.usedJSHeapSize;
            this.logger.info(
                'Bootstrap',
                `Phase ${pIdx + 1}/${PHASES.length} starting: ${phaseServices.join(', ')}`,
                { memMB: memBefore ? Math.round(memBefore / 1024 / 1024) : 'n/a' },
            );
            const results = await this.lifecycle.initAllSequential(phaseServices);
            const memAfter = (performance as unknown as { memory?: { usedJSHeapSize: number } })
                .memory?.usedJSHeapSize;
            this.logger.info('Bootstrap', `Phase ${pIdx + 1}/${PHASES.length} done`, {
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
                        // OBS-100: emit event for non-critical failures
                        this.eventBus.emit(EVENTS.NOTIFICATION, {
                            message: `Service ${name} failed to init`,
                            type: 'warning',
                            source: 'bootstrap',
                        });
                    }
                }
            }
            if (criticalFailed) break;
            // OBS-100: emit phase complete event
            this.eventBus.emit(EVENTS.KERNEL_UPDATED, {
                bootstrapPhase: pIdx + 1,
                totalPhases: PHASES.length,
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
        await this.lifecycle.startAll();

        // ── Causal Debugger Layer ────────────────────────────────────────
        if (ENABLE_CAUSAL_DEBUGGER) {
            const memBefore = getHeapMB();
            this.logger.info('Bootstrap', '[MODULE START] CausalTimelineService');
            try {
                const causalScopeManager = new CausalScopeManager();
                const keyStateProjection =
                    this.container.get<KeyStateProjection>('keyStateProjection');
                const routerProjection = this.container.get<RouterProjection>('routerProjection');
                const causalTimelineService = new CausalTimelineService(
                    causalScopeManager,
                    keyStateProjection,
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
        if (ENABLE_COUNTERFACTUAL) {
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
        if (ENABLE_TEMPORAL_REPLAY && ENABLE_EVENT_BRIDGE) {
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
        if (ENABLE_TRUTH_MONITOR) {
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

        // Group Manager — wraps all key lifecycle (depends on keyService being ready)
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

        // Seed KeyStateStore with existing keys so projection is populated before first probe
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

        // P1-9: Auto-resume interrupted debates found in Dexie after page reload
        // Mark non-terminated sessions as failed so the user sees them in UI
        try {
            const RUNNING_PHASES = new Set<DebatePhase>([
                'initializing',
                'active',
                'deliberating',
                'consensus',
                'summarizing',
            ]);
            const allSessions = await dexieDb.debateSessions.toArray();
            let interruptedCount = 0;
            for (const s of allSessions) {
                if (RUNNING_PHASES.has(s.phase)) {
                    await dexieDb.debateSessions.put({
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

        //    this.eventBus.emit(EVENTS.COMMAND, { action: 'run_health_checks' });
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
