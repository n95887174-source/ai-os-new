import { createServiceProxy } from './create-service-proxy';
import { DebateService as KernelDebateService } from '../kernel/services/debate-service';

export type { DebateSession, DebateParticipant, DebateArgument, DebateConfig } from '../kernel/services/debate-service';

export const debateService = createServiceProxy('debateService', KernelDebateService);
export { KernelDebateService as DebateService };
