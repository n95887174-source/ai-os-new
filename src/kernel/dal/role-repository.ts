/**
 * RoleRepository — DAL wrapper for agent roles/personas
 * 
 * Provides typed access to role definitions.
 */

import type { DatabaseService } from '../services/database-service';
import type { Role } from '../../types/role';

const MAX_ROLES = 100;

export class RoleRepository {
  private cache: Map<string, Role> = new Map();
  private cacheLoaded = false;
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheLoaded) return;
    
    const roles = await this.db.roles.toArray();
    
    this.cache.clear();
    for (const role of roles) {
      this.cache.set(role.id, role);
    }
    this.cacheLoaded = true;
  }

  async getAll(): Promise<Role[]> {
    await this.ensureCache();
    return Array.from(this.cache.values());
  }

  async get(id: string): Promise<Role | undefined> {
    await this.ensureCache();
    
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const role = await this.db.roles.get(id);
    if (role) {
      this.cache.set(role.id, role);
    }
    return role;
  }

  async save(role: Role): Promise<void> {
    await this.db.roles.put(role);
    this.cache.set(role.id, role);
    this.enforceLimit();
  }

  async delete(id: string): Promise<void> {
    await this.db.roles.delete(id);
    this.cache.delete(id);
  }

  private enforceLimit(): void {
    if (this.cache.size <= MAX_ROLES) return;
    
    const sorted = Array.from(this.cache.values())
      .sort((a, b) => (b.metadata?.updated ?? 0) - (a.metadata?.updated ?? 0))
      .slice(0, MAX_ROLES);
    
    this.cache.clear();
    for (const role of sorted) {
      this.cache.set(role.id, role);
    }
  }
}
