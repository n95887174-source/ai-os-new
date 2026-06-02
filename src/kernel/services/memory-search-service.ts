import { storageAdapter } from '../instances';

export interface MemoryEntry {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  score?: number;
}

export interface SearchResult {
  entry: MemoryEntry;
  score: number;
  matchReason: string;
}

interface MemorySearchServiceDeps {
  database: {
    getAll?: <T>(table: string) => Promise<T[]>;
  };
}

const STORAGE_KEY = 'super_agents_memory_index';

export class MemorySearchService {
  private index: MemoryEntry[] = [];
  private deps: MemorySearchServiceDeps;
  private maxEntries = 5000;

  constructor(deps: MemorySearchServiceDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {
    try {
      const stored = storageAdapter.getItem(STORAGE_KEY);
      if (stored) {
        this.index = JSON.parse(stored) as MemoryEntry[];
      }
    } catch {
      this.index = [];
    }
  }

  addEntry(entry: Omit<MemoryEntry, 'id'>): void {
    const id = crypto.randomUUID().slice(0, 12);
    this.index.push({ ...entry, id });
    if (this.index.length > this.maxEntries) {
      this.index = this.index.slice(-this.maxEntries);
    }
  }

  addBatch(entries: Array<Omit<MemoryEntry, 'id'>>): void {
    for (const entry of entries) {
      const id = crypto.randomUUID().slice(0, 12);
      this.index.push({ ...entry, id });
    }
    if (this.index.length > this.maxEntries) {
      this.index = this.index.slice(-this.maxEntries);
    }
  }

  persist(): void {
    try {
      storageAdapter.setItem(STORAGE_KEY, JSON.stringify(this.index));
    } catch {
      // storage full or unavailable
    }
  }

  search(query: string, k = 10): SearchResult[] {
    const queryTerms = this.tokenize(query).filter(t => t.length > 2);
    if (queryTerms.length === 0) return [];

    const scored: SearchResult[] = [];

    for (const entry of this.index) {
      const entryTerms = this.tokenize(entry.content);
      const entryTermSet = new Set(entryTerms);

      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        if (entryTermSet.has(term)) {
          score += 1;
          matchedTerms.push(term);
        } else if (entryTerms.some(et => et.includes(term) || term.includes(et))) {
          score += 0.5;
          matchedTerms.push(term);
        }
      }

      if (score > 0) {
        const recency = Math.max(0.1, 1 - (Date.now() - entry.timestamp) / (30 * 24 * 60 * 60 * 1000));
        const finalScore = score * recency;

        scored.push({
          entry,
          score: finalScore,
          matchReason: `Matched: ${matchedTerms.slice(0, 3).join(', ')}`,
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  searchWithSessionFilter(query: string, excludeSessionId: string, k = 5): SearchResult[] {
    return this.search(query, k * 2)
      .filter(r => r.entry.sessionId !== excludeSessionId)
      .slice(0, k);
  }

  getRecent(limit = 20): MemoryEntry[] {
    return [...this.index]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getSessionEntries(sessionId: string): MemoryEntry[] {
    return this.index.filter(e => e.sessionId === sessionId);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  getSize(): number {
    return this.index.length;
  }

  clear(): void {
    this.index = [];
  }

  destroy(): void {
    this.index = [];
  }
}
