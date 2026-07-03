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

    {
        id: 'builtin.brainstorming',
        name: 'Brainstorming',
        description:
            'Open creative exchange where all ideas are accepted without criticism. Focus on quantity, then refine.',
        version: '1.0.0',
        tags: ['creative', 'divergent'],
        root: {
            type: 'debate_graph',
            id: 'bs-main',
            agents: [
                { nodeId: 'facilitator', role: 'neutral', label: 'Facilitator' },
                { nodeId: 'thinker-1', role: 'pro', label: 'Thinker 1' },
                { nodeId: 'thinker-2', role: 'con', label: 'Thinker 2' },
                { nodeId: 'thinker-3', role: 'neutral', label: 'Thinker 3' },
            ],
            edges: [
                { from: 'facilitator', to: 'thinker-1', type: 'broadcast' },
                { from: 'thinker-1', to: 'thinker-2', type: 'sequential' },
                { from: 'thinker-2', to: 'thinker-3', type: 'sequential' },
                { from: 'thinker-3', to: 'facilitator', type: 'sequential' },
            ],
            maxRounds: 3,
        },
        parameters: [
            {
                name: 'divergenceTime',
                type: 'number',
                default: 2,
                min: 1,
                max: 5,
                description: 'Rounds of pure divergence before convergence',
            },
        ],
    },
    {
        id: 'builtin.delphi',
        name: 'Delphi Method',
        description:
            'Iterative anonymous expert consensus-building with controlled feedback between rounds',
        version: '1.0.0',
        tags: ['consensus', 'anonymous', 'expert'],
        root: {
            type: 'sequence',
            id: 'delphi-main',
            steps: [
                {
                    stepId: 'round-1',
                    primitive: {
                        type: 'debate_graph',
                        id: 'delphi-r1',
                        agents: [
                            { nodeId: 'expert-1', role: 'neutral', label: 'Expert 1' },
                            { nodeId: 'expert-2', role: 'neutral', label: 'Expert 2' },
                            { nodeId: 'expert-3', role: 'neutral', label: 'Expert 3' },
                        ],
                        edges: [
                            { from: 'expert-1', to: 'expert-2', type: 'broadcast' },
                            { from: 'expert-2', to: 'expert-3', type: 'broadcast' },
                        ],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'synthesis',
                    primitive: {
                        type: 'voting',
                        id: 'delphi-vote',
                        voters: [
                            { nodeId: 'expert-1', role: 'neutral', label: 'Expert 1' },
                            { nodeId: 'expert-2', role: 'neutral', label: 'Expert 2' },
                            { nodeId: 'expert-3', role: 'neutral', label: 'Expert 3' },
                        ],
                        mechanism: 'supermajority',
                        quorum: 0.75,
                        tieBreaker: 'judge',
                    },
                },
                {
                    stepId: 'round-2',
                    primitive: {
                        type: 'debate_graph',
                        id: 'delphi-r2',
                        agents: [
                            { nodeId: 'expert-1', role: 'neutral', label: 'Expert 1' },
                            { nodeId: 'expert-2', role: 'neutral', label: 'Expert 2' },
                            { nodeId: 'expert-3', role: 'neutral', label: 'Expert 3' },
                        ],
                        edges: [
                            { from: 'expert-1', to: 'expert-2', type: 'broadcast' },
                            { from: 'expert-2', to: 'expert-3', type: 'broadcast' },
                        ],
                        maxRounds: 1,
                    },
                },
            ],
        },
        parameters: [
            {
                name: 'maxRounds',
                type: 'number',
                default: 3,
                min: 2,
                max: 6,
                description: 'Number of Delphi rounds',
            },
        ],
    },
    {
        id: 'builtin.debate_athon',
        name: 'Debate-athon',
        description:
            'Extended marathon debate with stamina tracking, fatigue penalties, and endurance scoring',
        version: '1.0.0',
        tags: ['endurance', 'marathon', 'intensive'],
        root: {
            type: 'debate_graph',
            id: 'da-main',
            agents: [
                { nodeId: 'proponent', role: 'pro', label: 'Proponent' },
                { nodeId: 'opponent', role: 'con', label: 'Opponent' },
                { nodeId: 'moderator', role: 'neutral', label: 'Moderator' },
            ],
            edges: [
                { from: 'proponent', to: 'opponent', type: 'sequential' },
                { from: 'opponent', to: 'proponent', type: 'sequential' },
                { from: 'moderator', to: 'proponent', type: 'broadcast' },
                { from: 'moderator', to: 'opponent', type: 'broadcast' },
            ],
            maxRounds: 10,
        },
        parameters: [
            {
                name: 'staminaDecay',
                type: 'number',
                default: 0.1,
                min: 0,
                max: 0.5,
                description: 'Quality penalty per round',
            },
        ],
    },
    {
        id: 'builtin.meta_debate',
        name: 'Meta-Debate',
        description: 'Debate about the debate itself — format, rules, assumptions, and process',
        version: '1.0.0',
        tags: ['reflective', 'process', 'methodological'],
        root: {
            type: 'sequence',
            id: 'md-main',
            steps: [
                {
                    stepId: 'format-discussion',
                    primitive: {
                        type: 'debate_graph',
                        id: 'md-format',
                        agents: [
                            { nodeId: 'format-advocate', role: 'pro', label: 'Format Advocate' },
                            { nodeId: 'format-critic', role: 'con', label: 'Format Critic' },
                        ],
                        edges: [
                            { from: 'format-advocate', to: 'format-critic', type: 'challenge' },
                        ],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'assumption-audit',
                    primitive: {
                        type: 'critic_loop',
                        id: 'md-assumptions',
                        proponent: { nodeId: 'claimer', role: 'pro', label: 'Claimant' },
                        critic: { nodeId: 'auditor', role: 'con', label: 'Assumption Auditor' },
                        maxIterations: 4,
                        stopWhen: 'no_improvement',
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.autopsy',
        name: 'Autopsy',
        description:
            'Post-mortem analysis of a past event, decision, or failure to extract lessons',
        version: '1.0.0',
        tags: ['retrospective', 'analysis', 'learning'],
        root: {
            type: 'sequence',
            id: 'autopsy-main',
            steps: [
                {
                    stepId: 'timeline',
                    primitive: {
                        type: 'debate_graph',
                        id: 'autopsy-timeline',
                        agents: [
                            { nodeId: 'historian', role: 'neutral', label: 'Historian' },
                            { nodeId: 'analyst', role: 'neutral', label: 'Analyst' },
                        ],
                        edges: [{ from: 'historian', to: 'analyst', type: 'refine' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'root-cause',
                    primitive: {
                        type: 'debate_graph',
                        id: 'autopsy-root',
                        agents: [
                            { nodeId: 'investigator', role: 'pro', label: 'Investigator' },
                            { nodeId: 'skeptic', role: 'con', label: 'Skeptic' },
                        ],
                        edges: [
                            { from: 'investigator', to: 'skeptic', type: 'challenge' },
                            { from: 'skeptic', to: 'investigator', type: 'challenge' },
                        ],
                        maxRounds: 3,
                    },
                },
                {
                    stepId: 'recommendations',
                    primitive: {
                        type: 'voting',
                        id: 'autopsy-vote',
                        voters: [
                            { nodeId: 'historian', role: 'neutral', label: 'Historian' },
                            { nodeId: 'analyst', role: 'neutral', label: 'Analyst' },
                            { nodeId: 'investigator', role: 'neutral', label: 'Investigator' },
                        ],
                        mechanism: 'simple_majority',
                        quorum: 0.67,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.simulated_negotiation',
        name: 'Simulated Negotiation',
        description:
            'Multi-party negotiation where agents represent different interests and seek mutual agreement',
        version: '1.0.0',
        tags: ['negotiation', 'multi-party', 'compromise'],
        root: {
            type: 'debate_graph',
            id: 'neg-main',
            agents: [
                { nodeId: 'party-a', role: 'pro', label: 'Party A' },
                { nodeId: 'party-b', role: 'con', label: 'Party B' },
                { nodeId: 'mediator', role: 'neutral', label: 'Mediator' },
            ],
            edges: [
                { from: 'party-a', to: 'party-b', type: 'sequential' },
                { from: 'party-b', to: 'party-a', type: 'sequential' },
                { from: 'mediator', to: 'party-a', type: 'broadcast' },
                { from: 'mediator', to: 'party-b', type: 'broadcast' },
            ],
            maxRounds: 6,
            convergenceThreshold: 0.8,
        },
        parameters: [
            {
                name: 'dealSpace',
                type: 'enum',
                default: 'distributive',
                options: ['distributive', 'integrative', 'mixed'],
                description: 'Type of negotiation',
            },
        ],
    },
    {
        id: 'builtin.premortem',
        name: 'Premortem',
        description:
            'Imagine a project has failed spectacularly. Work backwards to identify what went wrong before it starts.',
        version: '1.0.0',
        tags: ['prospective', 'risk', 'prevention'],
        root: {
            type: 'debate_graph',
            id: 'pm-main',
            agents: [
                { nodeId: 'optimist', role: 'pro', label: 'Optimist' },
                { nodeId: 'pessimist', role: 'con', label: 'Pessimist' },
                { nodeId: 'facilitator', role: 'neutral', label: 'Facilitator' },
            ],
            edges: [
                { from: 'facilitator', to: 'optimist', type: 'broadcast' },
                { from: 'facilitator', to: 'pessimist', type: 'broadcast' },
                { from: 'pessimist', to: 'optimist', type: 'challenge' },
                { from: 'optimist', to: 'pessimist', type: 'refine' },
            ],
            maxRounds: 3,
        },
    },
    {
        id: 'builtin.red_teaming',
        name: 'Red Teaming',
        description:
            'Adversarial attack simulation where one team tries to break a proposal or system',
        version: '1.0.0',
        tags: ['adversarial', 'security', 'stress-test'],
        root: {
            type: 'debate_graph',
            id: 'rt-main',
            agents: [
                { nodeId: 'defender', role: 'pro', label: 'Defender' },
                { nodeId: 'attacker', role: 'con', label: 'Attacker' },
            ],
            edges: [
                { from: 'attacker', to: 'defender', type: 'challenge' },
                { from: 'defender', to: 'attacker', type: 'refine' },
            ],
            maxRounds: 5,
        },
        parameters: [
            {
                name: 'attackSurface',
                type: 'enum',
                default: 'comprehensive',
                options: ['security', 'logic', 'ethics', 'comprehensive'],
                description: 'Focus of red team attacks',
            },
        ],
    },
    {
        id: 'builtin.rhetorical_triangle',
        name: 'Rhetorical Triangle',
        description:
            'Evaluate arguments through ethos (credibility), pathos (emotion), and logos (logic)',
        version: '1.0.0',
        tags: ['rhetoric', 'persuasion', 'evaluation'],
        root: {
            type: 'sequence',
            id: 'rtri-main',
            steps: [
                {
                    stepId: 'logos',
                    primitive: {
                        type: 'debate_graph',
                        id: 'rtri-logos',
                        agents: [
                            { nodeId: 'logician', role: 'pro', label: 'Logician' },
                            { nodeId: 'critic', role: 'con', label: 'Logic Critic' },
                        ],
                        edges: [{ from: 'logician', to: 'critic', type: 'challenge' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'ethos',
                    primitive: {
                        type: 'debate_graph',
                        id: 'rtri-ethos',
                        agents: [
                            { nodeId: 'ethicist', role: 'pro', label: 'Ethicist' },
                            { nodeId: 'skeptic', role: 'con', label: 'Ethos Skeptic' },
                        ],
                        edges: [{ from: 'ethicist', to: 'skeptic', type: 'challenge' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'pathos',
                    primitive: {
                        type: 'debate_graph',
                        id: 'rtri-pathos',
                        agents: [
                            { nodeId: 'empath', role: 'pro', label: 'Empath' },
                            { nodeId: 'realist', role: 'con', label: 'Realist' },
                        ],
                        edges: [{ from: 'empath', to: 'realist', type: 'challenge' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'verdict',
                    primitive: {
                        type: 'voting',
                        id: 'rtri-vote',
                        voters: [
                            { nodeId: 'logician', role: 'neutral', label: 'Logician' },
                            { nodeId: 'ethicist', role: 'neutral', label: 'Ethicist' },
                            { nodeId: 'empath', role: 'neutral', label: 'Empath' },
                        ],
                        mechanism: 'weighted',
                        quorum: 0.67,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.evidence_based_policy',
        name: 'Evidence-Based Policy',
        description:
            'Policy proposal backed by evidence requirements, data citations, and impact assessment',
        version: '1.0.0',
        tags: ['policy', 'evidence', 'data-driven'],
        root: {
            type: 'sequence',
            id: 'ebp-main',
            steps: [
                {
                    stepId: 'proposal',
                    primitive: {
                        type: 'debate_graph',
                        id: 'ebp-proposal',
                        agents: [
                            { nodeId: 'proponent', role: 'pro', label: 'Proponent' },
                            { nodeId: 'evidencer', role: 'neutral', label: 'Evidence Checker' },
                        ],
                        edges: [{ from: 'proponent', to: 'evidencer', type: 'sequential' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'impact',
                    primitive: {
                        type: 'peer_review',
                        id: 'ebp-review',
                        authors: [{ nodeId: 'proponent', role: 'pro', label: 'Proponent' }],
                        reviewers: [
                            { nodeId: 'reviewer-1', role: 'neutral', label: 'Impact Reviewer' },
                            { nodeId: 'reviewer-2', role: 'neutral', label: 'Data Reviewer' },
                        ],
                        criteria: ['correctness', 'completeness', 'feasibility'],
                        minReviewsPerAuthor: 2,
                        revisionRounds: 1,
                        passThreshold: 0.7,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.principle_based_negotiation',
        name: 'Principle-Based Negotiation',
        description:
            'Harvard-style interest-based negotiation focusing on interests, not positions',
        version: '1.0.0',
        tags: ['negotiation', 'principled', 'interests'],
        root: {
            type: 'debate_graph',
            id: 'pbn-main',
            agents: [
                { nodeId: 'party-a', role: 'pro', label: 'Party A' },
                { nodeId: 'party-b', role: 'con', label: 'Party B' },
            ],
            edges: [
                { from: 'party-a', to: 'party-b', type: 'sequential' },
                { from: 'party-b', to: 'party-a', type: 'sequential' },
            ],
            maxRounds: 5,
            convergenceThreshold: 0.9,
        },
        parameters: [
            {
                name: 'focus',
                type: 'enum',
                default: 'interests',
                options: ['interests', 'options', 'legitimacy', 'alternatives', 'communication'],
                description: 'Negotiation focus area',
            },
        ],
    },
    {
        id: 'builtin.uncertainty_quantification',
        name: 'Uncertainty Quantification',
        description:
            'Agents express confidence levels and uncertainty in their claims, promoting intellectual humility',
        version: '1.0.0',
        tags: ['uncertainty', 'confidence', 'epistemic'],
        root: {
            type: 'debate_graph',
            id: 'uq-main',
            agents: [
                { nodeId: 'forecaster', role: 'pro', label: 'Forecaster' },
                { nodeId: 'skeptic', role: 'con', label: 'Skeptic' },
                { nodeId: 'evaluator', role: 'neutral', label: 'Uncertainty Evaluator' },
            ],
            edges: [
                { from: 'forecaster', to: 'skeptic', type: 'sequential' },
                { from: 'skeptic', to: 'forecaster', type: 'sequential' },
                { from: 'evaluator', to: 'forecaster', type: 'broadcast' },
                { from: 'evaluator', to: 'skeptic', type: 'broadcast' },
            ],
            maxRounds: 3,
        },
    },
    {
        id: 'builtin.multi_criteria',
        name: 'Multi-Criteria Analysis',
        description: 'Evaluate options across multiple weighted criteria with trade-off analysis',
        version: '1.0.0',
        tags: ['decision', 'criteria', 'weighted'],
        root: {
            type: 'sequence',
            id: 'mca-main',
            steps: [
                {
                    stepId: 'criteria-definition',
                    primitive: {
                        type: 'debate_graph',
                        id: 'mca-criteria',
                        agents: [
                            { nodeId: 'analyst', role: 'neutral', label: 'Analyst' },
                            { nodeId: 'stakeholder', role: 'neutral', label: 'Stakeholder' },
                        ],
                        edges: [{ from: 'analyst', to: 'stakeholder', type: 'refine' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'evaluation',
                    primitive: {
                        type: 'voting',
                        id: 'mca-vote',
                        voters: [
                            { nodeId: 'analyst', role: 'neutral', label: 'Analyst' },
                            { nodeId: 'stakeholder', role: 'neutral', label: 'Stakeholder' },
                        ],
                        mechanism: 'weighted',
                        quorum: 1,
                    },
                },
            ],
        },
        parameters: [
            {
                name: 'criteriaCount',
                type: 'number',
                default: 4,
                min: 2,
                max: 8,
                description: 'Number of evaluation criteria',
            },
        ],
    },
    {
        id: 'builtin.stakeholder_mapping',
        name: 'Stakeholder Mapping',
        description:
            'Represent diverse stakeholder perspectives (customers, regulators, employees, investors)',
        version: '1.0.0',
        tags: ['stakeholder', 'multi-perspective', 'inclusive'],
        root: {
            type: 'debate_graph',
            id: 'sm-main',
            agents: [
                { nodeId: 'customer', role: 'pro', label: 'Customer' },
                { nodeId: 'regulator', role: 'con', label: 'Regulator' },
                { nodeId: 'employee', role: 'neutral', label: 'Employee' },
                { nodeId: 'investor', role: 'neutral', label: 'Investor' },
            ],
            edges: [
                { from: 'customer', to: 'regulator', type: 'sequential' },
                { from: 'regulator', to: 'employee', type: 'sequential' },
                { from: 'employee', to: 'investor', type: 'sequential' },
                { from: 'investor', to: 'customer', type: 'sequential' },
            ],
            maxRounds: 4,
        },
    },
    {
        id: 'builtin.cross_examination',
        name: 'Cross-Examination',
        description:
            'Direct questioning format where one agent interrogates another about their claims',
        version: '1.0.0',
        tags: ['examination', 'interrogation', 'fact-finding'],
        root: {
            type: 'critic_loop',
            id: 'ce-main',
            proponent: { nodeId: 'witness', role: 'pro', label: 'Witness' },
            critic: { nodeId: 'examiner', role: 'con', label: 'Examiner' },
            maxIterations: 8,
            stopWhen: 'agreement',
        },
    },
    {
        id: 'builtin.trial',
        name: 'Trial',
        description:
            'Full adversarial trial with opening statements, witness examination, closing arguments, and jury verdict',
        version: '1.0.0',
        tags: ['legal', 'adversarial', 'formal'],
        root: {
            type: 'sequence',
            id: 'trial-main',
            steps: [
                {
                    stepId: 'opening',
                    primitive: {
                        type: 'debate_graph',
                        id: 'trial-opening',
                        agents: [
                            { nodeId: 'prosecution', role: 'pro', label: 'Prosecution' },
                            { nodeId: 'defense', role: 'con', label: 'Defense' },
                        ],
                        edges: [{ from: 'prosecution', to: 'defense', type: 'sequential' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'examination',
                    primitive: {
                        type: 'debate_graph',
                        id: 'trial-exam',
                        agents: [
                            { nodeId: 'prosecution', role: 'pro', label: 'Prosecution' },
                            { nodeId: 'defense', role: 'con', label: 'Defense' },
                            { nodeId: 'witness', role: 'neutral', label: 'Witness' },
                        ],
                        edges: [
                            { from: 'prosecution', to: 'witness', type: 'sequential' },
                            { from: 'witness', to: 'prosecution', type: 'sequential' },
                            { from: 'defense', to: 'witness', type: 'sequential' },
                            { from: 'witness', to: 'defense', type: 'sequential' },
                        ],
                        maxRounds: 3,
                    },
                },
                {
                    stepId: 'closing',
                    primitive: {
                        type: 'debate_graph',
                        id: 'trial-closing',
                        agents: [
                            { nodeId: 'prosecution', role: 'pro', label: 'Prosecution' },
                            { nodeId: 'defense', role: 'con', label: 'Defense' },
                        ],
                        edges: [{ from: 'prosecution', to: 'defense', type: 'sequential' }],
                        maxRounds: 1,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.parliamentary',
        name: 'Parliamentary Debate',
        description:
            'Formal debate following parliamentary procedure with government and opposition benches',
        version: '1.0.0',
        tags: ['formal', 'parliamentary', 'structured'],
        root: {
            type: 'sequence',
            id: 'parl-main',
            steps: [
                {
                    stepId: 'government-case',
                    primitive: {
                        type: 'debate_graph',
                        id: 'parl-gov',
                        agents: [
                            { nodeId: 'pm', role: 'pro', label: 'Prime Minister' },
                            { nodeId: 'deputy', role: 'pro', label: 'Deputy' },
                            { nodeId: 'speaker', role: 'neutral', label: 'Speaker' },
                        ],
                        edges: [
                            { from: 'pm', to: 'deputy', type: 'sequential' },
                            { from: 'speaker', to: 'pm', type: 'broadcast' },
                        ],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'opposition-rebuttal',
                    primitive: {
                        type: 'debate_graph',
                        id: 'parl-opp',
                        agents: [
                            { nodeId: 'leader-opp', role: 'con', label: 'Opposition Leader' },
                            { nodeId: 'deputy-opp', role: 'con', label: 'Opposition Deputy' },
                        ],
                        edges: [{ from: 'leader-opp', to: 'deputy-opp', type: 'sequential' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'floor-debate',
                    primitive: {
                        type: 'debate_graph',
                        id: 'parl-floor',
                        agents: [
                            { nodeId: 'pm', role: 'pro', label: 'Prime Minister' },
                            { nodeId: 'leader-opp', role: 'con', label: 'Opposition Leader' },
                        ],
                        edges: [
                            { from: 'pm', to: 'leader-opp', type: 'challenge' },
                            { from: 'leader-opp', to: 'pm', type: 'challenge' },
                        ],
                        maxRounds: 3,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.oxford_union',
        name: 'Oxford Union',
        description:
            'Classic Oxford Union debate format with proposition, opposition, floor contributions, and vote',
        version: '1.0.0',
        tags: ['formal', 'oxford', 'traditional'],
        root: {
            type: 'sequence',
            id: 'oxford-main',
            steps: [
                {
                    stepId: 'proposition',
                    primitive: {
                        type: 'debate_graph',
                        id: 'oxford-prop',
                        agents: [
                            { nodeId: 'proposer-1', role: 'pro', label: 'Proposer 1' },
                            { nodeId: 'proposer-2', role: 'pro', label: 'Proposer 2' },
                        ],
                        edges: [{ from: 'proposer-1', to: 'proposer-2', type: 'sequential' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'opposition',
                    primitive: {
                        type: 'debate_graph',
                        id: 'oxford-opp',
                        agents: [
                            { nodeId: 'opposer-1', role: 'con', label: 'Opposer 1' },
                            { nodeId: 'opposer-2', role: 'con', label: 'Opposer 2' },
                        ],
                        edges: [{ from: 'opposer-1', to: 'opposer-2', type: 'sequential' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'floor',
                    primitive: {
                        type: 'debate_graph',
                        id: 'oxford-floor',
                        agents: [
                            { nodeId: 'proposer-1', role: 'pro', label: 'Proposer 1' },
                            { nodeId: 'opposer-1', role: 'con', label: 'Opposer 1' },
                            { nodeId: 'member-1', role: 'neutral', label: 'Floor Member 1' },
                            { nodeId: 'member-2', role: 'neutral', label: 'Floor Member 2' },
                        ],
                        edges: [
                            { from: 'proposer-1', to: 'opposer-1', type: 'sequential' },
                            { from: 'opposer-1', to: 'member-1', type: 'sequential' },
                            { from: 'member-1', to: 'member-2', type: 'sequential' },
                        ],
                        maxRounds: 2,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.lincoln_douglas',
        name: 'Lincoln-Douglas',
        description: 'Values-based 1-on-1 debate focused on moral and philosophical propositions',
        version: '1.0.0',
        tags: ['values', 'philosophical', '1v1'],
        root: {
            type: 'sequence',
            id: 'ld-main',
            steps: [
                {
                    stepId: 'affirmative-constructive',
                    primitive: {
                        type: 'debate_graph',
                        id: 'ld-ac',
                        agents: [
                            { nodeId: 'affirmative', role: 'pro', label: 'Affirmative' },
                            { nodeId: 'negative', role: 'con', label: 'Negative' },
                        ],
                        edges: [{ from: 'affirmative', to: 'negative', type: 'sequential' }],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'cross-examination',
                    primitive: {
                        type: 'critic_loop',
                        id: 'ld-cross',
                        proponent: { nodeId: 'affirmative', role: 'pro', label: 'Affirmative' },
                        critic: { nodeId: 'negative', role: 'con', label: 'Negative' },
                        maxIterations: 3,
                        stopWhen: 'agreement',
                    },
                },
                {
                    stepId: 'rebuttal',
                    primitive: {
                        type: 'debate_graph',
                        id: 'ld-rebuttal',
                        agents: [
                            { nodeId: 'affirmative', role: 'pro', label: 'Affirmative' },
                            { nodeId: 'negative', role: 'con', label: 'Negative' },
                        ],
                        edges: [
                            { from: 'negative', to: 'affirmative', type: 'challenge' },
                            { from: 'affirmative', to: 'negative', type: 'refine' },
                        ],
                        maxRounds: 2,
                    },
                },
            ],
        },
        parameters: [
            {
                name: 'valueFramework',
                type: 'enum',
                default: 'deontology',
                options: ['deontology', 'utilitarianism', 'virtue_ethics', 'contractarianism'],
                description: 'Ethical framework for values',
            },
        ],
    },
    {
        id: 'builtin.spontaneous_argumentation',
        name: 'Spontaneous Argumentation',
        description: 'Impromptu debate on an unprepared topic with limited preparation time',
        version: '1.0.0',
        tags: ['impromptu', 'spontaneous', 'improvisation'],
        root: {
            type: 'debate_graph',
            id: 'sa-main',
            agents: [
                { nodeId: 'speaker-1', role: 'pro', label: 'Speaker 1' },
                { nodeId: 'speaker-2', role: 'con', label: 'Speaker 2' },
            ],
            edges: [
                { from: 'speaker-1', to: 'speaker-2', type: 'sequential' },
                { from: 'speaker-2', to: 'speaker-1', type: 'sequential' },
            ],
            maxRounds: 3,
        },
        parameters: [
            {
                name: 'prepTimeMinutes',
                type: 'number',
                default: 2,
                min: 0,
                max: 10,
                description: 'Preparation time before debate',
            },
        ],
    },
    {
        id: 'builtin.asynchronous_marathon',
        name: 'Asynchronous Marathon',
        description:
            'Extended timeline debate with staggered responses, allowing deep research between turns',
        version: '1.0.0',
        tags: ['async', 'extended', 'deep'],
        root: {
            type: 'debate_graph',
            id: 'am-main',
            agents: [
                { nodeId: 'researcher-1', role: 'pro', label: 'Researcher 1' },
                { nodeId: 'researcher-2', role: 'con', label: 'Researcher 2' },
                { nodeId: 'moderator', role: 'neutral', label: 'Moderator' },
            ],
            edges: [
                { from: 'moderator', to: 'researcher-1', type: 'broadcast' },
                { from: 'researcher-1', to: 'researcher-2', type: 'sequential' },
                { from: 'researcher-2', to: 'researcher-1', type: 'sequential' },
            ],
            maxRounds: 8,
            convergenceThreshold: 0.85,
        },
        parameters: [
            {
                name: 'hoursPerTurn',
                type: 'number',
                default: 24,
                min: 1,
                max: 168,
                description: 'Hours allowed per turn',
            },
        ],
    },
    {
        id: 'builtin.flash_debate',
        name: 'Flash Debate',
        description:
            'Ultra-short time-pressured debate with single short responses and rapid-fire exchange',
        version: '1.0.0',
        tags: ['fast', 'short', 'intense'],
        root: {
            type: 'debate_graph',
            id: 'fd-main',
            agents: [
                { nodeId: 'flash-pro', role: 'pro', label: 'Flash Pro' },
                { nodeId: 'flash-con', role: 'con', label: 'Flash Con' },
            ],
            edges: [
                { from: 'flash-pro', to: 'flash-con', type: 'sequential' },
                { from: 'flash-con', to: 'flash-pro', type: 'sequential' },
            ],
            maxRounds: 2,
        },
        parameters: [
            {
                name: 'responseSeconds',
                type: 'number',
                default: 30,
                min: 10,
                max: 120,
                description: 'Max response time in seconds',
            },
            {
                name: 'maxWordsPerResponse',
                type: 'number',
                default: 50,
                min: 10,
                max: 200,
                description: 'Max words per response',
            },
        ],
    },
    {
        id: 'builtin.collaborative_consensus',
        name: 'Collaborative Consensus',
        description:
            'All agents work together toward a shared agreement, building on each others ideas',
        version: '1.0.0',
        tags: ['collaborative', 'consensus', 'cooperative'],
        root: {
            type: 'debate_graph',
            id: 'cc-main',
            agents: [
                { nodeId: 'builder-1', role: 'pro', label: 'Builder 1' },
                { nodeId: 'builder-2', role: 'con', label: 'Builder 2' },
                { nodeId: 'builder-3', role: 'neutral', label: 'Builder 3' },
                { nodeId: 'synthesizer', role: 'neutral', label: 'Synthesizer' },
            ],
            edges: [
                { from: 'builder-1', to: 'builder-2', type: 'refine' },
                { from: 'builder-2', to: 'builder-3', type: 'refine' },
                { from: 'builder-3', to: 'synthesizer', type: 'refine' },
                { from: 'synthesizer', to: 'builder-1', type: 'broadcast' },
            ],
            maxRounds: 5,
            convergenceThreshold: 0.9,
        },
    },
    {
        id: 'builtin.scenario_testing',
        name: 'Scenario Testing',
        description:
            'Test a plan or decision against multiple future scenarios (best case, worst case, most likely)',
        version: '1.0.0',
        tags: ['scenario', 'testing', 'planning'],
        root: {
            type: 'sequence',
            id: 'st-main',
            steps: [
                {
                    stepId: 'best-case',
                    primitive: {
                        type: 'debate_graph',
                        id: 'st-best',
                        agents: [
                            { nodeId: 'optimist', role: 'pro', label: 'Optimist' },
                            { nodeId: 'validator', role: 'neutral', label: 'Validator' },
                        ],
                        edges: [{ from: 'optimist', to: 'validator', type: 'refine' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'worst-case',
                    primitive: {
                        type: 'debate_graph',
                        id: 'st-worst',
                        agents: [
                            { nodeId: 'pessimist', role: 'con', label: 'Pessimist' },
                            { nodeId: 'validator', role: 'neutral', label: 'Validator' },
                        ],
                        edges: [{ from: 'pessimist', to: 'validator', type: 'refine' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'most-likely',
                    primitive: {
                        type: 'debate_graph',
                        id: 'st-likely',
                        agents: [
                            { nodeId: 'realist', role: 'neutral', label: 'Realist' },
                            { nodeId: 'validator', role: 'neutral', label: 'Validator' },
                        ],
                        edges: [{ from: 'realist', to: 'validator', type: 'refine' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'synthesis',
                    primitive: {
                        type: 'voting',
                        id: 'st-vote',
                        voters: [
                            { nodeId: 'optimist', role: 'neutral', label: 'Optimist' },
                            { nodeId: 'pessimist', role: 'neutral', label: 'Pessimist' },
                            { nodeId: 'realist', role: 'neutral', label: 'Realist' },
                        ],
                        mechanism: 'weighted',
                        quorum: 0.67,
                    },
                },
            ],
        },
    },
    {
        id: 'builtin.hypothesis_testing',
        name: 'Hypothesis Testing',
        description:
            'Scientific method applied to claims: hypothesis, prediction, experiment, analysis, conclusion',
        version: '1.0.0',
        tags: ['scientific', 'hypothesis', 'rigorous'],
        root: {
            type: 'sequence',
            id: 'ht-main',
            steps: [
                {
                    stepId: 'hypothesis',
                    primitive: {
                        type: 'debate_graph',
                        id: 'ht-hyp',
                        agents: [
                            { nodeId: 'scientist', role: 'pro', label: 'Scientist' },
                            { nodeId: 'peer', role: 'con', label: 'Peer Reviewer' },
                        ],
                        edges: [{ from: 'scientist', to: 'peer', type: 'sequential' }],
                        maxRounds: 2,
                    },
                },
                {
                    stepId: 'evidence',
                    primitive: {
                        type: 'debate_graph',
                        id: 'ht-evidence',
                        agents: [
                            { nodeId: 'scientist', role: 'pro', label: 'Scientist' },
                            { nodeId: 'skeptic', role: 'con', label: 'Skeptic' },
                        ],
                        edges: [
                            { from: 'scientist', to: 'skeptic', type: 'sequential' },
                            { from: 'skeptic', to: 'scientist', type: 'challenge' },
                        ],
                        maxRounds: 3,
                    },
                },
                {
                    stepId: 'conclusion',
                    primitive: {
                        type: 'voting',
                        id: 'ht-vote',
                        voters: [
                            { nodeId: 'scientist', role: 'neutral', label: 'Scientist' },
                            { nodeId: 'peer', role: 'neutral', label: 'Peer Reviewer' },
                            { nodeId: 'skeptic', role: 'neutral', label: 'Skeptic' },
                        ],
                        mechanism: 'simple_majority',
                        quorum: 0.67,
                    },
                },
            ],
        },
        parameters: [
            {
                name: 'significanceLevel',
                type: 'number',
                default: 0.05,
                min: 0.01,
                max: 0.1,
                description: 'Statistical significance threshold',
            },
        ],
    },
    {
        id: 'builtin.contest_mode',
        name: 'Contest Mode',
        description:
            'Competitive judging format where multiple agents present and a panel scores them on criteria',
        version: '1.0.0',
        tags: ['competitive', 'judging', 'scored'],
        root: {
            type: 'sequence',
            id: 'cm-main',
            steps: [
                {
                    stepId: 'presentations',
                    primitive: {
                        type: 'debate_graph',
                        id: 'cm-present',
                        agents: [
                            { nodeId: 'contestant-1', role: 'pro', label: 'Contestant 1' },
                            { nodeId: 'contestant-2', role: 'con', label: 'Contestant 2' },
                            { nodeId: 'contestant-3', role: 'neutral', label: 'Contestant 3' },
                        ],
                        edges: [
                            { from: 'contestant-1', to: 'contestant-2', type: 'sequential' },
                            { from: 'contestant-2', to: 'contestant-3', type: 'sequential' },
                        ],
                        maxRounds: 1,
                    },
                },
                {
                    stepId: 'judging',
                    primitive: {
                        type: 'voting',
                        id: 'cm-judge',
                        voters: [
                            { nodeId: 'judge-1', role: 'neutral', label: 'Judge 1' },
                            { nodeId: 'judge-2', role: 'neutral', label: 'Judge 2' },
                            { nodeId: 'judge-3', role: 'neutral', label: 'Judge 3' },
                        ],
                        mechanism: 'ranked_choice',
                        quorum: 1,
                    },
                },
            ],
        },
        parameters: [
            {
                name: 'criteria',
                type: 'enum',
                default: 'all',
                options: ['persuasiveness', 'evidence', 'clarity', 'creativity', 'all'],
                description: 'Judging criteria focus',
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
