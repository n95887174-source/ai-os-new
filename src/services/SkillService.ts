import { container } from '../core/Container';
import { SkillService as KernelSkillService } from '../kernel/services/skill-service';

export type { CognitiveSkill } from '../types/domain';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const skillService = new Proxy({} as KernelSkillService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelSkillService>('skillService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelSkillService.prototype as any)[prop];
    }
  }
});

export { KernelSkillService as SkillService };
