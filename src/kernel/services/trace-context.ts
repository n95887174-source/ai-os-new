import type { ITraceContext } from '../contracts/logger';

export class TraceContext {
    private static contextStack: ITraceContext[] = [];
    private static stacks = new Map<string, ITraceContext[]>();

    static get current(): ITraceContext | undefined {
        return this.contextStack[this.contextStack.length - 1];
    }

    static getCurrentTraceId(): string | null {
        const ctx = this.current;
        return ctx?.traceId ?? null;
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
        let stack = this.stacks.get(traceId);
        if (!stack) {
            stack = [];
            this.stacks.set(traceId, stack);
        }
        this.contextStack.push(ctx);
        stack.push(ctx);
        try {
            fn();
        } finally {
            this.contextStack.pop();
            stack.pop();
            if (stack.length === 0) this.stacks.delete(traceId);
        }
    }

    static enter(trace?: Partial<ITraceContext>): ITraceContext {
        const parent = this.current;
        const traceId = trace?.traceId ?? parent?.traceId ?? crypto.randomUUID();
        const ctx: ITraceContext = {
            traceId,
            spanId: crypto.randomUUID(),
            parentSpanId: parent?.spanId,
            correlationId: trace?.correlationId ?? parent?.correlationId,
        };
        let stack = this.stacks.get(traceId);
        if (!stack) {
            stack = [];
            this.stacks.set(traceId, stack);
        }
        this.contextStack.push(ctx);
        stack.push(ctx);
        return ctx;
    }

    static exit(): void {
        const ctx = this.contextStack.pop();
        if (!ctx) return;
        const stack = this.stacks.get(ctx.traceId);
        if (!stack) return;
        stack.pop();
        if (stack.length === 0) this.stacks.delete(ctx.traceId);
    }

    static wrap<T>(fn: () => T, trace?: Partial<ITraceContext>): T {
        this.enter(trace);
        try {
            return fn();
        } finally {
            this.exit();
        }
    }

    static generateTraceId(): string {
        return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
    }

    static clear(): void {
        this.contextStack = [];
        this.stacks.clear();
    }
}
