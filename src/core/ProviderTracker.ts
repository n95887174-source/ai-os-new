/**
 * ProviderTracker - Legacy re-export layer
 * Implementation lives in src/kernel/services/provider-tracker.ts
 */

import { ProviderTracker } from '../kernel/services/provider-tracker';
import type { SystemState } from '../kernel/types/metrics-types';
import type { ProviderMetricData } from '../kernel/services/provider-tracker';

const providerTracker = new ProviderTracker();

export { ProviderTracker };
export type { ProviderTrackerDeps, ProviderMetricData, IProviderTracker } from '../kernel/services/provider-tracker';

export function updateProviderMetric(state: SystemState, data: ProviderMetricData): void {
  providerTracker.updateProviderMetric(state, data);
}

export function updateProviderError(state: SystemState, data: { provider: string }): void {
  providerTracker.updateProviderError(state, data);
}

export function calculateSelectionRates(state: SystemState): void {
  providerTracker.calculateSelectionRates(state);
}
