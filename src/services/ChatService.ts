import { container } from '../core/Container';
import { ChatService as KernelChatService } from '../kernel/services/chat-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const chatService = new Proxy({} as KernelChatService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelChatService>('chatService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelChatService.prototype as any)[prop];
    }
  }
});

export { KernelChatService as ChatService };
