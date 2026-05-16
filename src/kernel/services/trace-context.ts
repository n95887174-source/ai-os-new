import type { ITraceContext } from '../contracts/logger';

export class TraceContext {
  private static stack: ITraceContext[] = [];

  static get current(): ITraceContext | undefined {
    return this.stack[this.stack.length - 1];
  }

  static run(trace: Partial<ITraceContext>, fn: () => void): void {
    const parent = this.current;
    const ctx: ITraceContext = {
      traceId: trace.traceId ?? parent?.traceId ?? crypto.randomUUID(),
      spanId: crypto.randomUUID(),
      parentSpanId: parent?.spanId,
      correlationId: trace.correlationId ?? parent?.correlationId,
    };
    this.stack.push(ctx);
    try { fn(); } finally { this.stack.pop(); }
  }

  static enter(trace?: Partial<ITraceContext>): ITraceContext {
    const parent = trace ?? this.current;
    const ctx: ITraceContext = {
      traceId: parent?.traceId ?? crypto.randomUUID(),
      spanId: crypto.randomUUID(),
      parentSpanId: parent?.spanId,
      correlationId: parent?.correlationId,
    };
    this.stack.push(ctx);
    return ctx;
  }

  static exit(): void {
    this.stack.pop();
  }

  static wrap<T>(fn: () => T, trace?: Partial<ITraceContext>): T {
    const ctx = this.enter(trace);
    try { return fn(); } finally { this.exit(); }
  }

  static generateTraceId(): string {
    return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  }
}
