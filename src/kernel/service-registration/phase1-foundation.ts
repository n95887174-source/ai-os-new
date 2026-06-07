/**
 * Phase 1 — Foundation.
 *
 * Services with no dependencies on other kernel services (other than
 * `database` and `eventBus`, which are pre-registered in bootstrap).
 * These are the base that every later phase consumes.
 */
import type { Phase } from './helpers';
import type { IContainer } from '../container';
import type { IEventBus, IDatabaseService, ISecurityService } from '../types/interfaces';
import type { StorageLayer, KeyStore } from '../contracts/storage/storage-layer';
import type { SettingsServiceDeps } from '../services/settings-service';
import { SettingsService } from '../services/settings-service';
import { PricingService } from '../services/pricing-service';
import { KeyStateStore } from '../services/key-state-store';
import { ProviderTracker } from '../services/provider-tracker';
import { SystemKernel } from '../kernel';
import { MetricsService } from '../services/metrics-service';
import { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import { KeyService } from '../services/key-management/key-service';
import { GroupManagerService } from '../services/group-manager';
import type { AdvisorService } from '../services/advisor-service';

export const registerPhase1: Phase = (helpers, ctx) => {
  const { register, get, asDeps } = helpers;
  const _container: IContainer = ctx.container;

  register('settingsService', new SettingsService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    get routerService() { return get<SettingsServiceDeps['routerService']>('routerService'); },
    get kernel() { return get<SettingsServiceDeps['kernel']>('kernel'); },
  }));

  register('pricingService', new PricingService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('keyStateStore', new KeyStateStore(get<IEventBus>('eventBus')));

  register('providerTracker', new ProviderTracker({
    costCalculator: get<PricingService>('pricingService'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
    database: get<IDatabaseService>('database'),
  }));

  register('kernel', new SystemKernel({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    providerTracker: get<ProviderTracker>('providerTracker'),
  }));

  register('metricsService', new MetricsService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    kernel: get<SystemKernel>('kernel'),
  }));

  register('providerAdapterRegistry', new ProviderAdapterRegistry());

  // Pull storageLayer and keyStore/configStore once for use here and
  // for later phases.  Kept on the closure for visibility.
  const storageLayer = get<StorageLayer>('storageLayer');
  const keyStore = storageLayer?.keys;
  const configStore = storageLayer?.config;

  if (typeof console !== 'undefined') {
    console.log('[KEY_FLOW] keyStore implementation type:', {
      storageLayerExists: !!storageLayer,
      keyStoreExists: !!keyStore,
      isStub: !storageLayer,
      hasListKeys: typeof keyStore?.listKeys === 'function',
      hasBulkPut: typeof keyStore?.bulkPut === 'function',
    });
  }

  // Defensive wrapper — guarantees all KeyStore methods exist regardless
  // of storageLayer state.  Without this, downstream services that
  // unconditionally call keyStore.listKeys() crash at bootstrap.
  const safeKeyStore: KeyStore = keyStore && typeof keyStore.listKeys === 'function'
    ? keyStore
    : (() => {
        console.warn('[ServiceRegistration] keyStore missing or incomplete — using safe stub');
        return {
          saveKey: async () => {},
          getKey: async () => null,
          listKeys: async () => [],
          deleteKey: async () => {},
          bulkPut: async () => {},
          bulkAdd: async () => {},
          where: async () => undefined,
          exportAll: async () => '[]',
          importAll: async () => {},
          clear: async () => {},
        } as unknown as KeyStore;
      })();

  register('keyService', new KeyService(asDeps<ConstructorParameters<typeof KeyService>[0]>({
    database: get<IDatabaseService>('database'),
    keyStore: safeKeyStore,
    eventBus: get<IEventBus>('eventBus'),
    securityService: get<ISecurityService>('securityService'),
    pricingService: get<PricingService>('pricingService'),
    providerAdapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    get advisorService() { return _container.get<AdvisorService>('advisorService'); },
  })));

  // groupManagerService depends on configStore; keep it here so phases
  // that need groupManager can resolve it.
  register('groupManagerService', new GroupManagerService(asDeps<ConstructorParameters<typeof GroupManagerService>[0]>({
    keyService: get<KeyService>('keyService'),
    eventBus: get<IEventBus>('eventBus'),
    storage: {
      getKv: async <T>(id: string) => configStore ? configStore.get<T>(id) : null,
      setKv: async <T>(id: string, value: T) => { if (configStore) await configStore.set(id, value); },
    },
  })));
};
