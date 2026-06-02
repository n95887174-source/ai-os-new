/**
 * Research-Driven Agent Creation Service
 * Generate agents from research findings
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';

const LOGGER = rootLogger.child('ResearchAgentCreation');

export interface ResearchRecommendation {
  id: string;
  type: 'create_agent' | 'modify_agent' | 'add_tool' | 'add_policy';
  source: string; // Which research module generated this
  findingId: string;
  title: string;
  description: string;
  suggestedConfig?: AgentConfigSuggestion;
  confidence: number; // 0-1
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface AgentConfigSuggestion {
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  permissions: string[];
}

export interface FindingContext {
  findingId: string;
  module: string;
  severity: string;
  description: string;
  location?: string;
}

class ResearchRecommendationService {
  private recommendations: Map<string, ResearchRecommendation> = new Map();

  /**
   * Generate recommendations from findings
   */
  generateFromFinding(context: FindingContext): ResearchRecommendation[] {
    const recs: ResearchRecommendation[] = [];

    // Map finding type to recommendation type
    switch (context.module) {
      case 'prompt-audit':
        if (context.description.toLowerCase().includes('verbose')) {
          recs.push(this.createPromptEditorAgent(context));
        }
        if (context.description.toLowerCase().includes('injection')) {
          recs.push(this.createSecurityAuditorAgent(context));
        }
        break;

      case 'arch-review':
        if (context.description.toLowerCase().includes('circular')) {
          recs.push(this.createArchitectAgent(context));
        }
        if (context.description.toLowerCase().includes('dead')) {
          recs.push(this.createCodeCleanupAgent(context));
        }
        break;

      case 'routing-experiments':
        if (context.description.toLowerCase().includes('cost')) {
          recs.push(this.createCostOptimizerAgent(context));
        }
        break;

      case 'gov-stress-test':
        recs.push(this.createPolicyEnforcerAgent(context));
        break;

      case 'obs-gaps':
        recs.push(this.createObservabilityAgent(context));
        break;
    }

    for (const rec of recs) {
      this.recommendations.set(rec.id, rec);
      EventBus.emit(EVENTS.RESEARCH_RECOMMENDATION_CREATED, rec);
    }

    LOGGER.info('ResearchAgentCreation', 'Recommendations generated', {
      findingId: context.findingId,
      count: recs.length,
    });

    return recs;
  }

  /**
   * Get all recommendations
   */
  getAll(): ResearchRecommendation[] {
    return Array.from(this.recommendations.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get pending recommendations
   */
  getPending(): ResearchRecommendation[] {
    return this.getAll().filter(r => r.status === 'pending');
  }

  /**
   * Get recommendations by type
   */
  getByType(type: ResearchRecommendation['type']): ResearchRecommendation[] {
    return this.getAll().filter(r => r.type === type);
  }

  /**
   * Apply recommendation
   */
  async apply(recommendationId: string): Promise<AgentConfigSuggestion | null> {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) return null;

    rec.status = 'applied';
    EventBus.emit(EVENTS.RESEARCH_RECOMMENDATION_APPLIED, rec);
    LOGGER.info('ResearchAgentCreation', 'Recommendation applied', { id: recommendationId });

    return rec.suggestedConfig || null;
  }

  /**
   * Dismiss recommendation
   */
  dismiss(recommendationId: string): void {
    const rec = this.recommendations.get(recommendationId);
    if (rec) {
      rec.status = 'dismissed';
      EventBus.emit(EVENTS.RESEARCH_RECOMMENDATION_DISMISSED, { id: recommendationId });
    }
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    pending: number;
    applied: number;
    dismissed: number;
    byType: Record<string, number>;
  } {
    const all = this.getAll();
    const byType: Record<string, number> = {};

    for (const rec of all) {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
    }

    return {
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      applied: all.filter(r => r.status === 'applied').length,
      dismissed: all.filter(r => r.status === 'dismissed').length,
      byType,
    };
  }

  private createPromptEditorAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Prompt Editor Agent',
      description: `Create agent to fix: ${ctx.description}`,
      suggestedConfig: {
        name: 'Prompt Editor',
        role: 'writing',
        systemPrompt: `You are an expert at optimizing LLM prompts. Your job is to:
1. Analyze prompts for verbosity, ambiguity, and injection risks
2. Simplify while preserving intent
3. Add safety measures where needed
4. Test prompts for effectiveness

Focus on clarity, conciseness, and robustness against prompt injection.`,
        tools: ['prompt-analysis', 'prompt-testing'],
        permissions: ['chat:send', 'memory:read'],
      },
      confidence: 0.8,
      priority: ctx.severity === 'high' ? 'high' : 'medium',
      createdAt: Date.now(),
      status: 'pending',
    };
  }

  private createSecurityAuditorAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Security Auditor Agent',
      description: `Create agent to prevent: ${ctx.description}`,
      suggestedConfig: {
        name: 'Security Auditor',
        role: 'security',
        systemPrompt: `You are a security expert specializing in prompt injection prevention. Your role:
1. Scan prompts for injection patterns
2. Suggest sanitization strategies
3. Test for common bypass techniques
4. Maintain security policies

Always assume user input may be malicious. Validate and sanitize everything.`,
        tools: ['security-scan', 'injection-detection'],
        permissions: ['chat:send', 'memory:read', 'tools:execute'],
      },
      confidence: 0.9,
      priority: 'high',
      createdAt: Date.now(),
      status: 'pending',
    };
  }

  private createArchitectAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Architecture Advisor Agent',
      description: `Create agent to fix: ${ctx.description}`,
      suggestedConfig: {
        name: 'Architecture Advisor',
        role: 'analysis',
        systemPrompt: `You are a software architect who identifies and resolves structural issues.
Your responsibilities:
1. Detect circular dependencies
2. Suggest refactoring approaches
3. Ensure proper layering
4. Maintain dependency rules

Always trace imports to verify architectural constraints.`,
        tools: ['arch-analysis', 'dependency-check'],
        permissions: ['chat:send', 'memory:read'],
      },
      confidence: 0.75,
      priority: ctx.severity === 'high' ? 'high' : 'medium',
      createdAt: Date.now(),
      status: 'pending',
    };
  }

  private createCodeCleanupAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Code Cleanup Agent',
      description: `Create agent to identify: ${ctx.description}`,
      suggestedConfig: {
        name: 'Code Cleanup',
        role: 'technical',
        systemPrompt: `You identify and safely remove dead code.
Process:
1. Verify code is truly unreachable (check all import sites)
2. Identify side effects
3. Create safe removal plan
4. Execute removal with backup

Never remove code that might be needed — when in doubt, keep it.`,
        tools: ['code-analysis', 'dependency-check'],
        permissions: ['chat:send', 'memory:read'],
      },
      confidence: 0.7,
      priority: 'low',
      createdAt: Date.now(),
      status: 'pending',
    };
  }

  private createCostOptimizerAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Cost Optimizer Agent',
      description: `Create agent to optimize: ${ctx.description}`,
      suggestedConfig: {
        name: 'Cost Optimizer',
        role: 'management',
        systemPrompt: `You optimize LLM usage for cost-efficiency.
Your approach:
1. Analyze token usage patterns
2. Suggest model downgrades where quality allows
3. Identify caching opportunities
4. Recommend batch processing

Balance cost savings against quality requirements.`,
        tools: ['cost-analysis', 'model-comparison'],
        permissions: ['chat:send', 'memory:read'],
      },
      confidence: 0.8,
      priority: 'medium',
      createdAt: Date.now(),
      status: 'pending',
    };
  }

  private createPolicyEnforcerAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Policy Enforcer Agent',
      description: `Create agent to enforce: ${ctx.description}`,
      suggestedConfig: {
        name: 'Policy Enforcer',
        role: 'security',
        systemPrompt: `You ensure governance policies are followed.
Duties:
1. Validate actions against policies
2. Flag policy violations
3. Suggest policy updates
4. Report compliance status

Be strict — policies exist for important reasons.`,
        tools: ['policy-check', 'compliance-report'],
        permissions: ['chat:send', 'memory:read', 'tools:execute'],
      },
      confidence: 0.85,
      priority: 'high',
      createdAt: Date.now(),
      status: 'pending',
    };
  }

  private createObservabilityAgent(ctx: FindingContext): ResearchRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'create_agent',
      source: ctx.module,
      findingId: ctx.findingId,
      title: 'Observability Agent',
      description: `Create agent to improve: ${ctx.description}`,
      suggestedConfig: {
        name: 'Observability Agent',
        role: 'analysis',
        systemPrompt: `You improve system observability.
Tasks:
1. Identify unlogged events
2. Suggest appropriate log levels
3. Ensure trace context propagation
4. Monitor coverage gaps

Good observability enables debugging without reproduction.`,
        tools: ['log-analysis', 'trace-check'],
        permissions: ['chat:send', 'memory:read'],
      },
      confidence: 0.75,
      priority: 'medium',
      createdAt: Date.now(),
      status: 'pending',
    };
  }
}

// Singleton
export const researchRecommendationService = new ResearchRecommendationService();

// Add events
if (!EVENTS.RESEARCH_RECOMMENDATION_CREATED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_RECOMMENDATION_CREATED = 'research:recommendation:created';
}
if (!EVENTS.RESEARCH_RECOMMENDATION_APPLIED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_RECOMMENDATION_APPLIED = 'research:recommendation:applied';
}
if (!EVENTS.RESEARCH_RECOMMENDATION_DISMISSED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_RECOMMENDATION_DISMISSED = 'research:recommendation:dismissed';
}