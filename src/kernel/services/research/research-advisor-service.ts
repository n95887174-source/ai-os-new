/**
 * AI-Driven Research Suggestions Service
 * Suggests next research to run based on history
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('ResearchAdvisor');

export interface ResearchSuggestion {
  id: string;
  module: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  suggestedParams?: Record<string, unknown>;
  createdAt: number;
}

export interface ResearchHistory {
  module: string;
  lastRun: number;
  runCount: number;
  avgFindings: number;
  avgDuration: number;
}

class ResearchAdvisorService {
  private storage: StorageAdapter;
  private history: Map<string, ResearchHistory> = new Map();
  private suggestions: ResearchSuggestion[] = [];

  constructor() {
    this.storage = new StorageAdapter('research-advisor');
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      history: [string, ResearchHistory][];
      suggestions: ResearchSuggestion[];
    }>('data');

    if (saved) {
      for (const [module, hist] of saved.history || []) {
        this.history.set(module, hist);
      }
      this.suggestions = saved.suggestions || [];
    }
    LOGGER.info('ResearchAdvisor', `Initialized with ${this.history.size} modules`);
  }

  /**
   * Record a research run
   */
  async recordRun(module: string, findings: number, durationMs: number): Promise<void> {
    const existing = this.history.get(module);
    
    if (existing) {
      existing.lastRun = Date.now();
      existing.runCount++;
      existing.avgFindings = (existing.avgFindings * (existing.runCount - 1) + findings) / existing.runCount;
      existing.avgDuration = (existing.avgDuration * (existing.runCount - 1) + durationMs) / existing.runCount;
    } else {
      this.history.set(module, {
        module,
        lastRun: Date.now(),
        runCount: 1,
        avgFindings: findings,
        avgDuration: durationMs,
      });
    }

    // Generate new suggestions
    this.generateSuggestions();

    await this.save();
    LOGGER.info('ResearchAdvisor', 'Research recorded', { module, findings, durationMs });
  }

  /**
   * Get suggestions for next research
   */
  getSuggestions(): ResearchSuggestion[] {
    return this.suggestions.filter(s => s.priority !== 'low')
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.confidence - a.confidence;
      });
  }

  /**
   * Get all suggestions including low priority
   */
  getAllSuggestions(): ResearchSuggestion[] {
    return [...this.suggestions].sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Dismiss suggestion
   */
  dismiss(suggestionId: string): void {
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
    this.save();
  }

  /**
   * Get research history
   */
  getHistory(): ResearchHistory[] {
    return Array.from(this.history.values())
      .sort((a, b) => b.lastRun - a.lastRun);
  }

  /**
   * Get modules not run recently
   */
  getStaleModules(thresholdDays = 30): ResearchSuggestion[] {
    const threshold = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;
    
    return Array.from(this.history.entries())
      .filter(([_, hist]) => hist.lastRun < threshold)
      .map(([module, _]) => {
        const daysSince = Math.floor((Date.now() - (this.history.get(module)?.lastRun || 0)) / (24 * 60 * 60 * 1000));
        return {
          id: `stale-${module}`,
          module,
          reason: `Not run in ${daysSince} days`,
          priority: daysSince > 60 ? 'high' : 'medium',
          confidence: 0.9,
          createdAt: Date.now(),
        } as ResearchSuggestion;
      });
  }

  /**
   * Get high-finding modules
   */
  getHighFindingModules(): ResearchSuggestion[] {
    return Array.from(this.history.values())
      .filter(h => h.avgFindings > 5)
      .map(h => ({
        id: `high-finding-${h.module}`,
        module: h.module,
        reason: `Averages ${h.avgFindings.toFixed(1)} findings per run`,
        priority: h.avgFindings > 10 ? 'high' : 'medium',
        confidence: 0.8,
        createdAt: Date.now(),
      } as ResearchSuggestion));
  }

  private generateSuggestions(): void {
    this.suggestions = [];
    const now = Date.now();

    // Suggest stale modules
    for (const [module, hist] of this.history.entries()) {
      const daysSince = (now - hist.lastRun) / (24 * 60 * 60 * 1000);
      
      if (daysSince > 60) {
        this.suggestions.push({
          id: `stale-${module}`,
          module,
          reason: `Not run in ${Math.floor(daysSince)} days — findings may be outdated`,
          priority: 'high',
          confidence: 0.95,
          createdAt: now,
        });
      } else if (daysSince > 30) {
        this.suggestions.push({
          id: `stale-${module}`,
          module,
          reason: `Not run in ${Math.floor(daysSince)} days`,
          priority: 'medium',
          confidence: 0.8,
          createdAt: now,
        });
      }
    }

    // Suggest modules with high findings
    for (const hist of this.history.values()) {
      if (hist.avgFindings > 10) {
        this.suggestions.push({
          id: `high-finding-${hist.module}`,
          module: hist.module,
          reason: `Averages ${hist.avgFindings.toFixed(1)} findings — likely has more issues`,
          priority: 'medium',
          confidence: 0.75,
          createdAt: now,
        });
      }
    }

    // Cross-module suggestions
    if (this.history.has('arch-review') && !this.history.has('prompt-audit')) {
      this.suggestions.push({
        id: 'cross-arch-prompt',
        module: 'prompt-audit',
        reason: 'You run arch review but not prompt audit — prompt issues can cause architecture problems',
        priority: 'medium',
        confidence: 0.7,
        createdAt: now,
      });
    }

    if (this.history.has('routing-experiments') && !this.history.has('gov-stress-test')) {
      this.suggestions.push({
        id: 'cross-routing-gov',
        module: 'gov-stress-test',
        reason: 'Routing experiments found issues — verify governance policies are still valid',
        priority: 'low',
        confidence: 0.6,
        createdAt: now,
      });
    }

    // Sort and limit
    this.suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.confidence - a.confidence;
    });

    this.suggestions = this.suggestions.slice(0, 10);
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      history: Array.from(this.history.entries()),
      suggestions: this.suggestions,
    });
  }
}

// Singleton
export const researchAdvisorService = new ResearchAdvisorService();