import type { ApiKey } from '../../types/metrics-types';

export class KeyFingerprints {
  async fingerprintKey(apiKey: string): Promise<string> {
    const normalized = apiKey.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async findDuplicateFingerprints(existingKeys: ApiKey[], newKeys: string[]): Promise<Map<string, string[]>> {
    const existing = new Set<string>();
    for (const k of existingKeys) {
      if (k.key) existing.add(await this.fingerprintKey(k.key));
    }
    const batchFingerprints = new Map<string, string[]>();
    for (const key of newKeys) {
      const fp = await this.fingerprintKey(key);
      const existingBatch = batchFingerprints.get(fp) || [];
      existingBatch.push(key);
      batchFingerprints.set(fp, existingBatch);
    }
    const duplicates = new Map<string, string[]>();
    for (const [fp, batchKeys] of batchFingerprints) {
      if (batchKeys.length > 1 || existing.has(fp)) {
        duplicates.set(fp, batchKeys);
      }
    }
    return duplicates;
  }

  detectProvider(apiKey: string): string | null {
    if (!apiKey.trim()) return null;
    const patterns: [string, RegExp][] = [
      ['Gemini', /^AIza/],
      ['Groq', /^gsk_/],
      ['Anthropic', /^sk-ant-/],
      ['NVIDIA', /^nvapi-/],
      ['HuggingFace', /^hf_/],
      ['OpenRouter', /^sk-or-/],
      ['Fireworks', /^fw_/],
      ['DeepSeek', /^sk-[a-f0-9]{32}$/], // DeepSeek: строго 32 символа lowercase hex после sk-
      ['GitHub', /^ghp_/],
      ['Scaleway', /^[0-9a-f]{40}$/],
      ['Cometapi', /^sk-[a-zA-Z0-9]{45,}/],
      ['OpenAI', /^sk-[a-zA-Z0-9]{20,}/],
      ['Mistral', /^[A-Za-z0-9]{32,}$/],
      ['Cohere', /^[A-Za-z0-9]{40,}$/],
      ['Cerebras', /^cerebras_/],
      ['Cloudflare', /^[a-f0-9]{32}:[A-Za-z0-9_-]{40,}$/],
    ];
    for (const [provider, regex] of patterns) {
      if (regex.test(apiKey.trim())) return provider;
    }
    return null;
  }

  async verifyKey(provider: string, apiKey: string): Promise<boolean> {
    if (!apiKey.trim()) return false;
    return true;
  }

  extractAccountId(provider: string, apiKey: string): string {
    const key = apiKey.trim();
    switch (provider) {
      case 'Cloudflare': {
        const parts = key.split(':');
        return parts.length >= 2 ? `cf-${parts[0].slice(0, 12)}` : 'cloudflare-default';
      }
      case 'OpenAI': {
        const projMatch = key.match(/^sk-proj-([A-Za-z0-9]+)/);
        if (projMatch) return `openai-proj-${projMatch[1].toLowerCase()}`;
        return 'openai-default';
      }
      case 'OpenRouter': {
        return 'openrouter-default';
      }
      case 'Gemini': {
        return 'gemini-default';
      }
      case 'Groq': {
        return 'groq-default';
      }
      case 'NVIDIA': {
        return 'nvidia-default';
      }
      case 'HuggingFace': {
        return 'huggingface-default';
      }
      case 'Fireworks': {
        return 'fireworks-default';
      }
      case 'DeepSeek': {
        return 'deepseek-default';
      }
      case 'Mistral': {
        return 'mistral-default';
      }
      case 'Cohere': {
        return 'cohere-default';
      }
      case 'Cerebras': {
        return 'cerebras-default';
      }
      case 'Anthropic': {
        return 'anthropic-default';
      }
      default:
        return `${(provider || 'unknown').toLowerCase()}-default`;
    }
  }

  extractAccountLabel(provider: string, apiKey: string): string {
    const key = apiKey.trim();
    switch (provider) {
      case 'Cloudflare': {
        const parts = key.split(':');
        return parts.length >= 2 ? `Cloudflare Account ${parts[0].slice(0, 12)}...` : 'Cloudflare (default)';
      }
      case 'OpenAI': {
        const projMatch = key.match(/^sk-proj-([A-Za-z0-9]+)/);
        if (projMatch) return `Project ${projMatch[1].slice(0, 8)}...`;
        return 'OpenAI Personal Account';
      }
      case 'Gemini': return 'Google Cloud (Gemini)';
      case 'OpenRouter': return 'OpenRouter Account';
      case 'Groq': return 'Groq Cloud Account';
      case 'NVIDIA': return 'NVIDIA Account';
      case 'HuggingFace': return 'HuggingFace Account';
      case 'Fireworks': return 'Fireworks Account';
      case 'DeepSeek': return 'DeepSeek Account';
      case 'Mistral': return 'Mistral AI Account';
      case 'Cohere': return 'Cohere Account';
      case 'Cerebras': return 'Cerebras Account';
      case 'Anthropic': return 'Anthropic Account';
      default: return `${provider || 'Unknown'} Account`;
    }
  }
}
