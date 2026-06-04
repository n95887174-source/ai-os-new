/**
 * Agent Similarity Search Service
 * Find similar agents using embeddings
 */

import { rootLogger } from './logger-service';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('AgentSimilarity');

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  capabilities: string[];
  embedding?: number[];
}

export interface SimilarityResult {
  agentId: string;
  similarity: number; // 0-1
  matchType: 'role' | 'capability' | 'prompt' | 'tools';
}

class AgentSimilarityService {
  private storage: StorageAdapter;
  private profiles: Map<string, AgentProfile> = new Map();

  constructor() {
    this.storage = StorageAdapter.AGENTS;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, AgentProfile][]>('profiles');
    if (saved) {
      for (const [id, profile] of saved) {
        this.profiles.set(id, profile);
      }
    }
    LOGGER.info('AgentSimilarity', `Initialized with ${this.profiles.size} agent profiles`);
  }

  /**
   * Register/update agent profile
   */
  async registerAgent(agent: AgentProfile): Promise<void> {
    this.profiles.set(agent.id, agent);
    await this.save();
    LOGGER.info('AgentSimilarity', 'Agent registered', { id: agent.id, name: agent.name });
  }

  /**
   * Find similar agents
   */
  findSimilar(agentId: string, limit = 5): SimilarityResult[] {
    const target = this.profiles.get(agentId);
    if (!target) return [];

    const results: SimilarityResult[] = [];

    for (const [id, profile] of this.profiles.entries()) {
      if (id === agentId) continue;

      const similarity = this.calculateSimilarity(target, profile);
      if (similarity > 0.3) { // Threshold
        const matchType = this.getMatchType(target, profile);
        results.push({ agentId: id, similarity, matchType });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * Search agents by description
   */
  searchByDescription(query: string, limit = 10): Array<{ agentId: string; name: string; role: string; similarity: number }> {
    const queryLower = query.toLowerCase();
    const results: Array<{ agentId: string; name: string; role: string; similarity: number }> = [];

    for (const [id, profile] of this.profiles.entries()) {
      let similarity = 0;

      // Name match
      if (profile.name.toLowerCase().includes(queryLower)) similarity += 0.5;
      // Role match
      if (profile.role.toLowerCase().includes(queryLower)) similarity += 0.3;
      // Capability match
      if (profile.capabilities.some(c => c.toLowerCase().includes(queryLower))) similarity += 0.2;
      // Tool match
      if (profile.tools.some(t => t.toLowerCase().includes(queryLower))) similarity += 0.1;

      if (similarity > 0.1) {
        results.push({
          agentId: id,
          name: profile.name,
          role: profile.role,
          similarity,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * Get agent recommendations for a task
   */
  recommendForTask(task: string, requiredCapabilities: string[]): AgentProfile[] {
    const taskLower = task.toLowerCase();
    const scored: Array<{ profile: AgentProfile; score: number }> = [];

    for (const profile of this.profiles.values()) {
      let score = 0;

      // Task match
      if (taskLower.includes(profile.role.toLowerCase())) score += 0.4;
      
      // Capability match
      const matchedCapabilities = requiredCapabilities.filter(c =>
        profile.capabilities.some(pc => pc.toLowerCase().includes(c.toLowerCase()))
      );
      score += (matchedCapabilities.length / Math.max(1, requiredCapabilities.length)) * 0.4;

      // Tool match
      score += (profile.tools.length / 20) * 0.2; // Max 20 tools

      if (score > 0.2) {
        scored.push({ profile, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.profile);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get agent profile
   */
  getAgent(id: string): AgentProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Delete agent profile
   */
  async deleteAgent(id: string): Promise<boolean> {
    const deleted = this.profiles.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  private calculateSimilarity(a: AgentProfile, b: AgentProfile): number {
    let score = 0;
    let count = 0;

    // Role similarity
    if (a.role === b.role) {
      score += 0.4;
      count++;
    }

    // Capability overlap
    const aCaps = new Set(a.capabilities);
    const bCaps = new Set(b.capabilities);
    const intersection = [...aCaps].filter(c => bCaps.has(c));
    const union = new Set([...aCaps, ...bCaps]);
    if (union.size > 0) {
      score += intersection.length / union.size * 0.3;
      count++;
    }

    // Tool overlap
    const aTools = new Set(a.tools);
    const bTools = new Set(b.tools);
    const toolIntersection = [...aTools].filter(t => bTools.has(t));
    const toolUnion = new Set([...aTools, ...bTools]);
    if (toolUnion.size > 0) {
      score += toolIntersection.length / toolUnion.size * 0.3;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  private getMatchType(a: AgentProfile, b: AgentProfile): SimilarityResult['matchType'] {
    if (a.role === b.role) return 'role';
    
    const aCaps = new Set(a.capabilities);
    const bCaps = new Set(b.capabilities);
    if ([...aCaps].filter(c => bCaps.has(c)).length > 0) return 'capability';

    const aTools = new Set(a.tools);
    const bTools = new Set(b.tools);
    if ([...aTools].filter(t => bTools.has(t)).length > 0) return 'tools';

    return 'prompt';
  }

  private async save(): Promise<void> {
    await this.storage.set('profiles', Array.from(this.profiles.entries()));
  }
}

// Singleton
export const agentSimilarityService = new AgentSimilarityService();