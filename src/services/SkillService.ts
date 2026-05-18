import { resolve } from './service-resolver';
import { SkillService as KernelSkillService } from '../kernel/services/skill-service';
export { KernelSkillService as SkillService };
export type { CognitiveSkill } from '../kernel/services/skill-service';
export const skillService = resolve<KernelSkillService>('skillService');
