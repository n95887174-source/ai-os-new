import type { Phase } from './helpers';
import { UnifiedRoleRegistry } from '../services/unified-role-service';

export const registerPhase8: Phase = ({ register }) => {
    register('unifiedRoleRegistry', new UnifiedRoleRegistry());
};
