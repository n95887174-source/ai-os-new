import type { MemoryEntry, MemoryStats } from '../types/memory-types';
import type {
    IMemoryStore,
    MemoryStoreQuery,
    ConsolidationReport,
} from '../contracts/memory-store';
import { MemoryStoreType } from '../contracts/memory-store';
import { WorkingMemoryStore } from './memory/working-memory';
import { EpisodicMemoryStore } from './memory/episodic-memory';
import { SemanticMemoryStore } from './memory/semantic-memory';
import { ProceduralMemoryStore } from './memory/procedural-memory';
import { EmotionalMemoryStore } from './memory/emotional-memory';
import { SocialMemoryStore } from './memory/social-memory';
import { SpatialMemoryStore } from './memory/spatial-memory';
import { SleepEngine } from './memory/sleep-engine';
import { MemoryPalace } from './memory/memory-palace';
import type { PalaceState } from './memory/memory-palace';

export class MemoryOrchestrator {
    readonly stores: Map<MemoryStoreType, IMemoryStore>;
    readonly sleepEngine: SleepEngine;
    readonly palace: MemoryPalace;

    constructor() {
        this.stores = new Map();
        this.registerDefaultStores();
        this.sleepEngine = new SleepEngine(this.stores);
        this.palace = new MemoryPalace(this.stores);
    }

    private registerDefaultStores(): void {
        this.stores.set(MemoryStoreType.WORKING, new WorkingMemoryStore());
        this.stores.set(MemoryStoreType.EPISODIC, new EpisodicMemoryStore());
        this.stores.set(MemoryStoreType.SEMANTIC, new SemanticMemoryStore());
        this.stores.set(MemoryStoreType.PROCEDURAL, new ProceduralMemoryStore());
        this.stores.set(MemoryStoreType.EMOTIONAL, new EmotionalMemoryStore());
        this.stores.set(MemoryStoreType.SOCIAL, new SocialMemoryStore());
        this.stores.set(MemoryStoreType.SPATIAL, new SpatialMemoryStore());
    }

    async init(): Promise<void> {
        /* stores are self-initializing */
    }

    async destroy(): Promise<void> {
        this.stop();
    }

    start(): void {
        this.sleepEngine.start();
    }

    stop(): void {
        this.sleepEngine.stop();
    }

    getStore(type: MemoryStoreType): IMemoryStore | undefined {
        return this.stores.get(type);
    }

    async store(entry: Omit<MemoryEntry, 'id'>, storeType?: MemoryStoreType): Promise<string> {
        const store = storeType
            ? this.stores.get(storeType)
            : this.stores.get(MemoryStoreType.EPISODIC);
        if (!store) throw new Error(`Store ${storeType} not found`);
        this.sleepEngine.recordMutation();
        return store.store(entry);
    }

    async query(query: MemoryStoreQuery): Promise<MemoryEntry[]> {
        const store = query.store
            ? this.stores.get(query.store)
            : this.stores.get(MemoryStoreType.SEMANTIC);
        if (!store) return [];
        return store.query(query);
    }

    async recall(context: string, limit = 10): Promise<MemoryEntry[]> {
        const all: MemoryEntry[] = [];
        for (const [, store] of this.stores) {
            const results = await store.recall(context, Math.ceil(limit / this.stores.size));
            all.push(...results);
        }
        all.sort((a, b) => (b.metadata.importance || 0) - (a.metadata.importance || 0));
        return all.slice(0, limit);
    }

    async consolidateAll(): Promise<ConsolidationReport[]> {
        const reports: ConsolidationReport[] = [];
        for (const [, store] of this.stores) {
            reports.push(await store.consolidate());
        }
        return reports;
    }

    async getStats(): Promise<Record<MemoryStoreType, MemoryStats>> {
        const stats: Record<string, MemoryStats> = {};
        for (const [type, store] of this.stores) {
            stats[type] = await store.getStats();
        }
        return stats as Record<MemoryStoreType, MemoryStats>;
    }

    async getPalaceState(): Promise<PalaceState> {
        return this.palace.getState();
    }

    async clearAll(): Promise<void> {
        for (const [, store] of this.stores) {
            await store.clear();
        }
    }
}
