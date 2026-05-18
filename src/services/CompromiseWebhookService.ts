import { resolve } from './service-resolver';
import { CompromiseWebhookService as KernelCompromiseWebhookService } from '../kernel/services/compromise-webhook-service';
export { KernelCompromiseWebhookService as CompromiseWebhookService };
export type { CompromiseSignal, WebhookSource } from '../kernel/contracts/compromise';
export const compromiseWebhookService = resolve<KernelCompromiseWebhookService>('compromiseWebhookService');
