import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import { adapterRegistry } from './providers/AdapterRegistry';
import { settingsService } from './SettingsService';
import type { ChatResponse, QueuedRequest } from '../types/chat';

class ChatService {
  private activeRequests = new Map<string, AbortController>();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on(EVENTS.SEND_MESSAGE, (req: QueuedRequest) => {
      this.executeRequest(req);
    });

    eventBus.on(EVENTS.CANCEL_MESSAGE, ({ requestId }) => {
      this.cancelRequest(requestId);
    });
  }

  private async executeRequest(req: QueuedRequest) {
    const { requestId, provider, model, messages, keyId } = req;
    const settings = settingsService.getSettings();
    const adapter = adapterRegistry.getAdapter(provider);
    
    // Find the specific key if keyId is provided, otherwise find any active key for the provider
    const keyObj = keyId 
      ? keyService.getKeys().find(k => k.id === keyId)
      : keyService.getKeys().find(k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active');

    if (!adapter || !keyObj) {
      this.emitError(req, `Provider ${provider} is not configured or unavailable.`);
      return;
    }

    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    try {
      const startTime = Date.now();
      let fullContent = '';
      let ttft: number | undefined;
      let hasStarted = false;

      if (settings.streamingEnabled && adapter.streamMessage) {
        eventBus.emit('chat:stream:start', { requestId, provider, model, keyId: keyObj.id });

        await adapter.streamMessage(
          messages,
          model,
          keyObj.key,
          (chunk) => {
            if (!hasStarted && chunk.trim().length > 0) {
              hasStarted = true;
              ttft = Date.now() - startTime;
            }
            fullContent += chunk;
            eventBus.emit('chat:stream:chunk', { requestId, provider, chunk, keyId: keyObj.id });
          },
          controller.signal
        );

        const latency = Date.now() - startTime;
        const tokens = Math.ceil(fullContent.length / 4);
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
          tps
        });

        // Record usage
        keyService.recordUsage(provider, latency, tokens, model, { ttft, tps });
      } else {
        const response = await adapter.sendMessage(messages, model, keyObj.key, controller.signal);
        
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
          ttft: response.latency
        };

        eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);

        keyService.recordUsage(provider, response.latency, response.tokens, model);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.emitStatus(req, 'cancelled');
      } else {
        console.error(`ChatService Error [${provider}]:`, error);
        this.emitError(req, error.message || 'Unknown error occurred');
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
      requestId: req.requestId,
      provider: req.provider,
      model: req.model,
      content: '',
      latency: 0,
      status
    });
  }
}

export const chatService = new ChatService();
