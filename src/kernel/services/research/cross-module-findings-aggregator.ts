/**
 * Cross-Module Findings Aggregator
 * Combines and synthesizes findings from multiple research projects
 */

import { genId } from '../../../utils/gen-id';
import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { BucketStorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('FindingsAggregator');

export interface Finding {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceModule: string;
  sourceProject?: string;
  relevance: number;
  confidence: number;
  tags: string[];
  linkedHypotheses: string[];
  linkedExperiments: string[];
  linkedProjects: string[];
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface AggregatedInsight {
  id: string;
  title: string;
  description: string;
  type: 'convergence' | 'divergence' | 'synthesis' | 'gap';
  evidence: Finding[];
  strength: number; // 0-1
  consensus: number; // 0-1
  createdAt: number;
}

export interface CrossModuleAnalysis {
  id: string;
  projectIds: string[];
  insights: AggregatedInsight[];
  summary: {
    totalFindings: number;
    convergingFindings: number;
    divergingFindings: number;
    novelInsights: number;
    identifiedGaps: number;
  };
  crossTagAnalysis: Map<string, { findings: Finding[]; projects: Set<string> }>;
  createdAt: number;
}

export type AggregationStrategy = 'union' | 'intersection' | 'weighted' | 'novelty';

export interface AggregationConfig {
  strategy: AggregationStrategy;
  minRelevance: number;
  minConfidence: number;
  tagOverlapThreshold: number; // 0-1
  temporalWindowMs: number; // Only consider findings within this window
}

const DEFAULT_CONFIG: AggregationConfig = {
  strategy: 'weighted',
  minRelevance: 0.3,
  minConfidence: 0.5,
  tagOverlapThreshold: 0.3,
  temporalWindowMs: 30 * 24 * 60 * 60 * 1000, // 30 days
};

class CrossModuleFindingsAggregator {
  private config: AggregationConfig;
  private storage: BucketStorageAdapter;
  private analyses: Map<string, CrossModuleAnalysis> = new Map();

  constructor(config: Partial<AggregationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = BucketStorageAdapter.RESEARCH;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{ analyses: [string, CrossModuleAnalysis][] }>('analyses');
    if (saved) {
      for (const [id, analysis] of saved.analyses) {
        this.analyses.set(id, analysis);
      }
    }
    LOGGER.info('FindingsAggregator', `Initialized with ${this.analyses.size} analyses`);
  }

  /**
   * Aggregate findings across multiple research projects
   */
  aggregate(
    findings: Finding[],
    projectIds: string[],
    config?: Partial<AggregationConfig>
  ): CrossModuleAnalysis {
    const cfg = { ...this.config, ...config };
    const id = genId('analysis');

    LOGGER.info('FindingsAggregator', 'Aggregating findings', {
      findings: findings.length,
      projects: projectIds.length,
      strategy: cfg.strategy,
    });

    const filtered = this.filterFindings(findings, cfg);
    const crossTagAnalysis = this.analyzeCrossTag(filtered, projectIds);
    const insights = this.generateInsights(filtered, cfg);

    const analysis: CrossModuleAnalysis = {
      id,
      projectIds,
      insights,
      summary: {
        totalFindings: filtered.length,
        convergingFindings: insights.filter(i => i.type === 'convergence').length,
        divergingFindings: insights.filter(i => i.type === 'divergence').length,
        novelInsights: insights.filter(i => i.type === 'synthesis').length,
        identifiedGaps: insights.filter(i => i.type === 'gap').length,
      },
      crossTagAnalysis,
      createdAt: Date.now(),
    };

    this.analyses.set(id, analysis);
    void this.save(); // B10-62: Fire-and-forget; save() is async, data in analyses Map is safe

    EventBus.emit(EVENTS.FINDINGS_AGGREGATED, analysis);
    LOGGER.info('FindingsAggregator', 'Aggregation complete', { analysisId: id });

    return analysis;
  }

  /**
   * Find converging evidence across sources
   */
  findConvergingEvidence(findings: Finding[]): AggregatedInsight[] {
    const grouped = new Map<string, Finding[]>();

    for (const finding of findings) {
      for (const tag of finding.tags) {
        if (!grouped.has(tag)) grouped.set(tag, []);
        grouped.get(tag)!.push(finding);
      }
    }

    const insights: AggregatedInsight[] = [];

    for (const [tag, tagFindings] of grouped) {
      if (tagFindings.length < 2) continue;

      // Check if findings agree (similar relevance and confidence)
      const avgRelevance = tagFindings.reduce((sum, f) => sum + f.relevance, 0) / tagFindings.length;
      const avgConfidence = tagFindings.reduce((sum, f) => sum + f.confidence, 0) / tagFindings.length;
      const projects = new Set(tagFindings.map(f => f.sourceProject ?? f.source));

      // Converging if high agreement across multiple projects
      if (projects.size >= 2 && avgConfidence > 0.6) {
        insights.push({
          id: `converge-${tag}-${Date.now()}`,
          title: `Converging evidence: ${tag}`,
          description: `${tagFindings.length} findings from ${projects.size} projects support this conclusion. ` +
            `Average relevance: ${(avgRelevance * 100).toFixed(0)}%, confidence: ${(avgConfidence * 100).toFixed(0)}%`,
          type: 'convergence',
          evidence: tagFindings,
          strength: avgRelevance,
          consensus: projects.size / tagFindings.length,
          createdAt: Date.now(),
        });
      }
    }

    return insights;
  }

  /**
   * Find diverging evidence
   */
  findDivergingEvidence(findings: Finding[]): AggregatedInsight[] {
    const bySource = new Map<string, Finding[]>();
    for (const f of findings) {
      if (!bySource.has(f.source)) bySource.set(f.source, []);
      bySource.get(f.source)!.push(f);
    }

    const insights: AggregatedInsight[] = [];
    const sources = Array.from(bySource.keys());

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const sourceA = sources[i];
        const sourceB = sources[j];
        const findingsA = bySource.get(sourceA)!;
        const findingsB = bySource.get(sourceB)!;

        // Find shared tags with conflicting conclusions
        const sharedTags = findingsA.flatMap(f => f.tags).filter(t => 
          findingsB.some(f => f.tags.includes(t))
        );

        for (const tag of sharedTags) {
          const fA = findingsA.find(f => f.tags.includes(tag))!;
          const fB = findingsB.find(f => f.tags.includes(tag))!;

          // Diverging if same topic but different conclusions
          if (Math.abs(fA.relevance - fB.relevance) > 0.3) {
            insights.push({
              id: `diverge-${tag}-${sourceA}-${sourceB}`,
              title: `Conflicting evidence: ${tag}`,
              description: `${sourceA} rates this ${(fA.relevance * 100).toFixed(0)}% relevant, ` +
                `while ${sourceB} rates it ${(fB.relevance * 100).toFixed(0)}% relevant. ` +
                `This represents a significant disagreement requiring further investigation.`,
              type: 'divergence',
              evidence: [fA, fB],
              strength: Math.abs(fA.relevance - fB.relevance),
              consensus: 0, // No consensus
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    return insights;
  }

  /**
   * Identify gaps in the research
   */
  identifyResearchGaps(
    findings: Finding[],
    requiredTags: string[]
  ): AggregatedInsight[] {
    const presentTags = new Set(findings.flatMap(f => f.tags));
    const missingTags = requiredTags.filter(t => !presentTags.has(t));

    return missingTags.map(tag => ({
      id: `gap-${tag}-${Date.now()}`,
      title: `Research gap: ${tag}`,
      description: `No findings found for tag "${tag}". This represents an area that needs investigation.`,
      type: 'gap' as const,
      evidence: [],
      strength: 0,
      consensus: 0,
      createdAt: Date.now(),
    }));
  }

  /**
   * Synthesize novel insights from combinations
   */
  synthesizeNovelInsights(findings: Finding[]): AggregatedInsight[] {
    const insights: AggregatedInsight[] = [];

    // Find unusual tag combinations
    const tagPairs = new Map<string, Finding[]>();
    for (const finding of findings) {
      if (finding.tags.length >= 2) {
        const pairs = this.getTagPairs(finding.tags);
        for (const pair of pairs) {
          if (!tagPairs.has(pair)) tagPairs.set(pair, []);
          tagPairs.get(pair)!.push(finding);
        }
      }
    }

    for (const [pair, pairFindings] of tagPairs) {
      if (pairFindings.length >= 3) {
        // Novel synthesis from frequent tag combinations
        insights.push({
          id: `synthesis-${pair}-${Date.now()}`,
          title: `Synthesis: ${pair.replace('|', ' + ')}`,
          description: `${pairFindings.length} findings combine these concepts. ` +
            `This cross-domain connection may reveal novel relationships.`,
          type: 'synthesis',
          evidence: pairFindings,
          strength: pairFindings.reduce((sum, f) => sum + f.relevance, 0) / pairFindings.length,
          consensus: 1,
          createdAt: Date.now(),
        });
      }
    }

    return insights;
  }

  /**
   * Get existing analysis by ID
   */
  getAnalysis(id: string): CrossModuleAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get all analyses
   */
  getAllAnalyses(): CrossModuleAnalysis[] {
    return Array.from(this.analyses.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Compare findings between two time periods
   */
  compareTimePeriods(
    findings: Finding[],
    period1Start: number,
    period1End: number,
    period2Start: number,
    period2End: number
  ): {
    addedTags: string[];
    removedTags: string[];
    evolvedTags: Map<string, { before: number; after: number }>;
    newFindings: Finding[];
    maturedFindings: Finding[];
  } {
    const p1 = findings.filter(f => f.createdAt >= period1Start && f.createdAt <= period1End);
    const p2 = findings.filter(f => f.createdAt >= period2Start && f.createdAt <= period2End);

    const tags1 = new Set(p1.flatMap(f => f.tags));
    const tags2 = new Set(p2.flatMap(f => f.tags));

    const addedTags = Array.from(tags2).filter(t => !tags1.has(t));
    const removedTags = Array.from(tags1).filter(t => !tags2.has(t));

    const evolvedTags = new Map<string, { before: number; after: number }>();
    for (const tag of tags1) {
      if (tags2.has(tag)) {
        const before = p1.filter(f => f.tags.includes(tag)).reduce((sum, f) => sum + f.relevance, 0) / 
          Math.max(1, p1.filter(f => f.tags.includes(tag)).length);
        const after = p2.filter(f => f.tags.includes(tag)).reduce((sum, f) => sum + f.relevance, 0) / 
          Math.max(1, p2.filter(f => f.tags.includes(tag)).length);
        evolvedTags.set(tag, { before, after });
      }
    }

    const newFindings = p2.filter(f => f.createdAt >= period2Start);
    const maturedFindings = p2.filter(f => f.confidence > 0.8);

    return { addedTags, removedTags, evolvedTags, newFindings, maturedFindings };
  }

  /**
   * Rank findings by cross-project agreement
   */
  rankByAgreement(findings: Finding[]): Finding[] {
    const projectCount = new Map<string, Set<string>>();
    
    for (const f of findings) {
      for (const tag of f.tags) {
        if (!projectCount.has(tag)) projectCount.set(tag, new Set());
        for (const project of f.linkedProjects) {
          projectCount.get(tag)!.add(project);
        }
      }
    }

    return [...findings].sort((a, b) => {
      
      const aAgreement = a.tags.reduce((sum, t) => sum + (projectCount.get(t)?.size || 0), 0);
      const bAgreement = b.tags.reduce((sum, t) => sum + (projectCount.get(t)?.size || 0), 0);
      
      return bAgreement - aAgreement;
    });
  }

  private filterFindings(findings: Finding[], config: AggregationConfig): Finding[] {
    const now = Date.now();
    const windowStart = now - config.temporalWindowMs;

    return findings.filter(f => 
      f.relevance >= config.minRelevance &&
      f.confidence >= config.minConfidence &&
      f.createdAt >= windowStart
    );
  }

  private analyzeCrossTag(
    findings: Finding[],
    _projectIds: string[]
  ): Map<string, { findings: Finding[]; projects: Set<string> }> {
    const result = new Map<string, { findings: Finding[]; projects: Set<string> }>();

    for (const finding of findings) {
      for (const tag of finding.tags) {
        if (!result.has(tag)) {
          result.set(tag, { findings: [], projects: new Set() });
        }
        const entry = result.get(tag)!;
        entry.findings.push(finding);
        for (const project of finding.linkedProjects) {
          entry.projects.add(project);
        }
      }
    }

    return result;
  }

  private generateInsights(findings: Finding[], _config: AggregationConfig): AggregatedInsight[] {
    const insights: AggregatedInsight[] = [];

    insights.push(...this.findConvergingEvidence(findings));
    insights.push(...this.findDivergingEvidence(findings));
    insights.push(...this.synthesizeNovelInsights(findings));

    return insights.sort((a, b) => b.strength - a.strength);
  }

  private getTagPairs(tags: string[]): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        pairs.push([tags[i], tags[j]].sort().join('|'));
      }
    }
    return pairs;
  }

  private async save(): Promise<void> {
    const entries: [string, CrossModuleAnalysis][] = Array.from(this.analyses.entries()).slice(-50);
    await this.storage.set('analyses', { analyses: entries });
  }
}

// Singleton
export const crossModuleFindingsAggregator = new CrossModuleFindingsAggregator();

// Add missing event
if (!EVENTS.FINDINGS_AGGREGATED) {
  (EVENTS as unknown as Record<string, string>).FINDINGS_AGGREGATED = 'findings:aggregated';
}