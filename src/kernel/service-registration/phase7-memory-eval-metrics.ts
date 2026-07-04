/**
 * Phase 7 — Memory, Evaluation & Metrics.
 *
 * A-04: All services now use registerFactory (lazy instantiation).
 */
import type { Phase } from './helpers';
import { MemoryOrchestrator } from '../services/memory-orchestrator';
import { EvalDatasetService } from '../services/eval-dataset-service';
import { CustomMetricsService } from '../services/custom-metrics-service';
import type { IProviderAdapter } from '../contracts/provider-adapter';
import type { IProviderTracker } from '../services/provider-tracker';

export const registerPhase7: Phase = ({ register }) => {
    register('memoryOrchestrator', (_c) => new MemoryOrchestrator());

    register('evalDatasetService', (c) => {
        const adapterRegistry = c.get<{
            getAdapter(p: string): IProviderAdapter | null;
        }>('providerAdapterRegistry');
        if (adapterRegistry) {
            return new EvalDatasetService(adapterRegistry);
        }
        // Return a stub so the container stays consistent
        return undefined as unknown as EvalDatasetService;
    });

    register('customMetricsService', (c) => {
        const tracker = c.get<IProviderTracker>('providerTracker');
        if (tracker) {
            return new CustomMetricsService(tracker);
        }
        return undefined as unknown as CustomMetricsService;
    });
};
