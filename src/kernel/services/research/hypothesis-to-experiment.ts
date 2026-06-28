/**
 * Hypothesis to Experiment Pipeline
 * Converts validated hypotheses into routing experiments
 */

import { genId } from '../../../utils/gen-id';
import { EventBus } from '../../events/event-bus';
import { EVENTS } from '../../events/event-names';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('HypothesisToExperiment');

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  experimentable: boolean;
  status: 'active' | 'debating' | 'validated' | 'rejected' | 'archived';
  evidence?: string[];
  suggestedFix?: string;
  createdAt: number;
  validatedAt?: number;
}

export interface ExperimentConfig {
  controlConfig: Record<string, unknown>;
  variantConfig: Record<string, unknown>;
  trafficSplit: number; // 0-100, percentage to variant
  sampleSize: number;
  successMetric: string;
  durationDays: number;
}

export interface HypothesisExperimentLink {
  hypothesisId: string;
  experimentId: string;
  createdAt: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    hypothesisHeld: boolean;
    confidence: number;
    pValue?: number;
    sampleSize: number;
    recommendation: 'adopt' | 'reject' | 'inconclusive';
  };
}

export interface HypothesisConversionResult {
  success: boolean;
  hypothesis: Hypothesis;
  experimentId?: string;
  error?: string;
}

class HypothesisToExperimentPipeline {
  private links: Map<string, HypothesisExperimentLink> = new Map();
  private pendingConversions: Map<string, Hypothesis> = new Map();
  private unsub?: () => void;

  constructor() {
    this.init();
  }

  private init(): void {
    // Listen for hypothesis validation events
    this.unsub = EventBus.on(EVENTS.HYPOTHESIS_VALIDATED, ((data: { hypothesisId: string; hypothesis: Hypothesis }) => {
      if (data.hypothesis.experimentable) {
        this.queueConversion(data.hypothesis);
      }
    }) as unknown as (data: unknown) => void);

    LOGGER.info('HypothesisToExperiment', 'Initialized');
  }

  /**
   * Check if hypothesis is experimentable
   */
  isExperimentable(hypothesis: Hypothesis): boolean {
    // A hypothesis is experimentable if:
    // 1. It has a clear suggested fix
    // 2. The fix can be expressed as a routing parameter change
    // 3. It has a measurable outcome

    if (!hypothesis.suggestedFix) return false;
    if (!hypothesis.experimentable) return false;

    // Check if the suggested fix is actionable
    const actionableKeywords = [
      'router', 'strategy', 'weights', 'timeout', 'retry',
      'cache', 'fallback', 'rate-limit', 'concurrency', 'provider'
    ];

    return actionableKeywords.some(keyword =>
      hypothesis.suggestedFix!.toLowerCase().includes(keyword) ||
      hypothesis.description.toLowerCase().includes(keyword)
    );
  }

  /**
   * Queue a hypothesis for conversion
   */
  queueConversion(hypothesis: Hypothesis): void {
    this.pendingConversions.set(hypothesis.id, hypothesis);
    LOGGER.info('HypothesisToExperiment', 'Queued for conversion', {
      hypothesisId: hypothesis.id,
      title: hypothesis.title
    });
  }

  /**
   * Convert hypothesis to experiment
   */
  async convert(
    hypothesisId: string,
    config?: Partial<ExperimentConfig>
  ): Promise<HypothesisConversionResult> {
    const hypothesis = this.pendingConversions.get(hypothesisId) ||
                       await this.getHypothesisById(hypothesisId);

    if (!hypothesis) {
      return {
        success: false,
        hypothesis: { id: hypothesisId } as Hypothesis,
        error: 'Hypothesis not found'
      };
    }

    if (!this.isExperimentable(hypothesis)) {
      return {
        success: false,
        hypothesis,
        error: 'Hypothesis is not experimentable'
      };
    }

    try {
      // Generate experiment config from hypothesis
      const experimentConfig = this.generateExperimentConfig(hypothesis, config);

      // Create the experiment
      const experimentId = await this.createExperiment(experimentConfig);

      // Create link
      const link: HypothesisExperimentLink = {
        hypothesisId: hypothesis.id,
        experimentId,
        createdAt: Date.now(),
        status: 'pending',
      };

      this.links.set(`${hypothesis.id}:${experimentId}`, link);

      // Update hypothesis status
      hypothesis.status = 'debating';

      // Emit event to start experiment
      EventBus.emit(EVENTS.EXPERIMENT_CREATED_FROM_HYPOTHESIS, {
        hypothesisId: hypothesis.id,
        experimentId,
        config: experimentConfig
      });

      LOGGER.info('HypothesisToExperiment', 'Conversion successful', {
        hypothesisId: hypothesis.id,
        experimentId
      });

      return {
        success: true,
        hypothesis,
        experimentId
      };
    } catch (error) {
      LOGGER.error('HypothesisToExperiment', 'Conversion failed', {
        hypothesisId: hypothesis.id,
        error
      });

      return {
        success: false,
        hypothesis,
        error: String(error)
      };
    }
  }

