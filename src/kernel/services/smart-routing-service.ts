import { PROVIDER_DEFAULT_MODELS } from '../utils/provider-default-models';
import type {
    SmartRoutingConfig,
    RoutingRule,
    RoutingDecision,
    ISmartRoutingService,
} from '../contracts/smart-routing';

const DEFAULT_CONFIG: SmartRoutingConfig = {
    defaultProvider: 'openrouter',
    defaultModel: PROVIDER_DEFAULT_MODELS.openai ?? 'gpt-4o',
    rules: [],
    enableAutoRouting: true,
    enableFallback: true,
    maxFallbackDepth: 3,
    latencyThreshold: 2000,
    costOptimization: 'balanced',
};

let nextId = 1;

/**
 * @deprecated MOCK — simulated backend. Replace with real implementation before production use.
 */
export class SmartRoutingService implements ISmartRoutingService {
    private config: SmartRoutingConfig = { ...DEFAULT_CONFIG };
    private rules: RoutingRule[] = [];
    private decisionHistory: RoutingDecision[] = [];

    getConfig(): SmartRoutingConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<SmartRoutingConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    getRules(): RoutingRule[] {
        return [...this.rules].sort((a, b) => a.priority - b.priority);
    }

    addRule(rule: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>): RoutingRule {
        const now = Date.now();
        const newRule: RoutingRule = {
            ...rule,
            id: `rule-${nextId++}-${now}`,
            createdAt: now,
            updatedAt: now,
        };
        this.rules.push(newRule);
        return newRule;
    }

    updateRule(id: string, updates: Partial<RoutingRule>): RoutingRule | null {
        const idx = this.rules.findIndex((r) => r.id === id);
        if (idx === -1) return null;
        this.rules[idx] = { ...this.rules[idx], ...updates, updatedAt: Date.now() };
        return this.rules[idx];
    }

    deleteRule(id: string): boolean {
        const idx = this.rules.findIndex((r) => r.id === id);
        if (idx === -1) return false;
        this.rules.splice(idx, 1);
        return true;
    }

    reorderRules(fromIndex: number, toIndex: number): void {
        const sorted = this.getRules();
        const [moved] = sorted.splice(fromIndex, 1);
        sorted.splice(toIndex, 0, moved);
        sorted.forEach((r, i) => {
            const found = this.rules.find((x) => x.id === r.id);
            if (found) found.priority = i;
        });
    }

    simulateRouting(request: {
        model?: string;
        provider?: string;
        maxLatency?: number;
        maxCost?: number;
    }): RoutingDecision {
        const matchedConditions: string[] = [];

        for (const rule of this.getRules()) {
            if (!rule.enabled) continue;
            const allMatch = rule.conditions.every((c) => {
                const match = this.evaluateCondition(c, request);
                if (match) matchedConditions.push(`${c.type}:${c.value}`);
                return match;
            });
            if (allMatch) {
                return {
                    ruleId: rule.id,
                    selectedProvider: rule.targetProvider,
                    selectedModel: rule.targetModel ?? this.config.defaultModel,
                    fallbackUsed: false,
                    latency: Math.random() * 500 + 100,
                    estimatedCost: Math.random() * 0.01,
                    matchedConditions,
                    timestamp: Date.now(),
                };
            }
        }

        const decision: RoutingDecision = {
            ruleId: null,
            selectedProvider: request.provider || this.config.defaultProvider,
            selectedModel: request.model || this.config.defaultModel,
            fallbackUsed: false,
            latency: Math.random() * 500 + 100,
            estimatedCost: Math.random() * 0.01,
            matchedConditions,
            timestamp: Date.now(),
        };

        this.decisionHistory.push(decision);
        if (this.decisionHistory.length > 100) this.decisionHistory.shift();
        return decision;
    }

    getDecisionHistory(): RoutingDecision[] {
        return [...this.decisionHistory];
    }

    clearHistory(): void {
        this.decisionHistory = [];
    }

    private evaluateCondition(
        c: { type: string; value: string | number },
        req: { model?: string; provider?: string; maxLatency?: number; maxCost?: number },
    ): boolean {
        switch (c.type) {
            case 'model_match':
                return req.model === c.value;
            case 'provider_match':
                return req.provider === c.value;
            case 'max_latency':
                return (req.maxLatency ?? Infinity) <= Number(c.value);
            case 'max_cost':
                return (req.maxCost ?? Infinity) <= Number(c.value);
            default:
                return true;
        }
    }
}
