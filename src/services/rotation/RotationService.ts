import { container } from '../../core/Container';
import { RotationService as KernelRotationService } from '../../kernel/services/rotation-service';

export { KernelRotationService as RotationService };
export type { IRotationService, IKeyRotationManager } from '../../kernel/contracts/key-rotation';

let fallbackInstance: KernelRotationService | null = null;

export const rotationService = new Proxy({} as KernelRotationService, {
  get: (_target, prop) => {
    try {
      if (container.has('rotationService')) {
        const instance = container.get<KernelRotationService>('rotationService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch {}

    if (!fallbackInstance) {
      fallbackInstance = new KernelRotationService({
        keyManager: { getKeys: () => [], addKey: async () => ({} as any), updateKey: () => {} },
        eventBus: { on: () => () => {}, emit: () => {} },
      });
    }
    const val = (fallbackInstance as any)[prop];
    if (typeof val === 'function') return val.bind(fallbackInstance);
    return val;
  }
});
