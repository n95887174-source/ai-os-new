import type { SecretStore, SecretRef, SecretStoreConfig } from './SecretStore';

interface AwsSecretsManagerResponse {
  ARN?: string;
  Name?: string;
  SecretString?: string;
  VersionId?: string;
}

/**
 * AWS Secrets Manager integration via a configurable HTTP bridge/proxy.
 * In a browser context, direct AWS SDK calls require a signed proxy endpoint.
 * Configure via `endpoint` (e.g. "https://your-api-gateway/secretsmanager").
 */
export class AwsSecretStore implements SecretStore {
  readonly type = 'aws' as const;
  label = 'AWS Secrets Manager';
  private endpoint = '';
  private auth = '';
  private region = 'us-east-1';
  private timeoutMs = 10000;

  async init(config: SecretStoreConfig): Promise<boolean> {
    this.label = config.label || 'AWS Secrets Manager';
    this.endpoint = (config.endpoint || '').replace(/\/+$/, '');
    this.auth = config.auth || '';
    this.region = config.region || 'us-east-1';
    if (config.timeoutMs) this.timeoutMs = config.timeoutMs;
    if (!this.endpoint) return false;
    return this.health();
  }

  private async request<T>(action: string, body: unknown): Promise<T | null> {
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Aws-Target': `secretsmanager.${action}`,
          'Authorization': this.auth,
          'X-Aws-Region': this.region,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        console.warn(`[AwsStore] HTTP ${res.status} for ${action}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      console.warn(`[AwsStore] Request failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async get(ref: SecretRef): Promise<string | null> {
    const result = await this.request<AwsSecretsManagerResponse>('GetSecretValue', {
      SecretId: ref.path,
      ...(ref.version ? { VersionId: ref.version } : {}),
    });
    return result?.SecretString ?? null;
  }

  async set(ref: SecretRef, value: string): Promise<boolean> {
    const result = await this.request('CreateSecret', {
      Name: ref.path,
      SecretString: value,
    });
    if (result) return true;
    // If CreateSecret failed, try UpdateSecret (secret already exists)
    const update = await this.request('UpdateSecret', {
      SecretId: ref.path,
      SecretString: value,
    });
    return update !== null;
  }

  async delete(ref: SecretRef): Promise<boolean> {
    const result = await this.request('DeleteSecret', {
      SecretId: ref.path,
      ForceDeleteWithoutRecovery: true,
    });
    return result !== null;
  }

  async list(prefix = ''): Promise<string[]> {
    const result = await this.request<{ SecretList?: Array<{ Name: string }> }>('ListSecrets', {
      Filters: prefix
        ? [{ Key: 'name', Values: [prefix] }]
        : undefined,
    });
    return result?.SecretList?.map(s => s.Name) ?? [];
  }

  async health(): Promise<boolean> {
    const result = await this.request<{ SecretList?: unknown[] }>('ListSecrets', {
      MaxResults: 1,
    });
    return result !== null;
  }
}
