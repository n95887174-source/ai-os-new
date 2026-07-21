// ── Quality Impact Collector — P0 MVP ──────────────────────────────────
import type { ILifecycle } from '../contracts/lifecycle';
import { rootLogger } from './logger-service';
import { BucketStorageAdapter } from './storage-adapter';
import type {
    QualityImpactEvent,
    TechniqueImpactMetrics,
    QualitySessionRecord,
    IQualityImpactCollector,
} from '../contracts/quality-impact';

const LOGGER = rootLogger.child('QualityImpactCollector');

const STORAGE_PREFIX = 'quality-metrics-';

export class QualityImpactCollector implements IQualityImpactCollector, ILifecycle {
    private sessionBuffers = new Map<string, QualityImpactEvent[]>();
    private aggregatedMetrics = new Map<string, TechniqueImpactMetrics>();
    async init(): Promise<void> {
        await this.loadPersistedMetrics();
        LOGGER.info('QualityImpactCollector', 'init', {
            metricsLoaded: this.aggregatedMetrics.size,
        });
    }

    destroy(): void {
        this.sessionBuffers.clear();
    }

    // ── IQualityImpactCollector ──

    record(event: QualityImpactEvent): void {
        let buf = this.sessionBuffers.get(event.sessionId);
        if (!buf) {
            buf = [];
            this.sessionBuffers.set(event.sessionId, buf);
        }
        buf.push(event);
    }

    async finalizeSession(
        sessionId: string,
        sessionData: {
            enabledTechniques: string[];
            topic: string;
            strategy: string;
            participantCount: number;
            roundCount: number;
            totalTokens: number;
            durationMs: number;
            judgeScore?: number;
        },
    ): Promise<void> {
        const events = this.sessionBuffers.get(sessionId);
        if (!events || events.length === 0) {
            LOGGER.debug('QualityImpactCollector', 'finalizeSession: no events', { sessionId });
            return;
        }

        // 1. Aggregate per-technique metrics from events
        const techniqueEvents = this.groupByTechnique(events);
        const activated = Array.from(techniqueEvents.keys());

        // 2. Update aggregated metrics with this session's data
        for (const [techId, techEvents] of techniqueEvents) {
            const existing = this.aggregatedMetrics.get(techId) || this.emptyMetrics(techId);
            const onCount = techEvents.filter((e) => e.eventType !== 'FINAL_IMPACT').length;
            const delta = sessionData.judgeScore ?? 0;

            this.aggregatedMetrics.set(techId, {
                ...existing,
                totalSessions: existing.totalSessions + 1,
                totalActivations: existing.totalActivations + onCount,
                totalSkips:
                    existing.totalSkips +
                    Math.max(0, sessionData.enabledTechniques.length - onCount),
                avgJudgeScoreDelta:
                    (existing.avgJudgeScoreDelta * existing.sampleSizeOn + delta) /
                    (existing.sampleSizeOn + 1),
                sampleSizeOn: existing.sampleSizeOn + 1,
                lastUpdated: Date.now(),
            });
        }

        // 3. Persist QualitySessionRecord
        const record: QualitySessionRecord = {
            sessionId,
            topic: sessionData.topic,
            strategy: sessionData.strategy,
            participantCount: sessionData.participantCount,
            roundCount: sessionData.roundCount,
            totalTokens: sessionData.totalTokens,
            durationMs: sessionData.durationMs,
            enabledTechniques: sessionData.enabledTechniques,
            activatedTechniques: activated,
            techniqueEventCount: events.length,
            timestamp: Date.now(),
        };
        await this.persistSessionRecord(record);

        // 4. Persist aggregated metrics
        await this.persistAllMetrics();

        // 5. Console report
        this.printReport(sessionId, techniqueEvents);

        // 6. Cleanup buffer
        this.sessionBuffers.delete(sessionId);
    }

    getMetrics(techniqueId: string): TechniqueImpactMetrics | undefined {
        return this.aggregatedMetrics.get(techniqueId);
    }

    getAllMetrics(): TechniqueImpactMetrics[] {
        return Array.from(this.aggregatedMetrics.values());
    }

    // ── Private ──

    private groupByTechnique(events: QualityImpactEvent[]): Map<string, QualityImpactEvent[]> {
        const groups = new Map<string, QualityImpactEvent[]>();
        for (const e of events) {
            let g = groups.get(e.techniqueId);
            if (!g) {
                g = [];
                groups.set(e.techniqueId, g);
            }
            g.push(e);
        }
        return groups;
    }

    private emptyMetrics(techniqueId: string): TechniqueImpactMetrics {
        return {
            techniqueId,
            totalSessions: 0,
            totalActivations: 0,
            totalSkips: 0,
            avgJudgeScoreDelta: 0,
            avgConfidenceDelta: 0,
            avgRoundCountDelta: 0,
            avgTokenCostDelta: 0,
            sampleSizeOn: 0,
            sampleSizeOff: 0,
            confidence: 'none',
            lastUpdated: Date.now(),
        };
    }

    private printReport(
        sessionId: string,
        techniqueEvents: Map<string, QualityImpactEvent[]>,
    ): void {
        const sorted = Array.from(techniqueEvents.entries())
            .map(([techId, events]) => ({
                techId,
                count: events.filter((e) => e.eventType !== 'FINAL_IMPACT').length,
                metric: this.aggregatedMetrics.get(techId),
            }))
            .sort(
                (a, b) => (b.metric?.avgJudgeScoreDelta ?? 0) - (a.metric?.avgJudgeScoreDelta ?? 0),
            );

        console.log(`\n[QualityImpact] Session ${sessionId}: ${sorted.length} techniques`);
        for (const entry of sorted) {
            const m = entry.metric;
            if (!m) continue;
            const sign = m.avgJudgeScoreDelta >= 0 ? '+' : '';
            console.log(
                `  ${entry.techId}: ${sign}${(m.avgJudgeScoreDelta * 100).toFixed(1)}% (n=${entry.count}, ${m.totalSessions} sessions, ${m.confidence} confidence)`,
            );
        }
    }

    private async persistSessionRecord(record: QualitySessionRecord): Promise<void> {
        try {
            await BucketStorageAdapter.UI.set(`quality-session-${record.sessionId}`, record);
        } catch (e) {
            LOGGER.warn('QualityImpactCollector', 'persistSessionRecord failed', {
                sessionId: record.sessionId,
                error: String(e),
            });
        }
    }

    private async persistAllMetrics(): Promise<void> {
        for (const [techId, metrics] of this.aggregatedMetrics) {
            try {
                await BucketStorageAdapter.UI.set(`${STORAGE_PREFIX}${techId}`, metrics);
            } catch (e) {
                LOGGER.warn('QualityImpactCollector', 'persistMetrics failed', {
                    techniqueId: techId,
                    error: String(e),
                });
            }
        }
    }

    private async loadPersistedMetrics(): Promise<void> {
        // BucketStorageAdapter.UI doesn't support listing keys natively.
        // For P0 MVP, we rely on in-memory aggregation from current session.
        // Full persistence restore requires a separate index — deferred to P1.
        this.aggregatedMetrics.clear();
    }
}
