import { resolve } from './service-resolver';
import { NotificationWebhookService as KernelNotificationWebhookService } from '../kernel/services/notification-webhook-service';
export { KernelNotificationWebhookService as NotificationWebhookService };
export type { WebhookConfig, WebhookProvider, WebhookEventType } from '../kernel/contracts/webhook';
export const notificationWebhookService = resolve<KernelNotificationWebhookService>('notificationWebhookService');
