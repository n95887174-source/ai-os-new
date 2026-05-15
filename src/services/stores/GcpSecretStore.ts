import type { SecretStore, SecretRef, SecretStoreConfig } from './SecretStore';

interface GcpSecretPayload {
  payload?: { data?: string };
}

interface GcpSecretListResponse {
  secrets?: Array<{ name: string }>;
}

/**
 * GCP Secret Manager integration via a configurable HTTP bridge/proxy.
 * In a browser context, direct GCP API calls require OAuth2 which needs a
 * proxy or identity-aware endpoint. Configure via `endpoint`.
 */
export class GcpSecretStore implements SecretStore {
  readonly type = 'gcp' as const;
  label = 'GCP Secret Manager';
  private endpoint = '';
  private auth = '';
  private projectId = '';
  private timeoutMs = 10000;

  async init(config: SecretStoreConfig): Promise<boolean> {
    this.label = config.label || 'GCP Secret Manager';
    this.endpoint = (config.endpoint || '').replace(/\/+$/, '');
    this.auth = config.auth || '';
    this.projectId = config.projectId || '';
    if (config.timeoutMs) this.timeoutMs = config.timeoutMs;

    // If no explicit endpoint, construct the GCP API URL
    if (!this.endpoint && this.projectId) {
      this.endpoint = `https://secretmanager.googleapis.com/v1/projects/${this.projectId}`;
    }

    if (!this.endpoint) return false;
    return this.health();
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    try {
      const url = `${this.endpoint}/${path}`;
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.auth}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        console.warn(`[GcpStore] HTTP ${res.status} for ${method} ${path}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      console.warn(`[GcpStore] Request failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async get(ref: SecretRef): Promise<string | null> {
    const version = ref.version || 'latest';
    const path = `secrets/${encodeURIComponent(ref.path)}/versions/${version}:access`;
    const result = await this.request<GcpSecretPayload>('GET', path);
    if (!result?.payload?.data) return null;
    try {
      return atob(result.payload.data);
    } catch {
      return result.payload.data;
    }
  }

  async set(ref: SecretRef, value: string): Promise<boolean> {
    const encoded = btoa(value);
    // Try adding a new version first
    const addResult = await this.request('POST', `secrets/${encodeURIComponent(ref.path)}:addVersion`, {
      payload: { data: encoded },
    });
    if (addResult) return true;

    // If the secret doesn't exist yet, create it
    const createResult = await this.request('POST', `secrets?secret_id=${encodeURIComponent(ref.path)}`, {
      replication: { automatic: {} },
    });
    if (!createResult) return false;

    const versionResult = await this.request('POST', `secrets/${encodeURIComponent(ref.path)}:addVersion`, {
      payload: { data: encoded },
    });
    return versionResult !== null;
  }

  async delete(ref: SecretRef): Promise<boolean> {
    const result = await this.request('DELETE', `secrets/${encodeURIComponent(ref.path)}`);
    return result !== null;
  }

  async list(prefix = ''): Promise<string[]> {
    const filter = prefix ? `?filter=name:${encodeURIComponent(prefix)}` : '';
    const result = await this.request<GcpSecretListResponse>('GET', `secrets${filter}`);
    const fullPath = `projects/${this.projectId}/secrets/`;
    return result?.secrets?.map(s => s.name.replace(fullPath, '')) ?? [];
  }

  async health(): Promise<boolean> {
    const result = await this.request<{ secrets?: unknown[] }>('GET', 'secrets?pageSize=1');
    return result !== null;
  }
}
