export type MemorySource = 'decision' | 'observation' | 'fact' | 'chat_response' | 'chat_query' | 'system' | 'agent' | 'tool' | 'user_input' | 'embedding' | 'summary';

export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

export interface MemoryVector {
  vector: number[];
  model: string;
  dimensions: number;
}

export interface MemoryTags {
  labels: string[];
  category?: string;
  domain?: string;
}

export interface MemoryRelation {
  targetId: string;
  type: 'similar' | 'causal' | 'sequential' | 'derived' | 'reference';
  weight: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  vector?: number[];
  metadata: {
    source: MemorySource | string;
    type: string;
    timestamp: number;
    importance: number;
    chatId?: string;
    requestId?: string;
    agentId?: string;
    roleId?: string;
    tags?: MemoryTags;
    relations?: MemoryRelation[];
    vectorData?: MemoryVector;
    importanceLabel?: MemoryImportance;
    tokenCount?: number;
    ttl?: number;
    accessCount?: number;
    lastAccessed?: number;
    sessionId?: string;
    parentId?: string;
    childrenIds?: string[];
  };
  score?: number;
  embedding?: Float32Array;
}

export interface MemorySearchQuery {
  text: string;
  semantic?: boolean;
  limit?: number;
  minScore?: number;
  source?: MemorySource | string;
  type?: string;
  timeRange?: { from: number; to: number };
  importanceMin?: number;
  tags?: string[];
  agentId?: string;
  sessionId?: string;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  matchedOn: 'semantic' | 'keyword' | 'hybrid';
}

export interface MemoryStats {
  totalEntries: number;
  totalTokens: number;
  uniqueSources: number;
  byType: Record<string, number>;
  byImportance: Record<MemoryImportance, number>;
  avgImportance: number;
  oldestEntry: number;
  newestEntry: number;
  totalStorageBytes: number;
  lastPruned: number | null;
}

export interface MemoryPruneOptions {
  olderThan?: number;
  importanceBelow?: number;
  maxEntries?: number;
  types?: string[];
  dryRun?: boolean;
}

export interface MemoryPruneResult {
  removed: number;
  bytesFreed: number;
  details: { type: string; count: number }[];
}

export interface MemoryCluster {
  id: string;
  label: string;
  entries: MemoryEntry[];
  centroid?: number[];
  size: number;
}

export interface MemoryTimeline {
  date: string;
  count: number;
  entries: MemoryEntry[];
}
