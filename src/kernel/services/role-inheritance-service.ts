/**
 * Role Inheritance Service
 * Parent → Child role hierarchy with permission inheritance
 */

import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('RoleInheritance');

export interface Role {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  permissions: string[];
  parentId?: string;
  isInherited: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RoleVersion {
  id: string;
  roleId: string;
  config: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>;
  changeNote?: string;
  createdAt: number;
  tag?: 'stable' | 'experimental' | 'deprecated' | 'active';
}

class RoleInheritanceService {
  private roles: Map<string, Role> = new Map();
  private versions: Map<string, RoleVersion[]> = new Map();
  private storage: StorageAdapter;
  private maxVersionsPerRole = 50;

  constructor() {
    this.storage = StorageAdapter.ROLES;
  }

  async init(): Promise<void> {
    // Load from storage
    const savedRoles = await this.storage.get<Role[]>('roles');
    const savedVersions = await this.storage.get<{ roleId: string; versions: RoleVersion[] }[]>('versions');

    if (savedRoles) {
      for (const role of savedRoles) {
        this.roles.set(role.id, role);
      }
    }

    if (savedVersions) {
      for (const { roleId, versions } of savedVersions) {
        this.versions.set(roleId, versions);
      }
    }

    LOGGER.info('RoleInheritance', `Initialized with ${this.roles.size} roles`);
  }

