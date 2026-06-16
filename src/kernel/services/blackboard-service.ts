import { EVENTS } from '../events/event-names';

export interface BlackboardEntry {
  key: string;
  value: unknown;
  author: string;
  timestamp: number;
  ttl?: number;
  visibility: 'public' | 'group' | 'private';
}

export interface BlackboardServiceDeps {
  eventBus: {
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
}

export class BlackboardService {
  private deps: BlackboardServiceDeps;
  private entries: Map<string, BlackboardEntry> = new Map();
  private subscribers: Array<(entry: BlackboardEntry) => void> = [];
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(deps: BlackboardServiceDeps) {
    this.deps = deps;
  }

  init() {
    this.cleanupTimer = setInterval(() => this.evictExpired(), 30000);
  }

  destroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.subscribers.length = 0;
    this.entries.clear();
  }

  post(agentId: string, key: string, value: unknown, opts?: { ttl?: number; visibility?: 'public' | 'group' | 'private' }) {
    const entry: BlackboardEntry = {
      key,
      value,
      author: agentId,
      timestamp: Date.now(),
      ttl: opts?.ttl,
      visibility: opts?.visibility || 'public',
    };
    this.entries.set(key, entry);
    this.deps.eventBus.emit(EVENTS.AGENT_BLACKBOARD_UPDATED, { key, author: agentId, visibility: entry.visibility });
    this.subscribers.forEach(cb => cb(entry));
  }

  read(agentId?: string, _visibility?: 'public' | 'group' | 'private'): BlackboardEntry[] {
    this.evictExpired();
    const all = Array.from(this.entries.values());
    return all.filter(e => {
      if (e.visibility === 'public') return true;
      if (e.visibility === 'private' && agentId && e.author === agentId) return true;
      if (e.visibility === 'group') return true;
      return false;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  get(key: string): BlackboardEntry | undefined {
    this.evictExpired();
    return this.entries.get(key);
  }

  delete(key: string) {
    this.entries.delete(key);
  }

  subscribe(cb: (entry: BlackboardEntry) => void): () => void {
    this.subscribers.push(cb);
    return () => {
      const idx = this.subscribers.indexOf(cb);
      if (idx >= 0) this.subscribers.splice(idx, 1);
    };
  }

  private evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.entries.delete(key);
      }
    }
  }
}
