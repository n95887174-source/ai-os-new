import { CONFIG } from './config-registry';
import type { WebhookConfig, WebhookProvider, WebhookEventType } from '../contracts/webhook';

export interface NotificationWebhookServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  database: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
}

const WEBHOOKS_KEY = 'super_agents_webhooks';
const MAX_RETRIES = CONFIG.webhooks.maxRetries;
const RETRY_DELAY_MS = CONFIG.webhooks.retryDelayMs;

function formatPayload(provider: WebhookProvider, event: string, data: unknown): Record<string, unknown> | null {
  const text = `[${event}] ${JSON.stringify(data, null, 2)}`;

  if (provider === 'slack') {
    const isBad = event.includes('error') || event.includes('quota') || event.includes('compromise');
    return {
      text,
      username: 'AI-OS Alert',
      icon_emoji: ':robot_face:',
      attachments: [{
        color: isBad ? 'danger' : event.includes('warning') ? 'warning' : 'good',
        text,
        ts: Math.floor(Date.now() / 1000),
      }],
    };
  }

  if (provider === 'telegram') {
    return {
      text: `\`\`\`\n${text}\n\`\`\``,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    };
  }

  if (provider === 'discord') {
    const isBad = event.includes('error') || event.includes('quota') || event.includes('compromise');
    return {
      content: text.length > CONFIG.webhooks.discordContentMaxLength ? text.slice(0, CONFIG.webhooks.discordContentMaxLength - 3) + '...' : text,
      username: 'AI-OS Alert',
      avatar_url: '',
      embeds: [{
        title: event,
        description: text.slice(0, CONFIG.webhooks.discordEmbedDescMaxLength),
        color: isBad ? 0xff4444 : event.includes('warning') ? 0xffaa00 : 0x44ff44,
        timestamp: new Date().toISOString(),
      }],
    };
  }

  return null;
}

export class NotificationWebhookService {
  private webhooks: WebhookConfig[] = [];
  private unsubs: Array<() => void> = [];
  private deps: NotificationWebhookServiceDeps;

  constructor(deps: NotificationWebhookServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.load();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private async load() {
    try {
      const saved = await this.deps.database.getKv<WebhookConfig[]>(WEBHOOKS_KEY);
      if (saved) this.webhooks = saved;
    } catch (e) {
      console.warn('[Webhook] Failed to load webhooks', e);
    }
  }

  private async save() {
    try {
      await this.deps.database.setKv(WEBHOOKS_KEY, this.webhooks);
    } catch (e) {
      console.warn('[Webhook] Failed to save webhooks', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('system:notification', (data) => { this.dispatch('system:notification', data); }),
      this.deps.eventBus.on('key:quota_exceeded', (data) => { this.dispatch('key:quota_exceeded', data); }),
      this.deps.eventBus.on('policy:violation', (data) => { this.dispatch('policy:violation', data); }),
      this.deps.eventBus.on('key:state_changed', (data) => { this.dispatch('key:state_changed', data); }),
      this.deps.eventBus.on('chat:stream:error', (data) => { this.dispatch('chat:stream:error', data); }),
      this.deps.eventBus.on('key:compromise_signal', (data) => { this.dispatch('key:compromise_signal', data); }),
    );
  }

  private async dispatch(event: WebhookEventType, data: unknown) {
    const targets = this.webhooks.filter(w => w.enabled && w.events.includes(event));
    for (const target of targets) {
      this.sendWithRetry(target, event, data, 0).catch(e =>
        console.warn(`[Webhook] All retries failed for ${target.name}:`, e),
      );
    }
  }

  private async sendWithRetry(webhook: WebhookConfig, event: string, data: unknown, attempt: number): Promise<boolean> {
    try {
      const payload = formatPayload(webhook.provider, event, data);
      if (!payload) return false;

      const res = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CONFIG.webhooks.timeoutMs),
      });

      if (res.ok) return true;

      if (attempt < MAX_RETRIES && res.status >= 500) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return this.sendWithRetry(webhook, event, data, attempt + 1);
      }

      console.warn(`[Webhook] HTTP ${res.status} from ${webhook.name} (${event})`);
      return false;
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return this.sendWithRetry(webhook, event, data, attempt + 1);
      }
      console.warn(`[Webhook] Failed to send to ${webhook.name} after ${MAX_RETRIES + 1} attempts:`, e);
      return false;
    }
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

  async testWebhook(id: string): Promise<{ ok: boolean; status?: number }> {
    const webhook = this.webhooks.find(w => w.id === id);
    if (!webhook) return { ok: false };

    try {
      const payload = formatPayload(webhook.provider, 'system:notification', {
        message: 'Test notification from AI-OS',
        type: 'info',
        timestamp: new Date().toISOString(),
      });
      if (!payload) return { ok: false };

      const res = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CONFIG.webhooks.timeoutMs),
      });

      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false };
    }
  }
}
