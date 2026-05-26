import type { KernelEvent } from '../../contracts/event-log';
import type { Projection } from '../../contracts/projection';
import type { RouterWeights } from '../../types/metrics-types';

export interface ProjectedDecision {
  requestId: string;
  strategy: string;
  selected: string;
  secondBest: string | null;
  scores: Array<{ provider: string; score: string; components?: unknown }>;
  skipped: Array<{ provider: string; keyLabel: string; keyId?: string; reason: string; stage: string }>;
  classification?: { complexity: string; isCode: boolean; isLong: boolean; isMultimodal: boolean };
  profile?: string;
  isExperiment?: boolean;
  timestamp: number;
}

export class RouterProjection implements Projection<Map<string, ProjectedDecision>> {
  private decisions = new Map<string, ProjectedDecision>();

  reduce(event: KernelEvent): void {
    if (event.type !== 'system:decision') return;

    const p = event.payload as Record<string, unknown>;
    if (!p || !p.requestId) return;

    this.decisions.set(p.requestId as string, {
      requestId: p.requestId as string,
      strategy: p.strategy as string,
      selected: p.selected as string,
      secondBest: (p.secondBest as string) ?? null,
      scores: Array.isArray(p.scores) ? p.scores as Array<{ provider: string; score: string; components?: unknown }> : [],
      skipped: Array.isArray(p.skipped) ? p.skipped as Array<{ provider: string; keyLabel: string; keyId?: string; reason: string; stage: string }> : [],
      classification: p.classification as { complexity: string; isCode: boolean; isLong: boolean; isMultimodal: boolean } | undefined,
      profile: p.profile as string | undefined,
      isExperiment: p.isExperiment as boolean | undefined,
      timestamp: (p.timestamp as number) ?? Date.now(),
    });
  }

  getState(): Map<string, ProjectedDecision> {
    return this.decisions;
  }

  getSnapshot(): ProjectedDecision[] {
    return [...this.decisions.values()].sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Explicit deterministic snapshot ABI — deep clone via structuredClone */
  cloneSnapshot(): ProjectedDecision[] {
    return structuredClone(this.getSnapshot());
  }

  getByRequestId(id: string): ProjectedDecision | undefined {
    return this.decisions.get(id);
  }

  reset(): void {
    this.decisions.clear();
  }
}
