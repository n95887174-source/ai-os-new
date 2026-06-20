import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import type { CompromiseSignal, WebhookSource, GitHubSecretAlert, SentryAlert } from '../contracts/compromise';

const LOGGER = rootLogger.child('CompromiseWebhook');

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
      LOGGER.warn('CompromiseWebhook', 'GitHub payload rejected', { action: payload?.action, reason: 'resolved_or_empty' });
      this.deps.eventBus.emit('compromise:signal:rejected', { source: 'github', reason: payload?.action === 'resolved' ? 'resolved' : 'empty' });
      return false;
    }

    const alertInfo = payload.alert;
    if (!alertInfo) {
      LOGGER.warn('CompromiseWebhook', 'GitHub payload rejected: missing alert info');
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
      LOGGER.warn('CompromiseWebhook', 'Sentry payload rejected: empty');
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
      LOGGER.warn('CompromiseWebhook', 'Signal rejected: missing id and fingerprint');
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

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    const { CONFIG } = await import('./config-registry');
    const secret = CONFIG.security?.webhookSecret;
    if (!secret) return true; // Accept if no secret is configured
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['verify']
      );
      const sigHex = signature.replace(/^sha256=/, '');
      const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
    } catch (e) {
      LOGGER.warn('CompromiseWebhook', 'Signature verification error', { error: e });
      return false;
    }
  }

  async onWebhookRequest(source: WebhookSource, body: unknown, signature?: string, rawBody?: string): Promise<boolean> {
    if (signature && rawBody) {
      const isValid = await this.verifySignature(rawBody, signature);
      if (!isValid) {
        LOGGER.warn('CompromiseWebhook', 'Invalid HMAC signature');
        this.deps.eventBus.emit('compromise:signal:rejected', { source, reason: 'invalid_signature' });
        return false;
      }
    }

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
