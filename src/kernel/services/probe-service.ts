import type { IProbeService, ProbeResult, ProbeStatus } from '../contracts/probe';
import { EVENTS } from '../events/event-names';
import type { ILifecycle } from '../contracts/lifecycle';
import type { ApiKey } from '../types/metrics-types';
import type { IKeyStateStore } from '../contracts/key-state';
import type { IEventBus } from '../types/interfaces';
import { LLMError } from '../../llm/core/errors';

const PROBE_TIMEOUT = 5000;
const PROBE_MESSAGES = [
  { role: 'user' as const, content: 'Reply only: OK' },
];

const PROVDER_DEFAULTS: Record<string, string> = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'google/gemini-3.1-flash-lite',
  nvidia: 'meta/llama-3.1-8b-instruct',
  deepseek: 'deepseek-chat',
  cohere: 'command-r-plus',
};

export interface ProbeServiceDeps {
  keyService: {
    getKeys: () => ApiKey[];
    isProviderCircuitOpen: (provider: string) => boolean;
    isProviderRateLimited: (provider: string) => boolean;
    recordUsage: (keyId: string, latency: number, tokens: number, model: string, extra?: Record<string, unknown>) => void;
    pushHistory: (keyId: string, action: string, detail: string) => void;
  };
  adapterRegistry: {
    getAdapter: (provider: string) => {
      sendMessage: (messages: typeof PROBE_MESSAGES, model: string, apiKey: string, signal?: AbortSignal) => Promise<{ content: string; latency?: number }>;
    } | undefined;
    resetCircuitBreaker: (provider: string) => void;
  };
  keyStateStore?: IKeyStateStore;
  eventBus?: IEventBus;
}

export class ProbeService implements IProbeService, ILifecycle {
  private deps: ProbeServiceDeps;

