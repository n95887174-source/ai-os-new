/**
 * Role Inheritance Service
 * Parent → Child role hierarchy with permission inheritance
 *
 * Uses the canonical Role type from role-types.ts to stay compatible
 * with RoleService. Storage is namespaced to avoid key collisions.
 */

import { genId } from '../../utils/gen-id';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import { StorageAdapter } from './storage-adapter';
import type { Role, RolePermission } from '../types/role-types';

const LOGGER = rootLogger.child('RoleInheritance');

const STORAGE_KEY_ROLES = 'role-inheritance:roles';
const STORAGE_KEY_VERSIONS = 'role-inheritance:versions';

export interface InheritanceRoleVersion {
  id: string;
  roleId: string;
  config: Omit<Role, 'id'>;
  changeNote?: string;
  createdAt: number;
  tag?: 'stable' | 'experimental' | 'deprecated' | 'active';
}

class RoleInheritanceService {
  private roles: Map<string, Role> = new Map();
  private versions: Map<string, InheritanceRoleVersion[]> = new Map();
  private storage: StorageAdapter;
  private maxVersionsPerRole = 50;

  constructor() {
    this.storage = StorageAdapter.ROLES;
  }

  async init(): Promise<void> {
    const savedRoles = await this.storage.get<Role[]>(STORAGE_KEY_ROLES);
    const savedVersions = await this.storage.get<{ roleId: string; versions: InheritanceRoleVersion[] }[]>(STORAGE_KEY_VERSIONS);

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

  async createRole(data: {
    name: string;
    description?: string;
    systemPrompt?: string;
    permissions?: RolePermission[];
    parentRoleId?: string;
    baseTemperature?: number;
    capabilities?: string[];
  }): Promise<Role> {
    const id = genId('role');

    if (data.parentRoleId && !this.roles.has(data.parentRoleId)) {
      throw new Error(`Parent role ${data.parentRoleId} does not exist`);
    }

    if (data.parentRoleId) {
      const wouldCreateCycle = this.wouldCreateCycle(data.parentRoleId, id);
      if (wouldCreateCycle) {
        throw new Error('Circular inheritance detected');
      }
    }

    const now = Date.now();
    const role: Role = {
      id,
      name: data.name,
      description: data.description || '',
      systemPrompt: data.systemPrompt || '',
      baseTemperature: data.baseTemperature ?? 0.7,
      capabilities: data.capabilities || [],
      permissions: data.permissions || [],
      parentRoleId: data.parentRoleId,
      metadata: {
        category: 'custom',
        created: now,
        updated: now,
      },
    };

    this.roles.set(id, role);
    await this.saveRoles();
    await this.createVersion(id, role, 'Initial creation');

    EventBus.emit(EVENTS.ROLE_CREATED, role);
    LOGGER.info('RoleInheritance', 'Role created', { id, name: data.name });

    return role;
  }

  async updateRole(id: string, data: Partial<Omit<Role, 'id'>>, changeNote?: string): Promise<Role | null> {
    const existing = this.roles.get(id);
    if (!existing) return null;

    const newParentRoleId = data.parentRoleId !== undefined ? data.parentRoleId : existing.parentRoleId;
    if (newParentRoleId && newParentRoleId !== existing.parentRoleId) {
      if (!this.roles.has(newParentRoleId)) {
        throw new Error(`Parent role ${newParentRoleId} does not exist`);
      }
      if (this.wouldCreateCycle(newParentRoleId, id)) {
        throw new Error('Circular inheritance detected');
      }
    }

    const updated: Role = {
      ...existing,
      ...data,
      metadata: {
        ...existing.metadata,
        ...(data.metadata || {}),
        updated: Date.now(),
      },
    };

    this.roles.set(id, updated);
    await this.saveRoles();
    await this.createVersion(id, updated, changeNote);

    EventBus.emit(EVENTS.ROLE_UPDATED, updated);
    LOGGER.info('RoleInheritance', 'Role updated', { id });

    return updated;
  }

  async deleteRole(id: string): Promise<boolean> {
    const existing = this.roles.get(id);
    if (!existing) return false;

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

  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  getRoleById(id: string): Role | undefined {
    return this.roles.get(id);
  }

  getChildren(parentRoleId: string): Role[] {
    return this.getAllRoles().filter(r => r.parentRoleId === parentRoleId);
  }

  getParent(roleId: string): Role | undefined {
    const role = this.roles.get(roleId);
    if (!role?.parentRoleId) return undefined;
    return this.roles.get(role.parentRoleId);
  }

  getInheritanceChain(roleId: string): Role[] {
    const chain: Role[] = [];
    const visited = new Set<string>();
    let current = this.roles.get(roleId);

    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      chain.unshift(current);
      current = current.parentRoleId ? this.roles.get(current.parentRoleId) : undefined;
    }

    return chain;
  }

  // ── Permission Inheritance ────────────────────────────────────────────

  getEffectivePermissions(roleId: string, visited = new Set<string>()): RolePermission[] {
    if (visited.has(roleId)) return [];
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role) return [];

    const parentPerms = role.parentRoleId ? this.getEffectivePermissions(role.parentRoleId, visited) : [];
    const merged = new Set<RolePermission>([...parentPerms, ...(role.permissions as RolePermission[])]);

    return Array.from(merged);
  }

