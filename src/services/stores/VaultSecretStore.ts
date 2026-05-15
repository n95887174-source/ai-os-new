import type { SecretStore, SecretRef, SecretStoreConfig } from './SecretStore';

interface VaultListResult {
  data?: { keys?: string[] };
}

interface VaultReadResult {
  data?: { data?: Record<string, unknown> };
}

/**
 * HashiCorp Vault KV v2 secret engine integration via HTTP API.
 * Compatible with Vault 1.x+.
 */
export class VaultSecretStore implements SecretStore {
  readonly type = 'vault' as const;
  label = 'HashiCorp Vault';
  private endpoint = '';
  private token = '';
  private mount = 'secret';
  private timeoutMs = 10000;

  async init(config: SecretStoreConfig): Promise<boolean> {
    this.label = config.label || 'Vault';
    this.endpoint = (config.endpoint || '').replace(/\/+$/, '');
    this.token = config.auth || '';
    this.mount = config.mount || 'secret';
    if (config.timeoutMs) this.timeoutMs = config.timeoutMs;
    if (!this.endpoint) return false;
    return this.health();
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    try {
      const url = `${this.endpoint}/v1/${this.mount}/${path}`;
      const res = await fetch(url, {
        method,
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        console.warn(`[VaultStore] HTTP ${res.status} for ${method} ${path}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      console.warn(`[VaultStore] Request failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async get(ref: SecretRef): Promise<string | null> {
    const versionPath = ref.version ? `?version=${ref.version}` : '';
    const result = await this.request<VaultReadResult>('GET', `data/${ref.path}${versionPath}`);
    const data = result?.data?.data;
    if (!data) return null;
    // Support both named key access and direct string values
    const value = (data as Record<string, unknown>).value ?? Object.values(data)[0];
    return value != null ? String(value) : null;
  }

  async set(ref: SecretRef, value: string): Promise<boolean> {
    const result = await this.request('POST', `data/${ref.path}`, { data: { value } });
    return result !== null;
  }

  async delete(ref: SecretRef): Promise<boolean> {
    const result = await this.request('DELETE', `metadata/${ref.path}`);
    return result !== null;
  }

  async list(prefix = ''): Promise<string[]> {
    const result = await this.request<VaultListResult>('LIST', `metadata/${prefix}`);
    return result?.data?.keys ?? [];
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/v1/sys/health`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return res.ok || res.status === 429 || res.status === 473;
    } catch {
      return false;
    }
  }
}
