import { CONFIG_DEFAULTS, setConfig } from './config-registry'
import { getRouterConfig } from './router-config-manager'
import type { RouterConfigSection } from '../contracts/config-registry';
import type {
  MonitoringConfigSection,
  MetricsConfigSection,
  TracesConfigSection,
  WebhooksConfigSection,
  KeysConfigSection,
  LlmConfigSection,
  PressureConfigSection,
  PricingConfigSection,
  ServicesConfigSection
} from '../contracts/config-registry';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

export interface ConfigServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  eventBus?: { 
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
}

const OVERLAYS_KEY = 'config_overlays';

export type ConfigOverlays = {
  monitoring?: Partial<MonitoringConfigSection>;
  metrics?: Partial<MetricsConfigSection>;
  traces?: Partial<TracesConfigSection>;
  webhooks?: Partial<WebhooksConfigSection>;
  keys?: Partial<KeysConfigSection>;
  llm?: Partial<LlmConfigSection>;
  pressure?: Partial<PressureConfigSection>;
  pricing?: Partial<PricingConfigSection>;
  services?: Partial<ServicesConfigSection>;
};

function deepMerge<T>(target: T, source?: Partial<T>): T {
  if (!source) return target;
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const val = (source as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const base = (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]))
        ? (result[key] as Record<string, unknown>)
        : {};
      result[key] = deepMerge(base as unknown as T, val as Partial<T>);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

export class ConfigService {
  private deps: ConfigServiceDeps;
  private overlays: ConfigOverlays = {};
  private unsub?: () => void;

  constructor(deps: ConfigServiceDeps) {
    this.deps = deps;
  }

  async init() {
    try {
      const saved = await this.deps.database.getKv<typeof this.overlays>(OVERLAYS_KEY);
      if (saved) {
        this.overlays = saved;
        this.applyOverlays(saved);
      }
    } catch (e) { 
      rootLogger.warn('ConfigService', 'Failed to load config overlays, using defaults', { error: String(e) });
      this.overlays = {}; 
    }

    if (this.deps.eventBus) {
      this.unsub = this.deps.eventBus.on(EVENTS.SETTINGS_UPDATED, (data: unknown) => {
        const payload = data as { changes?: { full?: boolean } };
        if (payload?.changes?.full) {
          this.overlays = {};
        }
      });
    }
  }

  destroy(): void {
    this.unsub?.();
  }

  clearOverlays(): void {
    this.overlays = {};
  }

  getRouter(): RouterConfigSection {
    return getRouterConfig();
  }

  getMonitoring(): MonitoringConfigSection {
    return deepMerge(CONFIG_DEFAULTS.monitoring, this.overlays.monitoring);
  }

  getMetrics(): MetricsConfigSection {
    return deepMerge(CONFIG_DEFAULTS.metrics, this.overlays.metrics);
  }

  getTraces(): TracesConfigSection {
    return deepMerge(CONFIG_DEFAULTS.traces, this.overlays.traces);
  }

  getWebhooks(): WebhooksConfigSection {
    return deepMerge(CONFIG_DEFAULTS.webhooks, this.overlays.webhooks);
  }

  getKeys(): KeysConfigSection {
    return deepMerge(CONFIG_DEFAULTS.keys, this.overlays.keys);
  }

  getLlm(): LlmConfigSection {
    return deepMerge(CONFIG_DEFAULTS.llm, this.overlays.llm);
  }

  getPressure(): PressureConfigSection {
    return deepMerge(CONFIG_DEFAULTS.pressure, this.overlays.pressure);
  }

  getPricing(): PricingConfigSection {
    return deepMerge(CONFIG_DEFAULTS.pricing, this.overlays.pricing);
  }

  getServices(): ServicesConfigSection {
    return deepMerge(CONFIG_DEFAULTS.services, this.overlays.services);
  }

  async updateRouter(partial: Partial<RouterConfigSection>) {
    const { getRouterConfigManager } = await import('./router-config-manager');
    const mgr = getRouterConfigManager();
    if (!mgr) {
      throw new Error('[ConfigService] RouterConfigManager not initialized');
    }

    // Check for unsupported fields
    const supportedKeys = ['weights', 'activeProfile'];
    const unsupportedKeys = Object.keys(partial).filter(k => !supportedKeys.includes(k));
    if (unsupportedKeys.length > 0) {
      throw new Error(`[ConfigService] updateRouter: fields [${unsupportedKeys.join(', ')}] are not supported through this method. Use RouterConfigManager directly for complex configuration updates.`);
    }

    if (partial.weights) {
      const w = partial.weights as unknown as { ttft: number; tps: number; reliability: number };
      await mgr.updateActiveProfileWeights(w);
    }
    if (partial.activeProfile) await mgr.setActiveProfile(partial.activeProfile);
    await this.persist();
  }

  private notifySettingsUpdated(section: string, changes: unknown) {
    this.deps.eventBus?.emit(EVENTS.SETTINGS_UPDATED, { 
      settings: this.getConfigForSection(section), 
      changes 
    });
  }

