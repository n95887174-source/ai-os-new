import type { IBootstrap, IEventBus } from './types/interfaces';
import { type IContainer } from './container';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { LoggerService } from './services/logger-service';
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
import { EventSourcingService } from './services/event-sourcing/event-sourcing-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { registerServices } from './service-registration/index';
import { BOOTSTRAP_SERVICES } from './services/service-list';
import { RingEventLog } from './services/event-bridge/ring-event-log';
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
import type { KernelEventLog } from './contracts/event-log';
import type { ICausalScopeManager } from './contracts/causal-debugger';
import type { ApiKey } from './types/metrics-types';
import type { StorageLayer } from './contracts/storage/storage-layer';
import { MemoryWatchdog } from './utils/memory-watchdog';
import { setBootstrapSnapshot, clearBootstrapSnapshot } from './bootstrap-state';

// Services whose failure should abort bootstrap entirely
// Debug flag: disable all intervals to find OOM cause
const DISABLE_INTERVALS = false;

// Feature flags — toggle subsystems independently for memory profiling
const ENABLE_SQLJS = true;             // sql.js WASM — re-enabled; key blob is a recovery source
const ENABLE_EVENT_BRIDGE = true;      // EventBridge + projections (RingEventLog, ProjectionRegistry)
const ENABLE_CAUSAL_DEBUGGER = true;   // CausalScopeManager + CausalTimelineService
const ENABLE_COUNTERFACTUAL = true;    // CounterfactualEngine + Explanation + Narrative
const ENABLE_TEMPORAL_REPLAY = true;   // TemporalReplayService (needs EventBridge)
const ENABLE_TRUTH_MONITOR = true;     // TruthConsistencyMonitor

function getHeapMB(): number {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;
}

// Patch setInterval to track all intervals
const originalSetInterval = typeof window !== 'undefined' ? window.setInterval.bind(window) : null;
const activeIntervals: Map<ReturnType<typeof setInterval>, { name: string; createdAt: number }> = new Map();

