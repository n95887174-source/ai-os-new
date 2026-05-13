import { eventBus } from '../core/events';
import type { EventMap } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import type { Role, RoleWithStats, RoleUpdateInput, RoleCreateInput, RoleCategory } from '../types/role';
import { DEFAULT_ROLE_PERMISSIONS } from '../types/role';
import { toolService } from './ToolService';
import { orchestrator } from './OrchestrationService';

export interface RoleUsageStats {
  invocations: number;
  errors: number;
  totalLatency: number;
  avgLatency: number;
  lastUsed: number;
  totalTokens: number;
}

const DEFAULT_ROLES: Role[] = [
  {
    id: 'r-architect',
    name: 'System Architect',
    description: 'Expert in high-level system design and architectural patterns.',
    systemPrompt: 'You are a senior system architect. Focus on scalability, modularity, and clean code principles.',
    baseTemperature: 0.2,
    capabilities: ['code_interpreter'],
    permissions: DEFAULT_ROLE_PERMISSIONS.technical,
    metadata: { category: 'technical', created: Date.now(), updated: Date.now() },
    isBuiltin: true,
  },
  {
    id: 'r-critic',
    name: 'Critical Auditor',
    description: 'Specializes in finding flaws, security risks, and edge cases.',
    systemPrompt: 'You are a critical auditor. Your job is to find weaknesses in the provided input and suggest improvements.',
    baseTemperature: 0.1,
    capabilities: [],
    permissions: DEFAULT_ROLE_PERMISSIONS.analytical,
    metadata: { category: 'analytical', created: Date.now(), updated: Date.now() },
    isBuiltin: true,
  },
  {
    id: 'r-creative',
    name: 'Creative Visionary',
    description: 'Generates out-of-the-box ideas and creative solutions.',
    systemPrompt: 'You are a creative visionary. Think outside the box and provide innovative, non-standard perspectives.',
    baseTemperature: 0.8,
    capabilities: [],
    permissions: DEFAULT_ROLE_PERMISSIONS.creative,
    metadata: { category: 'creative', created: Date.now(), updated: Date.now() },
    isBuiltin: true,
  },
];

class RoleService {
  private roles: Role[] = [];
  private assignments: Map<string, string[]> = new Map();
  private usageStats: Map<string, RoleUsageStats> = new Map();
  private unsubs: Array<() => void> = [];

