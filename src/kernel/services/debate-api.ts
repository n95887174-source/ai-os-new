import { EVENTS } from '../events/event-names';
import type {
  DebateConfig,
  DebateParticipant,
  DebateSession,
  DebateStrategy,
} from '../contracts/debate-types';
import type { DebateService } from './debate-service';
import type { OrchestrationService } from './orchestration-service';

export interface CreateDebateBody {
  topic: string;
  participants?: string[];
  strategy?: DebateStrategy;
  maxRounds?: number;
  debateTemperature?: number;
  config?: Partial<DebateConfig>;
}

export interface DebateApiStreamEvent {
  type: 'started' | 'argument' | 'updated' | 'consensus' | 'completed' | 'error';
  sessionId: string;
  payload: unknown;
  timestamp: number;
}

interface StreamSubscriber {
  push: (event: DebateApiStreamEvent) => void;
  close: () => void;
}

export interface DebateApiServiceDeps {
  eventBus: {
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
  };
  debateService: DebateService;
  orchestrator: OrchestrationService;
}

export class DebateApiService {
  private subscribers = new Map<string, Set<StreamSubscriber>>();
  private unsubs: Array<() => void> = [];
  private fetchPatched = false;

  constructor(private deps: DebateApiServiceDeps) {}

  init(): void {
    this.unsubs.push(
      this.deps.eventBus.onSafe<DebateSession>(EVENTS.DEBATE_STARTED, (s) => {
        this.broadcast(s.id, { type: 'started', sessionId: s.id, payload: s, timestamp: Date.now() });
      }),
      this.deps.eventBus.onSafe<DebateSession>(EVENTS.DEBATE_UPDATED, (s) => {
        const type = s.status === 'completed' ? 'completed' : 'updated';
        this.broadcast(s.id, { type, sessionId: s.id, payload: s, timestamp: Date.now() });
        if (s.status === 'completed') this.closeStream(s.id);
      }),
      this.deps.eventBus.onSafe<unknown>(EVENTS.DEBATE_ARGUMENT, (arg) => {
        const session = this.deps.debateService.getSession();
        if (!session) return;
        this.broadcast(session.id, {
          type: 'argument',
          sessionId: session.id,
          payload: arg,
          timestamp: Date.now(),
        });
      }),
      this.deps.eventBus.onSafe<unknown>(EVENTS.DEBATE_CONSENSUS, (payload) => {
        const session = this.deps.debateService.getSession();
        if (!session) return;
        this.broadcast(session.id, {
          type: 'consensus',
          sessionId: session.id,
          payload,
          timestamp: Date.now(),
        });
      }),
    );
    this.installFetchBridge();
  }

  destroy(): void {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    for (const subs of this.subscribers.values()) {
      subs.forEach(s => s.close());
    }
    this.subscribers.clear();
  }

  installFetchBridge(): void {
    if (typeof window === 'undefined' || this.fetchPatched) return;
    this.fetchPatched = true;
    const native = window.fetch.bind(window);
    const service = this;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.href,
        window.location.origin,
      );
      if (url.pathname.startsWith('/api/debates')) {
        const req = input instanceof Request ? input : new Request(url.toString(), init);
        return service.handleHttp(req);
      }
      return native(input, init);
    };
  }

  async createDebate(body: CreateDebateBody): Promise<DebateSession> {
    const participants = this.resolveParticipants(body.participants);
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants');
    }
    const strategy = body.strategy ?? 'round_robin';
    const maxRounds = body.maxRounds ?? 5;
    const config: Partial<DebateConfig> = {
      ...body.config,
      ...(body.debateTemperature !== undefined
        ? { debateTemperature: body.debateTemperature }
        : {}),
    };
    return this.deps.debateService.startDebate(body.topic, participants, strategy, maxRounds, config);
  }

  getSession(id: string): DebateSession | null {
    return this.deps.debateService.getSessionById(id);
  }

  subscribeStream(sessionId: string, onEvent: (event: DebateApiStreamEvent) => void): () => void {
    const sub: StreamSubscriber = {
      push: onEvent,
      close: () => {},
    };
    if (!this.subscribers.has(sessionId)) this.subscribers.set(sessionId, new Set());
    this.subscribers.get(sessionId)!.add(sub);
    const session = this.getSession(sessionId);
    if (session) {
      onEvent({ type: 'updated', sessionId, payload: session, timestamp: Date.now() });
      if (session.status === 'completed') {
        onEvent({ type: 'completed', sessionId, payload: session, timestamp: Date.now() });
      }
    }
    return () => {
      this.subscribers.get(sessionId)?.delete(sub);
    };
  }

  async handleHttp(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (request.method === 'POST' && path === '/api/debates') {
      try {
        const body = (await request.json()) as CreateDebateBody;
        const session = await this.createDebate(body);
        return Response.json(
          { id: session.id, status: session.status, topic: session.topic },
          { status: 201 },
        );
      } catch (e) {
        return Response.json(
          { error: e instanceof Error ? e.message : 'Failed to start debate' },
          { status: 400 },
        );
      }
    }

    const streamMatch = path.match(/^\/api\/debates\/([^/]+)\/stream$/);
    if (request.method === 'GET' && streamMatch) {
      const sessionId = streamMatch[1];
      if (!this.getSession(sessionId)) {
        return Response.json({ error: 'Debate not found' }, { status: 404 });
      }
      return this.createSseResponse(sessionId);
    }

    const getMatch = path.match(/^\/api\/debates\/([^/]+)$/);
    if (request.method === 'GET' && getMatch) {
      const session = this.getSession(getMatch[1]);
      if (!session) return Response.json({ error: 'Debate not found' }, { status: 404 });
      return Response.json(session);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  private createSseResponse(sessionId: string): Response {
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    const stream = new ReadableStream({
      start: (controller) => {
        const send = (event: DebateApiStreamEvent) => {
          const line = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));
        };
        unsubscribe = this.subscribeStream(sessionId, send);
        send({
          type: 'updated',
          sessionId,
          payload: { connected: true },
          timestamp: Date.now(),
        });
      },
      cancel: () => {
        unsubscribe?.();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  private broadcast(sessionId: string, event: DebateApiStreamEvent): void {
    const subs = this.subscribers.get(sessionId);
    if (!subs) return;
    for (const sub of subs) sub.push(event);
  }

  private closeStream(sessionId: string): void {
    const subs = this.subscribers.get(sessionId);
    if (!subs) return;
    for (const sub of subs) sub.close();
    this.subscribers.delete(sessionId);
  }

  private resolveParticipants(ids?: string[]): DebateParticipant[] {
    const topology = this.deps.orchestrator.getActiveTopology();
    const agentNodes = topology?.nodes.filter(n => n.type === 'agent') ?? [];
    const selected = ids?.length
      ? ids.map(id => agentNodes.find(n => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n)
      : agentNodes.slice(0, 3);
    const roleOrder: Array<'pro' | 'con' | 'neutral'> = ['pro', 'con', 'neutral'];
    return selected.map((node, i) => ({
      id: node.id,
      name: node.label || node.id,
      role: roleOrder[i % roleOrder.length],
      systemPrompt: (node.config?.prompt as string) || `You are ${node.label}. Debate from your expertise.`,
      provider: (node.config?.provider as string) || undefined,
      modelId: (node.config?.model as string) !== 'auto' ? (node.config?.model as string) : undefined,
    }));
  }
}
