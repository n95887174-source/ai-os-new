import type { IMemoryStore } from '../../contracts/memory-store';
import { MemoryStoreType } from '../../contracts/memory-store';

const MICRO_CONSOLIDATION_TRIGGER = 10;
const NIGHTLY_IDLE_MS = 15 * 60 * 1000;

export class SleepEngine {
    private microCounter = 0;
    private nightlyTimer: ReturnType<typeof setTimeout> | null = null;
    private idleSince: number | null = null;
    private running = false;

    constructor(private stores: Map<MemoryStoreType, IMemoryStore>) {}

    start(): void {
        this.running = true;
        this.idleSince = Date.now();
        this.pollIdle();
    }

    stop(): void {
        this.running = false;
        if (this.nightlyTimer) clearTimeout(this.nightlyTimer);
    }

    recordMutation(): void {
        this.microCounter++;
        this.idleSince = Date.now();
        if (this.microCounter >= MICRO_CONSOLIDATION_TRIGGER) {
            this.microCounter = 0;
            this.runMicroConsolidation();
        }
    }

    private pollIdle(): void {
        if (!this.running) return;
        if (this.idleSince && Date.now() - this.idleSince > NIGHTLY_IDLE_MS) {
            this.runNightlyConsolidation();
            this.idleSince = Date.now();
        }
        this.nightlyTimer = setTimeout(() => this.pollIdle(), 60000);
    }

    private async runMicroConsolidation(): Promise<void> {
        const episodic = this.stores.get(MemoryStoreType.EPISODIC);
        const semantic = this.stores.get(MemoryStoreType.SEMANTIC);
        if (episodic) {
            const report = await episodic.consolidate();
            if (report.entriesForgotten > 0 || report.newSemanticEntries > 0) {
                const recentForgotten = report.entriesForgotten;
                if (recentForgotten > 0 && semantic) {
                    for (let i = 0; i < Math.min(recentForgotten, 5); i++) {
                        await semantic.store({
                            content: `[Consolidated] Episodic memory snapshot at ${new Date().toISOString()}`,
                            metadata: {
                                source: 'consolidation',
                                type: 'summary',
                                timestamp: Date.now(),
                                importance: 3,
                            },
                        });
                    }
                }
            }
        }
    }

    private async runNightlyConsolidation(): Promise<void> {
        const results: Array<{ store: MemoryStoreType; forgotten: number }> = [];
        for (const [type, store] of this.stores) {
            if (type === MemoryStoreType.WORKING) continue;
            const report = await store.consolidate();
            results.push({ store: type, forgotten: report.entriesForgotten });
        }
        void results;
    }

    async consolidateNow(): Promise<void> {
        await this.runNightlyConsolidation();
    }
}
