/**
 * Cross-Research Pattern Learning Service
 * Learns patterns across research modules
 */

import { genId } from '../../../utils/gen-id';
import { rootLogger } from '../logger-service';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('PatternLearning');

export interface Pattern {
  id: string;
  name: string;
  description: string;
  triggerModules: string[];
  occurrences: number;
  lastSeen: number;
  confidence: number; // 0-1
  correlations: Array<{ module: string; strength: number }>;
  suggestedAction?: string;
}

export interface PatternFinding {
  patternId: string;
  modules: string[];
  finding: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: number;
}

class CrossResearchPatternLearningService {
  private storage: StorageAdapter;
  private patterns: Map<string, Pattern> = new Map();
  private recentFindings: PatternFinding[] = [];

  constructor() {
    this.storage = StorageAdapter.RESEARCH;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      patterns: [string, Pattern][];
      recentFindings: PatternFinding[];
    }>('data');

    if (saved) {
      for (const [id, pattern] of saved.patterns || []) {
        this.patterns.set(id, pattern);
      }
      this.recentFindings = saved.recentFindings || [];
    }
    LOGGER.info('PatternLearning', `Initialized with ${this.patterns.size} patterns`);
  }

  /**
   * Record a finding from a research module
   */
  recordFinding(module: string, finding: string, severity: 'low' | 'medium' | 'high'): void {
    // Check for existing pattern
    for (const [patternId, pattern] of this.patterns.entries()) {
      if (this.matchesPattern(finding, pattern)) {
        // Update existing pattern
        if (!pattern.triggerModules.includes(module)) {
          pattern.triggerModules.push(module);
        }
        pattern.occurrences++;
        pattern.lastSeen = Date.now();
        
        // Update correlations
        const existingCorr = pattern.correlations.find(c => c.module === module);
        if (existingCorr) {
          // B10-63: Cap strength at 1.0 to prevent unbounded growth
          existingCorr.strength = Math.min(1.0, existingCorr.strength + 0.1);
        } else {
          pattern.correlations.push({ module, strength: 0.5 });
        }

        LOGGER.info('PatternLearning', 'Pattern matched', { patternId, module, finding: finding.slice(0, 50) });
        return;
      }
    }

    // Create new pattern after 2+ occurrences
    this.recentFindings.push({ patternId: '', modules: [module], finding, severity, detectedAt: Date.now() });
    
    // Group similar findings
    this.analyzePatterns();
  }

  /**
   * Get learned patterns
   */
  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.occurrences >= 2)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get patterns by module
   */
  getPatternsByModule(module: string): Pattern[] {
    return this.getPatterns().filter(p => p.triggerModules.includes(module));
  }

  /**
   * Get high-confidence patterns
   */
  getHighConfidencePatterns(): Pattern[] {
    return this.getPatterns().filter(p => p.confidence >= 0.7);
  }

  /**
   * Get correlated modules
   */
  getCorrelatedModules(module: string): Array<{ module: string; strength: number }> {
    const correlated: Array<{ module: string; strength: number }> = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.triggerModules.includes(module)) {
        for (const corr of pattern.correlations) {
          if (corr.module !== module) {
            const existing = correlated.find(c => c.module === corr.module);
            if (existing) {
              existing.strength = Math.max(existing.strength, corr.strength);
            } else {
              correlated.push({ ...corr });
            }
          }
        }
      }
    }

    return correlated.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get pattern predictions
   */
  predictNextFindings(currentModule: string): Array<{ module: string; likelihood: number; reason: string }> {
    const predictions: Array<{ module: string; likelihood: number; reason: string }> = [];
    const correlated = this.getCorrelatedModules(currentModule);

    for (const corr of correlated) {
      const patterns = this.getPatternsByModule(currentModule);
      const avgOccurrences = patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.occurrences, 0) / patterns.length
        : 0;

      predictions.push({
        module: corr.module,
        likelihood: corr.strength * Math.min(1, avgOccurrences / 5),
        reason: `${corr.strength.toFixed(1)} correlation strength with ${currentModule}`,
      });
    }

    return predictions.sort((a, b) => b.likelihood - a.likelihood);
  }

  /**
   * Get pattern summary
   */
  getSummary(): {
    totalPatterns: number;
    highConfidence: number;
    avgOccurrences: number;
    mostCorrelated: Array<{ from: string; to: string; strength: number }>;
  } {
    const patterns = this.getPatterns();
    const mostCorrelated: Array<{ from: string; to: string; strength: number }> = [];

    for (const pattern of patterns) {
      for (const corr of pattern.correlations) {
        if (corr.strength > 0.5) {
          mostCorrelated.push({
            from: pattern.triggerModules[0],
            to: corr.module,
            strength: corr.strength,
          });
        }
      }
    }

    return {
      totalPatterns: patterns.length,
      highConfidence: patterns.filter(p => p.confidence >= 0.7).length,
      avgOccurrences: patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.occurrences, 0) / patterns.length
        : 0,
      mostCorrelated: mostCorrelated.sort((a, b) => b.strength - a.strength).slice(0, 10),
    };
  }

  private analyzePatterns(): void {
    // Group recent findings by similarity
    const groups = new Map<string, PatternFinding[]>();

    for (const finding of this.recentFindings.slice(-50)) {
      const key = this.normalizeFinding(finding.finding);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(finding);
    }

    // Create patterns for groups with 2+ occurrences
    for (const [key, findings] of groups.entries()) {
      if (findings.length < 2) continue;

      const modules = [...new Set(findings.map(f => f.modules).flat())];
      if (modules.length < 2) continue;

      const pattern: Pattern = {
        id: genId('pattern'),
        name: this.generatePatternName(key),
        description: findings[0].finding,
        triggerModules: modules,
        occurrences: findings.length,
        lastSeen: Date.now(),
        confidence: Math.min(0.95, 0.5 + (modules.length * 0.1) + (findings.length * 0.05)),
        correlations: modules.map(m => ({ module: m, strength: 0.5 })),
        suggestedAction: this.generateAction(modules),
      };

      this.patterns.set(pattern.id, pattern);
      LOGGER.info('PatternLearning', 'Pattern discovered', { 
        id: pattern.id, 
        modules: modules.length, 
        occurrences: findings.length 
      });
    }

    // Keep only recent patterns
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [id, pattern] of this.patterns.entries()) {
      if (pattern.lastSeen < cutoff) {
        this.patterns.delete(id);
      }
    }

    void this.save().catch(e => LOGGER.warn('PatternLearning', 'Save failed', { error: e }));
  }

  private matchesPattern(finding: string, pattern: Pattern): boolean {
    const normalized = this.normalizeFinding(finding);
    const patternNormalized = this.normalizeFinding(pattern.description);
    
    // Simple similarity check
    const words = normalized.split(' ');
    const patternWords = patternNormalized.split(' ');
    const common = words.filter(w => patternWords.includes(w));
    
    return common.length >= 3;
  }

  private normalizeFinding(finding: string): string {
    return finding
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generatePatternName(key: string): string {
    const words = key.split(' ').slice(0, 3);
    return words.join(' ') + (words.length > 0 ? '...' : '');
  }

  private generateAction(modules: string[]): string {
    if (modules.length >= 3) {
      return 'Multiple modules affected — investigate root cause';
    }
    if (modules.includes('arch-review') && modules.includes('prompt-audit')) {
      return 'Architecture and prompt issues may be related — check dependency';
    }
    if (modules.includes('routing-experiments')) {
      return 'Consider updating routing policies';
    }
    return 'Review findings across affected modules';
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      patterns: Array.from(this.patterns.entries()),
      recentFindings: this.recentFindings.slice(-100),
    });
  }
}

// Singleton
export const crossResearchPatternLearningService = new CrossResearchPatternLearningService();