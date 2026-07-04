/**
 * Phase 8 — Roles & Consortia.
 *
 * A-04: All services now use registerFactory (lazy instantiation).
 */
import type { Phase } from './helpers';
import type { IDatabaseService, IEventBus } from '../types/interfaces';
import { UnifiedRoleRegistry } from '../services/unified-role-service';
import { RoleTeamService } from '../services/role-team-service';

export const registerPhase8: Phase = ({ register }) => {
    register('unifiedRoleRegistry', (_c) => new UnifiedRoleRegistry());
    register('roleTeamService', (c) =>
        new RoleTeamService(c.get<IEventBus>('eventBus'), c.get<IDatabaseService>('database')),
    );
};