  hasPermission(roleId: string, permission: RolePermission): boolean {
    return this.getEffectivePermissions(roleId).includes(permission);
  }

  async grantPermission(roleId: string, permission: RolePermission): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role) return null;

    if (role.permissions.includes(permission)) {
      return role;
    }

    return this.updateRole(roleId, {
      permissions: [...role.permissions, permission],
    }, `Granted permission: ${permission}`);
  }

  async revokePermission(roleId: string, permission: RolePermission): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role) return null;

    return this.updateRole(roleId, {
      permissions: role.permissions.filter(p => p !== permission),
    }, `Revoked permission: ${permission}`);
  }

  async breakInheritance(roleId: string): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role?.parentRoleId) return null;

    const effectivePerms = this.getEffectivePermissions(roleId);

    return this.updateRole(roleId, {
      parentRoleId: undefined,
      permissions: effectivePerms,
    }, 'Broke inheritance');
  }

  // ── Versioning ────────────────────────────────────────────────────────

  private async createVersion(roleId: string, config: Role, changeNote?: string): Promise<void> {
    if (!this.versions.has(roleId)) {
      this.versions.set(roleId, []);
    }

    const versions = this.versions.get(roleId)!;

    const version: InheritanceRoleVersion = {
      id: genId('v'),
      roleId,
      config: {
        name: config.name,
        description: config.description,
        systemPrompt: config.systemPrompt,
        baseTemperature: config.baseTemperature,
        capabilities: [...config.capabilities],
        permissions: [...config.permissions],
        parentRoleId: config.parentRoleId,
        metadata: { ...config.metadata },
      },
      changeNote,
      createdAt: Date.now(),
      tag: versions.length === 0 ? 'active' : undefined,
    };

    versions.push(version);

    if (versions.length > this.maxVersionsPerRole) {
      versions.splice(0, versions.length - this.maxVersionsPerRole);
    }

    await this.saveVersions();
  }

  getVersionHistory(roleId: string): InheritanceRoleVersion[] {
    return this.versions.get(roleId) || [];
  }

  getVersion(roleId: string, versionId: string): InheritanceRoleVersion | undefined {
    const versions = this.versions.get(roleId);
    return versions?.find(v => v.id === versionId);
  }

  async rollback(roleId: string, versionId: string): Promise<Role | null> {
    const version = this.getVersion(roleId, versionId);
    if (!version) return null;

    return this.updateRole(roleId, {
      name: version.config.name,
      description: version.config.description,
      systemPrompt: version.config.systemPrompt,
      baseTemperature: version.config.baseTemperature,
      capabilities: version.config.capabilities,
      permissions: version.config.permissions,
      parentRoleId: version.config.parentRoleId,
      metadata: { ...version.config.metadata },
    }, `Rolled back to ${versionId}`);
  }

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

  private wouldCreateCycle(parentRoleId: string, newChildId: string): boolean {
    let current = parentRoleId;
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current) || current === newChildId) {
        return true;
      }
      visited.add(current);
      const parent = this.roles.get(current);
      current = parent?.parentRoleId || '';
    }

    return false;
  }

  private async saveRoles(): Promise<void> {
    await this.storage.set(STORAGE_KEY_ROLES, this.getAllRoles());
  }

  private async saveVersions(): Promise<void> {
    const data = Array.from(this.versions.entries()).map(([roleId, versions]) => ({
      roleId,
      versions,
    }));
    await this.storage.set(STORAGE_KEY_VERSIONS, data);
  }

  getRoleTree(): Array<{ role: Role; depth: number; children: Role[] }> {
    const roots: Role[] = this.getAllRoles().filter(r => !r.parentRoleId);
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

  detectConflicts(roleId1: string, roleId2: string): {
    overlapping: string[];
    contradictory: string[];
  } {
    const perms1 = new Set(this.getEffectivePermissions(roleId1));
    const perms2 = new Set(this.getEffectivePermissions(roleId2));

    const overlapping: string[] = [];

    for (const p of perms1) {
      if (perms2.has(p)) {
        overlapping.push(p);
      }
    }

    return { overlapping, contradictory: [] };
  }
}

// Singleton instance
export const roleInheritanceService = new RoleInheritanceService();
