import type { SystemState } from '../types/metrics';

export const RELIABILITY_FLOOR = 0.4;
export const MAX_DRIFT = 0.15;
export const WEIGHT_SUM_TOLERANCE = 0.001;

/** @deprecated Mutates input state in place. Prefer returning corrected copy. */
export function enforceSafetyContractInPlace(state: SystemState): string[] {
  const violations: string[] = [];

  for (const p of Object.values(state.providers)) {
    if (p.reliability < RELIABILITY_FLOOR && p.status !== 'offline') {
      // Intentional mutation: safety enforcement requires in-place correction
      p.status = 'offline';
      violations.push(`Provider ${p.id} breached reliability floor (${p.reliability.toFixed(2)})`);
    }
  }

  const weights = state.weights.effective;
  const sum = weights.ttft + weights.tps + weights.reliability;
  if (Math.abs(sum) < 1e-10) {
    violations.push('Weight sum is zero — resetting to defaults');
    weights.ttft = 0.4; weights.tps = 0.3; weights.reliability = 0.3;
  } else if (Math.abs(sum - 1.0) > WEIGHT_SUM_TOLERANCE) {
    violations.push(`Weight sum invariant breached: ${sum.toFixed(4)}`);
    const norm = 1.0 / sum;
    weights.ttft = Math.max(0, weights.ttft * norm);
    weights.tps = Math.max(0, weights.tps * norm);
    weights.reliability = Math.max(0, weights.reliability * norm);
    const clampedSum = weights.ttft + weights.tps + weights.reliability;
    if (clampedSum > 0) {
      const reNorm = 1.0 / clampedSum;
      weights.ttft *= reNorm; weights.tps *= reNorm; weights.reliability *= reNorm;
    }
  }

  const delta = state.weights.adaptiveDelta;
  if (Math.abs(delta.ttft) > MAX_DRIFT || Math.abs(delta.tps) > MAX_DRIFT || Math.abs(delta.reliability) > MAX_DRIFT) {
    violations.push('Adaptive drift boundary exceeded. Clamping.');
    delta.ttft = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, delta.ttft));
    delta.tps = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, delta.tps));
    delta.reliability = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, delta.reliability));
  }

  if (violations.length > 0) {
    violations.forEach(v => console.warn(`[Kernel Safety] ${v}`));
  }

  return violations;
}
