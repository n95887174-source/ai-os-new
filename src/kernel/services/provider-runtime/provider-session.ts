export type SessionStatus = 'pending' | 'active' | 'completed' | 'errored' | 'cancelled';

export interface SessionTokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface ProviderSessionSnapshot {
  readonly id: string;
  readonly instanceId: string;
  readonly provider: string;
  readonly model: string;
  readonly status: SessionStatus;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly latency: number;
  readonly tokens: SessionTokenUsage;
  readonly cost: number;
  readonly error: string | null;
}

export class ProviderSession {
  readonly id: string;
  readonly instanceId: string;
  readonly provider: string;
  readonly model: string;
  readonly startedAt: number;
  status: SessionStatus = 'pending';
  completedAt: number | null = null;
  latency = 0;
  tokens: SessionTokenUsage = { input: 0, output: 0, total: 0 };
  cost = 0;
  error: string | null = null;

  private _onComplete: ((session: ProviderSession) => void) | null = null;

  constructor(
    instanceId: string,
    provider: string,
    model: string,
    sessionId?: string
  ) {
    this.id = sessionId ?? crypto.randomUUID().slice(0, 12);
    this.instanceId = instanceId;
    this.provider = provider;
    this.model = model;
    this.startedAt = Date.now();
  }

  activate(): void {
    this.status = 'active';
  }

  recordTokens(input: number, output: number): void {
    this.tokens.input += input;
    this.tokens.output += output;
    this.tokens.total = this.tokens.input + this.tokens.output;
  }

  recordCost(cost: number): void {
    this.cost += cost;
  }

  complete(latency: number): void {
    this.status = 'completed';
    this.completedAt = Date.now();
    this.latency = latency;
    this._onComplete?.(this);
  }

  fail(error: string): void {
    this.status = 'errored';
    this.completedAt = Date.now();
    this.error = error;
    this._onComplete?.(this);
  }

  cancel(): void {
    this.status = 'cancelled';
    this.completedAt = Date.now();
    this._onComplete?.(this);
  }

  onComplete(cb: (session: ProviderSession) => void): void {
    this._onComplete = cb;
  }

  snapshot(): ProviderSessionSnapshot {
    return {
      id: this.id,
      instanceId: this.instanceId,
      provider: this.provider,
      model: this.model,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      latency: this.latency,
      tokens: { ...this.tokens },
      cost: this.cost,
      error: this.error,
    };
  }

  getDuration(): number {
    const end = this.completedAt ?? Date.now();
    return end - this.startedAt;
  }
}
