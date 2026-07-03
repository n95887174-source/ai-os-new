import { genId } from '../../utils/gen-id';
import type { IHypothesisService, ProposeHypothesisInput } from '../contracts/hypothesis';
import type {
    ResearchHypothesis,
    HypothesisCategory,
    HypothesisStatus,
} from '../types/research-types';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('HypothesisService');

const STORAGE_KEY = 'research_hypotheses';

const SEED_HYPOTHESES: ResearchHypothesis[] = [
    {
        id: 'seed-1',
        title: 'Debate runtime: split into domain-specific modules',
        description:
            'The debate runtime is organized across debate-engine, debate-session, debate-metrics, debate-prompt-builder, debate-finalizer, and debate-sync-manager modules under debate-runtime/.',
        category: 'arch',
        status: 'accepted',
        createdAt: Date.now() - 86400000 * 2,
        sourceFile: 'src/kernel/services/debate-runtime/',
        evidenceRefs: ['docs/DEBT_REPORT.md D-02'],
    },
    {
        id: 'seed-2',
        title: 'Unify argument strategy prompts across topology agents',
        description:
            'Argument strategies are injected at multiple levels across agents. A single strategy registry would reduce duplication.',
        category: 'prompt',
        status: 'proposed',
        createdAt: Date.now() - 86400000,
        sourceFile: 'src/kernel/state/topology-defaults.ts',
        evidenceRefs: ['src/kernel/services/debate-prompt-builder.ts'],
    },
    {
        id: 'seed-3',
        title: 'Factor circuit breaker state into router weights',
        description:
            'Router weights do not account for open circuits. Adding breaker state as a multiplier would avoid wasted requests.',
        category: 'routing',
        status: 'debating',
        createdAt: Date.now() - 86400000 * 3,
        linkedDebateId: 'demo-debate',
        evidenceRefs: ['src/llm/decorators/circuit-breaker.ts'],
    },
];

export interface HypothesisServiceDeps {
    database: {
        getKv: <T>(id: string) => Promise<T | null>;
        setKv: <T>(id: string, value: T) => Promise<void>;
    };
    eventBus: { emit: (event: string, data?: unknown) => void };
}

export class HypothesisService implements IHypothesisService {
    private hypotheses: ResearchHypothesis[] = [];

    constructor(private deps: HypothesisServiceDeps) {}

    async init(): Promise<void> {
        const saved = await this.deps.database.getKv<ResearchHypothesis[]>(STORAGE_KEY);
        if (saved?.length) {
            this.hypotheses = saved;
        } else {
            this.hypotheses = [...SEED_HYPOTHESES];
            await this.persist();
        }
    }

    destroy(): void {
        this.hypotheses = [];
    }

    getAll(): ResearchHypothesis[] {
        return [...this.hypotheses];
    }

    async propose(input: ProposeHypothesisInput): Promise<ResearchHypothesis> {
        const title =
            input.title?.trim() ||
            this.mockTitle(input.category, input.sourceFile, input.description);
        const hypothesis: ResearchHypothesis = {
            id: genId('h'),
            title,
            description: input.description.trim(),
            category: input.category,
            status: 'proposed',
            createdAt: Date.now(),
            sourceFile: input.sourceFile?.trim() || undefined,
            evidenceRefs: input.evidenceRefs ?? [],
            metricsDelta: this.mockImpact(input.category),
        };
        this.hypotheses = [hypothesis, ...this.hypotheses];
        await this.persist();
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Hypothesis proposed: ${title}`,
            type: 'info',
        });
        this.deps.eventBus.emit(EVENTS.HYPOTHESES_UPDATED, { hypotheses: this.hypotheses });
        return hypothesis;
    }

    async update(
        id: string,
        patch: Partial<ResearchHypothesis>,
    ): Promise<ResearchHypothesis | null> {
        const idx = this.hypotheses.findIndex((h) => h.id === id);
        if (idx === -1) return null;
        this.hypotheses[idx] = { ...this.hypotheses[idx], ...patch };
        await this.persist();
        this.deps.eventBus.emit(EVENTS.HYPOTHESES_UPDATED, { hypotheses: this.hypotheses });
        return this.hypotheses[idx];
    }

    async remove(id: string): Promise<void> {
        this.hypotheses = this.hypotheses.filter((h) => h.id !== id);
        await this.persist();
        this.deps.eventBus.emit(EVENTS.HYPOTHESES_UPDATED, { hypotheses: this.hypotheses });
    }

    async linkDebate(id: string, debateId: string): Promise<void> {
        await this.update(id, { linkedDebateId: debateId, status: 'debating' });
    }

    async setStatus(id: string, status: HypothesisStatus): Promise<void> {
        await this.update(id, { status });
    }

    private async persist(): Promise<void> {
        try {
            await this.deps.database.setKv(STORAGE_KEY, this.hypotheses);
        } catch (e) {
            LOGGER.warn('HypothesisService', 'Persist failed', { error: e });
        }
    }

    private mockTitle(
        category: HypothesisCategory,
        sourceFile: string | undefined,
        description: string,
    ): string {
        const file = sourceFile?.split('/').pop() ?? 'system';
        const snippet = description.slice(0, 48).trim();
        const labels: Record<HypothesisCategory, string> = {
            arch: 'Architecture',
            prompt: 'Prompt',
            routing: 'Routing',
            gov: 'Governance',
        };
        return `${labels[category]} improvement for ${file}: ${snippet}${description.length > 48 ? '…' : ''}`;
    }

    private mockImpact(category: HypothesisCategory): string {
        const impacts: Record<HypothesisCategory, string> = {
            arch: 'Maintainability +15%, file size -30%',
            prompt: 'Token usage -10%, strategy clarity +20%',
            routing: 'Failed requests -25%, latency P95 -12%',
            gov: 'Policy violations -40%, audit coverage +25%',
        };
        return impacts[category];
    }
}
