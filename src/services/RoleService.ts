import { eventBus } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import type { Role } from '../types/role';
import { toolService } from './ToolService';

const ROLES_STORAGE_KEY = 'super_agents_roles';

const DEFAULT_ROLES: Role[] = [
  {
    id: 'r-architect',
    name: 'System Architect',
    description: 'Expert in high-level system design and architectural patterns.',
    systemPrompt: 'You are a senior system architect. Focus on scalability, modularity, and clean code principles.',
    baseTemperature: 0.2,
    capabilities: ['t-search', 't-code'],
    metadata: {
      category: 'technical',
      created: Date.now(),
      updated: Date.now()
    }
  },
  {
    id: 'r-critic',
    name: 'Critical Auditor',
    description: 'Specializes in finding flaws, security risks, and edge cases.',
    systemPrompt: 'You are a critical auditor. Your job is to find weaknesses in the provided input and suggest improvements.',
    baseTemperature: 0.1,
    capabilities: ['t-search'],
    metadata: {
      category: 'analytical',
      created: Date.now(),
      updated: Date.now()
    }
  },
  {
    id: 'r-creative',
    name: 'Creative Visionary',
    description: 'Generates out-of-the-box ideas and creative solutions.',
    systemPrompt: 'You are a creative visionary. Think outside the box and provide innovative, non-standard perspectives.',
    baseTemperature: 0.8,
    capabilities: [],
    metadata: {
      category: 'creative',
      created: Date.now(),
      updated: Date.now()
    }
  }
];

export interface RoleUsageStats {
  invocations: number;
  errors: number;
  totalLatency: number;
  avgLatency: number;
  lastUsed: number;
}

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
    this.unsubs = [];
  }

  private setupListeners() {
<<<<<<< HEAD
    this.unsubs.push(
      eventBus.on('system:topology:mounted', (topology) => {
        this.syncAssignments(topology as { nodes?: { id: string; config?: { roleId?: string } }[] });
      })
    );
=======
    eventBus.on('system:topology:mounted', (topology) => {
      this.syncAssignments(topology as { nodes?: { id: string; config?: { roleId?: string } }[] });
    });
>>>>>>> 54e1276a5d5730e4e3edce0bb2038b8d9038b261
  }

  private async load() {
    try {
      const count = await dexieDb.roles.count();
      if (count > 0) {
        this.roles = await dexieDb.roles.toArray();
      } else {
        const stored = localStorage.getItem(ROLES_STORAGE_KEY);
        if (stored) {
          try {
            this.roles = JSON.parse(stored);
            await dexieDb.roles.bulkAdd(this.roles);
            localStorage.removeItem(ROLES_STORAGE_KEY);
          } catch (e) {
            console.error('Failed to migrate roles from localStorage', e);
            this.roles = DEFAULT_ROLES;
            await dexieDb.roles.bulkAdd(this.roles);
          }
        } else {
          this.roles = DEFAULT_ROLES;
          await dexieDb.roles.bulkAdd(this.roles);
        }
      }
    } catch (e) {
      console.error('Failed to load roles from Dexie', e);
      this.roles = DEFAULT_ROLES;
    }

    const statsStored = localStorage.getItem('super_agents_role_stats');
    if (statsStored) {
      try {
        this.usageStats = new Map(JSON.parse(statsStored));
      } catch {
        // ignore
      }
    }

  }

  private async persist() {
    try {
      await dexieDb.roles.bulkPut(this.roles);
    } catch (e) {
      console.error('Failed to persist roles', e);
    }
  }

  getRoles() {
    return this.roles;
  }

  getRole(id: string) {
    return this.roles.find(r => r.id === id);
  }

  addRole(role: Omit<Role, 'id' | 'metadata'>) {
    const newRole: Role = {
      ...role,
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      metadata: {
        category: 'technical',
        created: Date.now(),
        updated: Date.now()
      }
    };
    this.roles.push(newRole);
    this.persist().catch(console.error);
    eventBus.emit('roles:updated', this.roles);
    return newRole;
  }

  updateRole(id: string, updates: Partial<Role>) {
    this.roles = this.roles.map(r =>
      r.id === id ? { ...r, ...updates, metadata: { ...r.metadata, updated: Date.now() } } : r
    );
    this.persist().catch(console.error);
    eventBus.emit('roles:updated', this.roles);
  }

  deleteRole(id: string) {
    this.roles = this.roles.filter(r => r.id !== id);
    this.assignments.delete(id);
    this.usageStats.delete(id);
    this.persist().catch(console.error);
    eventBus.emit('roles:updated', this.roles);
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

  recordRoleUsage(roleId: string, success: boolean, latency: number) {
    const stats = this.usageStats.get(roleId) || {
      invocations: 0, errors: 0, totalLatency: 0, avgLatency: 0, lastUsed: 0
    };
    stats.invocations++;
    if (!success) stats.errors++;
    stats.totalLatency += latency;
    stats.avgLatency = stats.totalLatency / stats.invocations;
    stats.lastUsed = Date.now();
    this.usageStats.set(roleId, stats);
    localStorage.setItem('super_agents_role_stats', JSON.stringify([...this.usageStats]));
  }

  getRoleStats(roleId: string): RoleUsageStats | null {
    return this.usageStats.get(roleId) || null;
  }

  getAllStats(): Record<string, RoleUsageStats> {
    return Object.fromEntries(this.usageStats);
  }
}

export const roleService = new RoleService();
