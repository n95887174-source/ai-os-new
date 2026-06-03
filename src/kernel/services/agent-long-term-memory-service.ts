/**
 * Agent Long-Term Memory Service
 * RAG-based memory for agents
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('AgentLongTermMemory');
const MAX_MEMORIES_PER_AGENT = 1000;

export interface AgentMemoryEntry {
  id: string;
  agentId: string;
  type: 'interaction' | 'task' | 'learned' | 'preference';
  content: string;
  context: string;
  embedding?: number[];
  relevance: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface MemoryQuery {
  agentId: string;
  query: string;
  limit?: number;
  minRelevance?: number;
}

class AgentLongTermMemoryService {
  private storage: StorageAdapter;
  private memories: Map<string, AgentMemoryEntry> = new Map();

  constructor() {
    this.storage = new StorageAdapter('agent-ltm');
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, AgentMemoryEntry][]>('memories');
    if (saved) {
      for (const [id, memory] of saved) {
        this.memories.set(id, memory);
      }
    }
    LOGGER.info('AgentLongTermMemory', `Initialized with ${this.memories.size} memories`);
  }

  /**
   * Store memory for an agent
   */
  async store(
    agentId: string,
    type: AgentMemoryEntry['type'],
    content: string,
    context: string,
    embedding?: number[]
  ): Promise<AgentMemoryEntry> {
    const id = `mem-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const entry: AgentMemoryEntry = {
      id,
      agentId,
      type,
      content,
      context,
      embedding,
      relevance: 1,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: 0,
    };

    this.memories.set(id, entry);
    this.evictIfOverLimit(agentId);
    await this.save();

    EventBus.emit(EVENTS.AGENT_MEMORY_STORED, { agentId, memoryId: id, type });
    LOGGER.info('AgentLongTermMemory', 'Memory stored', { agentId, type, memoryId: id });

    return entry;
  }

  /**
   * Query agent memories
   */
  query(params: MemoryQuery): AgentMemoryEntry[] {
    const { agentId, query, limit = 10, minRelevance = 0.3 } = params;
    
    const agentMemories = Array.from(this.memories.values())
      .filter(m => m.agentId === agentId);

    // Simple keyword matching (would use embeddings in production)
    const queryLower = query.toLowerCase();
    const scored = agentMemories.map(m => {
      let score = 0;
      if (m.content.toLowerCase().includes(queryLower)) score += 0.5;
      if (m.context.toLowerCase().includes(queryLower)) score += 0.3;
      if (m.type === 'learned') score += 0.2;
      return { memory: m, score };
    });

    return scored
      .filter(s => s.score >= minRelevance)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        s.memory.relevance = s.score;
        return s.memory;
      });
  }

  /**
   * Access memory (track usage)
   */
  access(memoryId: string): AgentMemoryEntry | undefined {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
    }
    return memory;
  }

  private evictIfOverLimit(agentId: string): void {
    const agentMemories = Array.from(this.memories.values())
      .filter(m => m.agentId === agentId)
      .sort((a, b) => {
        if (a.accessCount !== b.accessCount) return a.accessCount - b.accessCount;
        return a.lastAccessed - b.lastAccessed;
      });
    const overflow = agentMemories.length - MAX_MEMORIES_PER_AGENT;
    if (overflow > 0) {
      for (let i = 0; i < overflow; i++) {
        this.memories.delete(agentMemories[i].id);
      }
      LOGGER.info('AgentLongTermMemory', 'Evicted oldest memories', { agentId, evicted: overflow });
    }
  }

  /**
   * Get all memories for agent
   */
  getAgentMemories(agentId: string, type?: AgentMemoryEntry['type']): AgentMemoryEntry[] {
    return Array.from(this.memories.values())
      .filter(m => m.agentId === agentId && (!type || m.type === type))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Forget old memories
   */
  async forget(agentId: string, olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let count = 0;

    for (const [id, memory] of this.memories.entries()) {
      if (memory.agentId === agentId && memory.timestamp < cutoff && memory.accessCount < 3) {
        this.memories.delete(id);
        count++;
      }
    }

    if (count > 0) {
      await this.save();
      LOGGER.info('AgentLongTermMemory', 'Memories forgotten', { agentId, count });
    }

    return count;
  }

  /**
   * Learn from task completion
   */
  async learnFromTask(
    agentId: string,
    taskDescription: string,
    outcome: string,
    keyInsight: string
  ): Promise<void> {
    await this.store(agentId, 'learned', keyInsight, `Task: ${taskDescription}\nOutcome: ${outcome}`);
    await this.store(agentId, 'task', `Completed: ${taskDescription}`, outcome);
  }

  /**
   * Record interaction
   */
  async recordInteraction(
    agentId: string,
    userMessage: string,
    agentResponse: string
  ): Promise<void> {
    await this.store(
      agentId,
      'interaction',
      `User: ${userMessage}\nAgent: ${agentResponse}`,
      'Conversation interaction'
    );
  }

  /**
   * Get memory stats
   */
  getStats(agentId: string): {
    total: number;
    byType: Record<string, number>;
    avgAccessCount: number;
    mostAccessed: AgentMemoryEntry[];
  } {
    const memories = this.getAgentMemories(agentId);
    const byType: Record<string, number> = {};

    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
    }

    const mostAccessed = [...memories]
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);

    return {
      total: memories.length,
      byType,
      avgAccessCount: memories.length > 0 
        ? memories.reduce((sum, m) => sum + m.accessCount, 0) / memories.length 
        : 0,
      mostAccessed,
    };
  }

  private async save(): Promise<void> {
    await this.storage.set('memories', Array.from(this.memories.entries()));
  }
}

// Singleton
export const agentLongTermMemoryService = new AgentLongTermMemoryService();

// Add events
if (!EVENTS.AGENT_MEMORY_STORED) {
  (EVENTS as unknown as Record<string, string>).AGENT_MEMORY_STORED = 'agent:memory:stored';
}