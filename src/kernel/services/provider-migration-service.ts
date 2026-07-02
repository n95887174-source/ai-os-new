import type { IProviderMigrationService, MigrationPlan } from '../contracts/provider-migration';

let _idCounter = 0;
const genId = () => `migr-${++_idCounter}-${Date.now()}`;

export class ProviderMigrationService implements IProviderMigrationService {
    private plans: MigrationPlan[] = [
        {
            id: genId(),
            name: 'Groq → NVIDIA Migration',
            description: 'Migrate llama-3.1 workloads from Groq to NVIDIA NIM',
            sourceProvider: 'Groq',
            targetProvider: 'NVIDIA',
            models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
            status: 'completed',
            steps: [
                {
                    id: genId(),
                    action: 'Validate credentials',
                    detail: 'NVIDIA API key validated',
                    status: 'done',
                },
                {
                    id: genId(),
                    action: 'Deploy models',
                    detail: 'Both models deployed on NVIDIA NIM',
                    status: 'done',
                },
                {
                    id: genId(),
                    action: 'Migrate routing rules',
                    detail: '60% traffic shifted',
                    status: 'done',
                },
                {
                    id: genId(),
                    action: 'Verify parity',
                    detail: 'Latency within 15% of baseline',
                    status: 'done',
                },
                {
                    id: genId(),
                    action: 'Full cutover',
                    detail: '100% traffic on NVIDIA',
                    status: 'done',
                },
            ],
            createdAt: Date.now() - 86400000 * 3,
            completedAt: Date.now() - 86400000 * 2,
        },
        {
            id: genId(),
            name: 'OpenRouter → Direct Gemini',
            description: 'Move Gemini traffic to direct API endpoint',
            sourceProvider: 'OpenRouter',
            targetProvider: 'Gemini',
            models: ['gemini-2.0-flash'],
            status: 'in_progress',
            steps: [
                {
                    id: genId(),
                    action: 'Validate credentials',
                    detail: 'Gemini API key validated',
                    status: 'done',
                },
                { id: genId(), action: 'Deploy models', detail: '', status: 'running' },
                { id: genId(), action: 'Migrate routing rules', detail: '', status: 'pending' },
                { id: genId(), action: 'Full cutover', detail: '', status: 'pending' },
            ],
            createdAt: Date.now() - 3600000,
        },
    ];

    getPlans(): MigrationPlan[] {
        return [...this.plans];
    }

    createPlan(name: string, source: string, target: string, models: string[]): MigrationPlan {
        const plan: MigrationPlan = {
            id: genId(),
            name,
            description: `Migrate from ${source} to ${target}`,
            sourceProvider: source,
            targetProvider: target,
            models,
            status: 'draft',
            steps: [
                { id: genId(), action: 'Validate credentials', detail: '', status: 'pending' },
                { id: genId(), action: 'Deploy models', detail: '', status: 'pending' },
                { id: genId(), action: 'Migrate routing rules', detail: '', status: 'pending' },
                { id: genId(), action: 'Verify parity', detail: '', status: 'pending' },
                { id: genId(), action: 'Full cutover', detail: '', status: 'pending' },
            ],
            createdAt: Date.now(),
        };
        this.plans.push(plan);
        return plan;
    }

    async executePlan(id: string): Promise<MigrationPlan> {
        const plan = this.plans.find((p) => p.id === id);
        if (!plan) throw new Error(`Plan ${id} not found`);
        plan.status = 'in_progress';
        for (const step of plan.steps) {
            step.status = 'running';
            await new Promise((r) => setTimeout(r, 800));
            step.status = 'done';
            step.detail = `${step.action} completed successfully`;
        }
        plan.status = 'completed';
        plan.completedAt = Date.now();
        return { ...plan };
    }

    async rollbackPlan(id: string): Promise<MigrationPlan> {
        const plan = this.plans.find((p) => p.id === id);
        if (!plan) throw new Error(`Plan ${id} not found`);
        plan.status = 'rolled_back';
        for (const step of plan.steps) {
            step.status = 'pending';
            step.detail = '';
        }
        return { ...plan };
    }

    deletePlan(id: string): void {
        this.plans = this.plans.filter((p) => p.id !== id);
    }
}
