import { eventBus, EVENTS } from '../events/event-bus';
import { storageAdapter } from '../storage-adapter-instance';
import type { ILogger } from '../contracts/logger';

export interface IndexedMessage {
  id: string;
  requestId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  timestamp: number;
  tokens?: number;
  latencyMs?: number;
}

export interface SearchFilters {
  role?: 'user' | 'assistant';
  provider?: string;
  model?: string;
  sessionId?: string;
  fromTs?: number;
  toTs?: number;
  minTokens?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

const STORAGE_KEY = 'message_index_v1';
const MAX_MESSAGES = 1000;

function loadFromStorage(): IndexedMessage[] {
  try {
    const raw = storageAdapter.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IndexedMessage[]) : [];
  } catch { return []; }
}

function saveToStorage(messages: IndexedMessage[]): void {
  try {
    const trimmed = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
    storageAdapter.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* noop */ }
}

export class MessageIndexService {
  private messages: IndexedMessage[] = [];
  private byRequestId = new Map<string, IndexedMessage>();
  private listeners = new Set<() => void>();
  private unsubStreamEnd: (() => void) | null = null;
  private unsubSend: (() => void) | null = null;
  private unsubChatRewound: (() => void) | null = null;
  private unsubClearData: (() => void) | null = null;
  private currentSessionId: string | null = null;
  private sessionUserBuffer = new Map<string, { content: string; timestamp: number }>();

  constructor(_logger?: ILogger) {}

  init(): void {
    this.messages = loadFromStorage();
    for (const m of this.messages) {
      if (m.requestId) this.byRequestId.set(`${m.requestId}-${m.role}`, m);
    }
    this.unsubStreamEnd = eventBus.on(EVENTS.STREAM_END, (data: { requestId: string; fullContent: string; provider?: string; model?: string; latency?: number; tokens?: number }) => {
      this.handleStreamEnd(data);
    });
    this.unsubSend = eventBus.on(EVENTS.SEND_MESSAGE, (data: { requestId?: string; messages?: Array<{ role: string; content: string }>; sessionId?: string }) => {
      this.handleUserSend(data);
    });
    this.unsubChatRewound = eventBus.on(EVENTS.CHAT_REWOUND, (raw: unknown) => {
      const data = raw as { sessionId: string; messageId: string; truncatedCount: number };
      this.messages = this.messages.filter(m => m.sessionId !== data.sessionId);
      for (const [k, v] of this.byRequestId) {
        if (v.sessionId === data.sessionId) this.byRequestId.delete(k);
      }
      this.notify();
      this.persistDebounced();
    });
    this.unsubClearData = eventBus.on(EVENTS.CLEAR_DATA, () => {
      this.clear();
    });
  }

  destroy(): void {
    if (this.unsubStreamEnd) { this.unsubStreamEnd(); this.unsubStreamEnd = null; }
    if (this.unsubSend) { this.unsubSend(); this.unsubSend = null; }
    if (this.unsubChatRewound) { this.unsubChatRewound(); this.unsubChatRewound = null; }
    if (this.unsubClearData) { this.unsubClearData(); this.unsubClearData = null; }
    this.listeners.clear();
  }

  setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  private handleUserSend(data: { requestId?: string; messages?: Array<{ role: string; content: string }>; sessionId?: string }): void {
    if (data.sessionId) this.currentSessionId = data.sessionId;
    const lastUserMsg = data.messages?.filter(m => m.role === 'user').pop();
    if (!lastUserMsg || !data.requestId) return;
    this.sessionUserBuffer.set(data.requestId, {
      content: lastUserMsg.content,
      timestamp: Date.now(),
    });
  }

  private handleStreamEnd(data: { requestId: string; fullContent: string; provider?: string; model?: string; latency?: number; tokens?: number }): void {
    const userBuf = this.sessionUserBuffer.get(data.requestId);
    if (userBuf) {
      this.sessionUserBuffer.delete(data.requestId);
      this.add({
        id: `${data.requestId}-user`,
        requestId: data.requestId,
        sessionId: this.currentSessionId ?? 'unknown',
        role: 'user',
        content: userBuf.content,
        timestamp: userBuf.timestamp,
      });
    }
    this.add({
      id: `${data.requestId}-assistant`,
      requestId: data.requestId,
      sessionId: this.currentSessionId ?? 'unknown',
      role: 'assistant',
      content: data.fullContent,
      provider: data.provider,
      model: data.model,
      timestamp: Date.now(),
      tokens: data.tokens,
      latencyMs: data.latency,
    });
  }