  constructor(deps: ProbeServiceDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {}
  async start(): Promise<void> {}
  destroy(): void {}

  async probeKey(keyId: string, model?: string): Promise<ProbeResult> {
    const key = this.deps.keyService.getKeys().find(k => k.id === keyId);
    if (!key) {
      return {
        status: 'broken', provider: 'unknown', keyId, keyLabel: 'unknown', model: model || 'auto',
        latency: 0, rateLimited: false, circuitOpen: false, error: 'Key not found', timestamp: Date.now(),
      };
    }

    const provider = key.provider;
    const resolvedModel = model || PROVDER_DEFAULTS[provider.toLowerCase()] || key.availableModels?.[0] || 'auto';

    this.deps.adapterRegistry.resetCircuitBreaker(provider);
    const wasCircuitOpen = this.deps.keyService.isProviderCircuitOpen(provider);

    const rateLimited = this.deps.keyService.isProviderRateLimited(provider);
    const quotaInfo = this.getQuotaInfo(key);

    const adapter = this.deps.adapterRegistry.getAdapter(provider);
    if (!adapter) {
      return this.makeResult(key, resolvedModel, 'broken', 0, `No adapter for provider: ${provider}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
    const start = performance.now();

    let result: ProbeResult | undefined;
    try {
      const res = await adapter.sendMessage(PROBE_MESSAGES, resolvedModel, key.key, controller.signal);
      clearTimeout(timeout);
      const latency = Math.round(performance.now() - start);

      this.deps.keyService.recordUsage(key.id, latency, 0, resolvedModel, { probe: true });

      if (res.content && res.content.length > 0) {
        let status: ProbeStatus;
        if (latency > 5000 || quotaInfo.remaining <= 0) {
          status = 'degraded';
        } else if (rateLimited || (quotaInfo.limit > 0 && quotaInfo.remaining / quotaInfo.limit < 0.1)) {
          status = 'limited';
        } else {
          status = 'ready';
        }
        result = this.makeResult(key, resolvedModel, status, latency, undefined, rateLimited, wasCircuitOpen, quotaInfo, res.content);
      } else {
        result = this.makeResult(key, resolvedModel, 'broken', latency, 'Empty response', rateLimited, wasCircuitOpen, quotaInfo);
      }
    } catch (e: unknown) {
      clearTimeout(timeout);
      const latency = Math.round(performance.now() - start);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      const errorCode = e instanceof LLMError ? e.statusCode : undefined;
      this.deps.keyService.recordUsage(key.id, latency, 0, resolvedModel, { failed: true, error: msg, errorCode, task: 'probe' });
      if (e instanceof DOMException && e.name === 'AbortError') {
        result = this.makeResult(key, resolvedModel, 'broken', latency, 'Request timed out', rateLimited, wasCircuitOpen, quotaInfo, undefined, errorCode);
      } else if (errorCode === 429 || msg.includes('429') || msg.includes('Too Many Requests')) {
        result = this.makeResult(key, resolvedModel, 'limited', latency, msg, true, wasCircuitOpen, quotaInfo, undefined, errorCode);
      } else if (errorCode === 402 || msg.includes('402') || msg.includes('Payment Required')) {
        result = this.makeResult(key, resolvedModel, 'broken', latency, 'No credit', rateLimited, wasCircuitOpen, quotaInfo, undefined, errorCode);
      } else if (errorCode === 401) {
        result = this.makeResult(key, resolvedModel, 'broken', latency, msg, rateLimited, wasCircuitOpen, quotaInfo, undefined, errorCode);
      } else {
        result = this.makeResult(key, resolvedModel, 'broken', latency, msg, rateLimited, wasCircuitOpen, quotaInfo, undefined, errorCode);
      }
    } finally {
      if (result) {
        this.deps.keyService.pushHistory(key.id, 'probed', `${result.status} — ${result.latency}ms${result.error ? ` (${result.error})` : ''}`);
        this.deps.keyStateStore?.ingestProbe(key.id, result);
        this.deps.eventBus?.emit(EVENTS.KEY_PROBE_RESULT, { ...result });
        this.deps.eventBus?.emit(EVENTS.STREAM_END, {
          requestId: `probe-${key.id}-${result.timestamp}`,
          fullContent: result.responseContent || 'OK',
          provider: result.provider,
          model: result.model,
          latency: result.latency,
          tokens: 0,
          ttft: result.latency,
        });
      }
      this.deps.adapterRegistry.resetCircuitBreaker(provider);
    }
    return result ?? this.makeResult(key, resolvedModel, 'broken', 0, 'Probe failed before result was created');
  }

  async probeAll(): Promise<ProbeResult[]> {
    const keys = this.deps.keyService.getKeys();
    const results: ProbeResult[] = [];
    for (const key of keys) {
      const result = await this.probeKey(key.id);
      results.push(result);
    }
    return results;
  }

  async probeForDebate(
    participants: Array<{ id: string; provider?: string; modelId?: string }>,
  ): Promise<Map<string, ProbeResult>> {
    const map = new Map<string, ProbeResult>();
    const seen = new Set<string>();

    for (const p of participants) {
      const provider = p.provider;
      if (!provider || seen.has(provider)) continue;
      seen.add(provider);
      const keys = this.deps.keyService.getKeys().filter(k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active');
      if (keys.length === 0) {
        map.set(p.id, { status: 'broken', provider, keyId: '', keyLabel: '', model: p.modelId || 'auto', latency: 0, rateLimited: false, circuitOpen: false, error: 'No active keys', timestamp: Date.now() });
        continue;
      }
      const result = await this.probeKey(keys[0].id, p.modelId);
      map.set(p.id, result);
    }
    return map;
  }

  private makeResult(
    key: ApiKey, model: string, status: ProbeStatus, latency: number, error?: string,
    rateLimited = false, circuitOpen = false, quota?: { remaining: number; limit: number },
    responseContent?: string, statusCode?: number,
  ): ProbeResult {
    return {
      status, provider: key.provider, keyId: key.id, keyLabel: key.label, model,
      latency, rateLimited, circuitOpen, error, statusCode,
      quotaRemaining: quota?.remaining, quotaLimit: quota?.limit,
      timestamp: Date.now(), responseContent,
    };
  }

  private getQuotaInfo(key: ApiKey): { remaining: number; limit: number } {
    const usage = key.stats?.extended?.usageToday;
    return {
      remaining: usage ? Math.max(0, (usage as any).limit - usage.requests) : -1,
      limit: usage ? (usage as any).limit || 0 : 0,
    };
  }
}
