import { eventBus } from '../core/events';
import type { Role } from '../types/role';

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

class RoleService {
  private roles: Role[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const stored = localStorage.getItem(ROLES_STORAGE_KEY);
    if (stored) {
      try {
        this.roles = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load roles', e);
        this.roles = DEFAULT_ROLES;
      }
    } else {
      this.roles = DEFAULT_ROLES;
      this.persist();
    }
  }

  private persist() {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(this.roles));
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
    this.persist();
    eventBus.emit('roles:updated', this.roles);
    return newRole;
  }

  updateRole(id: string, updates: Partial<Role>) {
    this.roles = this.roles.map(r => 
      r.id === id ? { ...r, ...updates, metadata: { ...r.metadata, updated: Date.now() } } : r
    );
    this.persist();
    eventBus.emit('roles:updated', this.roles);
  }

  deleteRole(id: string) {
    this.roles = this.roles.filter(r => r.id !== id);
    this.persist();
    eventBus.emit('roles:updated', this.roles);
  }
}

export const roleService = new RoleService();
