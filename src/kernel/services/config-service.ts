import { CONFIG } from './config-registry';
import type { MonitoringConfigSection, MetricsConfigSection, TracesConfigSection } from '../contracts/config-registry';

export interface ConfigServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

const OVERLAYS_KEY = 'config_overlays';

export class ConfigService {
  private deps: ConfigServiceDeps;
  private overlays: {
    monitoring?: Partial<MonitoringConfigSection>;
    metrics?: Partial<MetricsConfigSection>;
    traces?: Partial<TracesConfigSection>;
  } = {};

  constructor(deps: ConfigServiceDeps) {
    this.deps = deps;
  }

  async init() {
    try {
      const saved = await this.deps.database.getKv<typeof this.overlays>(OVERLAYS_KEY);
      if (saved) this.overlays = saved;
    } catch { this.overlays = {}; }
  }

  getMonitoring(): MonitoringConfigSection {
    return { ...CONFIG.monitoring, ...this.overlays.monitoring } as MonitoringConfigSection;
  }

  getMetrics(): MetricsConfigSection {
    return { ...CONFIG.metrics, ...this.overlays.metrics } as MetricsConfigSection;
  }

  getTraces(): TracesConfigSection {
    return { ...CONFIG.traces, ...this.overlays.traces } as TracesConfigSection;
  }

  async updateMonitoring(partial: Partial<MonitoringConfigSection>) {
    this.overlays.monitoring = { ...this.overlays.monitoring, ...partial };
    await this.persist();
  }

  async updateMetrics(partial: Partial<MetricsConfigSection>) {
    this.overlays.metrics = { ...this.overlays.metrics, ...partial };
    await this.persist();
  }

  async updateTraces(partial: Partial<TracesConfigSection>) {
    this.overlays.traces = { ...this.overlays.traces, ...partial };
    await this.persist();
  }

  private async persist() {
    await this.deps.database.setKv(OVERLAYS_KEY, this.overlays);
  }
}
