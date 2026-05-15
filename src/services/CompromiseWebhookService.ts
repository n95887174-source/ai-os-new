import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';

export type WebhookSource = 'github' | 'sentry' | 'custom';

export interface CompromiseSignal {
  id?: string;
  fingerprint?: string;
  source: WebhookSource;
  raw?: unknown;
}

interface GitHubSecretAlert {
  alert?: {
    secret_type_display?: string;
    push_protection_bypassed?: boolean;
    validity?: string;
  };
  action?: string;
  repository?: { full_name?: string };
}

interface SentryAlert {
  event?: { event_id?: string };
  triggered_rule?: string;
  url?: string;
  issue?: { title?: string; culprit?: string };
}

class CompromiseWebhookService {
  private unsubs: Array<() => void> = [];

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  /**
   * Feed a raw GitHub secret scanning webhook payload.
   * Extracts identifying info and emits a compromise signal.
   */
  handleGitHubPayload(payload: GitHubSecretAlert): boolean {
    if (!payload || payload.action === 'resolved') return false;

    const alertInfo = payload.alert;
    if (!alertInfo) return false;

    const secretType = alertInfo.secret_type_display || 'unknown';
    const repo = payload.repository?.full_name || 'unknown';
    const provider = this.inferProvider(secretType);

    const fingerprint = provider;
    const source: CompromiseSignal = {
      fingerprint,
      source: 'github',
      raw: payload,
    };

    eventBus.emit(EVENTS.COMPROMISE_SIGNAL, {
      fingerprint,
      source: `GitHub Secret Scanning (${repo}, ${secretType})`,
    });

    return true;
  }

  /**
   * Feed a raw Sentry alert webhook payload.
   */
  handleSentryPayload(payload: SentryAlert): boolean {
    if (!payload) return false;

    const ruleName = payload.triggered_rule || 'unknown';
    const culprit = payload.issue?.title || payload.issue?.culprit || 'unknown';

    eventBus.emit(EVENTS.COMPROMISE_SIGNAL, {
      id: undefined,
      fingerprint: culprit,
      source: `Sentry Alert (${ruleName})`,
    });

    return true;
  }

  /**
   * Emit a custom compromise signal directly.
   */
  emitSignal(signal: CompromiseSignal): boolean {
    if (!signal.id && !signal.fingerprint) return false;

    eventBus.emit(EVENTS.COMPROMISE_SIGNAL, {
      id: signal.id,
      fingerprint: signal.fingerprint,
      source: signal.source,
    });

    return true;
  }

  /**
   * Register a listener for external webhook HTTP requests.
   * In browser context, this can be called from a service worker,
   * extension, or any other code that receives HTTP webhooks.
   */
  onWebhookRequest(source: WebhookSource, body: unknown): boolean {
    switch (source) {
      case 'github':
        return this.handleGitHubPayload(body as GitHubSecretAlert);
      case 'sentry':
        return this.handleSentryPayload(body as SentryAlert);
      case 'custom':
        return this.emitSignal(body as CompromiseSignal);
      default:
        return false;
    }
  }

  private inferProvider(secretType: string): string {
    const lower = secretType.toLowerCase();
    if (lower.includes('openai')) return 'OpenAI';
    if (lower.includes('openrouter')) return 'OpenRouter';
    if (lower.includes('anthropic')) return 'Anthropic';
    if (lower.includes('gemini') || lower.includes('google')) return 'Gemini';
    if (lower.includes('groq')) return 'Groq';
    if (lower.includes('mistral')) return 'Mistral';
    if (lower.includes('cohere')) return 'Cohere';
    if (lower.includes('hugging')) return 'HuggingFace';
    if (lower.includes('cerebras')) return 'Cerebras';
    if (lower.includes('cloudflare')) return 'Cloudflare';
    return secretType;
  }

  /**
   * Quick compromise by key label/ID — useful for manual or UI-triggered actions.
   */
  manuallyCompromise(keyIdOrLabel: string): boolean {
    return keyService.compromiseByFingerprint(keyIdOrLabel, 'manual');
  }
}

export const compromiseWebhookService = new CompromiseWebhookService();
