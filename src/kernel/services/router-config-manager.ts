import type { RouterConfig, WeightProfile, ABTestConfig } from '../types/routing-types';
import type { RouterConfigSection } from '../contracts/config-registry';
import { CONFIG } from './config-registry';

const CONFIG_KEY = 'router_config';
const DEFAULT_PROFILE_NAME = 'default';

let _instance: RouterConfigManager | null = null;

export function setRouterConfigManagerInstance(manager: RouterConfigManager): void {
  _instance = manager;
}

export function getRouterConfig(): RouterConfigSection {
  if (_instance) {
    const c = _instance.getConfig();
    return {
      ...CONFIG.router,
      activeProfile: c.activeProfile,
      weightProfiles: c.weightProfiles as unknown as RouterConfigSection['weightProfiles'],
      abTest: c.abTest as unknown as RouterConfigSection['abTest'],
    };
  }
  return CONFIG.router;
}

export interface RouterConfigManagerDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

function buildDefaultProfile(r: typeof CONFIG.router): WeightProfile {
  return {
    name: DEFAULT_PROFILE_NAME,
    description: 'Default system profile based on CONFIG.router defaults',
    defaultWeights: r.defaultWeights,
    strategyWeights: { ...r.strategyWeights, free_first: r.strategyWeights.freeFirst },
    autoDynamicAdjustment: r.autoDynamicAdjustment,
    latencyVarianceBands: r.latencyVarianceBands,
    scoring: {
      ttft: { maxMs: r.scoring.ttftMaxMs },
      tps: { max: r.scoring.tpsMax },
      reliability: { floor: r.scoring.reliabilityFloor },
      stabilityBonus: r.scoring.stabilityBonus,
      reputationBonus: r.scoring.reputationBonus,
      keyReputationBonus: r.scoring.keyReputationBonus,
      latencyPenalty: r.scoring.latencyPenalty,
      costPenalty: r.scoring.costPenalty,
    },
  };
}

function routerConfigFromCONFIG(): RouterConfig {
  const r = CONFIG.router;
  const defaultProfile = buildDefaultProfile(r);
  return {
    history: r.history,
    latency: r.latency,
    activeProfile: DEFAULT_PROFILE_NAME,
    weightProfiles: { [DEFAULT_PROFILE_NAME]: defaultProfile },
    abTest: null,
    classification: {
      complexThreshold: r.classification.complexThreshold,
      mediumThreshold: r.classification.mediumThreshold,
      longThreshold: r.classification.longThreshold,
      codePatterns: r.classification.codePatterns,
      reasoningPatterns: r.classification.reasoningPatterns,
      multimodalPatterns: r.classification.multimodalPatterns,
    },
    affinity: r.affinity,
    priority: r.priority,
    providerByComplexity: r.providerByComplexity,
  };
}

export class RouterConfigManager {
  private config: RouterConfig;
  private deps: RouterConfigManagerDeps;

  constructor(deps: RouterConfigManagerDeps) {
    this.deps = deps;
    this.config = routerConfigFromCONFIG();
  }

  get raw(): RouterConfig {
    return this.config;
  }

  async init(): Promise<void> {
    try {
      const saved = await this.deps.database.getKv<Partial<RouterConfig>>(CONFIG_KEY);
      if (saved) {
        const defaults = routerConfigFromCONFIG();
        this.config = {
          ...defaults,
          ...saved,
          weightProfiles: { ...defaults.weightProfiles, ...(saved.weightProfiles || {}) },
          abTest: saved.abTest !== undefined ? saved.abTest : defaults.abTest,
        };
        if (!this.config.weightProfiles[this.config.activeProfile]) {
          this.config.activeProfile = DEFAULT_PROFILE_NAME;
        }
      }
    } catch {
      // use defaults
    }
    setRouterConfigManagerInstance(this);
  }

  getConfig(): RouterConfig {
    return { ...this.config };
  }

  async updateConfig(partial: Partial<RouterConfig>): Promise<void> {
    this.config = { ...this.config, ...partial };
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  getActiveProfile(): WeightProfile {
    const profile = this.config.weightProfiles[this.config.activeProfile];
    return profile ?? this.config.weightProfiles[DEFAULT_PROFILE_NAME];
  }

  getProfileNames(): string[] {
    return Object.keys(this.config.weightProfiles);
  }

  getProfile(name: string): WeightProfile | null {
    return this.config.weightProfiles[name] ?? null;
  }

  async updateActiveProfileWeights(weights: { ttft: number; tps: number; reliability: number }): Promise<void> {
    const profile = this.config.weightProfiles[this.config.activeProfile];
    if (!profile) return;
    profile.defaultWeights = weights;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  async setProfile(name: string, profile: WeightProfile): Promise<void> {
    this.config.weightProfiles[name] = profile;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  async deleteProfile(name: string): Promise<boolean> {
    if (name === this.config.activeProfile || !this.config.weightProfiles[name]) return false;
    delete this.config.weightProfiles[name];
    await this.deps.database.setKv(CONFIG_KEY, this.config);
    return true;
  }

  async setActiveProfile(name: string): Promise<boolean> {
    if (!this.config.weightProfiles[name]) return false;
    this.config.activeProfile = name;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
    return true;
  }

  async startABTest(control: string, experiment: string, splitPercent: number): Promise<boolean> {
    if (!this.config.weightProfiles[control] || !this.config.weightProfiles[experiment]) return false;
    if (splitPercent < 1 || splitPercent > 99) return false;
    this.config.abTest = {
      enabled: true, controlProfile: control, experimentProfile: experiment,
      splitPercent, startedAt: Date.now(),
      metrics: { control: { requests: 0, avgLatency: 0, successRate: 0, avgScore: 0 }, experiment: { requests: 0, avgLatency: 0, successRate: 0, avgScore: 0 } },
    };
    await this.deps.database.setKv(CONFIG_KEY, this.config);
    return true;
  }

  async stopABTest(): Promise<void> {
    this.config.abTest = null;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  getABTest(): ABTestConfig | null {
    return this.config.abTest ? { ...this.config.abTest } : null;
  }

  recordABTestResult(usedExperiment: boolean, latency: number, success: boolean, score: number): void {
    const ab = this.config.abTest;
    if (!ab || !ab.enabled) return;
    const bucket = usedExperiment ? 'experiment' : 'control';
    const m = ab.metrics[bucket];
    const count = m.requests + 1;
    m.requests = count;
    m.avgLatency = m.avgLatency + (latency - m.avgLatency) / count;
    m.successRate = m.successRate + ((success ? 1 : 0) - m.successRate) / count;
    m.avgScore = m.avgScore + (score - m.avgScore) / count;
  }

  resolveProfileForRequest(): string {
    const ab = this.config.abTest;
    if (ab && ab.enabled && ab.splitPercent > 0) {
      const roll = Math.random() * 100;
      if (roll < ab.splitPercent) return ab.experimentProfile;
    }
    return this.config.activeProfile;
  }
}
