/**
 * Provider Personality Profile Service
 * Calibrate provider "personalities" for smart routing
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('ProviderPersonality');

export interface ProviderPersonality {
  provider: string;
  speed: number;        // 0-1 (1 = fastest)
  verbosity: number;    // 0-1 (1 = most verbose)
  formality: number;   // 0-1 (1 = most formal)
  creativity: number;  // 0-1 (1 = most creative)
  costEfficiency: number;
  calibrationSamples: number;
  lastCalibrated: number;
}

export interface PersonalityMatch {
  provider: string;
  matchScore: number; // 0-1
  traits: Record<string, number>;
}

const DEFAULT_PERSONALITIES: Record<string, Partial<ProviderPersonality>> = {
  groq: { speed: 0.95, verbosity: 0.4, formality: 0.5, creativity: 0.5, costEfficiency: 0.95 },
  gemini: { speed: 0.7, verbosity: 0.8, formality: 0.6, creativity: 0.7, costEfficiency: 0.9 },
  openai: { speed: 0.6, verbosity: 0.7, formality: 0.7, creativity: 0.6, costEfficiency: 0.4 },
  anthropic: { speed: 0.5, verbosity: 0.9, formality: 0.8, creativity: 0.5, costEfficiency: 0.3 },
  openrouter: { speed: 0.6, verbosity: 0.6, formality: 0.6, creativity: 0.6, costEfficiency: 0.5 },
  nvidia: { speed: 0.7, verbosity: 0.6, formality: 0.5, creativity: 0.6, costEfficiency: 0.5 },
};

class ProviderPersonalityService {
  private storage: StorageAdapter;
  private personalities: Map<string, ProviderPersonality> = new Map();

  constructor() {
    this.storage = StorageAdapter.PROVIDERS;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, ProviderPersonality][]>('personalities');
    if (saved) {
      for (const [provider, personality] of saved) {
        this.personalities.set(provider, personality);
      }
    }

    // Initialize defaults for providers that don't have profiles yet
    for (const [provider, defaults] of Object.entries(DEFAULT_PERSONALITIES)) {
      if (!this.personalities.has(provider)) {
        this.personalities.set(provider, {
          provider,
          speed: defaults.speed || 0.5,
          verbosity: defaults.verbosity || 0.5,
          formality: defaults.formality || 0.5,
          creativity: defaults.creativity || 0.5,
          costEfficiency: defaults.costEfficiency || 0.5,
          calibrationSamples: 0,
          lastCalibrated: 0,
        });
      }
    }

    LOGGER.info('ProviderPersonality', `Initialized with ${this.personalities.size} profiles`);
  }

  /**
   * Get personality for a provider
   */
  getPersonality(provider: string): ProviderPersonality | undefined {
    return this.personalities.get(provider);
  }

  /**
   * Get all personalities
   */
  getAll(): ProviderPersonality[] {
    return Array.from(this.personalities.values());
  }

  /**
   * Update personality trait
   */
  async updateTrait(provider: string, trait: keyof Omit<ProviderPersonality, 'provider' | 'calibrationSamples' | 'lastCalibrated'>, value: number): Promise<void> {
    const personality = this.personalities.get(provider);
    if (!personality) return;

    (personality as unknown as Record<string, unknown>)[trait] = Math.max(0, Math.min(1, value));
    personality.calibrationSamples++;
    personality.lastCalibrated = Date.now();

    await this.save();
    EventBus.emit(EVENTS.PROVIDER_PERSONALITY_UPDATED, { provider, trait, value });
  }

  /**
   * Batch update from calibration
   */
  async calibrate(provider: string, samples: Array<{ speed?: number; verbosity?: number; formality?: number; creativity?: number; costEfficiency?: number }>): Promise<void> {
    const personality = this.personalities.get(provider);
    if (!personality) return;

    const traits = ['speed', 'verbosity', 'formality', 'creativity', 'costEfficiency'] as const;
    
    for (const trait of traits) {
      const values = samples.map(s => s[trait]).filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        (personality as unknown as Record<string, unknown>)[trait] = avg;
      }
    }

    personality.calibrationSamples += samples.length;
    personality.lastCalibrated = Date.now();
    await this.save();

    LOGGER.info('ProviderPersonality', 'Provider calibrated', { provider, samples: samples.length });
    EventBus.emit(EVENTS.PROVIDER_PERSONALITY_CALIBRATED, { provider, samples: samples.length });
  }

  /**
   * Find best matching provider for a task
   */
  findBestMatch(task: {
    speed?: number;
    verbosity?: number;
    formality?: number;
    creativity?: number;
    costEfficiency?: number;
  }): PersonalityMatch[] {
    const results: PersonalityMatch[] = [];

    for (const [provider, personality] of this.personalities.entries()) {
      let totalScore = 0;
      let count = 0;
      const traits: Record<string, number> = {};

      const traitKeys = ['speed', 'verbosity', 'formality', 'creativity', 'costEfficiency'] as const;

      for (const trait of traitKeys) {
        const taskValue = task[trait as keyof typeof task];
        if (taskValue !== undefined) {
          const providerValue = personality[trait as keyof ProviderPersonality] as number;
          const diff = Math.abs(taskValue - providerValue);
          const score = 1 - diff;
          totalScore += score;
          count++;
          traits[trait] = score;
        }
      }

      if (count > 0) {
        results.push({
          provider,
          matchScore: totalScore / count,
          traits,
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get radar chart data
   */
  getRadarData(provider: string): Array<{ trait: string; value: number }> {
    const personality = this.personalities.get(provider);
    if (!personality) return [];

    const traits = ['speed', 'verbosity', 'formality', 'creativity', 'costEfficiency'];
    return traits.map(trait => ({
      trait,
      value: personality[trait as keyof ProviderPersonality] as number,
    }));
  }

  /**
   * Compare two providers
   */
  compare(providerA: string, providerB: string): {
    traits: Record<string, { a: number; b: number; diff: number }>;
    overallDiff: number;
  } {
    const a = this.personalities.get(providerA);
    const b = this.personalities.get(providerB);

    if (!a || !b) {
      return { traits: {}, overallDiff: 0 };
    }

    const traits = ['speed', 'verbosity', 'formality', 'creativity', 'costEfficiency'];
    const result: Record<string, { a: number; b: number; diff: number }> = {};
    let totalDiff = 0;

    for (const trait of traits) {
      const aVal = a[trait as keyof ProviderPersonality] as number;
      const bVal = b[trait as keyof ProviderPersonality] as number;
      const diff = Math.abs(aVal - bVal);
      result[trait] = { a: aVal, b: bVal, diff };
      totalDiff += diff;
    }

    return {
      traits: result,
      overallDiff: totalDiff / traits.length,
    };
  }

  private async save(): Promise<void> {
    await this.storage.set('personalities', Array.from(this.personalities.entries()));
  }
}

// Singleton
export const providerPersonalityService = new ProviderPersonalityService();

// Add events
if (!EVENTS.PROVIDER_PERSONALITY_UPDATED) {
  (EVENTS as unknown as Record<string, string>).PROVIDER_PERSONALITY_UPDATED = 'provider:personality:updated';
}
if (!EVENTS.PROVIDER_PERSONALITY_CALIBRATED) {
  (EVENTS as unknown as Record<string, string>).PROVIDER_PERSONALITY_CALIBRATED = 'provider:personality:calibrated';
}