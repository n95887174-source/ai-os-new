export interface SecretRef {
  /** Logical path/name in the external store (e.g. "projects/my-project/secrets/groq-key") */
  path: string;
  /** Optional version for stores that support versioning (Vault, AWS) */
  version?: string;
}

export interface SecretStoreConfig {
  type: 'local' | 'vault' | 'aws' | 'gcp';
  label: string;
  /** Connection/endpoint URL */
  endpoint?: string;
  /** Auth token or credentials (never stored, always passed in) */
  auth?: string;
  /** Optional mount path for Vault (default "secret") */
  mount?: string;
  /** AWS region */
  region?: string;
  /** GCP project ID */
  projectId?: string;
  /** Timeout in ms */
  timeoutMs?: number;
}

export interface SecretStore {
  readonly type: SecretStoreConfig['type'];
  readonly label: string;

  /** Initialize with config. Returns false if unreachable. */
  init(config: SecretStoreConfig): Promise<boolean>;

  /** Read a secret value from the store */
  get(ref: SecretRef): Promise<string | null>;

  /** Write a secret value to the store */
  set(ref: SecretRef, value: string): Promise<boolean>;

  /** Delete a secret from the store */
  delete(ref: SecretRef): Promise<boolean>;

  /** List available secret paths */
  list(prefix?: string): Promise<string[]>;

  /** Health check — returns true if the store is reachable and authenticated */
  health(): Promise<boolean>;
}
