/**
 * Prompt Audit Baselines Service
 * Track and compare prompt audit baselines over time
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('PromptAuditBaselines');

export interface PromptRisk {
  promptId: string;
  path: string;
  risks: PromptRiskItem[];
  overallScore: number; // 0-10
  timestamp: number;
}

export interface PromptRiskItem {
  type: 'bias' | 'injection' | 'verbosity' | 'ambiguity' | 'safety' | 'compliance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location?: string;
  suggestedFix?: string;
}

export interface PromptAuditBaseline {
  id: string;
  name: string;
  promptRisks: PromptRisk[];
  timestamp: number;
  stats: {
    totalPrompts: number;
    totalRisks: number;
    avgScore: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export interface PromptAuditComparison {
  baselineId: string;
  currentId: string;
  newRisks: PromptRiskItem[];
  fixedRisks: PromptRiskItem[];
  worsenedRisks: PromptRiskItem[];
  scoreChanges: Record<string, { before: number; after: number }>;
  regressions: string[];
  improvements: string[];
}

class PromptAuditBaselinesService {
  private storage: StorageAdapter;
  private baselines: Map<string, PromptAuditBaseline> = new Map();
  private currentAudit: PromptRisk[] = [];
  private currentAuditId: string = '';

  constructor() {
    this.storage = new StorageAdapter('prompt-audit-baselines');
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      baselines: [string, PromptAuditBaseline][];
      currentAudit: PromptRisk[];
      currentAuditId: string;
    }>('data');

    if (saved) {
      for (const [id, baseline] of saved.baselines || []) {
        this.baselines.set(id, baseline);
      }
      this.currentAudit = saved.currentAudit || [];
      this.currentAuditId = saved.currentAuditId || '';
    }
    LOGGER.info('PromptAuditBaselines', `Initialized with ${this.baselines.size} baselines`);
  }

  /**
   * Set current audit data
   */
  setCurrentAudit(promptRisks: PromptRisk[]): void {
    this.currentAudit = promptRisks;
    this.currentAuditId = `audit-${Date.now()}`;
    this.save();
  }

  /**
   * Set baseline from current audit
   */
  async setBaseline(name: string): Promise<PromptAuditBaseline> {
    const risks = [...this.currentAudit];
    const stats = this.calculateStats(risks);

    const baseline: PromptAuditBaseline = {
      id: `baseline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      promptRisks: risks,
      timestamp: Date.now(),
      stats,
    };

    this.baselines.set(baseline.id, baseline);
    await this.save();

    EventBus.emit(EVENTS.PROMPT_AUDIT_BASELINE_SET, baseline);
    LOGGER.info('PromptAuditBaselines', 'Baseline set', { id: baseline.id, name, prompts: risks.length });

    return baseline;
  }

  /**
   * Compare current audit to baseline
   */
  compareToBaseline(baselineId: string): PromptAuditComparison | null {
    const baseline = this.baselines.get(baselineId);
    if (!baseline) return null;

    const currentRisks = this.currentAudit;
    const newRisks: PromptRiskItem[] = [];
    const fixedRisks: PromptRiskItem[] = [];
    const worsenedRisks: PromptRiskItem[] = [];
    const scoreChanges: Record<string, { before: number; after: number }> = {};
    const regressions: string[] = [];
    const improvements: string[] = [];

    const baselineMap = new Map(baseline.promptRisks.map(p => [p.promptId, p]));
    const currentMap = new Map(currentRisks.map(p => [p.promptId, p]));

    // Check each current prompt
    for (const [promptId, current] of currentMap) {
      const baselinePrompt = baselineMap.get(promptId);

      if (!baselinePrompt) {
        // New prompt with risks
        newRisks.push(...current.risks);
      } else {
        // Compare scores
        const scoreDiff = current.overallScore - baselinePrompt.overallScore;
        scoreChanges[promptId] = {
          before: baselinePrompt.overallScore,
          after: current.overallScore,
        };

        if (scoreDiff > 0.5) {
          regressions.push(promptId);
        } else if (scoreDiff < -0.5) {
          improvements.push(promptId);
        }

        // Compare individual risks
        const baselineRiskMap = new Map(baselinePrompt.risks.map(r => [`${r.type}:${r.description}`, r]));
        const currentRiskMap = new Map(current.risks.map(r => [`${r.type}:${r.description}`, r]));

        for (const risk of current.risks) {
          const key = `${risk.type}:${risk.description}`;
          if (!baselineRiskMap.has(key)) {
            newRisks.push(risk);
          }
        }

        for (const risk of baselinePrompt.risks) {
          const key = `${risk.type}:${risk.description}`;
          if (!currentRiskMap.has(key)) {
            fixedRisks.push(risk);
          }
        }

        // Check for worsened severity
        for (const risk of current.risks) {
          const baselineRisk = baselineRiskMap.get(`${risk.type}:${risk.description}`);
          if (baselineRisk && this.getSeverityWeight(risk.severity) > this.getSeverityWeight(baselineRisk.severity)) {
            worsenedRisks.push(risk);
          }
        }
      }
    }

    // Check for removed prompts
    for (const [promptId, baselinePrompt] of baselineMap) {
      if (!currentMap.has(promptId)) {
        // Prompt was removed - all its risks are "fixed"
        fixedRisks.push(...baselinePrompt.risks);
      }
    }

    const comparison: PromptAuditComparison = {
      baselineId,
      currentId: this.currentAuditId,
      newRisks,
      fixedRisks,
      worsenedRisks,
      scoreChanges,
      regressions,
      improvements,
    };

    EventBus.emit(EVENTS.PROMPT_AUDIT_COMPARISON_CREATED, comparison);
    LOGGER.info('PromptAuditBaselines', 'Comparison created', {
      new: newRisks.length,
      fixed: fixedRisks.length,
      regressions: regressions.length,
    });

    return comparison;
  }

  /**
   * Get all baselines
   */
  getBaselines(): PromptAuditBaseline[] {
    return Array.from(this.baselines.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get baseline by ID
   */
  getBaseline(id: string): PromptAuditBaseline | undefined {
    return this.baselines.get(id);
  }

  /**
   * Get latest baseline
   */
  getLatestBaseline(): PromptAuditBaseline | undefined {
    const baselines = this.getBaselines();
    return baselines[0];
  }

  /**
   * Delete baseline
   */
  async deleteBaseline(id: string): Promise<boolean> {
    const deleted = this.baselines.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Get prompt risk score history
   */
  getPromptScoreHistory(promptId: string): Array<{ timestamp: number; score: number }> {
    const history: Array<{ timestamp: number; score: number }> = [];

    for (const baseline of this.baselines.values()) {
      const prompt = baseline.promptRisks.find(p => p.promptId === promptId);
      if (prompt) {
        history.push({ timestamp: baseline.timestamp, score: prompt.overallScore });
      }
    }

    if (this.currentAudit.some(p => p.promptId === promptId)) {
      history.push({ timestamp: Date.now(), score: this.currentAudit.find(p => p.promptId === promptId)!.overallScore });
    }

    return history.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get regression alerts
   */
  getRegressionAlerts(): Array<{ promptId: string; oldScore: number; newScore: number; threshold: number }> {
    const latestBaseline = this.getLatestBaseline();
    if (!latestBaseline) return [];

    const alerts: Array<{ promptId: string; oldScore: number; newScore: number; threshold: number }> = [];

    for (const current of this.currentAudit) {
      const baseline = latestBaseline.promptRisks.find(p => p.promptId === current.promptId);
      if (baseline && current.overallScore > baseline.overallScore + 1) {
        alerts.push({
          promptId: current.promptId,
          oldScore: baseline.overallScore,
          newScore: current.overallScore,
          threshold: 1,
        });
      }
    }

    return alerts;
  }

  private calculateStats(promptRisks: PromptRisk[]): PromptAuditBaseline['stats'] {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let totalRisks = 0;

    for (const prompt of promptRisks) {
      for (const risk of prompt.risks) {
        byType[risk.type] = (byType[risk.type] || 0) + 1;
        bySeverity[risk.severity] = (bySeverity[risk.severity] || 0) + 1;
        totalRisks++;
      }
    }

    const avgScore = promptRisks.length > 0
      ? promptRisks.reduce((sum, p) => sum + p.overallScore, 0) / promptRisks.length
      : 0;

    return {
      totalPrompts: promptRisks.length,
      totalRisks,
      avgScore,
      byType,
      bySeverity,
    };
  }

  private getSeverityWeight(severity: PromptRiskItem['severity']): number {
    const weights: Record<PromptRiskItem['severity'], number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
    };
    return weights[severity] || 0;
  }

  private async save(): Promise<void> {
    const baselines = Array.from(this.baselines.entries()).slice(-20);
    await this.storage.set('data', {
      baselines,
      currentAudit: this.currentAudit,
      currentAuditId: this.currentAuditId,
    });
  }
}

// Singleton
export const promptAuditBaselinesService = new PromptAuditBaselinesService();

// Add events
if (!EVENTS.PROMPT_AUDIT_BASELINE_SET) {
  (EVENTS as unknown as Record<string, string>).PROMPT_AUDIT_BASELINE_SET = 'prompt:audit:baseline:set';
}
if (!EVENTS.PROMPT_AUDIT_COMPARISON_CREATED) {
  (EVENTS as unknown as Record<string, string>).PROMPT_AUDIT_COMPARISON_CREATED = 'prompt:audit:comparison:created';
}