import { eventBus } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import { SkillService as KernelSkillService } from '../kernel/services/skill-service';

export type { CognitiveSkill } from '../types/domain';

export class SkillService extends KernelSkillService {
  constructor() {
    super({
      eventBus,
      database: dexieDb as any,
    });
  }
}

export const skillService = new SkillService();
