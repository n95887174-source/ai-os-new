import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { NotificationWebhookService as KernelNotificationWebhookService } from '../kernel/services/notification-webhook-service';

export type { WebhookConfig, WebhookProvider, WebhookEventType } from '../kernel/contracts/webhook';

class NotificationWebhookService extends KernelNotificationWebhookService {
  constructor() {
    super({
      eventBus: eventBus as any,
      database: db as any,
    });
  }
}

export const notificationWebhookService = new NotificationWebhookService();
export { NotificationWebhookService };
