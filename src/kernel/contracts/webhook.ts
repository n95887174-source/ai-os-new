export type WebhookProvider = 'slack' | 'telegram' | 'discord';
export type WebhookEventType = 'system:notification' | 'key:quota_exceeded' | 'policy:violation' | 'key:state_changed' | 'chat:stream:error' | 'key:compromise_signal' | 'key:compromised' | 'key:rotated';

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
