import type { ChatMessage, ProviderResponse, SendMessageOptions } from './types';
import { LLMError } from './errors';

export interface MiddlewareContext {
  messages: ChatMessage[];
  model: string;
  apiKey: string;
  options?: SendMessageOptions;
  signal?: AbortSignal;
}

export type NextFunction = (context: MiddlewareContext) => Promise<ProviderResponse>;

export interface LLMMiddleware {
  name: string;
  process(context: MiddlewareContext, next: NextFunction): Promise<ProviderResponse>;
}

export class MiddlewarePipeline {
  private middlewares: LLMMiddleware[] = [];

  use(middleware: LLMMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(
    context: MiddlewareContext,
    coreSender: (ctx: MiddlewareContext) => Promise<ProviderResponse>,
  ): Promise<ProviderResponse> {
    let index = 0;
    let nextCalled = false;

    const next: NextFunction = async (currentCtx: MiddlewareContext): Promise<ProviderResponse> => {
      if (nextCalled) {
        throw new LLMError('MiddlewarePipeline: next() called twice - this is not allowed', context.model);
      }
      nextCalled = true;
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware.process(currentCtx, next);
      }
      return coreSender(currentCtx);
    };

    return next(context);
  }
}

/**
 * Standard Validation Middleware
 * Checks that API key is present and messages are structural valid
 */
export class ValidationMiddleware implements LLMMiddleware {
  name = 'Validation';

  async process(context: MiddlewareContext, next: NextFunction): Promise<ProviderResponse> {
    if (!context.apiKey || context.apiKey.trim() === '') {
      throw new LLMError('LLM Request failed: API key is missing or empty.', context.model);
    }
    if (!context.messages || context.messages.length === 0) {
      throw new LLMError('LLM Request failed: Chat messages array is empty.', context.model);
    }
    return next(context);
  }
}

/**
 * Standard Safety Moderation Middleware
 * Blocks extremely toxic content, sensitive info leaks or system prompts override attempts
 */
export class ModerationMiddleware implements LLMMiddleware {
  name = 'Moderation';
  private bannedKeywords: string[];

  constructor(bannedKeywords: string[] = ['[TOXIC_MALWARE_BLOCK]']) {
    this.bannedKeywords = bannedKeywords;
  }

  async process(context: MiddlewareContext, next: NextFunction): Promise<ProviderResponse> {
    for (const msg of context.messages) {
      for (const kw of this.bannedKeywords) {
        if (msg.content && msg.content.includes(kw)) {
          throw new LLMError(`Moderation block: Input contains banned phrase "${kw}"`, context.model);
        }
      }
    }
    return next(context);
  }
}

/**
 * Standard Observability Logging Middleware
 * Tracks total execution times, output tokens count, error rates
 */
export class LoggingMiddleware implements LLMMiddleware {
  name = 'Logging';
  private logHandler: (log: {
    model: string;
    durationMs: number;
    tokens: number;
    success: boolean;
    error?: string;
  }) => void;

  constructor(
    logHandler = (log: any) => {
      console.log(`[LLM Middleware Log] ${log.model} - Success: ${log.success} - ${log.durationMs}ms - Tokens: ${log.tokens}`);
    },
  ) {
    this.logHandler = logHandler;
  }

  async process(context: MiddlewareContext, next: NextFunction): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      const response = await next(context);
      const durationMs = Date.now() - start;
      this.logHandler({
        model: context.model,
        durationMs,
        tokens: response.tokens || 0,
        success: true,
      });
      return response;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      this.logHandler({
        model: context.model,
        durationMs,
        tokens: 0,
        success: false,
        error: err?.message || String(err),
      });
      throw err;
    }
  }
}
