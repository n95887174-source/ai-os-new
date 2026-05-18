import { createServiceProxy } from './create-service-proxy';
import { SkillService as KernelSkillService } from '../kernel/services/skill-service';

export type { CognitiveSkill } from '../kernel/services/skill-service';

export const skillService = createServiceProxy('skillService', KernelSkillService);
export { KernelSkillService as SkillService };
