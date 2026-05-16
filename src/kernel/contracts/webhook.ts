export type WebhookProvider = 'slack' | 'telegram' | 'discord';
export type WebhookEventType = 'system:notification' | 'key:quota-exceeded' | 'policy:violation' | 'key:state-changed' | 'chat:stream:error' | 'key:compromise-signal' | 'key:compromised' | 'key:rotated';

export interface WebhookConfig {
  id: string;
  provider: WebhookProvider;
  name: string;
  webhookUrl: string;
  enabled: boolean;
  events: WebhookEventType[];
  createdAt: number;
  template?: string;
}
