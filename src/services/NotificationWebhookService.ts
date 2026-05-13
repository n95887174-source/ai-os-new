import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';

export type WebhookProvider = 'slack' | 'telegram';
export type WebhookEventType = 'system:notification' | 'key:quota-exceeded' | 'policy:violation' | 'key:state-changed' | 'chat:stream:error';

export interface WebhookConfig {
  id: string;
  provider: WebhookProvider;
  name: string;
  webhookUrl: string;
  enabled: boolean;
  events: WebhookEventType[];
  createdAt: number;
}

const WEBHOOKS_KEY = 'super_agents_webhooks';

class NotificationWebhookService {
  private webhooks: WebhookConfig[] = [];
  private unsubs: Array<() => void> = [];

  constructor() {
    this.load();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private async load() {
    try {
      const saved = await db.getKv<WebhookConfig[]>(WEBHOOKS_KEY);
      if (saved) this.webhooks = saved;
    } catch (e) {
      console.warn('[Webhook] Failed to load webhooks', e);
    }
  }

  private async save() {
    try {
      await db.setKv(WEBHOOKS_KEY, this.webhooks);
    } catch (e) {
      console.warn('[Webhook] Failed to save webhooks', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('system:notification', (data) => {
        this.dispatch('system:notification', data);
      }),
      eventBus.on('key:quota-exceeded', (data) => {
        this.dispatch('key:quota-exceeded', data);
      }),
      eventBus.on('policy:violation', (data) => {
        this.dispatch('policy:violation', data);
      }),
      eventBus.on('key:state-changed', (data) => {
        this.dispatch('key:state-changed', data);
      }),
      eventBus.on('chat:stream:error', (data) => {
        this.dispatch('chat:stream:error', data);
      }),
    );
  }

  private async dispatch(event: WebhookEventType, data: unknown) {
    const targets = this.webhooks.filter(w => w.enabled && w.events.includes(event));
    for (const target of targets) {
      this.send(target, event, data).catch(e =>
        console.warn(`[Webhook] Failed to send to ${target.name}:`, e)
      );
    }
  }

  private async send(webhook: WebhookConfig, event: string, data: unknown) {
    const payload = this.formatPayload(webhook.provider, event, data);
    if (!payload) return;

    const res = await fetch(webhook.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[Webhook] HTTP ${res.status} from ${webhook.name}`);
    }
  }

  private formatPayload(provider: WebhookProvider, event: string, data: unknown): Record<string, unknown> | null {
    const text = `[${event}] ${JSON.stringify(data)}`;
    if (provider === 'slack') {
      return {
        text,
        username: 'AI-OS Alert',
        icon_emoji: ':robot_face:',
        attachments: [{ color: event.includes('error') || event.includes('quota') ? 'danger' : 'good', text }],
      };
    }
    if (provider === 'telegram') {
      return { text, parse_mode: 'Markdown' };
    }
    return null;
  }

  getWebhooks(): WebhookConfig[] {
    return [...this.webhooks];
  }

  addWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>) {
    const webhook: WebhookConfig = {
      ...config,
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.webhooks.push(webhook);
    this.save();
    return webhook;
  }

  removeWebhook(id: string) {
    this.webhooks = this.webhooks.filter(w => w.id !== id);
    this.save();
  }

  updateWebhook(id: string, updates: Partial<WebhookConfig>) {
    this.webhooks = this.webhooks.map(w =>
      w.id === id ? { ...w, ...updates } : w
    );
    this.save();
  }

  testWebhook(id: string) {
    const webhook = this.webhooks.find(w => w.id === id);
    if (webhook) {
      this.send(webhook, 'system:notification', { message: 'Test notification from AI-OS', type: 'info' });
    }
  }
}

export const notificationWebhookService = new NotificationWebhookService();
