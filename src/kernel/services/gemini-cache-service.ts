import type { CachedContent, FreeTierUsage, IGeminiCacheService } from '../contracts/gemini-cache';

let nextCacheId = 1;

export class GeminiCacheService implements IGeminiCacheService {
    private caches: CachedContent[] = [
        {
            id: 'cached-1',
            name: 'debate-system-prompt-v2',
            model: 'gemini-2.5-flash',
            displayName: 'Debate System Prompt (Current)',
            sizeTokens: 1850,
            createTime: Date.now() - 3600000,
            expireTime: Date.now() + 3600000,
            ttl: '2h',
            hits: 14,
        },
        {
            id: 'cached-2',
            name: 'fact-check-prompt',
            model: 'gemini-2.5-pro',
            displayName: 'Fact-Check Pipeline',
            sizeTokens: 920,
            createTime: Date.now() - 7200000,
            expireTime: Date.now() + 7200000,
            ttl: '4h',
            hits: 7,
        },
    ];

    private freeTier: FreeTierUsage[] = [
        {
            model: 'gemini-2.0-flash',
            requestsUsed: 847,
            requestsLimit: 1500,
            tokensUsed: 623000,
            tokensLimit: 1000000,
            resetsAt: Date.now() + 4 * 3600000 + 23 * 60000,
        },
        {
            model: 'gemini-2.5-pro',
            requestsUsed: 12,
            requestsLimit: 50,
            tokensUsed: 45000,
            tokensLimit: 250000,
            resetsAt: Date.now() + 7 * 3600000,
        },
    ];

    async create(content: {
        systemPrompt: string;
        model: string;
        ttl?: string;
    }): Promise<CachedContent> {
        const now = Date.now();
        const ttlMs = parseTTL(content.ttl ?? '1h');
        const cached: CachedContent = {
            id: `cached-${nextCacheId++}-${now}`,
            name: `cache-${content.model}-${now}`,
            model: content.model,
            displayName: `System Prompt — ${content.model}`,
            sizeTokens: Math.ceil(content.systemPrompt.length / 4),
            createTime: now,
            expireTime: now + ttlMs,
            ttl: content.ttl ?? '1h',
            hits: 0,
        };
        this.caches.push(cached);
        return cached;
    }

    list(): CachedContent[] {
        return [...this.caches];
    }

    get(id: string): CachedContent | null {
        return this.caches.find((c) => c.id === id) ?? null;
    }

    delete(id: string): void {
        const idx = this.caches.findIndex((c) => c.id === id);
        if (idx !== -1) this.caches.splice(idx, 1);
    }

    getFreeTierUsage(): FreeTierUsage[] {
        return this.freeTier.map((f) => ({ ...f }));
    }

    getEstimatedSavings(): { totalSaved: number; cacheHitRate: number } {
        const totalHits = this.caches.reduce((s, c) => s + c.hits, 0);
        const totalTokens = this.caches.reduce((s, c) => s + c.sizeTokens, 0);
        const cacheHitRate = totalHits > 0 ? Math.min(1, totalHits / (totalHits + 10)) : 0;
        const totalSaved = totalTokens * cacheHitRate * 0.00000125;
        return { totalSaved, cacheHitRate };
    }
}

function parseTTL(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return num * (multipliers[unit] ?? 3600000);
}
