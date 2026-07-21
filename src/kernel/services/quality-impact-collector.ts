import type { ILifecycle } from '../contracts/lifecycle';
import { rootLogger } from './logger-service';
import { BucketStorageAdapter } from './storage-adapter';
import type {
    QualityImpactEvent,
    TechniqueImpactMetrics,
    QualitySessionRecord,
    QualityBaselineRecord,
    IQualityImpactCollector,
    BestConditions,
    SessionScoreSnapshot,
} from '../contracts/quality-impact';

const LOGGER = rootLogger.child('QualityImpactCollector');

const STORAGE_PREFIX = 'quality-metrics-';
const SESSION_PREFIX = 'quality-session-';
const BASELINE_PREFIX = 'quality-baseline-';
const STORAGE_KEY_SNAPSHOTS = 'quality-snapshots';

const SNAP_MAX = 500;

function studentTCdf(t: number, df: number): number {
    const x = df / (df + t * t);
    let p = 1 - 0.5 * Math.pow(x, df / 2);
    for (let i = 2; i < df; i += 2) {
        p -=
            (gamma(i / 2 + 0.5) / (Math.sqrt(Math.PI) * gamma(i / 2))) *
            Math.pow(x, i / 2) *
            (t > 0 ? 1 : -1);
    }
    return Math.max(0, Math.min(1, p));
}

function gamma(z: number): number {
    const g = 7;
    const c = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const tt = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(tt, z + 0.5) * Math.exp(-tt) * x;
}

function computeWelchPValue(
    sampleOn: number[],
    sampleOff: number[],
): { pValue: number; confidence: 'none' | 'low' | 'medium' | 'high' | 'very_high' } {
    const nOn = sampleOn.length;
    const nOff = sampleOff.length;
    if (nOn < 2 || nOff < 2) return { pValue: 1, confidence: 'none' };

    const meanOn = sampleOn.reduce((a, b) => a + b, 0) / nOn;
    const meanOff = sampleOff.reduce((a, b) => a + b, 0) / nOff;
    const varOn = sampleOn.reduce((s, x) => s + (x - meanOn) ** 2, 0) / (nOn - 1);
    const varOff = sampleOff.reduce((s, x) => s + (x - meanOff) ** 2, 0) / (nOff - 1);

    const se = Math.sqrt(varOn / nOn + varOff / nOff);
    if (se === 0) return { pValue: 1, confidence: 'none' };

    const t = (meanOn - meanOff) / se;
    const df =
        (varOn / nOn + varOff / nOff) ** 2 /
        ((varOn / nOn) ** 2 / (nOn - 1) + (varOff / nOff) ** 2 / (nOff - 1));

    const p = studentTCdf(t, Math.max(1, Math.round(df)));

    if (p < 0.001) return { pValue: p, confidence: 'very_high' };
    if (p < 0.01) return { pValue: p, confidence: 'high' };
    if (p < 0.05) return { pValue: p, confidence: 'medium' };
    if (p < 0.1) return { pValue: p, confidence: 'low' };
    return { pValue: p, confidence: 'none' };
}

function findBestRoundRange(scores: number[], rounds: number[]): [number, number] | undefined {
    if (scores.length < 3) return undefined;
    let bestStart = 0;
    let bestEnd = 0;
    let bestAvg = -Infinity;
    for (let i = 0; i < scores.length; i++) {
        for (let j = i + 1; j < Math.min(i + 4, scores.length); j++) {
            const slice = scores.slice(i, j + 1);
            const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestStart = rounds[i];
                bestEnd = rounds[j];
            }
        }
    }
    return bestAvg > -Infinity ? [bestStart, bestEnd] : undefined;
}

export class QualityImpactCollector implements IQualityImpactCollector, ILifecycle {
    private sessionBuffers = new Map<string, QualityImpactEvent[]>();
    private aggregatedMetrics = new Map<string, TechniqueImpactMetrics>();
    private sessionHistory: QualitySessionRecord[] = [];
    private baselineSessions: QualityBaselineRecord[] = [];
    private scoreSnapshots: SessionScoreSnapshot[] = [];

