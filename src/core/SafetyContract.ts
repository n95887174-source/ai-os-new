import type { SystemState } from '../types/metrics';

export const RELIABILITY_FLOOR = 0.4;
export const MAX_DRIFT = 0.15;
export const WEIGHT_SUM_TOLERANCE = 0.001;

export function enforceSafetyContract(state: SystemState): string[] {
  const violations: string[] = [];

  Object.values(state.providers).forEach(p => {
    if (p.reliability < RELIABILITY_FLOOR && p.status !== 'offline') {
      p.status = 'offline';
      violations.push(`Provider ${p.id} breached reliability floor (${p.reliability.toFixed(2)})`);
    }
  });

  const sum = state.weights.effective.ttft + state.weights.effective.tps + state.weights.effective.reliability;
  if (Math.abs(sum - 1.0) > WEIGHT_SUM_TOLERANCE) {
    violations.push(`Weight sum invariant breached: ${sum.toFixed(4)}`);
    const norm = 1.0 / sum;
    state.weights.effective.ttft *= norm;
    state.weights.effective.tps *= norm;
    state.weights.effective.reliability *= norm;
  }

  const d = state.weights.adaptiveDelta;
  if (Math.abs(d.ttft) > MAX_DRIFT || Math.abs(d.reliability) > MAX_DRIFT) {
    violations.push(`Adaptive drift boundary exceeded. Clamping.`);
    d.ttft = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, d.ttft));
    d.reliability = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, d.reliability));
  }

  if (violations.length > 0) {
    state.violations = [...state.violations, ...violations].slice(-20);
    violations.forEach(v => console.warn(`[Kernel Safety] ${v}`));
  }

  return violations;
}
