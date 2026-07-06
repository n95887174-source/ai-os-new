import type {
    EvalDataset,
    EvalRun,
    EvalRunResult,
    IEvalDatasetService,
} from '../contracts/eval-dataset';
import type { IProviderAdapter } from '../contracts/provider-adapter';

const STORAGE_KEY = 'eval_datasets';

let datasetLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = datasetLock;
    let release: () => void;
    datasetLock = new Promise<void>((resolve) => {
        release = resolve;
    });
    return prev.then(fn).finally(() => release!());
}

async function loadDatasets(): Promise<EvalDataset[]> {
    const { storageAdapter } = await import('../instances');
    const raw = storageAdapter.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function saveDatasets(datasets: EvalDataset[]): Promise<void> {
    const { storageAdapter } = await import('../instances');
    storageAdapter.setItem(STORAGE_KEY, JSON.stringify(datasets));
}

export class EvalDatasetService implements IEvalDatasetService {
    constructor(
        private adapterRegistry: { getAdapter(provider: string): IProviderAdapter | null },
    ) {}

    async list(): Promise<EvalDataset[]> {
        return withLock(() => loadDatasets());
    }

    async get(id: string): Promise<EvalDataset | undefined> {
        return withLock(async () => {
            const all = await loadDatasets();
            return all.find((d) => d.id === id);
        });
    }

    async create(
        dataset: Omit<EvalDataset, 'id' | 'createdAt' | 'updatedAt' | 'runs'>,
    ): Promise<string> {
        return withLock(async () => {
            const all = await loadDatasets();
            const id = crypto.randomUUID();
            const now = Date.now();
            all.push({ ...dataset, id, createdAt: now, updatedAt: now, runs: [] });
            await saveDatasets(all);
            return id;
        });
    }

    async update(id: string, updates: Partial<EvalDataset>): Promise<void> {
        return withLock(async () => {
            const all = await loadDatasets();
            const idx = all.findIndex((d) => d.id === id);
            if (idx < 0) throw new Error(`Dataset ${id} not found`);
            all[idx] = { ...all[idx], ...updates, updatedAt: Date.now() };
            await saveDatasets(all);
        });
    }

    async delete(id: string): Promise<void> {
        return withLock(async () => {
            const all = await loadDatasets();
            await saveDatasets(all.filter((d) => d.id !== id));
        });
    }

    async runEval(datasetId: string, provider: string, model: string): Promise<EvalRun> {
        return withLock(async () => {
            const all = await loadDatasets();
            const dataset = all.find((d) => d.id === datasetId);
            if (!dataset) throw new Error(`Dataset ${datasetId} not found`);

            const adapter = this.adapterRegistry.getAdapter(provider);
            if (!adapter) throw new Error(`Provider ${provider} not found`);

            const instances = await import('../instances');
            const keys = instances.keyService?.getKeys() || [];
            const key = keys.find((k: { provider: string }) => k.provider === provider);
            if (!key) throw new Error(`No key for provider ${provider}`);

            const apiKey = typeof key.key === 'string' ? key.key : '';

            const results: EvalRunResult[] = [];
            for (let i = 0; i < dataset.prompts.length; i++) {
                const prompt = dataset.prompts[i];
                const start = Date.now();
                try {
                    const response = await adapter.sendMessage(
                        [{ role: 'user', content: prompt.input }],
                        model,
                        apiKey,
                    );
                    const latencyMs = Date.now() - start;
                    const actualOutput =
                        typeof response.content === 'string' ? response.content : '';
                    const tkns = response.tokens;
                    const inputTokens =
                        tkns && typeof tkns === 'object' ? (tkns as any).input || 0 : 0;
                    const outputTokens =
                        tkns && typeof tkns === 'object' ? (tkns as any).output || 0 : 0;
                    const score = prompt.expectedOutput
                        ? computeSimilarity(actualOutput, prompt.expectedOutput)
                        : 1;
                    results.push({
                        promptIndex: i,
                        input: prompt.input,
                        expectedOutput: prompt.expectedOutput,
                        actualOutput,
                        latencyMs,
                        tokens: { input: inputTokens, output: outputTokens },
                        cost: 0,
                        passed: score >= 0.7,
                        score,
                    });
                } catch (err) {
                    results.push({
                        promptIndex: i,
                        input: prompt.input,
                        expectedOutput: prompt.expectedOutput,
                        actualOutput: '',
                        latencyMs: Date.now() - start,
                        tokens: { input: 0, output: 0 },
                        cost: 0,
                        passed: false,
                        score: 0,
                        error: String(err),
                    });
                }
            }

            const run: EvalRun = {
                id: crypto.randomUUID(),
                datasetId,
                provider,
                model,
                timestamp: Date.now(),
                results,
                summary: {
                    total: results.length,
                    passed: results.filter((r) => r.passed).length,
                    failed: results.filter((r) => !r.passed).length,
                    avgLatency: results.reduce((s, r) => s + r.latencyMs, 0) / results.length,
                    avgScore: results.reduce((s, r) => s + r.score, 0) / results.length,
                    totalCost: results.reduce((s, r) => s + r.cost, 0),
                },
            };

            const idx = all.findIndex((d) => d.id === datasetId);
            all[idx].runs.push(run);
            if (all[idx].runs.length > 50) all[idx].runs = all[idx].runs.slice(-50);
            all[idx].updatedAt = Date.now();
            await saveDatasets(all);

            return run;
        });
    }

    async getRun(datasetId: string, runId: string): Promise<EvalRun | undefined> {
        const dataset = await this.get(datasetId);
        return dataset?.runs.find((r) => r.id === runId);
    }
}

function computeSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
    const bWords = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
    const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);
    return union.size > 0 ? intersection.size / union.size : 1;
}
