/**
 * Fact-Check Pipeline for Debates
 * Validates claims against online sources using Perplexity API
 */

import { genId } from '../../../utils/gen-id';
import { rootLogger } from '../../services/logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { ProviderAdapterRegistry } from '../../services/provider-adapter-registry';
import { StorageAdapter } from '../../services/storage-adapter';

const LOGGER = rootLogger.child('FactCheck');

export type FactCheckVerdict = 'verified' | 'disputed' | 'no_evidence' | 'false' | 'unverified';

export interface FactCheckResult {
  id: string;
  claim: string;
  verdict: FactCheckVerdict;
  explanation: string;
  sources: FactCheckSource[];
  confidence: number; // 0-1
  timestamp: number;
  cached: boolean;
}

export interface FactCheckSource {
  title: string;
  url: string;
  snippet: string;
}

export interface FactCheckConfig {
  provider: string;
  model: string;
  sampleRate: number;        // 0-1, check this fraction of claims
  cacheEnabled: boolean;
  cacheMaxAge: number;        // ms
  levels: 'off' | 'sampled' | 'all';
}

const DEFAULT_CONFIG: FactCheckConfig = {
  provider: 'perplexity',
  model: 'llama-3.1-sonar-small-128k-online',
  sampleRate: 0.3,
  cacheEnabled: true,
  cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  levels: 'sampled',
};

class FactCheckService {
  private config: FactCheckConfig;
  private cache: Map<string, FactCheckResult> = new Map();
  private storage: StorageAdapter;
  private adapterRegistry: ProviderAdapterRegistry;

  constructor(config: Partial<FactCheckConfig> = {}, registry?: ProviderAdapterRegistry) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = StorageAdapter.PROVIDERS;
    this.adapterRegistry = registry ?? new ProviderAdapterRegistry();
  }

  async init(): Promise<void> {
    // Load cached results
    const saved = await this.storage.get<FactCheckResult[]>('cache');
    if (saved) {
      for (const result of saved) {
        const key = this.makeCacheKey(result.claim);
        this.cache.set(key, result);
      }
    }

    LOGGER.info('FactCheck', `Initialized with ${this.cache.size} cached results`);
  }

  /**
   * Check if fact-checking should be performed
   */
  shouldCheck(): boolean {
    return this.config.levels !== 'off';
  }

  /**
   * Sample a claim for checking
   */
  shouldSampleClaim(claim: string): boolean {
    if (this.config.levels === 'all') return true;
    if (this.config.levels === 'off') return false;
    
    // Simple hash-based sampling for consistency
    const hash = this.simpleHash(claim);
    return (hash % 10) / 10 < this.config.sampleRate;
  }

  /**
   * Check a single claim
   */
  async checkClaim(claim: string): Promise<FactCheckResult> {
    // Check cache first
    const cacheKey = this.makeCacheKey(claim);
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isCacheStale(cached)) {
      return { ...cached, cached: true };
    }

    try {
      const result = await this.performFactCheck(claim);
      
      // Cache result
      this.cache.set(cacheKey, result);
      await this.saveCache();

      EventBus.emit(EVENTS.DEBATE_FACT_CHECKED, result);
      LOGGER.debug('FactCheck', 'Claim checked', { claim: claim.substring(0, 50), verdict: result.verdict });

      return result;
    } catch (error) {
      LOGGER.error('FactCheck', 'Fact check failed', { claim: claim.substring(0, 50), error });
      
      return {
        id: `fc-${Date.now()}`,
        claim,
        verdict: 'unverified',
        explanation: `Error checking claim: ${String(error)}`,
        sources: [],
        confidence: 0,
        timestamp: Date.now(),
        cached: false,
      };
    }
  }

  /**
   * Check multiple claims
   */
  async checkBatch(claims: string[]): Promise<FactCheckResult[]> {
    const results: FactCheckResult[] = [];
    
    for (const claim of claims) {
      if (this.shouldSampleClaim(claim)) {
        const result = await this.checkClaim(claim);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Perform actual fact-check via Perplexity
   */
  private async performFactCheck(claim: string): Promise<FactCheckResult> {
    const adapter = this.adapterRegistry.getAdapter(this.config.provider);
    if (!adapter) {
      throw new Error(`Provider ${this.config.provider} not available`);
    }

    const prompt = `Fact-check the following claim. Respond with a JSON object:
{
  "verdict": "verified" | "disputed" | "no_evidence" | "false",
  "explanation": "2-3 sentence explanation",
  "sources": [{"title": "...", "url": "...", "snippet": "..."}],
  "confidence": 0-1
}

Claim: "${claim}"

Respond ONLY with the JSON object, no markdown.`;

    const response = await (adapter as unknown as { sendMessage: (msgs: { role: string; content: string }[], opts: { model: string; maxTokens: number; apiKey?: string }) => Promise<{ content?: string }> }).sendMessage(
      [{ role: 'user', content: prompt }],
      { model: this.config.model, maxTokens: 500 }
    );

    const content = response.content || '';
    
    try {
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        verdict: FactCheckVerdict;
        explanation: string;
        sources: FactCheckSource[];
        confidence: number;
      };

      return {
        id: genId('fc'),
        claim,
        verdict: parsed.verdict || 'unverified',
        explanation: parsed.explanation || 'No explanation provided',
        sources: parsed.sources || [],
        confidence: parsed.confidence || 0.5,
        timestamp: Date.now(),
        cached: false,
      };
    } catch (parseError) {
      LOGGER.warn('FactCheck', 'Failed to parse response', { content: content.substring(0, 100) });
      
      return {
        id: `fc-${Date.now()}`,
        claim,
        verdict: 'unverified',
        explanation: `Could not parse fact-check response: ${String(parseError)}`,
        sources: [],
        confidence: 0,
        timestamp: Date.now(),
        cached: false,
      };
    }
  }

  /**
   * Get fact-check score for a set of claims
   */
  getFactCheckScore(results: FactCheckResult[]): number {
    if (results.length === 0) return 1; // No claims checked = assume good

    const verified = results.filter(r => r.verdict === 'verified').length;
    const falseClaims = results.filter(r => r.verdict === 'false').length;
    const noEvidence = results.filter(r => r.verdict === 'no_evidence').length;

    // Score: verified = +1, disputed = 0, no_evidence = -0.5, false = -1
    const total = results.length;
    const score = (verified - falseClaims - 0.5 * noEvidence) / total;

    return Math.max(0, Math.min(1, (score + 1) / 2)); // Normalize to 0-1
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<FactCheckConfig>): void {
    this.config = { ...this.config, ...config };
    LOGGER.info('FactCheck', 'Configuration updated', this.config as unknown as Record<string, unknown>);
  }

  private makeCacheKey(claim: string): string {
    // Simple hash for cache key
    return `${this.simpleHash(claim)}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private isCacheStale(result: FactCheckResult): boolean {
    return Date.now() - result.timestamp > this.config.cacheMaxAge;
  }

  private async saveCache(): Promise<void> {
    const entries = Array.from(this.cache.values());
    await this.storage.set('cache', entries);
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await (this.storage as unknown as { remove: (k: string) => Promise<void> }).remove('cache');
    LOGGER.info('FactCheck', 'Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; oldest: number; newest: number } {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return { size: 0, oldest: 0, newest: 0 };

    return {
      size: entries.length,
      oldest: Math.min(...entries.map(e => e.timestamp)),
      newest: Math.max(...entries.map(e => e.timestamp)),
    };
  }
}

// Singleton instance
export const factCheckService = new FactCheckService();