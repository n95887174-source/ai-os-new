import { CONFIG_DEFAULTS } from './config-registry';
import { setConfig } from './config-mutations';
import type {
    ConfigRegistry,
    MonitoringConfigSection,
    MetricsConfigSection,
    TracesConfigSection,
    WebhooksConfigSection,
    KeysConfigSection,
    LlmConfigSection,
    PressureConfigSection,
    PricingConfigSection,
    ServicesConfigSection,
} from '../contracts/config-registry';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('ConfigService');

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

function deepMerge<T>(target: T, source?: Partial<T>, depth = 0): T {
    if (!source) return target;
    if (depth > 10) return { ...target, ...source } as T;
    const result = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(source as Record<string, unknown>)) {
        const val = (source as Record<string, unknown>)[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const base =
                result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
                    ? (result[key] as Record<string, unknown>)
                    : {};
            result[key] = deepMerge(base as T, val as Partial<T>, depth + 1);
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
            rootLogger.warn('ConfigService', 'Failed to load config overlays, using defaults', {
                error: String(e),
            });
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

    private notifySettingsUpdated(section: string, changes: unknown) {
        this.deps.eventBus?.emit(EVENTS.SETTINGS_UPDATED, {
            settings: this.getConfigForSection(section),
            changes,
        });
    }

    private getConfigForSection(section: string) {
        switch (section) {
            case 'monitoring':
                return this.getMonitoring();
            case 'metrics':
                return this.getMetrics();
            case 'traces':
                return this.getTraces();
            case 'webhooks':
                return this.getWebhooks();
            case 'keys':
                return this.getKeys();
            case 'llm':
                return this.getLlm();
            case 'pressure':
                return this.getPressure();
            case 'pricing':
                return this.getPricing();
            case 'services':
                return this.getServices();
            default:
                return undefined;
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
        try {
            await this.deps.database.setKv(OVERLAYS_KEY, this.overlays);
        } catch (e) {
            LOGGER.warn('ConfigService', 'Persist failed', { error: e });
        }
    }

    private applyOverlays(overlays: ConfigOverlays) {
        const defaults = CONFIG_DEFAULTS as Record<string, unknown>;
        for (const [key, value] of Object.entries(overlays)) {
            if (value)
                setConfig(
                    key as keyof ConfigRegistry,
                    deepMerge(defaults[key] as Record<string, unknown>, value),
                );
        }
    }
}
