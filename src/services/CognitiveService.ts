import { container } from '../core/Container';
import { CognitiveService as KernelCognitiveService } from '../kernel/services/cognitive-service';
import { RouterService as KernelRouter } from '../kernel/services/provider-router';

export type { CognitiveStats, DecisionAlternative } from '../kernel/services/cognitive-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const cognitiveService = new Proxy({} as KernelCognitiveService, {
  get: (_target, prop) => {
    try {
      if (container.has('cognitiveService')) {
        const instance = container.get<KernelCognitiveService>('cognitiveService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {}

    if (prop === 'getTraces') return () => [];
    if (prop === 'getStats') return () => ({
      totalTraces: 0, completedTraces: 0, failedTraces: 0,
      avgLatency: 0, avgTokens: 0, avgConfidence: 0,
      totalTokens: 0, totalCost: 0,
    });

    const protoVal = (KernelCognitiveService.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('cognitiveService');
          return instance[prop](...args);
        } catch (err) {
          console.warn(`[Proxy] Service not ready: cognitiveService.${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});

export { KernelCognitiveService as CognitiveService };
