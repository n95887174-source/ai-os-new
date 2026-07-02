import type {
    IKeyUsageAnalyticsService,
    KeyUsageSummary,
    ProviderUsageBreakdown,
    UsageTrend,
} from '../contracts/key-usage-analytics';

export class KeyUsageAnalyticsService implements IKeyUsageAnalyticsService {
    getSummary(): KeyUsageSummary {
        return {
            totalKeys: 12,
            activeKeys: 8,
            totalRequests: 15234,
            totalTokens: 8912345,
            totalCost: 47.23,
            avgLatency: 843,
            topProvider: 'Groq',
        };
    }

    getProviderBreakdown(): ProviderUsageBreakdown[] {
        return [
            {
                provider: 'Groq',
                requestCount: 6234,
                tokenCount: 3210456,
                cost: 12.45,
                avgLatency: 287,
                errorRate: 1.2,
            },
            {
                provider: 'Gemini',
                requestCount: 4123,
                tokenCount: 2890123,
                cost: 18.9,
                avgLatency: 1245,
                errorRate: 3.4,
            },
            {
                provider: 'NVIDIA',
                requestCount: 2890,
                tokenCount: 1567890,
                cost: 8.34,
                avgLatency: 567,
                errorRate: 0.8,
            },
            {
                provider: 'OpenRouter',
                requestCount: 1987,
                tokenCount: 1243876,
                cost: 7.54,
                avgLatency: 1876,
                errorRate: 5.1,
            },
        ];
    }

    getTrends(days = 7): UsageTrend[] {
        const trends: UsageTrend[] = [];
        const now = Date.now();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now - i * 86400000);
            trends.push({
                date: date.toISOString().slice(0, 10),
                requests: Math.round(1500 + Math.random() * 2000),
                tokens: Math.round(500000 + Math.random() * 1500000),
                cost: Math.round((3 + Math.random() * 8) * 100) / 100,
            });
        }
        return trends;
    }
}
