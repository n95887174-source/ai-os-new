import { KeyService as KernelKeyService, FREE_TIER_LIMITS } from '../kernel/services/key-vault';
import type { FreeTierLimit, PoolStrategy } from '../kernel/services/key-vault';
import type { ApiKey, ProviderAlert, KeyNote, SLAMode } from '../types/metrics';
import { EVENTS, eventBus } from '../core/events';
import { securityService } from '../core/SecurityService';
import { pricingService } from './PricingService';
import { dexieDb, db } from '../core/DatabaseService';

export { FREE_TIER_LIMITS };
export type { FreeTierLimit, PoolStrategy };

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export class KeyService {
  private delegate: KernelKeyService;
  private kernelDelegationReady = false;

  constructor(deps?: { eventBus: any; securityService: any; pricingService: any; database: any }) {
    const d = deps || {
      eventBus,
      securityService,
      pricingService,
      database: db,
    };
    this.delegate = new KernelKeyService({
      eventBus: d.eventBus,
      securityService: d.securityService,
      pricingService: d.pricingService,
      database: d.database,
    });
    this.kernelDelegationReady = true;
  }

  async init() {
    await this.delegate.init();
  }

  get globalSLAMode(): string {
    return this.delegate.globalSLAMode;
  }

  get latencyThreshold(): number {
    return this.delegate.latencyThreshold;
  }

  destroy() {
    this.delegate.destroy();
  }

  async unlock(password: string): Promise<boolean> {
    return this.delegate.unlock(password);
  }

  async unlockVault(password: string): Promise<boolean> {
    return this.delegate.unlock(password);
  }

  getFreeTierLimits(): Record<string, FreeTierLimit> {
    return this.delegate.getFreeTierLimits();
  }

  setFreeTierLimit(provider: string, limit: FreeTierLimit) {
    this.delegate.setFreeTierLimit(provider, limit);
  }

  getKeys() {
    return this.delegate.getKeys();
  }

  getKey(id: string) {
    return this.delegate.getKey(id);
  }

  async addKey(data: Omit<ApiKey, 'id' | 'stats'>) {
    return this.delegate.addKey(data);
  }

  async removeKey(id: string) {
    return this.delegate.removeKey(id);
  }

  updateKey(id: string, data: Partial<ApiKey>) {
    this.delegate.updateKey(id, data);
  }

  getAlerts(): ProviderAlert[] {
    return this.delegate.getAlerts();
  }

  resolveAlert(alertId: string) {
    this.delegate.resolveAlert(alertId);
  }

  handleProviderError(keyId: string, error: string) {
    this.delegate.handleProviderError(keyId, error);
  }

  canUseKey(id: string): { can: boolean; reason?: string } {
    return this.delegate.canUseKey(id);
  }

  async fingerprintKey(apiKey: string): Promise<string> {
    return this.delegate.fingerprintKey(apiKey);
  }

  async findDuplicateFingerprints(keys: string[]): Promise<Map<string, string[]>> {
    return this.delegate.findDuplicateFingerprints(keys);
  }

  getPoolKeys(provider: string): ApiKey[] {
    return this.delegate.getPoolKeys(provider);
  }

  selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null {
    return this.delegate.selectFromPool(provider, strategy);
  }

  getPoolStrategy(provider: string): PoolStrategy {
    return this.delegate.getPoolStrategy(provider);
  }

  setPoolStrategy(provider: string, strategy: PoolStrategy) {
    this.delegate.setPoolStrategy(provider, strategy);
  }

  getPoolStatus(provider: string): { total: number; active: number; used: number; limit: number } {
    return this.delegate.getPoolStatus(provider);
  }

  getPoolKeyDistribution(provider: string): Array<{ id: string; label: string; used: number; limit: number; pct: number; status: string }> {
    return this.delegate.getPoolKeyDistribution(provider);
  }

  incrementConcurrency(id: string) {
    this.delegate.incrementConcurrency(id);
  }

  decrementConcurrency(id: string) {
    this.delegate.decrementConcurrency(id);
  }

  transitionState(id: string, newState: string) {
    this.delegate.transitionState(id, newState);
  }

  async addNote(keyId: string, text: string, type: KeyNote['type'] = 'admin', author: string = 'Operator') {
    return this.delegate.addNote(keyId, text, type, author);
  }

  async deleteNote(keyId: string, noteId: string) {
    await this.delegate.removeNote(keyId, noteId);
  }

  async loadNotes(keyId: string) {
    await this.delegate.loadNotes(keyId);
  }

  async refreshModels(id: string) {
    const key = this.delegate.getKey(id);
    if (!key || !key.key) return;
    try {
      this.delegate.updateKeyStatus(id, 'checking');
      const { adapterRegistry } = await import('./providers/AdapterRegistry');
      const adapter = adapterRegistry.getAdapter(key.provider);
      if (adapter && 'getAvailableModels' in adapter) {
        const models = await (adapter as { getAvailableModels(apiKey: string): Promise<string[]> }).getAvailableModels(key.key);
        if (Array.isArray(models) && models.length > 0) {
          this.delegate.updateAvailableModels(id, models);
          eventBus.emit(EVENTS.NOTIFICATION, { message: `Found ${models.length} models for ${key.provider}`, type: 'success' });
        }
      } else {
        const defaults: Record<string, string[]> = {
          'OpenRouter': ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b'],
          'Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
          'Groq': ['llama3-70b-8192', 'mixtral-8x7b-32768'],
          'NVIDIA': ['nvidia/llama-3.1-405b-instruct'],
          'Cerebras': ['cerebras-gpt-3.5'],
          'Cloudflare': ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
        };
        const models = defaults[key.provider] || [];
        this.delegate.updateAvailableModels(id, models);
      }
      this.delegate.updateKeyStatus(id, 'active');
    } catch (e: unknown) {
      this.delegate.updateKeyStatus(id, 'error');
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Failed to refresh models: ${e instanceof Error ? e.message : String(e)}`, type: 'error' });
    }
  }

  async runBenchmark(id: string) {
    const key = this.delegate.getKey(id);
    if (!key || key.status !== 'active') return;
    const testPrompts = [
      "Say 'Hello World' in exactly 2 words.",
      "Write a JSON object with 5 keys describing a spaceship.",
      "Explain quantum entanglement to a 5-year old in 3 sentences.",
    ];
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Starting benchmark for ${key.provider}...`, type: 'info' });
    for (const prompt of testPrompts) {
      const startTime = Date.now();
      try {
        const { adapterRegistry } = await import('./providers/AdapterRegistry');
        const adapter = adapterRegistry.getAdapter(key.provider);
        const model = key.availableModels?.[0] || 'default';
        const res = await adapter!.sendMessage([{ role: 'user', content: prompt }], model, key.key);
        const latency = Date.now() - startTime;
        this.delegate.recordUsage(key.id, latency, estimateTokens(res.content), model, {
          task: 'benchmark',
          fullContent: res.content,
          ttft: Math.min(latency, Math.max(50, latency * 0.3)),
        });
      } catch (e) {
        console.warn('[KeyService] Benchmark step failed:', e);
        eventBus.emit('system:notification', { message: 'Benchmark step failed', type: 'error' });
      }
    }
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Benchmark for ${key.provider} completed`, type: 'success' });
  }

  async runAdvisor(id: string) {
    const key = this.delegate.getKey(id);
    if (!key) return;
    const mod = await import('./AdvisorService');
    eventBus.emit('trace:updated', [{
      id: `advisor-${crypto.randomUUID().slice(0, 8)}`,
      traceId: `advisor-${crypto.randomUUID().slice(0, 8)}`,
      startTime: Date.now(),
      input: `Advisor analysis for ${key.label}`,
      status: 'completed',
      steps: [],
      decisionGraph: { nodes: [], edges: [] },
      totalLatency: key.stats?.avgLatency || 800,
      totalTokens: 0,
      estimatedCost: 0,
      semanticConfidence: (key.stats?.extended?.reputationScore || 100) / 100,
    }]);
    this.delegate.getKeys(); // trigger notification
    const suggestions = mod.advisorService.getSuggestions().filter((s: { targetNodeId?: string }) => s.targetNodeId === id);
    if (suggestions.length > 0) {
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: ${suggestions.length} suggestion(s) for ${key.label}`, type: 'info' });
    } else {
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: No suggestions for ${key.label}`, type: 'success' });
    }
  }

  updateKeyStatus(id: string, status: ApiKey['status'], latency?: number) {
    this.delegate.updateKeyStatus(id, status, latency);
  }

  updateAvailableModels(id: string, models: string[]) {
    this.delegate.updateAvailableModels(id, models);
  }

  recordUsage(keyIdOrProvider: string, latency: number, tokens: number = 0, model?: string, extra?: Record<string, unknown>) {
    this.delegate.recordUsage(keyIdOrProvider, latency, tokens, model, extra);
  }

  setKeyTTL(id: string, ttlHours: number, autoRotate = false) {
    this.delegate.setKeyTTL(id, ttlHours, autoRotate);
  }

  clearKeyTTL(id: string) {
    this.delegate.clearKeyTTL(id);
  }

  async requestKeyRotation(id: string): Promise<boolean> {
    return this.delegate.requestKeyRotation(id);
  }

  async setGlobalSLA(mode: string) {
    await this.delegate.setGlobalSLA(mode);
    import('../core/Kernel').then(({ kernel }) => {
      kernel.setSLAMode(mode as SLAMode);
    });
  }

  async setSLA(id: string, mode: string) {
    await this.delegate.setSLA(id, mode);
  }

  async toggleKeyStatus(id: string) {
    await this.delegate.toggleKeyStatus(id);
  }

  async enableAllKeys() {
    await this.delegate.enableAllKeys();
  }

  async disableAllKeys() {
    await this.delegate.disableAllKeys();
  }

  async exportKeys(): Promise<string> {
    return this.delegate.exportKeys();
  }

  async importKeys(jsonData: string): Promise<number> {
    return this.delegate.importKeys(jsonData);
  }

  clearAllData() {
    this.delegate.clearAllData();
  }

  quarantineKey(idOrFingerprint: string, source: string = 'manual'): boolean {
    return this.delegate.quarantineKey(idOrFingerprint, source);
  }

  quarantineByFingerprint(fingerprint: string, source: string = 'manual'): boolean {
    const key = this.delegate.getKeys().find(k =>
      k.id === fingerprint || k.label.toLowerCase().includes(fingerprint.toLowerCase())
    );
    if (key) return this.delegate.quarantineKey(key.id, source);
    return false;
  }

  compromiseKey(id: string, source: string = 'webhook'): boolean {
    const result = this.delegate.compromiseKey(id, source);
    const key = this.delegate.getKey(id);
    if (key) {
      import('../core/Kernel').then(({ kernel }) => {
        kernel.markProviderOffline(key!.provider, `Key compromised: ${key!.label}`);
      });
    }
    return result;
  }

  compromiseByFingerprint(fingerprint: string, source: string = 'webhook'): boolean {
    const key = this.delegate.getKeys().find(k =>
      k.id === fingerprint ||
      k.label.toLowerCase().includes(fingerprint.toLowerCase()) ||
      k.provider.toLowerCase() === fingerprint.toLowerCase()
    );
    if (key) return this.compromiseKey(key.id, source);
    return false;
  }

  resetStats(keyId: string) {
    this.delegate.resetStats(keyId);
  }

  async setLatencyThreshold(threshold: number) {
    await this.delegate.setLatencyThreshold(threshold);
  }

  async verifyKey(provider: string, apiKey: string): Promise<boolean> {
    return this.delegate.verifyKey(provider, apiKey);
  }

  async getProviderIntrospection(provider: string, apiKey: string): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = { provider };
    try {
      const p = provider.toLowerCase();
      if (p === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          result['credits'] = data.data?.credits ?? 'unknown';
          result['usage'] = data.data?.usage ?? 'unknown';
          result['limit'] = data.data?.limit ?? 'unknown';
          result['key_label'] = data.data?.key ?? 'unknown';
        } else {
          result['error'] = `HTTP ${res.status}: ${res.statusText}`;
        }
      } else if (p === 'openai') {
        const res = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          result['total_granted'] = data.total_granted ?? 'unknown';
          result['total_used'] = data.total_used ?? 'unknown';
          result['total_available'] = data.total_available ?? 'unknown';
        } else {
          result['error'] = `HTTP ${res.status}: ${res.statusText}`;
        }
      } else if (p === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const remaining = res.headers.get('x-ratelimit-remaining-requests');
          const limit = res.headers.get('x-ratelimit-limit-requests');
          const remainingTokens = res.headers.get('x-ratelimit-remaining-tokens');
          const limitTokens = res.headers.get('x-ratelimit-limit-tokens');
          const data = await res.json();
          result['available_models'] = (data.data as Array<{id: string}> | undefined)?.length ?? 0;
          result['rate_limit_remaining'] = remaining ?? 'unknown';
          result['rate_limit_limit'] = limit ?? 'unknown';
          if (remainingTokens) result['tokens_remaining'] = remainingTokens;
          if (limitTokens) result['tokens_limit'] = limitTokens;
        } else {
          result['error'] = `HTTP ${res.status}: ${res.statusText}`;
        }
      } else if (p === 'gemini') {
        const res = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey, {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          const models = (data.models as Array<{name: string; supportedGenerationMethods: string[]}> | undefined) ?? [];
          result['available_models'] = models.length;
          result['has_generation'] = models.some(m => m.supportedGenerationMethods?.includes('generateContent'));
        } else {
          result['note'] = 'Gemini tier info not available via API; check Google AI Studio dashboard.';
          result['models_check'] = `HTTP ${res.status}`;
        }
      } else {
        result['note'] = `No introspection endpoint for ${provider}.`;
      }
    } catch (e) {
      result['error'] = e instanceof Error ? e.message : 'Unknown request failed';
    }
    return result;
  }

  detectProvider(apiKey: string): string | null {
    return this.delegate.detectProvider(apiKey);
  }
}

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const keyService = new Proxy({} as KernelKeyService, {
  get: (_target, prop) => {
    try {
      if (container.has('keyService')) {
        const instance = container.get<KernelKeyService>('keyService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {}

    if (prop === 'getKeys') return () => [];
    if (prop === 'getAlerts') return () => [];
    if (prop === 'getPools') return () => [];
    if (prop === 'getFreeTierLimits') return () => ({});
    if (prop === 'getPoolStrategy') return () => 'round-robin';
    if (prop === 'getPoolKeyDistribution') return () => [];

    const protoVal = (KernelKeyService.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('keyService');
          return instance[prop](...args);
        } catch (err) {
          console.warn(`[Proxy] Service not ready: keyService.${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});