  /**
   * Generate experiment configuration from hypothesis
   */
  private generateExperimentConfig(
    hypothesis: Hypothesis,
    overrides?: Partial<ExperimentConfig>
  ): ExperimentConfig {
    // Parse the suggested fix to determine what to change
    const fix = hypothesis.suggestedFix || '';

    // Default configuration
    const controlConfig = {
      strategy: 'balanced',
      weights: { reliability: 0.25, latency: 0.25, cost: 0.25, quality: 0.25 }
    };

    let variantConfig = { ...controlConfig };

    // Parse fix to modify variant config
    if (fix.includes('reliability')) {
      variantConfig = {
        ...variantConfig,
        weights: { reliability: 0.4, latency: 0.2, cost: 0.2, quality: 0.2 }
      };
    }

    if (fix.includes('latency')) {
      variantConfig = {
        ...variantConfig,
        weights: { reliability: 0.2, latency: 0.4, cost: 0.2, quality: 0.2 }
      };
    }

    if (fix.includes('cost')) {
      variantConfig = {
        ...variantConfig,
        weights: { reliability: 0.2, latency: 0.2, cost: 0.4, quality: 0.2 }
      };
    }

    if (fix.includes('retry')) {
      variantConfig = {
        ...variantConfig,
        maxRetries: 3,
        retryDelay: 500
      } as typeof variantConfig;
    }

    if (fix.includes('circuit')) {
      variantConfig = {
        ...variantConfig,
        circuitBreakerThreshold: 3
      } as typeof variantConfig;
    }

    return {
      controlConfig,
      variantConfig,
      trafficSplit: overrides?.trafficSplit ?? 50,
      sampleSize: overrides?.sampleSize ?? 100,
      successMetric: overrides?.successMetric ?? 'success_rate',
      durationDays: overrides?.durationDays ?? 7,
      ...overrides
    };
  }

  /**
   * Create experiment via event (actual experiment creation handled elsewhere)
   */
  private async createExperiment(_config: ExperimentConfig): Promise<string> {
    const experimentId = genId('exp');
    return experimentId;
  }

  /**
   * Get hypothesis by ID (placeholder - would integrate with HypothesisService)
   */
  private async getHypothesisById(_id: string): Promise<Hypothesis | null> {
    // This would integrate with the actual hypothesis service
    // For now, return null and expect hypothesis to be queued first
    return null;
  }

  /**
   * Record experiment result and link back to hypothesis
   */
  recordResult(
    hypothesisId: string,
    experimentId: string,
    result: HypothesisExperimentLink['result']
  ): void {
    const linkKey = `${hypothesisId}:${experimentId}`;
    const link = this.links.get(linkKey);

    if (link) {
      link.result = result;
      link.status = 'completed';

      // Update hypothesis based on result
      EventBus.emit(EVENTS.HYPOTHESIS_EXPERIMENT_RESULT, {
        hypothesisId,
        experimentId,
        result,
        recommendation: result?.recommendation
      });

      LOGGER.info('HypothesisToExperiment', 'Result recorded', {
        hypothesisId,
        experimentId,
        recommendation: result?.recommendation
      });
    }
  }

  /**
   * Get pending conversions
   */
  getPendingConversions(): Hypothesis[] {
    return Array.from(this.pendingConversions.values());
  }

  /**
   * Get link for hypothesis-experiment pair
   */
  getLink(hypothesisId: string, experimentId: string): HypothesisExperimentLink | undefined {
    return this.links.get(`${hypothesisId}:${experimentId}`);
  }

  /**
   * Get all links for a hypothesis
   */
  getLinksForHypothesis(hypothesisId: string): HypothesisExperimentLink[] {
    return Array.from(this.links.values()).filter(l => l.hypothesisId === hypothesisId);
  }

  /**
   * Get all links for an experiment
   */
  getLinksForExperiment(experimentId: string): HypothesisExperimentLink[] {
    return Array.from(this.links.values()).filter(l => l.experimentId === experimentId);
  }

  /**
   * Get experiment conversion stats
   */
  getStats(): {
    totalConversions: number;
    completed: number;
    pending: number;
    hypothesisHeld: number;
    hypothesisRejected: number;
    inconclusive: number;
  } {
    const links = Array.from(this.links.values());
    const completed = links.filter(l => l.status === 'completed');

    return {
      totalConversions: links.length,
      completed: completed.length,
      pending: links.filter(l => l.status === 'pending' || l.status === 'running').length,
      hypothesisHeld: completed.filter(l => l.result?.recommendation === 'adopt').length,
      hypothesisRejected: completed.filter(l => l.result?.recommendation === 'reject').length,
      inconclusive: completed.filter(l => l.result?.recommendation === 'inconclusive').length,
    };
  }

  /**
   * Clear stale pending conversions
   */
  destroy(): void {
    this.unsub?.();
    this.unsub = undefined;
    this.links.clear();
    this.pendingConversions.clear();
  }

  clearStaleConversions(maxAgeMs = 86400000): void {
    const now = Date.now();
    for (const [id, hypothesis] of this.pendingConversions) {
      if (now - hypothesis.createdAt > maxAgeMs) {
        this.pendingConversions.delete(id);
      }
    }
  }

  /**
   * Preview conversion without creating experiment
   */
  previewConversion(hypothesisId: string, overrides?: Partial<ExperimentConfig>): ExperimentConfig | null {
    // B10-66: Check pendingConversions first; if not found, return null instead of creating a partial object
    const hypothesis = this.pendingConversions.get(hypothesisId);
    if (!hypothesis) return null;

    return this.generateExperimentConfig(hypothesis, overrides);
  }
}

// Singleton instance
export const hypothesisToExperimentPipeline = new HypothesisToExperimentPipeline();

