import type { ITraceContext } from '../contracts/logger';

export class TraceContext {
  private static stacks = new Map<string, ITraceContext[]>();
  private static activeTraceId: string | null = null;

  static get current(): ITraceContext | undefined {
    const stack = this.activeTraceId ? this.stacks.get(this.activeTraceId) : undefined;
    return stack?.[stack.length - 1];
  }

  static getCurrentTraceId(): string | null {
    return this.activeTraceId;
  }

  static run(trace: Partial<ITraceContext>, fn: () => void): void {
    const parent = this.current;
    const traceId = trace.traceId ?? parent?.traceId ?? crypto.randomUUID();
    const ctx: ITraceContext = {
      traceId,
      spanId: crypto.randomUUID(),
      parentSpanId: parent?.spanId,
      correlationId: trace.correlationId ?? parent?.correlationId,
    };
    const prevTraceId = this.activeTraceId;
    let stack = this.stacks.get(traceId);
    if (!stack) { stack = []; this.stacks.set(traceId, stack); }
    this.activeTraceId = traceId;
    stack.push(ctx);
    try { fn(); } finally {
      stack.pop();
      if (stack.length === 0) this.stacks.delete(traceId);
      this.activeTraceId = prevTraceId;
    }
  }

  static enter(trace?: Partial<ITraceContext>): ITraceContext {
    const parent = trace ?? this.current;
    const traceId = parent?.traceId ?? crypto.randomUUID();
    const ctx: ITraceContext = {
      traceId,
      spanId: crypto.randomUUID(),
      parentSpanId: parent?.spanId,
      correlationId: parent?.correlationId,
    };
    let stack = this.stacks.get(traceId);
    if (!stack) { stack = []; this.stacks.set(traceId, stack); }
    this.activeTraceId = traceId;
    stack.push(ctx);
    return ctx;
  }

  static exit(): void {
    if (!this.activeTraceId) return;
    const stack = this.stacks.get(this.activeTraceId);
    if (!stack) return;
    stack.pop();
    if (stack.length === 0) {
      this.stacks.delete(this.activeTraceId);
      this.activeTraceId = null;
    }
  }

  static wrap<T>(fn: () => T, _trace?: Partial<ITraceContext>): T {
    try { return fn(); } finally { this.exit(); }
  }

  static generateTraceId(): string {
    return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
  }

  static clear(): void {
    this.stacks.clear();
    this.activeTraceId = null;
  }
}
