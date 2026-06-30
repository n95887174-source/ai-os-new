import { safeJsonParse } from '../../../kernel/utils/safe-json';
import type {
    StrategyDefinition,
    StrategyPrimitive,
    StrategyPrimitiveType,
    StrategyRegistryEntry,
    IStrategyRegistry,
    ValidationResult,
    ValidationError,
    Incompatibility,
    SequencePrimitive,
    DebateGraphPrimitive,
    CriticLoopPrimitive,
    VotingPrimitive,
    PeerReviewPrimitive,
} from '../../contracts/debate-strategy-dsl';

// ── Built-in strategy definitions ──────────────────────────────────

const BUILTIN_STRATEGIES: StrategyDefinition[] = [
    {
        id: 'builtin.round_robin',
        name: 'Round Robin',
        description: 'Classic sequential round-robin where each agent speaks once per round',
        version: '1.0.0',
        tags: ['classic', 'simple'],
        root: {
            type: 'debate_graph',
            id: 'rr-main',
            agents: [
                { nodeId: 'proponent', role: 'pro', label: 'Proponent' },
                { nodeId: 'opponent', role: 'con', label: 'Opponent' },
            ],
            edges: [
                { from: 'proponent', to: 'opponent', type: 'sequential' },
                { from: 'opponent', to: 'proponent', type: 'sequential' },
            ],
            maxRounds: 5,
            convergenceThreshold: 0.85,
        },
    },
    {
        id: 'builtin.socratic',
        name: 'Socratic Method',
        description:
            'Question-driven inquiry that probes assumptions through iterative questioning',
        version: '1.0.0',
        tags: ['inquiry', 'philosophical'],
        root: {
            type: 'critic_loop',
            id: 'socratic-main',
            proponent: { nodeId: 'claimer', role: 'pro', label: 'Claimant' },
            critic: { nodeId: 'questioner', role: 'con', label: 'Questioner' },
            maxIterations: 6,
            stopWhen: 'agreement',
        },
    },
    {
        id: 'builtin.argument_tree',
        name: 'Argument Tree',
        description: 'Tree-structured argumentation with challenges and refinements',
        version: '1.0.0',
        tags: ['structured', 'deep'],
        root: {
            type: 'debate_graph',
            id: 'at-main',
            agents: [
                { nodeId: 'thesis', role: 'pro', label: 'Thesis' },
                { nodeId: 'antithesis', role: 'con', label: 'Antithesis' },
                { nodeId: 'synthesis', role: 'neutral', label: 'Synthesis' },
            ],
            edges: [
                { from: 'thesis', to: 'antithesis', type: 'challenge' },
                { from: 'antithesis', to: 'thesis', type: 'challenge' },
                { from: 'thesis', to: 'synthesis', type: 'refine' },
                { from: 'antithesis', to: 'synthesis', type: 'refine' },
            ],
            maxRounds: 4,
        },
    },
    {
        id: 'builtin.peer_review',
        name: 'Peer Review',
        description: 'Author submits, reviewers evaluate on multiple criteria, revisions allowed',
        version: '1.0.0',
        tags: ['academic', 'quality'],
        root: {
            type: 'peer_review',
            id: 'pr-main',
            authors: [{ nodeId: 'author', role: 'pro', label: 'Author' }],
            reviewers: [
                { nodeId: 'reviewer-1', role: 'neutral', label: 'Reviewer 1' },
                { nodeId: 'reviewer-2', role: 'neutral', label: 'Reviewer 2' },
            ],
            criteria: ['correctness', 'completeness', 'clarity', 'evidence'],
            minReviewsPerAuthor: 2,
            revisionRounds: 2,
            passThreshold: 0.7,
        },
    },
    {
        id: 'builtin.jury_trial',
        name: 'Jury Trial',
        description: 'Prosecution vs defense with jury deliberation and verdict',
        version: '1.0.0',
        tags: ['legal', 'adversarial'],
        root: {
            type: 'sequence',
            id: 'jt-main',
            steps: [
                {
                    stepId: 'opening',
                    primitive: {
                        type: 'debate_graph',
                        id: 'jt-opening',
                        agents: [
                            { nodeId: 'prosecution', role: 'pro', label: 'Prosecution' },
                            { nodeId: 'defense', role: 'con', label: 'Defense' },
                        ],
                        edges: [{ from: 'prosecution', to: 'defense', type: 'sequential' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'deliberation',
                    primitive: {
                        type: 'voting',
                        id: 'jt-vote',
                        voters: [
                            { nodeId: 'juror-1', role: 'neutral', label: 'Juror 1' },
                            { nodeId: 'juror-2', role: 'neutral', label: 'Juror 2' },
                            { nodeId: 'juror-3', role: 'neutral', label: 'Juror 3' },
                        ],
                        mechanism: 'simple_majority',
                        quorum: 0.67,
                        tieBreaker: 'judge',
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.constrained',
        name: 'Constrained Debate',
        description: 'Debate with enforced constraints (facts_only, data_driven, etc.)',
        version: '1.0.0',
        tags: ['disciplined', 'factual'],
        root: {
            type: 'debate_graph',
            id: 'cd-main',
            agents: [
                { nodeId: 'advocate', role: 'pro', label: 'Advocate', temperature: 0.3 },
                { nodeId: 'skeptic', role: 'con', label: 'Skeptic', temperature: 0.3 },
            ],
            edges: [
                { from: 'advocate', to: 'skeptic', type: 'sequential' },
                { from: 'skeptic', to: 'advocate', type: 'sequential' },
            ],
            maxRounds: 4,
            convergenceThreshold: 0.9,
            earlyExitConfidence: 0.95,
        },
        parameters: [
            {
                name: 'constraint',
                type: 'enum',
                default: 'facts_only',
                options: ['facts_only', 'data_driven', 'ethical_framework', 'first_principles'],
                description: 'Constraint applied to all arguments',
            },
        ],
    },
];

// ── Validation helpers ─────────────────────────────────────────────

function validatePrimitive(primitive: StrategyPrimitive, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!primitive.id || typeof primitive.id !== 'string') {
        errors.push({
            path: `${path}.id`,
            message: 'Primitive must have a string id',
            code: 'MISSING_ID',
        });
    }

    switch (primitive.type) {
        case 'sequence': {
            const seq = primitive as SequencePrimitive;
            if (!Array.isArray(seq.steps) || seq.steps.length === 0) {
                errors.push({
                    path: `${path}.steps`,
                    message: 'Sequence must have at least one step',
                    code: 'EMPTY_SEQUENCE',
                });
            } else {
                seq.steps.forEach((step, i) => {
                    if (!step.stepId) {
                        errors.push({
                            path: `${path}.steps[${i}].stepId`,
                            message: 'Step must have a stepId',
                            code: 'MISSING_STEP_ID',
                        });
                    }
                    if (!step.primitive) {
                        errors.push({
                            path: `${path}.steps[${i}].primitive`,
                            message: 'Step must have a primitive',
                            code: 'MISSING_PRIMITIVE',
                        });
                    } else {
                        errors.push(
                            ...validatePrimitive(step.primitive, `${path}.steps[${i}].primitive`),
                        );
                    }
                });
            }
            break;
        }
        case 'debate_graph': {
            const graph = primitive as DebateGraphPrimitive;
            if (!Array.isArray(graph.agents) || graph.agents.length < 2) {
                errors.push({
                    path: `${path}.agents`,
                    message: 'Debate graph must have at least 2 agents',
                    code: 'INSUFFICIENT_AGENTS',
                });
            }
            if (!Array.isArray(graph.edges) || graph.edges.length === 0) {
                errors.push({
                    path: `${path}.edges`,
                    message: 'Debate graph must have at least 1 edge',
                    code: 'EMPTY_GRAPH',
                });
            } else {
                const agentIds = new Set(graph.agents?.map((a) => a.nodeId) ?? []);
                const edgeKeys = new Set<string>();
                graph.edges.forEach((edge, i) => {
                    if (!agentIds.has(edge.from)) {
                        errors.push({
                            path: `${path}.edges[${i}].from`,
                            message: `Unknown agent: ${edge.from}`,
                            code: 'UNKNOWN_AGENT',
                        });
                    }
                    if (!agentIds.has(edge.to)) {
                        errors.push({
                            path: `${path}.edges[${i}].to`,
                            message: `Unknown agent: ${edge.to}`,
                            code: 'UNKNOWN_AGENT',
                        });
                    }
                    if (edge.from === edge.to) {
                        errors.push({
                            path: `${path}.edges[${i}]`,
                            message: 'Self-loop edge',
                            code: 'SELF_LOOP',
                        });
                    }
                    const key = `${edge.from}->${edge.to}`;
                    if (edgeKeys.has(key)) {
                        errors.push({
                            path: `${path}.edges[${i}]`,
                            message: `Duplicate edge: ${key}`,
                            code: 'DUPLICATE_EDGE',
                        });
                    }
                    edgeKeys.add(key);
                });
            }
            if (graph.maxRounds !== undefined && graph.maxRounds < 1) {
                errors.push({
                    path: `${path}.maxRounds`,
                    message: 'maxRounds must be >= 1',
                    code: 'INVALID_ROUNDS',
                });
            }
            if (
                graph.convergenceThreshold !== undefined &&
                (graph.convergenceThreshold < 0 || graph.convergenceThreshold > 1)
            ) {
                errors.push({
                    path: `${path}.convergenceThreshold`,
                    message: 'convergenceThreshold must be 0-1',
                    code: 'INVALID_THRESHOLD',
                });
            }
            break;
        }
        case 'critic_loop': {
            const loop = primitive as CriticLoopPrimitive;
            if (!loop.proponent) {
                errors.push({
                    path: `${path}.proponent`,
                    message: 'Critic loop must have a proponent',
                    code: 'MISSING_PROPONENT',
                });
            }
            if (!loop.critic) {
                errors.push({
                    path: `${path}.critic`,
                    message: 'Critic loop must have a critic',
                    code: 'MISSING_CRITIC',
                });
            }
            if (loop.maxIterations < 1 || loop.maxIterations > 20) {
                errors.push({
                    path: `${path}.maxIterations`,
                    message: 'maxIterations must be 1-20',
                    code: 'INVALID_ITERATIONS',
                });
            }
            break;
        }
        case 'voting': {
            const vote = primitive as VotingPrimitive;
            if (!Array.isArray(vote.voters) || vote.voters.length < 2) {
                errors.push({
                    path: `${path}.voters`,
                    message: 'Voting must have at least 2 voters',
                    code: 'INSUFFICIENT_VOTERS',
                });
            }
            const validMechanisms = [
                'simple_majority',
                'supermajority',
                'unanimous',
                'ranked_choice',
                'weighted',
            ];
            if (!validMechanisms.includes(vote.mechanism)) {
                errors.push({
                    path: `${path}.mechanism`,
                    message: `Invalid mechanism: ${vote.mechanism}`,
                    code: 'INVALID_MECHANISM',
                });
            }
            break;
        }
        case 'peer_review': {
            const pr = primitive as PeerReviewPrimitive;
            if (!Array.isArray(pr.authors) || pr.authors.length === 0) {
                errors.push({
                    path: `${path}.authors`,
                    message: 'Peer review must have at least 1 author',
                    code: 'MISSING_AUTHORS',
                });
            }
            if (!Array.isArray(pr.reviewers) || pr.reviewers.length === 0) {
                errors.push({
                    path: `${path}.reviewers`,
                    message: 'Peer review must have at least 1 reviewer',
                    code: 'MISSING_REVIEWERS',
                });
            }
            if (!Array.isArray(pr.criteria) || pr.criteria.length === 0) {
                errors.push({
                    path: `${path}.criteria`,
                    message: 'Peer review must have at least 1 criterion',
                    code: 'MISSING_CRITERIA',
                });
            }
            break;
        }
    }
    return errors;
}

function validateCompatibility(a: StrategyDefinition, b: StrategyDefinition): Incompatibility[] {
    const conflicts: Incompatibility[] = [];

    // Check explicit incompatibility lists
    if (a.compatibility?.incompatibleWith?.includes(b.id)) {
        conflicts.push({
            primitiveA: a.id,
            primitiveB: b.id,
            reason: `${a.name} is explicitly incompatible with ${b.name}`,
            severity: 'error',
        });
    }
    if (b.compatibility?.incompatibleWith?.includes(a.id)) {
        conflicts.push({
            primitiveA: b.id,
            primitiveB: a.id,
            reason: `${b.name} is explicitly incompatible with ${a.name}`,
            severity: 'error',
        });
    }

    // Check for competing voting mechanisms
    const getVotingPrimitives = (def: StrategyDefinition): VotingPrimitive[] => {
        const result: VotingPrimitive[] = [];
        const walk = (p: StrategyPrimitive) => {
            if (p.type === 'voting') result.push(p as VotingPrimitive);
            if (p.type === 'sequence')
                (p as SequencePrimitive).steps.forEach((s) => walk(s.primitive));
        };
        walk(def.root);
        return result;
    };

    const votesA = getVotingPrimitives(a);
    const votesB = getVotingPrimitives(b);
    if (votesA.length > 0 && votesB.length > 0) {
        conflicts.push({
            primitiveA: a.id,
            primitiveB: b.id,
            reason: 'Multiple voting mechanisms may produce conflicting results',
            severity: 'warning',
        });
    }

    return conflicts;
}

// ── Strategy Registry ──────────────────────────────────────────────

export class StrategyRegistry implements IStrategyRegistry {
    protected entries = new Map<string, StrategyRegistryEntry>();

    constructor() {
        for (const def of BUILTIN_STRATEGIES) {
            this.register(def, true);
        }
    }

    register(definition: StrategyDefinition, builtin = false): void {
        const existing = this.entries.get(definition.id);
        if (existing?.builtin) return;
        this.entries.set(definition.id, {
            definition,
            builtin,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }

    unregister(id: string): boolean {
        const entry = this.entries.get(id);
        if (entry?.builtin) return false;
        return this.entries.delete(id);
    }

    get(id: string): StrategyDefinition | undefined {
        return this.entries.get(id)?.definition;
    }

    list(): StrategyRegistryEntry[] {
        return [...this.entries.values()];
    }

    search(query: string): StrategyRegistryEntry[] {
        const q = query.toLowerCase();
        return this.list().filter(
            (e) =>
                e.definition.name.toLowerCase().includes(q) ||
                e.definition.description.toLowerCase().includes(q) ||
                e.definition.tags?.some((t) => t.toLowerCase().includes(q)),
        );
    }

    validate(definition: StrategyDefinition): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        if (!definition.id)
            errors.push({ path: 'id', message: 'Strategy must have an id', code: 'MISSING_ID' });
        if (!definition.name)
            errors.push({
                path: 'name',
                message: 'Strategy must have a name',
                code: 'MISSING_NAME',
            });
        if (!definition.root)
            errors.push({
                path: 'root',
                message: 'Strategy must have a root primitive',
                code: 'MISSING_ROOT',
            });

        if (definition.root) {
            errors.push(...validatePrimitive(definition.root, 'root'));
        }

        // Check for cycles in sequence
        const seen = new Set<string>();
        const checkCycle = (p: StrategyPrimitive): void => {
            if (seen.has(p.id)) {
                errors.push({
                    path: `root.${p.id}`,
                    message: `Cycle detected: ${p.id} appears twice`,
                    code: 'CYCLE_DETECTED',
                });
                return;
            }
            seen.add(p.id);
            if (p.type === 'sequence') {
                (p as SequencePrimitive).steps.forEach((s) => checkCycle(s.primitive));
            }
        };
        if (definition.root) checkCycle(definition.root);

        // Validate parameters
        definition.parameters?.forEach((param, i) => {
            if (!param.name)
                errors.push({
                    path: `parameters[${i}].name`,
                    message: 'Parameter must have a name',
                    code: 'MISSING_PARAM_NAME',
                });
            if (
                param.type === 'number' &&
                param.min !== undefined &&
                param.max !== undefined &&
                param.min > param.max
            ) {
                errors.push({
                    path: `parameters[${i}]`,
                    message: 'min > max',
                    code: 'INVALID_RANGE',
                });
            }
        });

        return { valid: errors.length === 0, errors, warnings };
    }

    getCompatibleStrategies(id: string): StrategyDefinition[] {
        const def = this.get(id);
        if (!def) return [];
        return this.list()
            .map((e) => e.definition)
            .filter((other) => {
                if (other.id === id) return false;
                if (def.compatibility?.incompatibleWith?.includes(other.id)) return false;
                if (other.compatibility?.incompatibleWith?.includes(def.id)) return false;
                const conflicts = validateCompatibility(def, other);
                return conflicts.filter((c) => c.severity === 'error').length === 0;
            });
    }

    resolveConflicts(a: StrategyDefinition, b: StrategyDefinition): Incompatibility[] {
        return validateCompatibility(a, b);
    }

    exportJson(id: string): string | null {
        const def = this.get(id);
        if (!def) return null;
        return JSON.stringify(def, null, 2);
    }

    importJson(json: string): {
        success: boolean;
        definition?: StrategyDefinition;
        errors?: ValidationError[];
    } {
        try {
            const def = safeJsonParse(json) as StrategyDefinition;
            const validation = this.validate(def);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }
            this.register(def, false);
            return { success: true, definition: def };
        } catch {
            return {
                success: false,
                errors: [{ path: 'json', message: 'Invalid JSON', code: 'PARSE_ERROR' }],
            };
        }
    }

    listPrimitiveTypes(): StrategyPrimitiveType[] {
        return ['sequence', 'debate_graph', 'critic_loop', 'voting', 'peer_review'];
    }

    describePrimitive(type: StrategyPrimitiveType): string {
        const descriptions: Record<StrategyPrimitiveType, string> = {
            sequence: 'Run child primitives in order. Each step completes before the next begins.',
            debate_graph:
                'Multi-agent interaction with defined edges (sequential, challenge, refine, broadcast).',
            critic_loop:
                'Iterative refinement between a proponent and critic until convergence or max iterations.',
            voting: 'Collect votes from multiple agents using a tallying mechanism.',
            peer_review: 'Authors submit work, reviewers evaluate on criteria, revisions allowed.',
        };
        return descriptions[type];
    }

    destroy(): void {
        this.entries.clear();
    }
}