  private add(msg: IndexedMessage): void {
    this.messages.push(msg);
    const compositeKey = `${msg.requestId}-${msg.role}`;
    this.byRequestId.set(compositeKey, msg);
    if (this.messages.length > MAX_MESSAGES) {
      const removed = this.messages.shift();
      if (removed) {
        const removedCompositeKey = `${removed.requestId}-${removed.role}`;
        if (this.byRequestId.get(removedCompositeKey) === removed) this.byRequestId.delete(removedCompositeKey);
      }
    }
    this.notify();
    this.persistDebounced();
  }

  private persistTimeout: ReturnType<typeof setTimeout> | null = null;
  private persistDebounced(): void {
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(() => saveToStorage(this.messages), 1000);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  search(opts: SearchOptions): IndexedMessage[] {
    const limit = opts.limit ?? 100;
    const filters = opts.filters ?? {};
    const q = opts.query.trim();
    let regex: RegExp | null = null;
    if (q && opts.useRegex) {
      try { regex = new RegExp(q, opts.caseSensitive ? '' : 'i'); } catch { return []; }
    }
    const matches: Array<{ msg: IndexedMessage; score: number; snippet: string }> = [];
    for (let i = this.messages.length - 1; i >= 0 && matches.length < limit * 4; i--) {
      const m = this.messages[i];
      if (!m) continue;
      if (filters.role && m.role !== filters.role) continue;
      if (filters.provider && m.provider !== filters.provider) continue;
      if (filters.model && m.model !== filters.model) continue;
      if (filters.sessionId && m.sessionId !== filters.sessionId) continue;
      if (filters.fromTs && m.timestamp < filters.fromTs) continue;
      if (filters.toTs && m.timestamp > filters.toTs) continue;
      if (filters.minTokens && (m.tokens ?? 0) < filters.minTokens) continue;

      let score = 0;
      let snippet = '';
      if (q) {
        const haystack = opts.caseSensitive ? m.content : m.content.toLowerCase();
        const needle = opts.caseSensitive ? q : q.toLowerCase();
        if (regex) {
          const match = regex.exec(m.content);
          if (!match) continue;
          score = 1;
          const start = Math.max(0, match.index - 40);
          const end = Math.min(m.content.length, match.index + match[0].length + 40);
          snippet = (start > 0 ? '...' : '') + m.content.slice(start, end) + (end < m.content.length ? '...' : '');
        } else {
          const idx = haystack.indexOf(needle);
          if (idx < 0) continue;
          score = needle.length / m.content.length;
          const start = Math.max(0, idx - 40);
          const end = Math.min(m.content.length, idx + needle.length + 40);
          snippet = (start > 0 ? '...' : '') + m.content.slice(start, end) + (end < m.content.length ? '...' : '');
        }
      } else {
        score = 1;
        snippet = m.content.slice(0, 80) + (m.content.length > 80 ? '...' : '');
      }
      matches.push({ msg: m, score, snippet });
    }
    return matches
      .sort((a, b) => b.msg.timestamp - a.msg.timestamp)
      .slice(0, limit)
      .map(m => m.msg);
  }

  count(): number { return this.messages.length; }

  clear(): void {
    this.messages = [];
    this.byRequestId.clear();
    storageAdapter.removeItem(STORAGE_KEY);
    this.notify();
  }

  uniqueProviders(): string[] {
    const set = new Set<string>();
    for (const m of this.messages) if (m.provider) set.add(m.provider);
    return Array.from(set).sort();
  }

  uniqueModels(): string[] {
    const set = new Set<string>();
    for (const m of this.messages) if (m.model) set.add(m.model);
    return Array.from(set).sort();
  }

  uniqueSessions(): Array<{ id: string; count: number; lastAt: number }> {
    const map = new Map<string, { count: number; lastAt: number }>();
    for (const m of this.messages) {
      const cur = map.get(m.sessionId);
      if (!cur) map.set(m.sessionId, { count: 1, lastAt: m.timestamp });
      else { cur.count++; if (m.timestamp > cur.lastAt) cur.lastAt = m.timestamp; }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 50);
  }
}

let instance: MessageIndexService | null = null;

export function getMessageIndexService(logger?: ILogger): MessageIndexService {
  if (!instance) {
    instance = new MessageIndexService(logger);
    instance.init();
  }
  return instance;
}
