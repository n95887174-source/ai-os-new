import type {
    EvalDataset,
    EvalRun,
    EvalRunResult,
    IEvalDatasetService,
} from '../contracts/eval-dataset';
import type { IProviderAdapter } from '../contracts/provider-adapter';

const STORAGE_KEY = 'eval_datasets';
const VERSION_KEY = 'eval_datasets_version';

let datasetLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = datasetLock;
    let release: () => void;
    datasetLock = new Promise<void>((resolve) => {
        release = resolve;
    });
    return prev.then(fn).finally(() => release!());
}

async function loadDatasets(): Promise<{ datasets: EvalDataset[]; version: number }> {
    const { storageAdapter } = await import('../instances');
    const raw = storageAdapter.getItem(STORAGE_KEY);
    const versionRaw = storageAdapter.getItem(VERSION_KEY);
    return {
        datasets: raw ? JSON.parse(raw) : [],
        version: versionRaw ? parseInt(versionRaw, 10) || 0 : 0,
    };
}

async function saveDatasets(datasets: EvalDataset[], expectedVersion: number): Promise<boolean> {
    const { storageAdapter } = await import('../instances');
    // C-48: Cross-tab race protection — reload and check version before write
    const currentVersionRaw = storageAdapter.getItem(VERSION_KEY);
    const currentVersion = currentVersionRaw ? parseInt(currentVersionRaw, 10) || 0 : 0;
    if (currentVersion !== expectedVersion) {
        // Another tab modified data — merge by keeping all entries deduped by id
        const currentRaw = storageAdapter.getItem(STORAGE_KEY);
        if (currentRaw) {
            const current: EvalDataset[] = JSON.parse(currentRaw);
            const existingIds = new Set(current.map((d) => d.id));
            for (const d of datasets) {
                if (!existingIds.has(d.id)) current.push(d);
            }
            storageAdapter.setItem(STORAGE_KEY, JSON.stringify(current));
        } else {
            storageAdapter.setItem(STORAGE_KEY, JSON.stringify(datasets));
        }
    } else {
        storageAdapter.setItem(STORAGE_KEY, JSON.stringify(datasets));
    }
    storageAdapter.setItem(VERSION_KEY, String(expectedVersion + 1));
    return true;
}

export class EvalDatasetService implements IEvalDatasetService {
    constructor(
        private adapterRegistry: { getAdapter(provider: string): IProviderAdapter | null },
    ) {}

    async list(): Promise<EvalDataset[]> {
        return withLock(async () => {
            const result = await loadDatasets();
            return result.datasets;
        });
    }

    async get(id: string): Promise<EvalDataset | undefined> {
        return withLock(async () => {
            const result = await loadDatasets();
            return result.datasets.find((d) => d.id === id);
        });
    }

    async create(
        dataset: Omit<EvalDataset, 'id' | 'createdAt' | 'updatedAt' | 'runs'>,
    ): Promise<string> {
        return withLock(async () => {
            const result = await loadDatasets();
            const datasets = result.datasets;
            const id = crypto.randomUUID();
            const now = Date.now();
            const all = [...datasets, { ...dataset, id, createdAt: now, updatedAt: now, runs: [] }];
            await saveDatasets(all, result.version);
            return id;
        });
    }

    async update(id: string, updates: Partial<EvalDataset>): Promise<void> {
        return withLock(async () => {
            const result = await loadDatasets();
            const datasets = result.datasets;
            const version = result.version;
            const idx = datasets.findIndex((d) => d.id === id);
            if (idx < 0) throw new Error(`Dataset ${id} not found`);
            const all = [...datasets];
            all[idx] = { ...all[idx], ...updates, updatedAt: Date.now() };
            await saveDatasets(all, version);
        });
    }

    async delete(id: string): Promise<void> {
        return withLock(async () => {
            const result = await loadDatasets();
            const all = result.datasets.filter((d) => d.id !== id);
            await saveDatasets(all, result.version);
        });
    }

    async runEval(datasetId: string, provider: string, model: string): Promise<EvalRun> {
        return withLock(async () => {
            const result = await loadDatasets();
            const datasets = result.datasets;
            const version = result.version;
            const dataset = datasets.find((d) => d.id === datasetId);
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
                    const tokensRecord =
                        tkns && typeof tkns === 'object' ? (tkns as Record<string, number>) : {};
                    const inputTokens = tokensRecord.input || 0;
                    const outputTokens = tokensRecord.output || 0;
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

            const idx = datasets.findIndex((d: EvalDataset) => d.id === datasetId);
            datasets[idx].runs.push(run);
            if (datasets[idx].runs.length > 50) datasets[idx].runs = datasets[idx].runs.slice(-50);
            datasets[idx].updatedAt = Date.now();
            await saveDatasets(datasets, version);

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
