import { resolve } from './service-resolver';
import { DebateService as KernelDebateService } from '../kernel/services/debate-service';
export { KernelDebateService as DebateService };
export type { DebateSession, DebateParticipant, DebateArgument, DebateConfig } from '../kernel/services/debate-service';
export const debateService = resolve<KernelDebateService>('debateService');
