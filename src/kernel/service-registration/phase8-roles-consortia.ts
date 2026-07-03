import type { Phase } from './helpers';
import type { IDatabaseService, IEventBus } from '../types/interfaces';
import { UnifiedRoleRegistry } from '../services/unified-role-service';
import { RoleTeamService } from '../services/role-team-service';

export const registerPhase8: Phase = ({ register, get }) => {
    const eventBus = get<IEventBus>('eventBus');
    register('unifiedRoleRegistry', new UnifiedRoleRegistry());
    register('roleTeamService', new RoleTeamService(eventBus, get<IDatabaseService>('database')));
};
