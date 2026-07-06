const STORAGE_KEY = 'batch_jobs';

let nextJobId = Date.now();
function generateJobId(): string {
    return `batch-${nextJobId++}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface BatchTask {
    prompt: string;
    provider: string;
    model: string;
}

export interface BatchResult {
    prompt: string;
    provider: string;
    model: string;
    response: string;
    latency: number;
    tokens: number;
    error?: string;
    status: 'success' | 'error';
}

export interface BatchJob {
    id: string;
    label: string;
    tasks: BatchTask[];
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    results: BatchResult[];
    total: number;
    completed: number;
    failed: number;
    createdAt: number;
    completedAt?: number;
}

const MAX_JOBS = 20;

export class BatchProcessorService {
    private jobs: BatchJob[] = [];
    private currentAbort: AbortController | null = null;
    private loaded = false;

    private async db(): Promise<import('../types/interfaces').IDatabaseService> {
        const { database } = await import('../instances');
        return database;
    }

    private async ensureLoaded(): Promise<void> {
        if (this.loaded) return;
        const d = await this.db();
        const saved = await d.getKv<BatchJob[]>(STORAGE_KEY);
        this.jobs = saved ?? [];
        this.loaded = true;
    }

    private async persist(): Promise<void> {
        const d = await this.db();
        await d.setKv(STORAGE_KEY, this.jobs.slice(-MAX_JOBS));
    }

    async getJobs(): Promise<BatchJob[]> {
        await this.ensureLoaded();
        return [...this.jobs].reverse();
    }

    async getJob(id: string): Promise<BatchJob | undefined> {
        await this.ensureLoaded();
        return this.jobs.find((j) => j.id === id);
    }

    async createJob(label: string, tasks: BatchTask[]): Promise<BatchJob> {
        await this.ensureLoaded();
        const job: BatchJob = {
            id: generateJobId(),
            label,
            tasks,
            status: 'pending',
            results: [],
            total: tasks.length,
            completed: 0,
            failed: 0,
            createdAt: Date.now(),
        };
        this.jobs.push(job);
        await this.persist();
        return job;
    }

    async runJob(jobId: string, onProgress?: (job: BatchJob) => void): Promise<BatchJob> {
        await this.ensureLoaded();
        const job = this.jobs.find((j) => j.id === jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        const { adapterRegistry, keyService } = await import('../instances');
        const abortController = new AbortController();
        this.currentAbort = abortController;

        job.status = 'running';
        await this.persist();

        const allKeys = keyService.getKeys();
        const keyRotationIndex: Record<string, number> = {};

        for (let i = 0; i < job.tasks.length; i++) {
            if (abortController.signal.aborted) {
                job.status = 'cancelled';
                break;
            }

            const task = job.tasks[i];
            const startTime = Date.now();

            try {
                const adapter = adapterRegistry.getAdapter(task.provider);
                if (!adapter) throw new Error(`Adapter not found for provider: ${task.provider}`);

                const providerKeys = allKeys.filter((k) => k.provider === task.provider);
                if (providerKeys.length === 0)
                    throw new Error(`No key found for provider: ${task.provider}`);
                const idx = (keyRotationIndex[task.provider] ?? 0) % providerKeys.length;
                keyRotationIndex[task.provider] = idx + 1;
                const key = providerKeys[idx];

                const response = await adapter.sendMessage(
                    [{ role: 'user', content: task.prompt }],
                    task.model,
                    key.key,
                    abortController.signal,
                    { temperature: 0.7, maxOutputTokens: 1024 },
                );

                const latency = Date.now() - startTime;
                job.results.push({
                    prompt: task.prompt,
                    provider: task.provider,
                    model: task.model,
                    response: response.content ?? '',
                    latency,
                    tokens: response.tokens ?? 0,
                    status: 'success',
                });
                job.completed++;
            } catch (err) {
                const latency = Date.now() - startTime;
                job.results.push({
                    prompt: task.prompt,
                    provider: task.provider,
                    model: task.model,
                    response: '',
                    latency,
                    tokens: 0,
                    error: String(err),
                    status: 'error',
                });
                job.failed++;
            }

            onProgress?.(job);
        }

        if (job.status === 'running') {
            job.status = 'completed';
        }
        job.completedAt = Date.now();
        this.currentAbort = null;
        await this.persist();
        return job;
    }

    cancelJob(): void {
        this.currentAbort?.abort();
        this.currentAbort = null;
    }

    async clearHistory(): Promise<void> {
        this.jobs = [];
        this.loaded = true;
        const d = await this.db();
        await d.setKv(STORAGE_KEY, []);
    }
}
