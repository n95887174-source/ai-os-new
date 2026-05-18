import { resolve } from './service-resolver';
import { SkillService as KernelSkillService } from '../kernel/services/skill-service';
export { KernelSkillService as SkillService };
export type { CognitiveSkill } from '../kernel/types/domain-types';
export const skillService = resolve<KernelSkillService>('skillService');