    async init(): Promise<void> {
        await this.loadPersistedMetrics();
        await this.loadSessionHistory();
        await this.loadBaselineSessions();
        await this.loadScoreSnapshots();
        LOGGER.info('QualityImpactCollector', 'init', {
            metricsLoaded: this.aggregatedMetrics.size,
            historyLoaded: this.sessionHistory.length,
            baselinesLoaded: this.baselineSessions.length,
        });
    }

    destroy(): void {
        this.sessionBuffers.clear();
    }

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

        const judgeScore = sessionData.judgeScore ?? 0;
        const techniqueEvents = this.groupByTechnique(events);
        const activated = Array.from(techniqueEvents.keys());

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
        this.sessionHistory.push(record);
        await this.persistSessionRecord(record);

        const isBaseline = sessionData.enabledTechniques.length === 0;
        if (isBaseline) {
            const bl: QualityBaselineRecord = {
                sessionId,
                topic: sessionData.topic,
                strategy: sessionData.strategy,
                participantCount: sessionData.participantCount,
                roundCount: sessionData.roundCount,
                totalTokens: sessionData.totalTokens,
                durationMs: sessionData.durationMs,
                judgeScore,
                avgConfidence: 0.5,
                timestamp: Date.now(),
            };
            this.baselineSessions.push(bl);
            await this.persistBaselineRecord(bl);
        }

        const snap: SessionScoreSnapshot = {
            sessionId,
            enabledTechniques: sessionData.enabledTechniques,
            judgeScore,
            avgConfidence: 0.5,
            roundCount: sessionData.roundCount,
            totalTokens: sessionData.totalTokens,
            participantCount: sessionData.participantCount,
            strategy: sessionData.strategy,
            topic: sessionData.topic,
            durationMs: sessionData.durationMs,
            timestamp: Date.now(),
        };
        this.scoreSnapshots.push(snap);
        if (this.scoreSnapshots.length > SNAP_MAX) {
            this.scoreSnapshots = this.scoreSnapshots.slice(-SNAP_MAX);
        }
        await this.persistScoreSnapshots();

        const baselineAvg = this.computeBaselineAvg(judgeScore);

        for (const [techId, techEvents] of techniqueEvents) {
            const existing = this.aggregatedMetrics.get(techId) || this.emptyMetrics(techId);
            const onCount = techEvents.filter((e) => e.eventType !== 'FINAL_IMPACT').length;
            const delta = judgeScore - baselineAvg;

            const allOnScores = this.scoreSnapshots
                .filter((s) => s.enabledTechniques.includes(techId))
                .map((s) => s.judgeScore);
            const allOffScores = this.scoreSnapshots
                .filter(
                    (s) => !s.enabledTechniques.includes(techId) && s.enabledTechniques.length > 0,
                )
                .map((s) => s.judgeScore);

            const sig =
                allOnScores.length >= 2 && allOffScores.length >= 2
                    ? computeWelchPValue(allOnScores, allOffScores)
                    : { pValue: 1, confidence: 'none' as const };

            const totalOn = existing.sampleSizeOn + 1;
            const newDelta =
                (existing.avgJudgeScoreDelta * existing.sampleSizeOn + delta) / totalOn;

            this.aggregatedMetrics.set(techId, {
                ...existing,
                totalSessions: existing.totalSessions + 1,
                totalActivations: existing.totalActivations + onCount,
                totalSkips:
                    existing.totalSkips +
                    Math.max(0, sessionData.enabledTechniques.length - onCount),
                avgJudgeScoreDelta: isFinite(newDelta) ? newDelta : 0,
                sampleSizeOn: allOnScores.length || 1,
                sampleSizeOff: allOffScores.length || 0,
                confidence: sig.confidence,
                pValue: sig.pValue,
                lastUpdated: Date.now(),
            });
        }

