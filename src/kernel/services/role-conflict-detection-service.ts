/**
 * Role Conflict Detection Service
 * Find overlapping or contradictory permissions
 */

import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('RoleConflict');

export interface Conflict {
  roleIdA: string;
  roleIdB: string;
  type: 'overlap' | 'contradiction' | 'dominance';
  conflictingPermissions: string[];
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface RolePermissions {
  roleId: string;
  permissions: string[];
  inherited: string[];
}

const CONFLICT_PAIRS: [string, string][] = [
  ['chat:send', 'chat:read-only'],
  ['memory:read', 'memory:deny'],
  ['memory:write', 'memory:read-only'],
  ['tools:execute', 'tools:deny'],
  ['tools:manage', 'tools:read-only'],
];

class RoleConflictDetectionService {
  /**
   * Detect conflicts between roles
   */
  detectConflicts(roleA: RolePermissions, roleB: RolePermissions): Conflict[] {
    const conflicts: Conflict[] = [];

    const permsA = new Set(roleA.permissions);
    const permsB = new Set(roleB.permissions);

    // Check for overlap (both have same permission)
    const overlapping = [...permsA].filter(p => permsB.has(p));
    if (overlapping.length > 0) {
      conflicts.push({
        roleIdA: roleA.roleId,
        roleIdB: roleB.roleId,
        type: 'overlap',
        conflictingPermissions: overlapping,
        severity: overlapping.length > 3 ? 'high' : 'medium',
        description: `Roles share ${overlapping.length} permissions, which may cause redundancy or confusion.`,
      });
    }

    // Check for contradictions
    for (const [permA, permB] of CONFLICT_PAIRS) {
      const hasA = permsA.has(permA);
      const hasB = permsB.has(permA);
      const hasPermB = permsA.has(permB) || permsB.has(permB);

      if (hasA && hasB) {
        conflicts.push({
          roleIdA: roleA.roleId,
          roleIdB: roleB.roleId,
          type: 'contradiction',
          conflictingPermissions: [permA, permB],
          severity: 'high',
          description: `${roleA.roleId} and ${roleB.roleId} have contradictory permissions (${permA} vs ${permB}).`,
        });
      }
    }

    // Check for dominance (one role has all permissions of another + more)
    const allInA = [...permsB].filter(p => permsA.has(p));
    const allInB = [...permsA].filter(p => permsB.has(p));

    if (allInA.length === permsB.size && permsA.size > permsB.size) {
      conflicts.push({
        roleIdA: roleA.roleId,
        roleIdB: roleB.roleId,
        type: 'dominance',
        conflictingPermissions: [...permsB],
        severity: 'low',
        description: `${roleA.roleId} completely dominates ${roleB.roleId} — consider removing the lesser role.`,
      });
    }

    if (allInB.length === permsA.size && permsB.size > permsA.size) {
      conflicts.push({
        roleIdA: roleA.roleId,
        roleIdB: roleB.roleId,
        type: 'dominance',
        conflictingPermissions: [...permsA],
        severity: 'low',
        description: `${roleB.roleId} completely dominates ${roleA.roleId} — consider removing the lesser role.`,
      });
    }

    return conflicts;
  }

  /**
   * Check all roles for conflicts
   */
  checkAllRoles(roles: RolePermissions[]): Conflict[] {
    const allConflicts: Conflict[] = [];

    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const conflicts = this.detectConflicts(roles[i], roles[j]);
        allConflicts.push(...conflicts);
      }
    }

    return allConflicts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Validate role against others
   */
  validateRole(role: RolePermissions, allRoles: RolePermissions[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const other of allRoles) {
      if (other.roleId === role.roleId) continue;
      conflicts.push(...this.detectConflicts(role, other));
    }

    return conflicts;
  }

  /**
   * Get conflict summary
   */
  getSummary(conflicts: Conflict[]): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    criticalRoles: string[];
  } {
    const bySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const byType: Record<string, number> = { overlap: 0, contradiction: 0, dominance: 0 };
    const affectedRoles = new Set<string>();

    for (const conflict of conflicts) {
      bySeverity[conflict.severity]++;
      byType[conflict.type]++;
      affectedRoles.add(conflict.roleIdA);
      affectedRoles.add(conflict.roleIdB);
    }

    return {
      total: conflicts.length,
      bySeverity,
      byType,
      criticalRoles: Array.from(affectedRoles),
    };
  }
}

// Singleton
export const roleConflictDetectionService = new RoleConflictDetectionService();