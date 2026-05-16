import { eventBus } from '../core/events';
import { keyService } from './KeyService';
import { CompromiseWebhookService as KernelCompromiseWebhookService } from '../kernel/services/compromise-webhook-service';

export type { CompromiseSignal, WebhookSource } from '../kernel/contracts/compromise';

class CompromiseWebhookService extends KernelCompromiseWebhookService {
  constructor() {
    super({
      eventBus: eventBus as any,
      keyService: keyService as any,
    });
  }
}

export const compromiseWebhookService = new CompromiseWebhookService();
export { CompromiseWebhookService };
