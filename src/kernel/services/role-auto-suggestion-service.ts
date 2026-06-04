/**
 * Role Auto-Suggestion Service
 * Suggest roles based on task description
 */

import { rootLogger } from './logger-service';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('RoleAutoSuggest');

export interface SuggestionResult {
  roleId: string;
  roleName: string;
  confidence: number;
  matchReasons: string[];
  suggestedTools: string[];
}

const TASK_KEYWORDS: Record<string, { keywords: string[]; roleId: string; reasons: string[] }> = {
  'code-reviewer': {
    keywords: ['review', 'code', 'quality', 'security', 'bug', 'refactor', 'lint'],
    roleId: 'code-reviewer',
    reasons: ['Code analysis keywords detected', 'Quality assessment needed'],
  },
  'debugger': {
    keywords: ['debug', 'fix', 'error', 'crash', 'issue', 'problem', 'troubleshoot'],
    roleId: 'debugger',
    reasons: ['Debugging keywords detected', 'Problem-solving needed'],
  },
  'tutor': {
    keywords: ['teach', 'learn', 'explain', 'understand', 'study', 'education', 'tutorial'],
    roleId: 'tutor',
    reasons: ['Teaching keywords detected', 'Educational context'],
  },
  'researcher': {
    keywords: ['research', 'find', 'investigate', 'analyze', 'study', 'explore', 'discover'],
    roleId: 'researcher',
    reasons: ['Research keywords detected', 'Information gathering needed'],
  },
  'translator': {
    keywords: ['translate', 'language', 'convert', 'localize', 'international'],
    roleId: 'translator',
    reasons: ['Translation keywords detected', 'Language conversion needed'],
  },
  'writer': {
    keywords: ['write', 'draft', 'compose', 'create', 'content', 'blog', 'article', 'document'],
    roleId: 'documentation-writer',
    reasons: ['Writing keywords detected', 'Content creation needed'],
  },
  'moderator': {
    keywords: ['debate', 'discuss', 'mediate', 'facilitate', 'moderate', 'argument'],
    roleId: 'moderator',
    reasons: ['Debate keywords detected', 'Discussion facilitation needed'],
  },
  'qa-tester': {
    keywords: ['test', 'qa', 'quality', 'validate', 'verify', 'check', 'assert'],
    roleId: 'qa-tester',
    reasons: ['Testing keywords detected', 'Quality assurance needed'],
  },
};

class RoleAutoSuggestionService {
  private storage: StorageAdapter;
  private suggestions: Map<string, SuggestionResult[]> = new Map();

  constructor() {
    this.storage = StorageAdapter.ROLES;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, SuggestionResult[]][]>('suggestions');
    if (saved) {
      for (const [query, results] of saved) {
        this.suggestions.set(query, results);
      }
    }
    LOGGER.info('RoleAutoSuggest', `Initialized`);
  }

  /**
   * Suggest roles for a task
   */
  suggest(taskDescription: string, limit = 3): SuggestionResult[] {
    const lower = taskDescription.toLowerCase();
    const scored: Array<SuggestionResult & { score: number }> = [];

    for (const [, config] of Object.entries(TASK_KEYWORDS)) {
      let score = 0;
      const matchReasons: string[] = [];

      for (const keyword of config.keywords) {
        if (lower.includes(keyword)) {
          score += 0.3;
          matchReasons.push(`Matched keyword: "${keyword}"`);
        }
      }

      // Bonus for multiple matches
      if (config.keywords.filter(k => lower.includes(k)).length >= 3) {
        score += 0.2;
        matchReasons.push('Strong keyword match');
      }

      if (score > 0) {
        scored.push({
          roleId: config.roleId,
          roleName: this.getRoleName(config.roleId),
          confidence: Math.min(1, score),
          matchReasons: [...new Set(matchReasons)].slice(0, 3),
          suggestedTools: this.getSuggestedTools(config.roleId),
          score,
        });
      }
    }

    // Sort by score and return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest as SuggestionResult);
  }

  /**
   * Get suggestion with full context
   */
  getSuggestionWithContext(task: {
    description: string;
    requiredCapabilities?: string[];
    expectedTools?: string[];
  }): SuggestionResult[] {
    // Combine task description with capabilities and tools
    const combinedText = [
      task.description,
      ...(task.requiredCapabilities || []),
      ...(task.expectedTools || []),
    ].join(' ');

    let results = this.suggest(combinedText);

    // Boost if capabilities match
    if (task.requiredCapabilities) {
      for (const result of results) {
        const toolMatches = (task.requiredCapabilities || []).filter(cap =>
          result.suggestedTools.some(tool => tool.toLowerCase().includes(cap.toLowerCase()))
        );
        if (toolMatches.length > 0) {
          result.confidence = Math.min(1, result.confidence + 0.1);
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Save suggestion history
   */
  async saveSuggestion(query: string, results: SuggestionResult[]): Promise<void> {
    // Keep last 100 queries
    const keys = Array.from(this.suggestions.keys());
    if (keys.length >= 100) {
      const oldest = keys.sort()[0];
      this.suggestions.delete(oldest);
    }

    this.suggestions.set(query, results);
    await this.save();
  }

  /**
   * Get suggestion history
   */
  getHistory(): Array<{ query: string; results: SuggestionResult[]; timestamp: number }> {
    return Array.from(this.suggestions.entries())
      .map(([query, results]) => ({
        query,
        results,
        timestamp: 0, // Would need to track timestamps
      }))
      .slice(-50);
  }

  private getRoleName(roleId: string): string {
    const names: Record<string, string> = {
      'code-reviewer': 'Code Reviewer',
      'debugger': 'Debugger',
      'tutor': 'Tutor',
      'researcher': 'Researcher',
      'translator': 'Translator',
      'documentation-writer': 'Documentation Writer',
      'moderator': 'Debate Moderator',
      'qa-tester': 'QA Tester',
    };
    return names[roleId] || roleId;
  }

  private getSuggestedTools(roleId: string): string[] {
    const tools: Record<string, string[]> = {
      'code-reviewer': ['code-analysis', 'syntax-check', 'security-scan'],
      'debugger': ['code-analysis', 'debugging', 'log-reader'],
      'tutor': ['web-search', 'explanation'],
      'researcher': ['web-search', 'data-analysis', 'citation'],
      'translator': ['language-detection', 'translation'],
      'documentation-writer': ['markdown-generation', 'grammar-check'],
      'moderator': ['debate-management', 'argument-analysis'],
      'qa-tester': ['test-execution', 'bug-reporting', 'coverage-analysis'],
    };
    return tools[roleId] || [];
  }

  private async save(): Promise<void> {
    await this.storage.set('suggestions', Array.from(this.suggestions.entries()));
  }
}

// Singleton
export const roleAutoSuggestionService = new RoleAutoSuggestionService();