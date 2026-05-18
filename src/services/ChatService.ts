import { createServiceProxy } from './create-service-proxy';
import { ChatService as KernelChatService } from '../kernel/services/chat-service';

export const chatService = createServiceProxy('chatService', KernelChatService);
export { KernelChatService as ChatService };
