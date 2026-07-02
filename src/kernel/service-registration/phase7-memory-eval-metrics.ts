import type { Phase } from './helpers';
import { MemoryOrchestrator } from '../services/memory-orchestrator';
import { EvalDatasetService } from '../services/eval-dataset-service';
import { CustomMetricsService } from '../services/custom-metrics-service';
import type { IProviderAdapter } from '../contracts/provider-adapter';
import type { IProviderTracker } from '../services/provider-tracker';

export const registerPhase7: Phase = ({ register, get }) => {
    const orchestrator = new MemoryOrchestrator();
    register('memoryOrchestrator', orchestrator);

    const adapterRegistry = get<{ getAdapter(p: string): IProviderAdapter | null }>(
        'providerAdapterRegistry',
    );
    if (adapterRegistry) {
        register('evalDatasetService', new EvalDatasetService(adapterRegistry));
    }

    const tracker = get<IProviderTracker>('providerTracker');
    if (tracker) {
        register('customMetricsService', new CustomMetricsService(tracker));
    }
};
