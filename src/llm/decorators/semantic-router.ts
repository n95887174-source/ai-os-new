import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';

interface RouteConfig {
  maxSimpleLength: number;
  maxSimpleMessages: number;
  codeIndicatorPattern: RegExp;
}

const DEFAULT_ROUTE_CONFIG: RouteConfig = {
  maxSimpleLength: 200,
  maxSimpleMessages: 3,
  codeIndicatorPattern: /```|function|class|def |import |const |let |var |=>|->/,
};

interface RouteTarget {
  adapter: LLMProviderAdapter;
  model: string;
}

export interface SemanticRouterOptions {
  fast: RouteTarget;
  powerful: RouteTarget;
  config?: Partial<RouteConfig>;
}

function estimateComplexity(messages: ChatMessage[], config: RouteConfig): 'simple' | 'complex' {
  const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalLength > config.maxSimpleLength) return 'complex';
  if (messages.length > config.maxSimpleMessages) return 'complex';
  const allText = messages.map(m => m.content).join(' ');
  if (config.codeIndicatorPattern.test(allText)) return 'complex';
  return 'simple';
}

export class SemanticRouterDecorator implements LLMProviderAdapter {
  private fast: RouteTarget;
  private powerful: RouteTarget;
  private config: RouteConfig;

  constructor(options: SemanticRouterOptions) {
    this.fast = options.fast;
    this.powerful = options.powerful;
    this.config = { ...DEFAULT_ROUTE_CONFIG, ...options.config };
  }

  get id(): string {
    return `${this.fast.adapter.id}>${this.powerful.adapter.id}`;
  }

  private route(messages: ChatMessage[]): { adapter: LLMProviderAdapter; model: string } {
    const complexity = estimateComplexity(messages, this.config);
    return complexity === 'simple' ? this.fast : this.powerful;
  }

  async sendMessage(messages: ChatMessage[], _model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const target = this.route(messages);
    return target.adapter.sendMessage(messages, target.model, apiKey, signal);
  }

  async streamMessage(
    messages: ChatMessage[],
    _model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const target = this.route(messages);
    return target.adapter.streamMessage!(messages, target.model, apiKey, onChunk, signal);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const fast = await this.fast.adapter.checkHealth(apiKey);
    if (fast.status === 'error') return fast;
    return this.powerful.adapter.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const [fast, powerful] = await Promise.all([
      this.fast.adapter.getAvailableModels(apiKey),
      this.powerful.adapter.getAvailableModels(apiKey),
    ]);
    return [...new Set([...fast, ...powerful])];
  }
}
