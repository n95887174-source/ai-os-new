import { resolve } from './service-resolver';
import { ChatService as KernelChatService } from '../kernel/services/chat-service';
export { KernelChatService as ChatService };
export const chatService = resolve<KernelChatService>('chatService');