        await this.persistAllMetrics();
        this.printReport(sessionId, techniqueEvents);
        this.sessionBuffers.delete(sessionId);
    }

    getMetrics(techniqueId: string): TechniqueImpactMetrics | undefined {
        return this.aggregatedMetrics.get(techniqueId);
    }

    getAllMetrics(): TechniqueImpactMetrics[] {
        return Array.from(this.aggregatedMetrics.values());
    }

    getSessionHistory(): QualitySessionRecord[] {
        return [...this.sessionHistory];
    }

    getBaselineSessions(): QualityBaselineRecord[] {
        return [...this.baselineSessions];
    }

    getBestConditions(techniqueId: string): BestConditions {
        const metric = this.aggregatedMetrics.get(techniqueId);
        if (!metric) {
            return { techniqueId, confidence: 'none' };
        }

        const sessionsWithTech = this.scoreSnapshots.filter((s) =>
            s.enabledTechniques.includes(techniqueId),
        );

        if (sessionsWithTech.length < 2) {
            return { techniqueId, confidence: metric.confidence };
        }

        const bestRoundRange = findBestRoundRange(
            sessionsWithTech.map((s) => s.judgeScore),
            sessionsWithTech.map((s) => s.roundCount),
        );

        const participantCounts = sessionsWithTech.map((s) => s.participantCount);
        const bestAgentCount =
            participantCounts.length > 0
                ? Math.round(
                      participantCounts.reduce((a, b) => a + b, 0) / participantCounts.length,
                  )
                : undefined;

        return {
            techniqueId,
            bestRoundRange,
            bestAgentCount,
            confidence: metric.confidence,
        };
    }

    getSignificance(techniqueId: string): {
        pValue: number;
        confidence: 'none' | 'low' | 'medium' | 'high' | 'very_high';
    } {
        const metric = this.aggregatedMetrics.get(techniqueId);
        if (!metric) return { pValue: 1, confidence: 'none' };

        if (metric.pValue !== undefined) {
            return { pValue: metric.pValue, confidence: metric.confidence };
        }

        const onScores = this.scoreSnapshots
            .filter((s) => s.enabledTechniques.includes(techniqueId))
            .map((s) => s.judgeScore);
        const offScores = this.scoreSnapshots
            .filter(
                (s) => !s.enabledTechniques.includes(techniqueId) && s.enabledTechniques.length > 0,
            )
            .map((s) => s.judgeScore);

        if (onScores.length < 2 || offScores.length < 2) {
            return { pValue: 1, confidence: 'none' };
        }

        return computeWelchPValue(onScores, offScores);
    }

    getScoreSnapshots(): SessionScoreSnapshot[] {
        return [...this.scoreSnapshots];
    }

    private computeBaselineAvg(currentScore: number): number {
        if (this.baselineSessions.length === 0) return currentScore;
        const total = this.baselineSessions.reduce((s, b) => s + b.judgeScore, 0);
        return total / this.baselineSessions.length;
    }

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
                `  ${entry.techId}: ${sign}${(m.avgJudgeScoreDelta * 100).toFixed(1)}% (n=${entry.count}, ${m.totalSessions} sessions, p=${m.pValue?.toFixed(4) ?? 'N/A'}, ${m.confidence})`,
            );
        }
    }

    private async persistSessionRecord(record: QualitySessionRecord): Promise<void> {
        try {
            await BucketStorageAdapter.UI.set(`${SESSION_PREFIX}${record.sessionId}`, record);
        } catch (e) {
            LOGGER.warn('QualityImpactCollector', 'persistSessionRecord failed', {
                sessionId: record.sessionId,
                error: String(e),
            });
        }
    }

    private async persistBaselineRecord(record: QualityBaselineRecord): Promise<void> {
        try {
            await BucketStorageAdapter.UI.set(`${BASELINE_PREFIX}${record.sessionId}`, record);
        } catch (e) {
            LOGGER.warn('QualityImpactCollector', 'persistBaselineRecord failed', {
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

    private async persistScoreSnapshots(): Promise<void> {
        try {
            await BucketStorageAdapter.UI.set(STORAGE_KEY_SNAPSHOTS, this.scoreSnapshots);
        } catch (e) {
            LOGGER.warn('QualityImpactCollector', 'persistScoreSnapshots failed', {
                error: String(e),
            });
        }
    }

    private async loadPersistedMetrics(): Promise<void> {
        this.aggregatedMetrics.clear();
    }

    private async loadSessionHistory(): Promise<void> {
        this.sessionHistory = [];
    }

    private async loadBaselineSessions(): Promise<void> {
        this.baselineSessions = [];
    }

    private async loadScoreSnapshots(): Promise<void> {
        try {
            const raw =
                await BucketStorageAdapter.UI.get<SessionScoreSnapshot[]>(STORAGE_KEY_SNAPSHOTS);
            if (raw) this.scoreSnapshots = raw;
        } catch {
            this.scoreSnapshots = [];
        }
    }
}
