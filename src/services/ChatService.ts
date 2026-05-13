import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import { settingsService } from './SettingsService';
import { estimateTokens } from '../utils/tokenEstimate';
import { LLMClient } from '../llm/facade/llm-client';
import type { ChatResponse, QueuedRequest } from '../types/chat';

class ChatService {
  private llmClient: LLMClient;
  private activeRequests = new Map<string, AbortController>();
  private unsubs: Array<() => void> = [];

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient ?? new LLMClient({
      resolveApiKey: (provider: string) => {
        const key = keyService.getKeys().find(
          k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active',
        );
        return key?.key;
      },
    });
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
        this.executeRequest({ ...req, requestId: req.requestId || crypto.randomUUID() });
      }),
      eventBus.on(EVENTS.CANCEL_MESSAGE, ({ requestId }) => {
        this.cancelRequest(requestId);
      })
    );
  }

  private async executeRequest(req: QueuedRequest) {
    const { requestId, provider, model, messages, keyId } = req;
    const settings = settingsService.getSettings();

    const keyObj = keyId
      ? keyService.getKeys().find(k => k.id === keyId)
      : keyService.getKeys().find(k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active');

    if (!keyObj) {
      this.emitError(req, `Provider ${provider} is not configured or unavailable.`);
      return;
    }

    eventBus.emit('request:incoming', { requestId, messages });

    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    try {
      const startTime = Date.now();
      let fullContent = '';
      let ttft: number | undefined;
      let hasStarted = false;

      if (settings.streamingEnabled) {
        eventBus.emit('chat:stream:start', { requestId, provider, model, keyId: keyObj.id });

        await this.llmClient.chat(messages, {
          provider,
          model,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (!hasStarted && chunk.trim().length > 0) {
              hasStarted = true;
              ttft = Date.now() - startTime;
            }
            fullContent += chunk;
            eventBus.emit('chat:stream:chunk', { requestId, provider, chunk, keyId: keyObj.id });
          },
        });

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(fullContent);
        const duration = (latency - (ttft || 0)) / 1000;
        const tps = duration > 0 ? (tokens / duration) : 0;

        eventBus.emit('chat:stream:end', {
          requestId,
          provider,
          model,
          keyId: keyObj.id,
          fullContent,
          latency,
          ttft,
          tps,
        });

        keyService.recordUsage(provider, latency, tokens, model, { ttft, tps });
      } else {
        const response = await this.llmClient.chat(messages, {
          provider,
          model,
          signal: controller.signal,
        });

        const res: ChatResponse = {
          id: crypto.randomUUID(),
          requestId,
          provider,
          model,
          keyId: keyObj.id,
          content: response.content,
          latency: response.latency,
          status: 'done',
          tokens: response.tokens,
          ttft: response.latency,
        };

        eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);

        keyService.recordUsage(provider, response.latency, response.tokens, model);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.emitStatus(req, 'cancelled');
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`ChatService Error [${provider}]:`, error);
        this.emitError(req, errMsg);
      }
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  private cancelRequest(requestId: string) {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  private emitError(req: QueuedRequest, error: string) {
    eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
      id: `err-${Date.now()}`,
      requestId: req.requestId,
      provider: req.provider,
      model: req.model,
      keyId: req.keyId,
      content: '',
      latency: 0,
      status: 'error',
      error
    });
    // Also emit stream error for store
    eventBus.emit('chat:stream:error', {
      requestId: req.requestId,
      provider: req.provider,
      keyId: req.keyId,
      error
    });
  }

  private emitStatus(req: QueuedRequest, status: ChatResponse['status']) {
    eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
      id: `st-${Date.now()}`,
      requestId: req.requestId || crypto.randomUUID(),
      provider: req.provider || 'unknown',
      model: req.model || 'unknown',
      keyId: req.keyId,
      content: '',
      latency: 0,
      status
    });
  }
}

export const chatService = new ChatService();