  // ── Role CRUD ─────────────────────────────────────────────────────────

  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    description?: string;
    systemPrompt?: string;
    permissions?: string[];
    parentId?: string;
  }): Promise<Role> {
    const id = `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Validate parent exists
    if (data.parentId && !this.roles.has(data.parentId)) {
      throw new Error(`Parent role ${data.parentId} does not exist`);
    }

    // Check for circular inheritance
    if (data.parentId) {
      const wouldCreateCycle = this.wouldCreateCycle(data.parentId, id);
      if (wouldCreateCycle) {
        throw new Error('Circular inheritance detected');
      }
    }

    const role: Role = {
      id,
      name: data.name,
      description: data.description || '',
      systemPrompt: data.systemPrompt || '',
      permissions: data.permissions || [],
      parentId: data.parentId,
      isInherited: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.roles.set(id, role);
    await this.saveRoles();
    await this.createVersion(id, role, 'Initial creation');

    EventBus.emit(EVENTS.ROLE_CREATED, role);
    LOGGER.info('RoleInheritance', 'Role created', { id, name: data.name });

    return role;
  }

  /**
   * Update a role
   */
  async updateRole(id: string, data: Partial<Omit<Role, 'id' | 'createdAt'>>, changeNote?: string): Promise<Role | null> {
    const existing = this.roles.get(id);
    if (!existing) return null;

    const updated: Role = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    this.roles.set(id, updated);
    await this.saveRoles();
    await this.createVersion(id, updated, changeNote);

    EventBus.emit(EVENTS.ROLE_UPDATED, updated);
    LOGGER.info('RoleInheritance', 'Role updated', { id });

    return updated;
  }

  /**
   * Delete a role
   */
  async deleteRole(id: string): Promise<boolean> {
    const existing = this.roles.get(id);
    if (!existing) return false;

    // Check if any roles inherit from this one
    const children = this.getChildren(id);
    if (children.length > 0) {
      LOGGER.warn('RoleInheritance', 'Cannot delete role with children', { id, children: children.map(c => c.id) });
      return false;
    }

    this.roles.delete(id);
    this.versions.delete(id);
    await this.saveRoles();
    await this.saveVersions();

    EventBus.emit(EVENTS.ROLE_DELETED, { id });
    LOGGER.info('RoleInheritance', 'Role deleted', { id });

    return true;
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): Role | undefined {
    return this.roles.get(id);
  }

  /**
   * Get children of a role
   */
  getChildren(parentId: string): Role[] {
    return this.getAllRoles().filter(r => r.parentId === parentId);
  }

  /**
   * Get parent of a role
   */
  getParent(roleId: string): Role | undefined {
    const role = this.roles.get(roleId);
    if (!role?.parentId) return undefined;
    return this.roles.get(role.parentId);
  }

  /**
   * Get full inheritance chain (root to leaf)
   */
  getInheritanceChain(roleId: string): Role[] {
    const chain: Role[] = [];
    let current = this.roles.get(roleId);

    while (current) {
      chain.unshift(current);
      current = current.parentId ? this.roles.get(current.parentId) : undefined;
    }

    return chain;
  }

  // ── Permission Inheritance ────────────────────────────────────────────

  /**
   * Get effective permissions (resolves inheritance)
   */
  getEffectivePermissions(roleId: string): string[] {
    const role = this.roles.get(roleId);
    if (!role) return [];

    // Get parent permissions recursively
    const parentPerms = role.parentId ? this.getEffectivePermissions(role.parentId) : [];

    // Merge: parent permissions + own permissions (override not supported - child adds)
    const merged = new Set([...parentPerms, ...role.permissions]);

    return Array.from(merged);
  }

  /**
   * Check if a role has a specific permission (resolves inheritance)
   */
  hasPermission(roleId: string, permission: string): boolean {
    return this.getEffectivePermissions(roleId).includes(permission);
  }

  /**
   * Grant permission to a role
   */
  async grantPermission(roleId: string, permission: string): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role) return null;

    if (role.permissions.includes(permission)) {
      return role; // Already has it
    }

    return this.updateRole(roleId, {
      permissions: [...role.permissions, permission]
    }, `Granted permission: ${permission}`);
  }

  /**
   * Revoke permission from a role
   */
  async revokePermission(roleId: string, permission: string): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role) return null;

    return this.updateRole(roleId, {
      permissions: role.permissions.filter(p => p !== permission)
    }, `Revoked permission: ${permission}`);
  }

  /**
   * Break inheritance (copy parent permissions, become independent)
   */
  async breakInheritance(roleId: string): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role?.parentId) return null;

    // Get current effective permissions
    const effectivePerms = this.getEffectivePermissions(roleId);

    // Update role with copied permissions and no parent
    return this.updateRole(roleId, {
      parentId: undefined,
      permissions: effectivePerms,
      isInherited: false,
    }, 'Broke inheritance');
  }

  // ── Versioning ────────────────────────────────────────────────────────

  /**
   * Create a version snapshot
   */
  private async createVersion(roleId: string, config: Role, changeNote?: string): Promise<void> {
    if (!this.versions.has(roleId)) {
      this.versions.set(roleId, []);
    }

    const versions = this.versions.get(roleId)!;

    const version: RoleVersion = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roleId,
      config: {
        name: config.name,
        description: config.description,
        systemPrompt: config.systemPrompt,
        permissions: [...config.permissions],
        parentId: config.parentId,
        isInherited: config.isInherited,
      },
      changeNote,
      createdAt: Date.now(),
      tag: versions.length === 0 ? 'active' : undefined,
    };

    versions.push(version);

    // Trim old versions
    if (versions.length > this.maxVersionsPerRole) {
      versions.splice(0, versions.length - this.maxVersionsPerRole);
    }

    await this.saveVersions();
  }

  /**
   * Get version history for a role
   */
  getVersionHistory(roleId: string): RoleVersion[] {
    return this.versions.get(roleId) || [];
  }

  /**
   * Get specific version
   */
  getVersion(roleId: string, versionId: string): RoleVersion | undefined {
    const versions = this.versions.get(roleId);
    return versions?.find(v => v.id === versionId);
  }

  /**
   * Rollback to a specific version
   */
  async rollback(roleId: string, versionId: string): Promise<Role | null> {
    const version = this.getVersion(roleId, versionId);
    if (!version) return null;

    return this.updateRole(roleId, {
      name: version.config.name,
      description: version.config.description,
      systemPrompt: version.config.systemPrompt,
      permissions: version.config.permissions,
      parentId: version.config.parentId,
      isInherited: version.config.isInherited,
    }, `Rolled back to ${versionId}`);
  }

  /**
   * Tag a version
   */
  async tagVersion(roleId: string, versionId: string, tag: 'stable' | 'experimental' | 'deprecated'): Promise<void> {
    const versions = this.versions.get(roleId);
    if (!versions) return;

    const version = versions.find(v => v.id === versionId);
    if (version) {
      version.tag = tag;
      await this.saveVersions();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private wouldCreateCycle(parentId: string, newChildId: string): boolean {
    let current = parentId;
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current) || current === newChildId) {
        return true;
      }
      visited.add(current);
      const parent = this.roles.get(current);
      current = parent?.parentId || '';
    }

    return false;
  }

  private async saveRoles(): Promise<void> {
    await this.storage.set('roles', this.getAllRoles());
  }

  private async saveVersions(): Promise<void> {
    const data = Array.from(this.versions.entries()).map(([roleId, versions]) => ({
      roleId,
      versions,
    }));
    await this.storage.set('versions', data);
  }

  /**
   * Get role tree (hierarchical view)
   */
  getRoleTree(): Array<{ role: Role; depth: number; children: Role[] }> {
    const roots: Role[] = this.getAllRoles().filter(r => !r.parentId);
    const result: Array<{ role: Role; depth: number; children: Role[] }> = [];

    const buildTree = (role: Role, depth: number) => {
      const children = this.getChildren(role.id);
      result.push({ role, depth, children });
      for (const child of children) {
        buildTree(child, depth + 1);
      }
    };

    for (const root of roots) {
      buildTree(root, 0);
    }

    return result;
  }

  /**
   * Detect conflicts between roles
   */
  detectConflicts(roleId1: string, roleId2: string): {
    overlapping: string[];
    contradictory: string[];
  } {
    const perms1 = new Set(this.getEffectivePermissions(roleId1));
    const perms2 = new Set(this.getEffectivePermissions(roleId2));

    const overlapping: string[] = [];
    const contradictory: string[] = [];

    for (const p of perms1) {
      if (perms2.has(p)) {
        overlapping.push(p);
      }
    }

    // Contradictory would require additional logic (e.g., role A grants X, role B explicitly revokes X)
    // For now, we just flag high overlap as potential conflict

    return { overlapping, contradictory };
  }
}

// Singleton instance
export const roleInheritanceService = new RoleInheritanceService();