  private getConfigForSection(section: string) {
    switch (section) {
      case 'monitoring': return this.getMonitoring();
      case 'metrics': return this.getMetrics();
      case 'traces': return this.getTraces();
      case 'webhooks': return this.getWebhooks();
      case 'keys': return this.getKeys();
      case 'llm': return this.getLlm();
      case 'pressure': return this.getPressure();
      case 'pricing': return this.getPricing();
      case 'services': return this.getServices();
      default: return undefined;
    }
  }

  async updateMonitoring(partial: Partial<MonitoringConfigSection>) {
    this.overlays.monitoring = deepMerge(this.overlays.monitoring || {}, partial);
    setConfig('monitoring', deepMerge(CONFIG_DEFAULTS.monitoring, this.overlays.monitoring));
    await this.persist();
    this.notifySettingsUpdated('monitoring', partial);
  }

  async updateMetrics(partial: Partial<MetricsConfigSection>) {
    this.overlays.metrics = deepMerge(this.overlays.metrics || {}, partial);
    setConfig('metrics', deepMerge(CONFIG_DEFAULTS.metrics, this.overlays.metrics));
    await this.persist();
    this.notifySettingsUpdated('metrics', partial);
  }

  async updateTraces(partial: Partial<TracesConfigSection>) {
    this.overlays.traces = deepMerge(this.overlays.traces || {}, partial);
    setConfig('traces', deepMerge(CONFIG_DEFAULTS.traces, this.overlays.traces));
    await this.persist();
    this.notifySettingsUpdated('traces', partial);
  }

  async updateWebhooks(partial: Partial<WebhooksConfigSection>) {
    this.overlays.webhooks = deepMerge(this.overlays.webhooks || {}, partial);
    setConfig('webhooks', deepMerge(CONFIG_DEFAULTS.webhooks, this.overlays.webhooks));
    await this.persist();
    this.notifySettingsUpdated('webhooks', partial);
  }

  async updateKeys(partial: Partial<KeysConfigSection>) {
    this.overlays.keys = deepMerge(this.overlays.keys || {}, partial);
    setConfig('keys', deepMerge(CONFIG_DEFAULTS.keys, this.overlays.keys));
    await this.persist();
    this.notifySettingsUpdated('keys', partial);
  }

  async updateLlm(partial: Partial<LlmConfigSection>) {
    this.overlays.llm = deepMerge(this.overlays.llm || {}, partial);
    setConfig('llm', deepMerge(CONFIG_DEFAULTS.llm, this.overlays.llm));
    await this.persist();
    this.notifySettingsUpdated('llm', partial);
  }

  async updatePressure(partial: Partial<PressureConfigSection>) {
    this.overlays.pressure = deepMerge(this.overlays.pressure || {}, partial);
    setConfig('pressure', deepMerge(CONFIG_DEFAULTS.pressure, this.overlays.pressure));
    await this.persist();
    this.notifySettingsUpdated('pressure', partial);
  }

  async updatePricing(partial: Partial<PricingConfigSection>) {
    this.overlays.pricing = deepMerge(this.overlays.pricing || {}, partial);
    setConfig('pricing', deepMerge(CONFIG_DEFAULTS.pricing, this.overlays.pricing));
    await this.persist();
    this.notifySettingsUpdated('pricing', partial);
  }

  async updateServices(partial: Partial<ServicesConfigSection>) {
    this.overlays.services = deepMerge(this.overlays.services || {}, partial);
    setConfig('services', deepMerge(CONFIG_DEFAULTS.services, this.overlays.services));
    await this.persist();
    this.notifySettingsUpdated('services', partial);
  }

  private async persist() {
    await this.deps.database.setKv(OVERLAYS_KEY, this.overlays);
  }

  private applyOverlays(overlays: ConfigOverlays) {
    if (overlays.monitoring) setConfig('monitoring', deepMerge(CONFIG_DEFAULTS.monitoring, overlays.monitoring));
    if (overlays.metrics) setConfig('metrics', deepMerge(CONFIG_DEFAULTS.metrics, overlays.metrics));
    if (overlays.traces) setConfig('traces', deepMerge(CONFIG_DEFAULTS.traces, overlays.traces));
    if (overlays.webhooks) setConfig('webhooks', deepMerge(CONFIG_DEFAULTS.webhooks, overlays.webhooks));
    if (overlays.keys) setConfig('keys', deepMerge(CONFIG_DEFAULTS.keys, overlays.keys));
    if (overlays.llm) setConfig('llm', deepMerge(CONFIG_DEFAULTS.llm, overlays.llm));
    if (overlays.pressure) setConfig('pressure', deepMerge(CONFIG_DEFAULTS.pressure, overlays.pressure));
    if (overlays.pricing) setConfig('pricing', deepMerge(CONFIG_DEFAULTS.pricing, overlays.pricing));
    if (overlays.services) setConfig('services', deepMerge(CONFIG_DEFAULTS.services, overlays.services));
  }
}

