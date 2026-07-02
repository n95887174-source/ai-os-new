import type { ConsiliumType } from './unified-role';

export type TeamStrategy =
    | 'parallel'
    | 'sequential'
    | 'pipeline'
    | 'debate'
    | 'consensus'
    | 'hierarchical'
    | 'swarm'
    | 'tournament'
    | 'round-robin'
    | 'review';

export type TeamDomain =
    | 'medical'
    | 'scientific'
    | 'technical'
    | 'legal'
    | 'business'
    | 'creative'
    | 'educational'
    | 'crisis'
    | 'ethical'
    | 'financial'
    | 'investigation'
    | 'editorial'
    | 'research'
    | 'custom';

export interface TeamExecutionConfig {
    maxRounds?: number;
    consensusThreshold?: number;
    parallelTimeout?: number;
    sequentialDelay?: number;
}

export interface RoleTeam {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    consiliumType?: ConsiliumType;
    roleIds: string[];
    leaderRoleId?: string;
    coordinationStrategy: TeamStrategy;
    fallbackPlan?: string;
    metadata: {
        domain: TeamDomain;
        created: number;
        updated: number;
        author?: string;
        tags?: string[];
        version?: string;
        isBuiltin?: boolean;
        isTemplate?: boolean;
    };
    executionConfig: TeamExecutionConfig;
}

export interface TeamTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    domain: TeamDomain;
    defaultStrategy: TeamStrategy;
    recommendedRoles: string[];
    minRoles: number;
    maxRoles: number;
    useCases: string[];
    isBuiltin: boolean;
}

export const DEFAULT_TEAM_TEMPLATES: TeamTemplate[] = [
    {
        id: 'tt-medical',
        name: 'Medical Council',
        description: 'Multi-specialty medical consultation team for complex diagnoses',
        icon: '🩺',
        color: '#10b981',
        domain: 'medical',
        defaultStrategy: 'consensus',
        recommendedRoles: [
            'diagnostician',
            'surgeon',
            'pharmacologist',
            'radiologist',
            'pathologist',
        ],
        minRoles: 3,
        maxRoles: 8,
        useCases: ['Complex diagnosis', 'Treatment planning', 'Second opinion'],
        isBuiltin: true,
    },
    {
        id: 'tt-research',
        name: 'Research Lab',
        description: 'Scientific research team for hypothesis testing and analysis',
        icon: '🔬',
        color: '#3b82f6',
        domain: 'scientific',
        defaultStrategy: 'pipeline',
        recommendedRoles: [
            'principal_investigator',
            'data_scientist',
            'lab_technician',
            'literature_reviewer',
            'statistician',
        ],
        minRoles: 3,
        maxRoles: 7,
        useCases: ['Paper writing', 'Experiment design', 'Data analysis'],
        isBuiltin: true,
    },
    {
        id: 'tt-dev-team',
        name: 'Software Development Team',
        description: 'Full-stack development team with code review pipeline',
        icon: '💻',
        color: '#8b5cf6',
        domain: 'technical',
        defaultStrategy: 'pipeline',
        recommendedRoles: [
            'product_manager',
            'architect',
            'frontend_dev',
            'backend_dev',
            'qa_engineer',
            'devops',
        ],
        minRoles: 3,
        maxRoles: 10,
        useCases: ['Feature development', 'Code review', 'Architecture design'],
        isBuiltin: true,
    },
    {
        id: 'tt-crisis',
        name: 'Crisis Management Team',
        description: 'Rapid response team for crisis situations',
        icon: '🚨',
        color: '#ef4444',
        domain: 'crisis',
        defaultStrategy: 'hierarchical',
        recommendedRoles: [
            'incident_commander',
            'communications_lead',
            'technical_lead',
            'legal_advisor',
            'logistics_coordinator',
        ],
        minRoles: 3,
        maxRoles: 8,
        useCases: ['Incident response', 'Damage assessment', 'Recovery planning'],
        isBuiltin: true,
    },
    {
        id: 'tt-editorial',
        name: 'Editorial Board',
        description: 'Content creation and review pipeline',
        icon: '📝',
        color: '#f59e0b',
        domain: 'editorial',
        defaultStrategy: 'sequential',
        recommendedRoles: ['editor_in_chief', 'writer', 'fact_checker', 'copy_editor', 'publisher'],
        minRoles: 3,
        maxRoles: 7,
        useCases: ['Article writing', 'Review process', 'Publication'],
        isBuiltin: true,
    },
    {
        id: 'tt-legal',
        name: 'Legal Council',
        description: 'Legal analysis and strategy team',
        icon: '⚖️',
        color: '#6366f1',
        domain: 'legal',
        defaultStrategy: 'debate',
        recommendedRoles: [
            'senior_counsel',
            'associate',
            'paralegal',
            'expert_witness',
            'compliance_officer',
        ],
        minRoles: 2,
        maxRoles: 6,
        useCases: ['Case strategy', 'Contract review', 'Compliance audit'],
        isBuiltin: true,
    },
    {
        id: 'tt-creative',
        name: 'Creative Studio',
        description: 'Creative brainstorming and production team',
        icon: '🎨',
        color: '#ec4899',
        domain: 'creative',
        defaultStrategy: 'swarm',
        recommendedRoles: [
            'creative_director',
            'designer',
            'copywriter',
            'art_director',
            'producer',
        ],
        minRoles: 2,
        maxRoles: 6,
        useCases: ['Campaign ideation', 'Concept development', 'Creative review'],
        isBuiltin: true,
    },
    {
        id: 'tt-business',
        name: 'Strategy Board',
        description: 'Business strategy and decision-making team',
        icon: '📊',
        color: '#14b8a6',
        domain: 'business',
        defaultStrategy: 'consensus',
        recommendedRoles: ['ceo', 'cfo', 'cmo', 'coo', 'strategy_analyst'],
        minRoles: 3,
        maxRoles: 8,
        useCases: ['Strategic planning', 'Risk assessment', 'Investment decision'],
        isBuiltin: true,
    },
];

export interface IRoleTeamService {
    listTeams(): RoleTeam[];
    getTeam(id: string): RoleTeam | undefined;
    createTeam(input: Omit<RoleTeam, 'id' | 'metadata'>): RoleTeam;
    updateTeam(id: string, patch: Partial<RoleTeam>): void;
    deleteTeam(id: string): void;
    getTemplates(): TeamTemplate[];
    createFromTemplate(templateId: string, overrides?: Partial<RoleTeam>): RoleTeam;
}
