import { CONFIG } from '../config-registry';
import { estimateTokenCount } from '../../../llm/utils/token-counter';
import type {
  CognitiveMetricsSnapshot,
  CognitivePressure,
  CognitiveSessionSummary,
  SessionDiagnostic,
  TopologyWhatIf,
  CognitiveIssue,
  ICognitiveIntelligenceService,
} from '../../contracts/cognitive-intelligence';
import type { ILifecycle } from '../../contracts/lifecycle';
import type { IEventBus } from '../../types/interfaces';
import { CognitiveMetricsEngine } from './cognitive-metrics';
import { CognitivePressureEngine } from './cognitive-pressure';
import { CognitiveDiagnosticsEngine } from './cognitive-diagnostics';
import { CognitiveWhatIfEngine } from './cognitive-whatif';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';

export class CognitiveIntelligenceService implements ICognitiveIntelligenceService, ILifecycle {
  private metrics: CognitiveMetricsEngine;
  private pressure: CognitivePressureEngine;
  private diagnostics: CognitiveDiagnosticsEngine;
  private whatif: CognitiveWhatIfEngine;
  private eventBus: IEventBus;
  private unsubs: Array<() => void> = [];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private sessionSummaries = new Map<string, CognitiveSessionSummary>();

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.metrics = new CognitiveMetricsEngine();
    this.pressure = new CognitivePressureEngine();
    this.diagnostics = new CognitiveDiagnosticsEngine();
    this.whatif = new CognitiveWhatIfEngine();
  }

  async init(): Promise<void> {
    this.unsubs.push(
      this.eventBus.onSafe<{ sessionId: string; agentId: string; content: string }>(DebateRuntimeEvents.AGENT_RESPONDED, (d) => {
        this.updateSessionSummary(d.sessionId, {
          tokens: estimateTokenCount(d.content),
          phase: 'deliberating',
        });
      }),
      this.eventBus.onSafe<{ sessionId: string; topic: string; topologyType: string }>(DebateRuntimeEvents.SESSION_CREATED, (d) => {
        this.sessionSummaries.set(d.sessionId, {
          id: d.sessionId,
          phase: 'created',
          round: 0,
          topologyType: d.topologyType,
          topologyDepth: d.topologyType === 'tree-of-thought' ? 3 : d.topologyType === 'judge' || d.topologyType === 'red-blue' ? 2 : 1,
          agentCount: 0,
          activeAgentCount: 0,
          totalTokens: 0,
          contradictionDensity: 0,
          consensusConfidence: 0,
        });
      }),
      this.eventBus.onSafe<{ sessionId: string; from: string; to: string }>(DebateRuntimeEvents.PHASE_CHANGED, (d) => {
        this.updateSessionSummary(d.sessionId, { phase: d.to });
      }),
      this.eventBus.onSafe<{ sessionId: string; confidence: number; agreements: number; conflicts: number }>(DebateRuntimeEvents.CONSENSUS_REACHED, (d) => {
        this.updateSessionSummary(d.sessionId, {
          consensusConfidence: d.confidence,
          contradictionDensity: d.conflicts > 0 ? d.conflicts / Math.max(1, d.agreements + d.conflicts) : 0,
        });
      }),
      this.eventBus.on(DebateRuntimeEvents.SESSION_COMPLETED, () => this.refresh()),
      this.eventBus.on(DebateRuntimeEvents.SESSION_FAILED, () => this.refresh()),
      this.eventBus.on(DebateRuntimeEvents.SESSION_CANCELLED, () => this.refresh()),
    );

    this.refreshInterval = setInterval(() => this.refresh(), CONFIG?.pressure?.autoRefreshIntervalMs ?? 10000);
  }

  async start(): Promise<void> {}

  getMetrics(): CognitiveMetricsSnapshot {
    return this.metrics.compute();
  }

  getPressure(): CognitivePressure {
    const summaries = Array.from(this.sessionSummaries.values());
    return this.pressure.compute(summaries);
  }

  diagnoseSession(sessionId: string): SessionDiagnostic | undefined {
    const summary = this.sessionSummaries.get(sessionId);
    if (!summary) return undefined;

    const history = this.metrics.getSessionHistory(sessionId);
    if (history.length === 0) history.push(summary);

    return this.diagnostics.diagnose(summary, history);
  }

  simulateTopologyChange(sessionId: string, proposedType: string): TopologyWhatIf | undefined {
    const summary = this.sessionSummaries.get(sessionId);
    if (!summary) return undefined;
    return this.whatif.simulateTopologyChange(summary, proposedType);
  }

  simulateParticipantChange(sessionId: string, additionalAgents: number) {
    const summary = this.sessionSummaries.get(sessionId);
    if (!summary) return undefined;
    return this.whatif.simulateParticipantChange(summary, additionalAgents);
  }

  getActiveIssues(): CognitiveIssue[] {
    return this.diagnostics.getActiveIssues();
  }

  refresh(): void {
    this.metrics.compute();
    this.pressure.compute(Array.from(this.sessionSummaries.values()));
  }

  onMetricsChange(cb: (metrics: CognitiveMetricsSnapshot) => void): () => void {
    return this.metrics.onMetricsChange(cb);
  }

  onPressureChange(cb: (pressure: CognitivePressure) => void): () => void {
    return this.pressure.onPressureChange(cb);
  }

  destroy(): void {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.metrics.destroy();
    this.pressure.destroy();
    this.diagnostics.destroy();
    this.sessionSummaries.clear();
  }

  private updateSessionSummary(sessionId: string, partial: Partial<CognitiveSessionSummary> & { tokens?: number }): void {
    const existing = this.sessionSummaries.get(sessionId);
    if (!existing) return;

    const updated: CognitiveSessionSummary = {
      ...existing,
      ...partial,
      totalTokens: partial.tokens !== undefined
        ? existing.totalTokens + partial.tokens
        : existing.totalTokens,
    };
    if (partial.tokens !== undefined) delete (updated as unknown as Record<string, unknown>).tokens;

    this.sessionSummaries.set(sessionId, updated);
    this.metrics.recordSummary(updated);
  }
}
