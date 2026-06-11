import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import type { WebhookConfig, WebhookProvider, WebhookEventType } from '../contracts/webhook';
import { isPrivateIP } from '../utils/network';

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (isPrivateIP(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

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
      this.deps.eventBus.on(EVENTS.NOTIFICATION, (data) => { this.dispatch(EVENTS.NOTIFICATION, data); }),
      this.deps.eventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, (data) => { this.dispatch(EVENTS.KEY_QUOTA_EXCEEDED, data); }),
      this.deps.eventBus.on(EVENTS.KEY_STATE_CHANGED, (data) => { this.dispatch(EVENTS.KEY_STATE_CHANGED, data); }),
      this.deps.eventBus.on(EVENTS.COMPROMISE_SIGNAL, (data) => { this.dispatch(EVENTS.COMPROMISE_SIGNAL, data); }),
      this.deps.eventBus.on(EVENTS.STREAM_ERROR, (data) => { this.dispatch(EVENTS.STREAM_ERROR, data); }),
      this.deps.eventBus.on(EVENTS.POLICY_VIOLATION, (data) => { this.dispatch(EVENTS.POLICY_VIOLATION, data); }),
    );
  }

  private async dispatch(event: WebhookEventType, data: unknown) {
    const targets = this.webhooks.filter(w => w.enabled && w.events.includes(event));
    const results = await Promise.allSettled(targets.map(target =>
      this.sendWithRetry(target, event, data, 0)
    ));
    for (const r of results) {
      if (r.status === 'rejected') {
        console.warn('[Webhook] Dispatch error:', r.reason);
      }
    }
  }

  private async sendWithRetry(webhook: WebhookConfig, event: string, data: unknown, attempt: number): Promise<boolean> {
    try {
      if (!isValidWebhookUrl(webhook.webhookUrl)) {
        console.warn(`[Webhook] Blocked SSRF attempt: ${webhook.webhookUrl}`);
        return false;
      }

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
    if (!isValidWebhookUrl(config.webhookUrl)) throw new Error(`Invalid webhook URL (blocked SSRF): ${config.webhookUrl}`);
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
