import type { ApiKey } from '../../../types/metrics';

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
      ['DeepSeek', /^sk-[a-f0-9]{32,}/],
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
    const knownPrefixes: Record<string, RegExp> = {
      OpenAI: /^sk-/,
      OpenRouter: /^sk-or-/,
      Anthropic: /^sk-ant-/,
      Gemini: /^AIza/,
      Groq: /^gsk_/,
      DeepSeek: /^sk-/,
      Mistral: /^[A-Za-z0-9]{32,}$/,
      Cohere: /^[A-Za-z0-9]{40,}$/,
      HuggingFace: /^hf_/,
      Cerebras: /^cerebras_/,
      Cloudflare: /^[a-f0-9]{32}:[A-Za-z0-9_-]{40,}$/,
    };
    const expected = knownPrefixes[provider];
    if (expected && !expected.test(apiKey.trim())) return false;
    return true;
  }
}
