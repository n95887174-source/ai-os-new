import { CONFIG, setConfig } from './config-registry';
import { getRouterConfig } from './router-config-manager';
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

export interface ConfigServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
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
      result[key] = deepMerge(base as never, val as Partial<never>);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

export class ConfigService {
  private deps: ConfigServiceDeps;
  private overlays: ConfigOverlays = {};

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
    } catch { this.overlays = {}; }
  }

  getRouter(): RouterConfigSection {
    return getRouterConfig();
  }

  getMonitoring(): MonitoringConfigSection {
    return deepMerge(CONFIG.monitoring, this.overlays.monitoring);
  }

  getMetrics(): MetricsConfigSection {
    return deepMerge(CONFIG.metrics, this.overlays.metrics);
  }

  getTraces(): TracesConfigSection {
    return deepMerge(CONFIG.traces, this.overlays.traces);
  }

  getWebhooks(): WebhooksConfigSection {
    return deepMerge(CONFIG.webhooks, this.overlays.webhooks);
  }

  getKeys(): KeysConfigSection {
    return deepMerge(CONFIG.keys, this.overlays.keys);
  }

  getLlm(): LlmConfigSection {
    return deepMerge(CONFIG.llm, this.overlays.llm);
  }

  getPressure(): PressureConfigSection {
    return deepMerge(CONFIG.pressure, this.overlays.pressure);
  }

  getPricing(): PricingConfigSection {
    return deepMerge(CONFIG.pricing, this.overlays.pricing);
  }

  getServices(): ServicesConfigSection {
    return deepMerge(CONFIG.services, this.overlays.services);
  }

  async updateRouter(_partial: Partial<RouterConfigSection>) {
    console.warn('[ConfigService] updateRouter() is deprecated — use RouterConfigManager API');
  }

  async updateMonitoring(partial: Partial<MonitoringConfigSection>) {
    this.overlays.monitoring = deepMerge(this.overlays.monitoring || {}, partial);
    setConfig('monitoring', deepMerge(CONFIG.monitoring, partial));
    await this.persist();
  }

  async updateMetrics(partial: Partial<MetricsConfigSection>) {
    this.overlays.metrics = deepMerge(this.overlays.metrics || {}, partial);
    setConfig('metrics', deepMerge(CONFIG.metrics, partial));
    await this.persist();
  }

  async updateTraces(partial: Partial<TracesConfigSection>) {
    this.overlays.traces = deepMerge(this.overlays.traces || {}, partial);
    setConfig('traces', deepMerge(CONFIG.traces, partial));
    await this.persist();
  }

  async updateWebhooks(partial: Partial<WebhooksConfigSection>) {
    this.overlays.webhooks = deepMerge(this.overlays.webhooks || {}, partial);
    setConfig('webhooks', deepMerge(CONFIG.webhooks, partial));
    await this.persist();
  }

  async updateKeys(partial: Partial<KeysConfigSection>) {
    this.overlays.keys = deepMerge(this.overlays.keys || {}, partial);
    setConfig('keys', deepMerge(CONFIG.keys, partial));
    await this.persist();
  }

  async updateLlm(partial: Partial<LlmConfigSection>) {
    this.overlays.llm = deepMerge(this.overlays.llm || {}, partial);
    setConfig('llm', deepMerge(CONFIG.llm, partial));
    await this.persist();
  }

  async updatePressure(partial: Partial<PressureConfigSection>) {
    this.overlays.pressure = deepMerge(this.overlays.pressure || {}, partial);
    setConfig('pressure', deepMerge(CONFIG.pressure, partial));
    await this.persist();
  }

  async updatePricing(partial: Partial<PricingConfigSection>) {
    this.overlays.pricing = deepMerge(this.overlays.pricing || {}, partial);
    setConfig('pricing', deepMerge(CONFIG.pricing, partial));
    await this.persist();
  }

  async updateServices(partial: Partial<ServicesConfigSection>) {
    this.overlays.services = deepMerge(this.overlays.services || {}, partial);
    setConfig('services', deepMerge(CONFIG.services, partial));
    await this.persist();
  }

  private async persist() {
    await this.deps.database.setKv(OVERLAYS_KEY, this.overlays);
  }

  private applyOverlays(overlays: ConfigOverlays) {
    if (overlays.monitoring) setConfig('monitoring', deepMerge(CONFIG.monitoring, overlays.monitoring));
    if (overlays.metrics) setConfig('metrics', deepMerge(CONFIG.metrics, overlays.metrics));
    if (overlays.traces) setConfig('traces', deepMerge(CONFIG.traces, overlays.traces));
    if (overlays.webhooks) setConfig('webhooks', deepMerge(CONFIG.webhooks, overlays.webhooks));
    if (overlays.keys) setConfig('keys', deepMerge(CONFIG.keys, overlays.keys));
    if (overlays.llm) setConfig('llm', deepMerge(CONFIG.llm, overlays.llm));
    if (overlays.pressure) setConfig('pressure', deepMerge(CONFIG.pressure, overlays.pressure));
    if (overlays.pricing) setConfig('pricing', deepMerge(CONFIG.pricing, overlays.pricing));
    if (overlays.services) setConfig('services', deepMerge(CONFIG.services, overlays.services));
  }
}

