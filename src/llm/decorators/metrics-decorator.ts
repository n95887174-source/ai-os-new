import type { ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';

export interface MetricRecord {
  timestamp: number;
  provider: string;
  model: string;
  latency: number;
  tokens: number;
  finishReason?: string;
  error?: string;
  streamed: boolean;
}

export interface LLMAggregatedMetrics {
  totalRequests: number;
  totalTokens: number;
  totalErrors: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  byModel: Record<string, { requests: number; tokens: number; errors: number; avgLatency: number }>;
  byFinishReason: Record<string, number>;
}

export class MetricsDecorator extends BaseDecorator {
  private records: MetricRecord[] = [];
  private readonly maxRecords: number;

  constructor(
    inner: import('../core/types').LLMProviderAdapter,
    options?: { maxRecords?: number },
  ) {
    super(inner);
    this.maxRecords = options?.maxRecords ?? 10000;
  }

  private record(m: MetricRecord): void {
    this.records.push(m);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      const res = await this.inner.sendMessage(messages, model, apiKey, signal, options);
      this.record({
        timestamp: Date.now(),
        provider: this.id,
        model,
        latency: res.latency,
        tokens: res.tokens,
        finishReason: res.finishReason,
        error: res.error,
        streamed: false,
      });
      return res;
    } catch (e) {
      this.record({
        timestamp: Date.now(),
        provider: this.id,
        model,
        latency: Date.now() - start,
        tokens: 0,
        error: e instanceof Error ? e.message : String(e),
        streamed: false,
      });
      throw e;
    }
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    const start = Date.now();
    let finalMeta: Record<string, unknown> | undefined;
    const wrapped: typeof onChunk = (chunk, meta) => {
      if (meta) finalMeta = meta as Record<string, unknown>;
      onChunk(chunk, meta);
    };
    try {
      if (!this.inner.streamMessage) throw new Error('MetricsDecorator: inner adapter does not support streaming');
      await this.inner.streamMessage(messages, model, apiKey, wrapped, signal, options);
      this.record({
        timestamp: Date.now(),
        provider: this.id,
        model,
        latency: Date.now() - start,
        tokens: (finalMeta?.usage as { total_tokens?: number })?.total_tokens ?? 0,
        finishReason: finalMeta?.finishReason as string | undefined,
        streamed: true,
      });
    } catch (e) {
      this.record({
        timestamp: Date.now(),
        provider: this.id,
        model,
        latency: Date.now() - start,
        tokens: 0,
        error: e instanceof Error ? e.message : String(e),
        streamed: true,
      });
      throw e;
    }
  }

  getMetrics(windowMs?: number): LLMAggregatedMetrics {
    const now = Date.now();
    const filtered = windowMs ? this.records.filter(r => now - r.timestamp < windowMs) : this.records;

    const latencies = filtered.map(r => r.latency).sort((a, b) => a - b);
    const totalRequests = filtered.length;
    const totalErrors = filtered.filter(r => r.error).length;
    const totalTokens = filtered.reduce((s, r) => s + r.tokens, 0);
    const avgLatency = totalRequests > 0 ? latencies.reduce((s, l) => s + l, 0) / totalRequests : 0;

    const byModel: LLMAggregatedMetrics['byModel'] = {};
    const byFinishReason: Record<string, number> = {};

    for (const r of filtered) {
      if (!byModel[r.model]) byModel[r.model] = { requests: 0, tokens: 0, errors: 0, avgLatency: 0 };
      byModel[r.model].requests++;
      byModel[r.model].tokens += r.tokens;
      if (r.error) byModel[r.model].errors++;
      byModel[r.model].avgLatency += r.latency;

      const reason = r.finishReason ?? 'unknown';
      byFinishReason[reason] = (byFinishReason[reason] ?? 0) + 1;
    }

    for (const modelKey of Object.keys(byModel)) {
      byModel[modelKey].avgLatency /= byModel[modelKey].requests;
    }

    const p95Idx = Math.ceil(latencies.length * 0.95) - 1;
    const p99Idx = Math.ceil(latencies.length * 0.99) - 1;

    return {
      totalRequests,
      totalTokens,
      totalErrors,
      avgLatency,
      p95Latency: latencies[p95Idx] ?? 0,
      p99Latency: latencies[p99Idx] ?? 0,
      byModel,
      byFinishReason,
    };
  }

  getMetricsPrometheus(windowMs?: number): string {
    const metrics = this.getMetrics(windowMs);
    const lines: string[] = [];
    const prefix = 'llm';

    lines.push(`# HELP ${prefix}_requests_total Total LLM requests`);
    lines.push(`# TYPE ${prefix}_requests_total counter`);
    lines.push(`${prefix}_requests_total{provider="${this.id}"} ${metrics.totalRequests}`);

    lines.push(`# HELP ${prefix}_tokens_total Total tokens consumed`);
    lines.push(`# TYPE ${prefix}_tokens_total counter`);
    lines.push(`${prefix}_tokens_total{provider="${this.id}"} ${metrics.totalTokens}`);

    lines.push(`# HELP ${prefix}_errors_total Total LLM request errors`);
    lines.push(`# TYPE ${prefix}_errors_total counter`);
    lines.push(`${prefix}_errors_total{provider="${this.id}"} ${metrics.totalErrors}`);

    lines.push(`# HELP ${prefix}_latency_seconds Request latency`);
    lines.push(`# TYPE ${prefix}_latency_seconds gauge`);
    lines.push(`${prefix}_latency_seconds{provider="${this.id}",quantile="avg"} ${(metrics.avgLatency / 1000).toFixed(4)}`);
    lines.push(`${prefix}_latency_seconds{provider="${this.id}",quantile="p95"} ${(metrics.p95Latency / 1000).toFixed(4)}`);
    lines.push(`${prefix}_latency_seconds{provider="${this.id}",quantile="p99"} ${(metrics.p99Latency / 1000).toFixed(4)}`);

    for (const [model, stats] of Object.entries(metrics.byModel)) {
      lines.push(`${prefix}_model_requests_total{provider="${this.id}",model="${model}"} ${stats.requests}`);
      lines.push(`${prefix}_model_tokens_total{provider="${this.id}",model="${model}"} ${stats.tokens}`);
      lines.push(`${prefix}_model_errors_total{provider="${this.id}",model="${model}"} ${stats.errors}`);
    }

    for (const [reason, count] of Object.entries(metrics.byFinishReason)) {
      lines.push(`${prefix}_finish_reason_total{provider="${this.id}",reason="${reason}"} ${count}`);
    }

    return lines.join('\n');
  }

  clearMetrics(): void {
    this.records = [];
  }
}
