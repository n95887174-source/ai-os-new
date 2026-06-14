import { EVENTS } from '../events/event-names';
import type { CompromiseSignal, WebhookSource, GitHubSecretAlert, SentryAlert } from '../contracts/compromise';

export interface CompromiseWebhookServiceDeps {
  eventBus: { emit: (event: string, data?: unknown) => void };
  keyService: { compromiseByFingerprint: (keyIdOrLabel: string, source: string) => boolean };
}

export class CompromiseWebhookService {
  private deps: CompromiseWebhookServiceDeps;

  constructor(deps: CompromiseWebhookServiceDeps) {
    this.deps = deps;
  }

  handleGitHubPayload(payload: GitHubSecretAlert): boolean {
    if (!payload || payload.action === 'resolved') {
      console.warn('[CompromiseWebhook] GitHub payload rejected: resolved or empty', payload?.action);
      this.deps.eventBus.emit('compromise:signal:rejected', { source: 'github', reason: payload?.action === 'resolved' ? 'resolved' : 'empty' });
      return false;
    }

    const alertInfo = payload.alert;
    if (!alertInfo) {
      console.warn('[CompromiseWebhook] GitHub payload rejected: missing alert info');
      this.deps.eventBus.emit('compromise:signal:rejected', { source: 'github', reason: 'missing_alert_info' });
      return false;
    }

    const secretType = alertInfo.secret_type_display || 'unknown';
    const repo = payload.repository?.full_name || 'unknown';
    const provider = this.inferProvider(secretType);

    this.deps.eventBus.emit(EVENTS.COMPROMISE_SIGNAL, {
      fingerprint: provider,
      source: `GitHub Secret Scanning (${repo}, ${secretType})`,
    });

    return true;
  }

  handleSentryPayload(payload: SentryAlert): boolean {
    if (!payload) {
      console.warn('[CompromiseWebhook] Sentry payload rejected: empty');
      this.deps.eventBus.emit('compromise:signal:rejected', { source: 'sentry', reason: 'empty' });
      return false;
    }

    const ruleName = payload.triggered_rule || 'unknown';
    const culprit = payload.issue?.title || payload.issue?.culprit || 'unknown';

    this.deps.eventBus.emit(EVENTS.COMPROMISE_SIGNAL, {
      id: undefined,
      fingerprint: culprit,
      source: `Sentry Alert (${ruleName})`,
    });

    return true;
  }

  emitSignal(signal: CompromiseSignal): boolean {
    if (!signal.id && !signal.fingerprint) {
      console.warn('[CompromiseWebhook] Signal rejected: missing id and fingerprint');
      this.deps.eventBus.emit('compromise:signal:rejected', { source: 'custom', reason: 'missing_id_and_fingerprint' });
      return false;
    }

    this.deps.eventBus.emit(EVENTS.COMPROMISE_SIGNAL, {
      id: signal.id,
      fingerprint: signal.fingerprint,
      source: signal.source,
    });

    return true;
  }

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
    if (lower.includes('openai')) return 'openai';
    if (lower.includes('openrouter')) return 'openrouter';
    if (lower.includes('anthropic')) return 'anthropic';
    if (lower.includes('gemini') || lower.includes('google')) return 'gemini';
    if (lower.includes('groq')) return 'groq';
    if (lower.includes('mistral')) return 'mistral';
    if (lower.includes('cohere')) return 'cohere';
    if (lower.includes('hugging')) return 'huggingface';
    if (lower.includes('cerebras')) return 'cerebras';
    if (lower.includes('cloudflare')) return 'cloudflare';
    return secretType.toLowerCase();
  }

  manuallyCompromise(keyIdOrLabel: string): boolean {
    return this.deps.keyService.compromiseByFingerprint(keyIdOrLabel, 'manual');
  }
}
