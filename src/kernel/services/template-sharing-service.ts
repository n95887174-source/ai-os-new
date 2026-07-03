import type {
    ITemplateSharingService,
    SharedTemplate,
    TemplateCategory,
} from '../contracts/template-sharing';

const genId = () => crypto.randomUUID();

const SHARED_TEMPLATES: SharedTemplate[] = [
    {
        id: genId(),
        name: 'Research Debate',
        description: 'Structured debate for evaluating research papers',
        category: 'debate',
        author: 'Research Team',
        content: 'TOPIC: {{topic}}\nROUNDS: 3\nSTRATEGY: socratic',
        downloads: 340,
        tags: ['research', 'academic', 'peer-review'],
        createdAt: Date.now() - 86400000 * 14,
        imported: false,
    },
    {
        id: genId(),
        name: 'Code Review Pipeline',
        description: 'Multi-step workflow for automated code review',
        category: 'workflow',
        author: 'DevOps',
        content: 'STEPS:\n  - lint\n  - test\n  - security-scan\n  - review',
        downloads: 890,
        tags: ['code', 'review', 'pipeline'],
        createdAt: Date.now() - 86400000 * 10,
        imported: false,
    },
    {
        id: genId(),
        name: 'Multi-Agent Topology',
        description: 'DAG topology with 8 agents and consensus layer',
        category: 'topology',
        author: 'Core',
        content: 'NODES:\n  - router\n  - agent:4\n  - aggregator\n  - judge',
        downloads: 210,
        tags: ['topology', 'agents', 'dag'],
        createdAt: Date.now() - 86400000 * 7,
        imported: false,
    },
    {
        id: genId(),
        name: 'System Prompt Starter',
        description: 'Base prompt template for system instructions',
        category: 'prompt',
        author: 'Community',
        content: 'You are {{role}}. Your task is to {{task}}.',
        downloads: 1500,
        tags: ['prompt', 'starter', 'system'],
        createdAt: Date.now() - 86400000 * 5,
        imported: false,
    },
    {
        id: genId(),
        name: 'Debate Moderator Agent',
        description: 'Neutral moderator for structured debates',
        category: 'agent',
        author: 'Debate Team',
        content: 'ROLE: moderator\nGOAL: ensure fair turn-taking\nCONSTRAINTS: no bias, time-boxed',
        downloads: 670,
        tags: ['agent', 'moderator', 'debate'],
        createdAt: Date.now() - 86400000 * 3,
        imported: false,
    },
    {
        id: genId(),
        name: 'Socratic Seminar',
        description: 'Socratic method debate template with 5 rounds',
        category: 'debate',
        author: 'Socratic Labs',
        content: 'METHOD: socratic\nROUNDS: 5\nPARTICIPANTS: 3',
        downloads: 430,
        tags: ['socratic', 'debate', 'deep'],
        createdAt: Date.now() - 86400000,
        imported: false,
    },
];

export class TemplateSharingService implements ITemplateSharingService {
    private templates: SharedTemplate[] = SHARED_TEMPLATES.map((t) => ({ ...t }));

    getSharedTemplates(category?: TemplateCategory): SharedTemplate[] {
        let result = this.templates;
        if (category) result = result.filter((t) => t.category === category);
        return result.map((t) => ({ ...t }));
    }

    search(query: string): SharedTemplate[] {
        const q = query.toLowerCase();
        return this.templates
            .filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q) ||
                    t.tags.some((tag) => tag.includes(q)),
            )
            .map((t) => ({ ...t }));
    }

    importTemplate(id: string): void {
        const t = this.templates.find((tmpl) => tmpl.id === id);
        if (t) t.imported = true;
    }

    exportTemplate(
        data: Omit<SharedTemplate, 'id' | 'createdAt' | 'imported' | 'downloads'>,
    ): SharedTemplate {
        const t: SharedTemplate = {
            ...data,
            id: genId(),
            downloads: 0,
            createdAt: Date.now(),
            imported: true,
        };
        this.templates.push(t);
        return { ...t };
    }

    getImported(): SharedTemplate[] {
        return this.templates.filter((t) => t.imported).map((t) => ({ ...t }));
    }

    publishTemplate(
        data: Omit<SharedTemplate, 'id' | 'createdAt' | 'imported' | 'downloads'>,
    ): SharedTemplate {
        const t: SharedTemplate = {
            ...data,
            id: genId(),
            downloads: 0,
            createdAt: Date.now(),
            imported: false,
        };
        this.templates.push(t);
        return { ...t };
    }
}
