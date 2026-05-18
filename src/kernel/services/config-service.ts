import { CONFIG } from './config-registry';
import type { MonitoringConfigSection, MetricsConfigSection, TracesConfigSection } from '../contracts/config-registry';

export interface ConfigServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

const OVERLAYS_KEY = 'config_overlays';

type ConfigOverlays = {
  monitoring?: Partial<MonitoringConfigSection>;
  metrics?: Partial<MetricsConfigSection>;
  traces?: Partial<TracesConfigSection>;
};

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

  getMonitoring(): MonitoringConfigSection {
    return this.mergeMonitoring(CONFIG.monitoring, this.overlays.monitoring);
  }

  getMetrics(): MetricsConfigSection {
    return { ...CONFIG.metrics, ...this.overlays.metrics };
  }

  getTraces(): TracesConfigSection {
    return { ...CONFIG.traces, ...this.overlays.traces };
  }

  async updateMonitoring(partial: Partial<MonitoringConfigSection>) {
    this.overlays.monitoring = this.mergeMonitoring(this.getMonitoring(), partial);
    CONFIG.monitoring = this.mergeMonitoring(CONFIG.monitoring, partial);
    await this.persist();
  }

  async updateMetrics(partial: Partial<MetricsConfigSection>) {
    this.overlays.metrics = { ...this.overlays.metrics, ...partial };
    CONFIG.metrics = { ...CONFIG.metrics, ...partial };
    await this.persist();
  }

  async updateTraces(partial: Partial<TracesConfigSection>) {
    this.overlays.traces = { ...this.overlays.traces, ...partial };
    CONFIG.traces = { ...CONFIG.traces, ...partial };
    await this.persist();
  }

  private async persist() {
    await this.deps.database.setKv(OVERLAYS_KEY, this.overlays);
  }

  private applyOverlays(overlays: ConfigOverlays) {
    if (overlays.monitoring) CONFIG.monitoring = this.mergeMonitoring(CONFIG.monitoring, overlays.monitoring);
    if (overlays.metrics) CONFIG.metrics = { ...CONFIG.metrics, ...overlays.metrics };
    if (overlays.traces) CONFIG.traces = { ...CONFIG.traces, ...overlays.traces };
  }

  private mergeMonitoring(base: MonitoringConfigSection, partial?: Partial<MonitoringConfigSection>): MonitoringConfigSection {
    const next = { ...base, ...partial };
    next.healthThresholds = { ...base.healthThresholds, ...partial?.healthThresholds };
    next.latencyPenalty = { ...base.latencyPenalty, ...partial?.latencyPenalty };
    next.errorRatePenalty = { ...base.errorRatePenalty, ...partial?.errorRatePenalty };
    next.successRatePenalty = { ...base.successRatePenalty, ...partial?.successRatePenalty };
    next.alertPenalty = { ...base.alertPenalty, ...partial?.alertPenalty };
    return next;
  }
}