const CRITICAL_SERVICES = new Set([
  'configService',
  'keyService',
  'pricingService',
]);
const BOOTSTRAP_SERVICE_NAMES = new Set<string>(BOOTSTRAP_SERVICES);

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
  private serviceStatus: BootstrapReport['services'] = [];
  private error: string | null = null;
  private container: IContainer;
  private eventBus: IEventBus;
  private lifecycle = new LifecycleManager();
  private logger: LoggerService;
  private eventBridge: EventBridge | null = null;
  private causalTimeline: CausalTimelineService | null = null;
  private memoryWatchdog = new MemoryWatchdog({ intervalMs: 5000, thresholdMB: 100 });

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

    const kernel = this.container.get<SystemKernel>('kernel');
    await this.lifecycle.tryInit('kernel', () => kernel.init());

    // Boot configService immediately to restore configuration overlays from database
    const configService = this.container.get<ConfigService>('configService');
    await this.lifecycle.tryInit('configService', () => configService.init());

    // HARD RESET: Force storage to canonical (localStorage.super_agents_api_keys).
    // Wipes dexieDb.apiKeys, sqlite blob, in-memory caches — converges all browsers
    // to a single deterministic key set. Must run BEFORE hydration.
    try {
      const { resetKeyStorageToCanonical } = await import('./services/key-reset');
      const keyService = this.container.get<KeyService>('keyService');
      const storageLayer = (this.container.has('storageLayer')
        ? this.container.get<StorageLayer>('storageLayer')
        : null);
      await resetKeyStorageToCanonical({
        eventBus: this.eventBus,
        storageLayer,
        keyService,
      });
    } catch (e) {
      this.logger.warn('Bootstrap', 'Key storage reset failed (non-critical)', { error: e });
    }

    // StorageRouter: audit all 3 sources, score them, select winner by mode.
    // Runs BEFORE hydration so the result can inform downstream decisions.
    // The router is READ-ONLY — it does not mutate any storage backend.
    try {
      const { routeStorage, setForcedStorageMode } = await import('./services/storage-router');
      // Read debug override from globalThis if set externally.
      const result = await routeStorage('auto');
      this.logger.info('Bootstrap', 'StorageRouter result', {
        mode: result.mode,
        winner: result.winner,
        localStorage: result.diagnostics.localStorage,
        dexie: result.diagnostics.dexie,
        sql: result.diagnostics.sql,
        scores: result.scores,
      });
      if (result.mode === 'auto' && result.winner) {
        // Inform the rest of bootstrap about the selected source. We do NOT
        // mutate storage here — resetKeyStorageToCanonical() already did that.
        // This log makes the source-of-truth explicit for debugging.
        console.log(
          `[BOOTSTRAP] StorageRouter winner: ${result.winner} (${result.diagnostics.reason})`
        );
      }
      // Reference setForcedStorageMode to prevent tree-shaking of the export
      // (callers can set the override via DevTools: setForcedStorageMode('dexie')).
      void setForcedStorageMode;
    } catch (e) {
      this.logger.warn('Bootstrap', 'StorageRouter audit failed (non-critical)', { error: e });
    }

    // Hydrate: read dexieDb.apiKeys (mirror of localStorage) and push to KeyRegistry.
    // No merge, no SQLite blob, no cross-source combination.
    try {
      const { hydrateKeyStorage } = await import('./services/key-storage-hydrator');
      const keyService = this.container.get<KeyService>('keyService');
      await hydrateKeyStorage({ eventBus: this.eventBus, keyService });
    } catch (e) {
      this.logger.warn('Bootstrap', 'Key storage hydration failed (non-critical)', { error: e });
    }

    // Key Reconciler: forensic audit + safe merge of REAL keys across all
    // backends. If any of the 3+1 sources (localStorage, kernel state in
    // localStorage, kernel state in Dexie, sql.js blob) holds a real key
    // missing from Dexie.apiKeys, insert it. NEVER overwrite. NEVER wipe.
    // NEVER promote placeholders. Runs AFTER hydration so the canonical
    // localStorage state is already known; runs BEFORE the bootstrap
    // snapshot so the reconciled state is what gets snapshotted.
    try {
      const { reconcileAndSync } = await import('./services/key-reconciler');
      const report = await reconcileAndSync();
      this.logger.info('Bootstrap', 'KeyReconciler result', {
        merged: report.totals.merged,
        realMerged: report.totals.realMerged,
        placeholders: report.totals.placeholders,
        duplicates: report.duplicates.length,
        missing: report.missing.length,
        conflicts: report.conflicts.length,
        finalDexie: report.sync?.finalDexieCount ?? report.totals.dexie,
        finalLocalStorage: report.sync?.finalLocalStorageCount ?? report.totals.localStorage,
      });
    } catch (e) {
      this.logger.warn('Bootstrap', 'KeyReconciler failed (non-critical)', { error: e });
    }

    // ════════════════════════════════════════════════════════════════════
    //   STRICT BOOTSTRAP SNAPSHOT — read dexie DIRECTLY, not from KeyRegistry
    // ════════════════════════════════════════════════════════════════════
    //   STEP 3: READ dexieDb.apiKeys.toArray() directly
    //   STEP 4: assign globalThis.__BOOTSTRAP_KEY_SNAPSHOT__
    //   STEP 5: set globalThis.__BOOTSTRAP_PHASE__ = true
    //
    //   HARD RULE: KeyRegistry.loadKeys() is NEVER used to construct the
    //   snapshot. The snapshot is the dexie hydration output, fallback chain
    //   is dexie → sqlite blob → localStorage. KeyRegistry mutations
    //   during initServices cannot affect this snapshot.
    // ════════════════════════════════════════════════════════════════════
    // DEXIE_IDENTITY: verify the bootstrap module sees the same Dexie
    // instance as the hydration + KeyRegistry layers. Throws
    // [DEXIE MISMATCH] on split.
    const bootstrapDexie = verifyDexieInstance('bootstrap:step3', dexieDb as unknown as Parameters<typeof verifyDexieInstance>[1]);
    await logDexieIdentityWithCount('bootstrap:step3', bootstrapDexie);

    const dexieRaw = await dexieDb.apiKeys.toArray();
    console.log('[BOOTSTRAP_SNAPSHOT_RAW] dexie count:', dexieRaw.length);

    let snapshotKeys: ApiKey[] = [];
    let snapshotSource: 'dexie' | 'sqlite' | 'localStorage' | 'unknown' = 'unknown';

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
          const SQLITE_MAGIC = new Uint8Array([83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0]);
          let validMagic = bytes.length >= 100;
          for (let i = 0; validMagic && i < 16; i++) {
            if (bytes[i] !== SQLITE_MAGIC[i]) validMagic = false;
          }
          if (validMagic) {
            // sql.js is disabled (ENABLE_SQLJS=false) so actual row extraction
            // requires WASM runtime. Currently returns 0 — falls through to
            // localStorage. For forward-compat: if extraction ever succeeds,
            // the source attribution is preserved.
            // (tryExtractApiKeysFromSqliteBlob is in key-reset.ts; kept here as
            // a no-op since we don't import the heavy path.)
          }
        }
      } catch { /* non-critical */ }
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
      } catch { /* non-critical */ }
    }

    // C-01: Always clear localStorage immediately after reading, not after initServices
    // This prevents keys from lingering in localStorage if initServices() fails later,
    // and minimizes the XSS window between read and cleanup.
    try {
      localStorage.removeItem('super_agents_api_keys');
      localStorage.removeItem('superagents:providers:super_agents_api_keys');
      localStorage.removeItem('superagents:providers:super_agents_kernel_state');
    } catch { /* non-critical */ }

    // GUARD: if snapshot ended up 0 but dexieDb.apiKeys has data, force
    // re-read from dexie. This catches any edge case where the assignment
    // was dropped silently.
    if (snapshotKeys.length === 0 && dexieRaw.length > 0) {
      console.warn('[BOOTSTRAP_SNAPSHOT] GUARD: snapshot is 0 but dexie has', dexieRaw.length, '— force re-read from dexie');
      snapshotKeys = [...dexieRaw];
      snapshotSource = 'dexie';
    }

    // Always clean up stale prefixed localStorage keys AFTER services initialized.
    // If initServices() fails and snapshot is cleared, keys still exist in localStorage
    // as a recovery source.
    console.log('[BOOTSTRAP_SNAPSHOT_FINAL] count:', snapshotKeys.length);
    console.log('[BOOTSTRAP_SNAPSHOT_SOURCE]', snapshotSource);

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

    if (this.causalTimeline) {
      try { this.causalTimeline.destroy(); } catch { /* ignore */ }
      this.causalTimeline = null;
    }
    if (this.eventBridge) {
      try { this.eventBridge.stop(); } catch { /* ignore */ }
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
      ['keyStateStore', 'routerService', 'sessionAffinityStore', 'llmClientService', 'providerRuntimeService', 'virtualKeyService', 'raceExecutor', 'groupManagerService'],
      ['toolService', 'sandboxService', 'memoryService', 'featureFlagService', 'cognitiveService', 'policyService', 'roleService', 'snapshotService', 'agentService', 'agentHealthMonitor'],
      ['chatService', 'debateService', 'debateApiService', 'debateKnowledgeSync', 'hypothesisService', 'metricsService', 'advisorService', 'budgetService', 'usageTracker', 'timelineService', 'adminService'],
      ['healthCheckService', 'monitoringService', 'traceService', 'diagnosticService', 'whatIfService', 'pressureMapService', 'cognitiveIntelligenceService', 'blackboardService', 'topologyManager', 'workforceFederation', 'routingPolicyService', 'notificationWebhookService', 'compromiseWebhookService', 'externalSecretsService', 'workspaceService', 'probeService', 'consistencyChecker', 'consistencyHealingPipeline', 'systemStatusService'],
    ];

    let criticalFailed = false;
    for (let pIdx = 0; pIdx < PHASES.length; pIdx++) {
      const phaseServices = PHASES[pIdx];
      const memBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
      this.logger.info('Bootstrap', `Phase ${pIdx + 1}/${PHASES.length} starting: ${phaseServices.join(', ')}`, { memMB: memBefore ? Math.round(memBefore / 1024 / 1024) : 'n/a' });
      const results = await this.lifecycle.initAllParallel(phaseServices);
      const memAfter = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
      this.logger.info('Bootstrap', `Phase ${pIdx + 1}/${PHASES.length} done`, { memMB: memAfter ? Math.round(memAfter / 1024 / 1024) : 'n/a', deltaMB: memBefore && memAfter ? Math.round((memAfter - memBefore) / 1024 / 1024) : 'n/a' });
      const entryNames = this.lifecycle.getEntries()
        .filter(e => phaseServices.includes(e.name))
        .map(e => e.name);

      for (let i = 0; i < results.length; i++) {
        if (!results[i]) {
          const name = entryNames[i] ?? `unknown-${i}`;
          if (CRITICAL_SERVICES.has(name)) {
            this.logger.error('Bootstrap', `Critical service ${name} failed — aborting`);
            criticalFailed = true;
          } else {
            this.logger.warn('Bootstrap', `Optional service ${name} failed — continuing`);
          }
        }
      }
      if (criticalFailed) break;
    }

    if (criticalFailed) {
      this.phase = 'failed';
      this.error = 'One or more critical services failed to initialize';
      return false;
    }

    this.phase = 'topology';

    const memPreEventSourcing = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    this.logger.info('Bootstrap', `Before eventSourcing init, memMB: ${memPreEventSourcing ? Math.round(memPreEventSourcing / 1024 / 1024) : 'n/a'}`);

    await this.lifecycle.tryInit('eventSourcing', () => {
      return this.container.get<EventSourcingService>('eventSourcingService').init();
    });

    const memPreProviderRuntime = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    this.logger.info('Bootstrap', `After eventSourcing, before providerRuntime, memMB: ${memPreProviderRuntime ? Math.round(memPreProviderRuntime / 1024 / 1024) : 'n/a'}`);

    await this.lifecycle.tryInit('providerRuntime', () => {
      const prs = this.container.get<ProviderRuntimeService>('providerRuntimeService');
      const ks = this.container.get<KeyService>('keyService');
      const keys: ApiKey[] = ks.getKeys?.() ?? [];
      for (const key of keys) {
        try { prs.createInstance(key); }
        catch (e) { console.warn(`[Bootstrap] createInstance failed for ${key.provider}:`, e); }
      }
    });

    const memPreRotation = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    this.logger.info('Bootstrap', `After providerRuntime, before rotation, memMB: ${memPreRotation ? Math.round(memPreRotation / 1024 / 1024) : 'n/a'}`);

    await this.lifecycle.tryInit('rotation', async () => {
      const svc = this.container.get<RotationService>('rotationService');
      return svc.init();
    });

    const memPostRotation = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    this.logger.info('Bootstrap', `After rotation, before orchestrator, memMB: ${memPostRotation ? Math.round(memPostRotation / 1024 / 1024) : 'n/a'}`);

    const memBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    this.logger.info('Bootstrap', `Before orchestrator + topology, memMB: ${memBefore ? Math.round(memBefore / 1024 / 1024) : 'n/a'}`);

    try {
      const toolService = this.container.get<ToolService>('toolService');
      const cognitiveService = this.container.get<CognitiveService>('cognitiveService');
      const policyService = this.container.get<PolicyService>('policyService');
      
      const orch = new Orchestrator({
        eventBus: this.eventBus,
        toolService,
        cognitiveService,
        policyService,
      });
      this.container.register('orchestrator', orch);

      const memAfterOrch = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
      this.logger.info('Bootstrap', `After orchestrator created, memMB: ${memAfterOrch ? Math.round(memAfterOrch / 1024 / 1024) : 'n/a'}`);

      orch.mount(AuditorTopology);

      const memAfterMount = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
      this.logger.info('Bootstrap', `After topology mount, memMB: ${memAfterMount ? Math.round(memAfterMount / 1024 / 1024) : 'n/a'}`);
    } catch (e) {
      this.logger.error('Bootstrap', 'Failed to mount topology', { error: e });
    }

    // ── EventBridge ──────────────────────────────────────────────────
    if (ENABLE_EVENT_BRIDGE) {
      const memBefore = getHeapMB();
      this.logger.info('Bootstrap', '[MODULE START] EventBridge');
      try {
        const eventLog = new RingEventLog(10_000);
        const registry = new ProjectionRegistry();
        const keyStateProjection = new KeyStateProjection();
        const routerProjection = new RouterProjection();
        registry.register(keyStateProjection);
        registry.register(routerProjection);
        const bridge = new EventBridge(this.eventBus, eventLog, registry);
        bridge.start();
        this.eventBridge = bridge;
        this.container.register('eventLog', eventLog);
        this.container.register('projectionRegistry', registry);
        this.container.register('keyStateProjection', keyStateProjection);
        this.container.register('routerProjection', routerProjection);
        const memAfter = getHeapMB();
        this.logger.info('Bootstrap', `[MODULE END] EventBridge [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB — ${registry.size()} projection(s)`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'EventBridge failed (non-critical)', { error: e });
      }
    }

    // ── Causal Debugger Layer ────────────────────────────────────────
    if (ENABLE_CAUSAL_DEBUGGER) {
      const memBefore = getHeapMB();
      this.logger.info('Bootstrap', '[MODULE START] CausalTimelineService');
      try {
        const causalScopeManager = new CausalScopeManager();
        const keyStateProjection = this.container.get<KeyStateProjection>('keyStateProjection');
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
        this.logger.info('Bootstrap', `[MODULE END] CausalTimelineService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'CausalTimelineService failed (non-critical)', { error: e });
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
        this.logger.info('Bootstrap', `[MODULE END] CounterfactualEngine [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter1}MB [MEMORY DELTA] ${memAfter1 - memBefore > 0 ? '+' : ''}${memAfter1 - memBefore}MB`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'CounterfactualEngine failed (non-critical)', { error: e });
      }

      this.logger.info('Bootstrap', '[MODULE START] CounterfactualExplanationService');
      try {
        const explanationService = new CounterfactualExplanationService();
        this.container.register('counterfactualExplanationService', explanationService);
        const memAfter2 = getHeapMB();
        this.logger.info('Bootstrap', `[MODULE END] CounterfactualExplanationService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter2}MB [MEMORY DELTA] ${memAfter2 - memBefore > 0 ? '+' : ''}${memAfter2 - memBefore}MB`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'CounterfactualExplanationService failed (non-critical)', { error: e });
      }

      this.logger.info('Bootstrap', '[MODULE START] CounterfactualNarrativeService');
      try {
        const narrativeService = new CounterfactualNarrativeService();
        this.container.register('counterfactualNarrativeService', narrativeService);
        const memAfter3 = getHeapMB();
        this.logger.info('Bootstrap', `[MODULE END] CounterfactualNarrativeService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter3}MB [MEMORY DELTA] ${memAfter3 - memBefore > 0 ? '+' : ''}${memAfter3 - memBefore}MB`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'CounterfactualNarrativeService failed (non-critical)', { error: e });
      }
    }

    // ── Temporal Replay Service (needs EventBridge) ──────────────────
    if (ENABLE_TEMPORAL_REPLAY && ENABLE_EVENT_BRIDGE) {
      const memBefore = getHeapMB();
      this.logger.info('Bootstrap', '[MODULE START] TemporalReplayService');
      try {
        const routerService = this.container.get<RouterService>('routerService');
        const eventLog = this.container.get<KernelEventLog>('eventLog');
        const scopeManager = this.container.get<ICausalScopeManager>('causalScopeManager');
        const temporalReplayService = new TemporalReplayService(eventLog, routerService, scopeManager);
        this.container.register('temporalReplayService', temporalReplayService);
        const memAfter = getHeapMB();
        this.logger.info('Bootstrap', `[MODULE END] TemporalReplayService [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'TemporalReplayService failed (non-critical)', { error: e });
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
        this.logger.info('Bootstrap', `[MODULE END] TruthConsistencyMonitor [MEMORY BEFORE] ${memBefore}MB [MEMORY AFTER] ${memAfter}MB [MEMORY DELTA] ${memAfter - memBefore > 0 ? '+' : ''}${memAfter - memBefore}MB`);
      } catch (e) {
        this.logger.warn('Bootstrap', 'TruthConsistencyMonitor failed (non-critical)', { error: e });
      }
    }

    // Group Manager — wraps all key lifecycle (depends on keyService being ready)
    try {
      const gm = this.container.get<GroupManagerService>('groupManagerService');
      const keysBeforeSync = this.container.get<KeyService>('keyService').getKeys();
      console.log('[KEY_FLOW] GroupManager.syncExistingKeys — keys before sync:', { count: keysBeforeSync.length });
      await gm.syncExistingKeys();
      const keysAfterSync = gm.getAllKeys();
      console.log('[KEY_FLOW] GroupManager.syncExistingKeys — keys after sync:', { count: keysAfterSync.length });
      this.container.get<KeyService>('keyService').attachGroupManager(gm);
      this.logger.info('Bootstrap', 'Group Manager synced existing keys');
    } catch (e) {
      this.logger.warn('Bootstrap', 'GroupManager syncExistingKeys failed (non-critical)', { error: e });
    }

    // Seed KeyStateStore with existing keys so projection is populated before first probe
    try {
      const ks = this.container.get<KeyService>('keyService');
      const kss = this.container.get<KeyStateStore>('keyStateStore');
      const existingKeys: ApiKey[] = ks.getKeys?.() ?? [];
      console.log('[KEY_FLOW] KeyStateStore seed:', { keyCount: existingKeys.length });
      if (kss && existingKeys.length > 0) {
        kss.seedFromKeys(existingKeys);
        this.logger.info('Bootstrap', `KeyStateStore seeded with ${existingKeys.length} key(s)`);
      }
    } catch (e) {
      this.logger.warn('Bootstrap', 'KeyStateStore seed failed (non-critical)', { error: e });
    }

      //    this.eventBus.emit(EVENTS.COMMAND, { action: 'run_health_checks' });
    this.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Super-Agents OS Runtime ready', type: 'success' });
    this.eventBus.emit(EVENTS.RUNTIME_READY, { timestamp: Date.now() });

    this.phase = 'ready';
    return true;
  }

  private registerWithLifecycle(name: string, instance: unknown) {
    if (instance && typeof (instance as ILifecycle).init === 'function' && typeof (instance as ILifecycle).destroy === 'function') {
      this.lifecycle.register(name, instance as ILifecycle);
    }
  }
}
