import { eventBus } from '../core/events';
import { keyService, FREE_TIER_LIMITS } from './KeyService';
import { virtualKeyService } from './VirtualKeyService';
import { settingsService } from './SettingsService';
import { routerService } from './RouterService';
import { cacheService } from './CacheService';
import { policyService } from './PolicyService';
import { LLMClient } from '../llm/facade/llm-client';
import { ChatService as KernelChatService } from '../kernel/services/chat-service';

export class ChatService extends KernelChatService {
  constructor() {
    super(
      {
        eventBus,
        keyService: keyService as any,
        virtualKeyService: virtualKeyService as any,
        settingsService: settingsService as any,
        routerService: routerService as any,
        cacheService: cacheService as any,
        policyService: policyService as any,
        freeTierLimits: FREE_TIER_LIMITS,
      },
      new LLMClient({
        resolveApiKey: (provider: string) => {
          const key = keyService.selectFromPool(provider);
          return key?.key;
        },
      })
    );
    this.init().catch(() => {});
  }
}

export const chatService = new ChatService();