  constructor() {
    this.load();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('system:topology:mounted', (topology) => {
        this.syncAssignments(topology as { nodes?: { id: string; config?: { roleId?: string } }[] });
      })
    );
  }

  private async load() {
    try {
      const count = await dexieDb.roles.count();
      if (count > 0) {
        this.roles = await dexieDb.roles.toArray();
      } else {
        const stored = localStorage.getItem('super_agents_roles');
        if (stored) {
          try {
            this.roles = JSON.parse(stored);
            await dexieDb.roles.bulkAdd(this.roles);
            localStorage.removeItem('super_agents_roles');
          } catch (e) {
            console.error('[RoleService] Failed to migrate roles from localStorage', e);
            this.roles = DEFAULT_ROLES;
            await dexieDb.roles.bulkAdd(this.roles);
          }
        } else {
          this.roles = DEFAULT_ROLES;
          await dexieDb.roles.bulkAdd(this.roles);
        }
      }
    } catch (e) {
      console.error('[RoleService] Failed to load roles from Dexie', e);
      this.roles = DEFAULT_ROLES;
    }

    const statsStored = await dexieDb.keyValue.get('role_usage_stats');
    if (statsStored?.value) {
      try {
        this.usageStats = new Map(statsStored.value as Array<[string, RoleUsageStats]>);
      } catch (e) {
        console.warn('[RoleService] Failed to parse stored role stats:', e);
      }
    }
    localStorage.removeItem('super_agents_role_stats');
  }

  private async persist() {
    try {
      await dexieDb.roles.bulkPut(this.roles);
    } catch (e) {
      console.error('[RoleService] Failed to persist roles', e);
    }
  }

  private saveStats() {
    dexieDb.keyValue.put({ id: 'role_usage_stats', value: [...this.usageStats] }).catch(e =>
      console.warn('[RoleService] Failed to persist role stats:', e)
    );
  }

  getAllRoles(): Role[] {
    return [...this.roles];
  }

  getRole(id: string): Role | undefined {
    return this.roles.find(r => r.id === id);
  }

  getRolesByCategory(category: RoleCategory): Role[] {
    return this.roles.filter(r => r.metadata.category === category);
  }

  getBuiltinRoles(): Role[] {
    return this.roles.filter(r => r.isBuiltin);
  }

  getCustomRoles(): Role[] {
    return this.roles.filter(r => !r.isBuiltin);
  }

  addRole(input: RoleCreateInput): Role {
    const newRole: Role = {
      ...input,
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      permissions: input.permissions || DEFAULT_ROLE_PERMISSIONS[input.metadata?.category || 'custom'],
      metadata: {
        category: input.metadata?.category || 'custom',
        created: Date.now(),
        updated: Date.now(),
        tags: input.metadata?.tags,
        author: input.metadata?.author,
      },
    };
    this.roles.push(newRole);
    this.persist();
    eventBus.emit('roles:updated', this.roles);
    return newRole;
  }

  updateRole(id: string, updates: RoleUpdateInput) {
    this.roles = this.roles.map(r =>
      r.id === id ? { ...r, ...updates, metadata: { ...r.metadata, ...(updates.metadata || {}), updated: Date.now() } } : r
    );
    this.persist();
    eventBus.emit('roles:updated', this.roles);
  }

  deleteRole(id: string) {
    this.roles = this.roles.filter(r => r.id !== id);
    this.assignments.delete(id);
    this.usageStats.delete(id);

    const topology = orchestrator.getActiveTopology();
    if (topology) {
      let changed = false;
      for (const node of topology.nodes) {
        if (node.config?.roleId === id) {
          delete node.config.roleId;
          changed = true;
        }
      }
      if (changed) {
        orchestrator.mount({ ...topology });
      }
    }

    this.persist();
    eventBus.emit('roles:updated', this.roles);
  }

  duplicateRole(id: string): Role | null {
    const source = this.getRole(id);
    if (!source) return null;
    const clone: Role = {
      ...source,
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      name: `${source.name} (Copy)`,
      isBuiltin: false,
      metadata: { ...source.metadata, created: Date.now(), updated: Date.now() },
    };
    this.roles.push(clone);
    this.persist();
    eventBus.emit('roles:updated', this.roles);
    return clone;
  }

  getRolesWithStats(): RoleWithStats[] {
    return this.roles.map(r => ({
      ...r,
      usageStats: {
        totalCalls: this.usageStats.get(r.id)?.invocations || 0,
        totalTokens: this.usageStats.get(r.id)?.totalTokens || 0,
        avgLatency: this.usageStats.get(r.id)?.avgLatency || 0,
        lastUsed: this.usageStats.get(r.id)?.lastUsed || null,
        assignedNodes: this.assignments.get(r.id) || [],
      },
    }));
  }

  syncAssignments(topology: { nodes?: { id: string; config?: { roleId?: string } }[] }) {
    this.assignments.clear();
    if (!topology?.nodes) return;
    for (const node of topology.nodes) {
      const roleId = node.config?.roleId;
      if (roleId) {
        const existing = this.assignments.get(roleId) || [];
        existing.push(node.id);
        this.assignments.set(roleId, existing);
      }
    }
  }

  assignNodeToRole(nodeId: string, roleId: string) {
    const existing = this.assignments.get(roleId) || [];
    if (!existing.includes(nodeId)) {
      existing.push(nodeId);
      this.assignments.set(roleId, existing);
      eventBus.emit('role:assigned' as keyof EventMap, { roleId, nodeId });
    }
  }

  unassignNodeFromRole(nodeId: string, roleId: string) {
    const existing = this.assignments.get(roleId) || [];
    const filtered = existing.filter(n => n !== nodeId);
    if (filtered.length !== existing.length) {
      this.assignments.set(roleId, filtered);
      eventBus.emit('role:unassigned' as keyof EventMap, { roleId, nodeId });
    }
  }

  getRoleForNode(nodeId: string): Role | null {
    for (const [roleId, nodeIds] of this.assignments) {
      if (nodeIds.includes(nodeId)) {
        return this.getRole(roleId) || null;
      }
    }
    return null;
  }

  getAgentsByRole(roleId: string): string[] {
    return this.assignments.get(roleId) || [];
  }

  validateRole(roleId: string): { valid: boolean; missingTools: string[] } {
    const role = this.getRole(roleId);
    if (!role) return { valid: false, missingTools: [] };
    const missingTools: string[] = [];
    const availableTools = toolService.getTools();
    for (const cap of role.capabilities) {
      const toolExists = availableTools.some(t => t.id === cap);
      if (!toolExists) missingTools.push(cap);
    }
    return { valid: missingTools.length === 0, missingTools };
  }

  recordRoleUsage(roleId: string, success: boolean, latency: number, tokens = 0) {
    const stats = this.usageStats.get(roleId) || {
      invocations: 0, errors: 0, totalLatency: 0, avgLatency: 0, lastUsed: 0, totalTokens: 0,
    };
    stats.invocations++;
    if (!success) stats.errors++;
    stats.totalLatency += latency;
    stats.avgLatency = stats.totalLatency / stats.invocations;
    stats.lastUsed = Date.now();
    stats.totalTokens += tokens;
    this.usageStats.set(roleId, stats);
    this.saveStats();
  }

  getRoleStats(roleId: string): RoleUsageStats | null {
    return this.usageStats.get(roleId) || null;
  }

  getAllStats(): Record<string, RoleUsageStats> {
    return Object.fromEntries(this.usageStats);
  }

  resetStats(roleId: string) {
    this.usageStats.delete(roleId);
    this.saveStats();
  }

  resetAllStats() {
    this.usageStats.clear();
    this.saveStats();
  }
}

export const roleService = new RoleService();
