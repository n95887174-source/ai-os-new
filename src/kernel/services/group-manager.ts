import type { KeyPassport, KeyGroup, IGroupManager } from '../contracts/group-manager';
import type { KeyService } from './key-management/key-service';
import type { ApiKey } from '../types/metrics-types';
import type { Result } from '../contracts/results';
import { ok, fail } from '../contracts/results';
import type { ApiKey as VaultApiKey } from '../contracts/key-vault';
import type { IEventBus } from '../contracts/event-bus';

const KV_GROUPS = 'key_groups';
const KV_PASSPORTS = 'key_passports';
const DEFAULT_GROUP_ID = '__default__';
const DEFAULT_GROUP_NAME = 'Default';

interface GroupManagerDeps {
  keyService: KeyService;
  eventBus: IEventBus;
  storage: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

export class GroupManagerService implements IGroupManager {
  private deps: GroupManagerDeps;
  private groups: KeyGroup[] = [];
  private passports: Map<string, KeyPassport> = new Map();
  private loaded = false;
  private unsubs: Array<() => void> = [];

  get ready(): boolean {
    return this.loaded;
  }

  constructor(deps: GroupManagerDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {
    const saved = await this.deps.storage.getKv<{ groups: KeyGroup[]; passports: [string, KeyPassport][] }>(KV_GROUPS);
    if (saved) {
      this.groups = saved.groups;
      this.passports = new Map(saved.passports);
    }
    // Auto-create default group if missing
    if (!this.groups.find(g => g.id === DEFAULT_GROUP_ID)) {
      this.groups.push({
        id: DEFAULT_GROUP_ID,
        name: DEFAULT_GROUP_NAME,
        createdAt: Date.now(),
        keyIds: [],
      });
    }
    this.loaded = true;
    // Subscribe to key:state:changed for reactive passport sync
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ id: string; status: string }>('key:state:changed', (data) => {
        const p = this.passports.get(data.id);
        if (p && data.status) p.status = data.status;
      }),
    );
  }

  async destroy(): Promise<void> {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    await this.persist();
  }

  private async persist(): Promise<void> {
    await this.deps.storage.setKv(KV_GROUPS, {
      groups: this.groups,
      passports: Array.from(this.passports.entries()),
    });
  }

  getDefaultGroup(): KeyGroup {
    const g = this.groups.find(g => g.id === DEFAULT_GROUP_ID);
    if (!g) throw new Error('Default group missing — init() not called');
    return g;
  }

  async createGroup(name: string, description?: string): Promise<string> {
    const existing = this.groups.find(g => g.name === name);
    if (existing) return existing.id;
    const id = `grp_${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}`;
    this.groups.push({ id, name, description, createdAt: Date.now(), keyIds: [] });
    await this.persist();
    return id;
  }

  async deleteGroup(id: string): Promise<void> {
    if (id === DEFAULT_GROUP_ID) throw new Error('Cannot delete default group');
    const idx = this.groups.findIndex(g => g.id === id);
    if (idx === -1) return;
    const group = this.groups[idx];
    this.groups.splice(idx, 1);
    // Move keys to default group
    const def = this.getDefaultGroup();
    for (const keyId of group.keyIds) {
      if (!def.keyIds.includes(keyId)) def.keyIds.push(keyId);
      const p = this.passports.get(keyId);
      if (p) p.groupId = DEFAULT_GROUP_ID;
    }
    await this.persist();
  }

  getGroups(): KeyGroup[] {
    return [...this.groups];
  }

  getGroup(id: string): KeyGroup | undefined {
    return this.groups.find(g => g.id === id);
  }

  async renameGroup(id: string, name: string): Promise<void> {
    const g = this.groups.find(g => g.id === id);
    if (!g) throw new Error(`Group ${id} not found`);
    g.name = name;
    // Update passports that reference this group
    for (const p of this.passports.values()) {
      if (p.groupId === id) p.groupName = name;
    }
    await this.persist();
  }

  async assignKeyToGroup(keyId: string, groupName: string): Promise<void> {
    // Auto-create group if needed
    const gid = await this.createGroup(groupName);
    const group = this.groups.find(g => g.id === gid)!;
    // Remove from previous group
    for (const g of this.groups) {
      const idx = g.keyIds.indexOf(keyId);
      if (idx >= 0) g.keyIds.splice(idx, 1);
    }
    if (!group.keyIds.includes(keyId)) group.keyIds.push(keyId);
    // Update passport
    const p = this.passports.get(keyId);
    if (p) {
      p.groupId = gid;
      p.groupName = groupName;
    }
    await this.persist();
    this.deps.eventBus.emit('key:group:sync', { reassigned: 1 });
  }

  getKeysByGroup(groupId: string): string[] {
    const g = this.groups.find(g => g.id === groupId);
    return g ? [...g.keyIds] : [];
  }

  getPassport(keyId: string): KeyPassport | undefined {
    return this.passports.get(keyId);
  }

  validatePassport(keyId: string): Result<KeyPassport, string> {
    const p = this.passports.get(keyId);
    if (!p) return fail(`No passport for key ${keyId}`);
    const group = this.groups.find(g => g.id === p.groupId);
    if (!group) return fail(`Key ${keyId} belongs to missing group ${p.groupId}`);
    return ok(p);
  }

  async createKey(
    data: Omit<VaultApiKey, 'id' | 'stats'>,
    opts?: { source?: KeyPassport['source']; groupName?: string },
  ): Promise<Result<string, string>> {
    try {
      const groupName = opts?.groupName || data.group || DEFAULT_GROUP_NAME;
      const newKey = await this.deps.keyService.addKey({
        ...data,
        group: groupName,
      });
      if (!newKey) return fail('KeyService.addKey returned undefined');
      const keyId = newKey.id;
      // Create passport
      const gid = await this.createGroup(groupName);
      const group = this.groups.find(g => g.id === gid)!;
      if (!group.keyIds.includes(keyId)) group.keyIds.push(keyId);
      const passport: KeyPassport = {
        keyId,
        keyLabel: data.label,
        provider: data.provider,
        groupId: gid,
        groupName,
        account: data.account,
        accountId: data.accountId,
        status: data.status || 'active',
        createdAt: Date.now(),
        source: opts?.source || 'ui',
      };
      this.passports.set(keyId, passport);
      await this.persist();
      return ok(keyId);
    } catch (e) {
      return fail(`Failed to create key: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async updateKey(keyId: string, updates: Partial<VaultApiKey>): Promise<void> {
    const p = this.passports.get(keyId);
    if (!p) return; // no passport = not a managed key
    if (updates.group !== undefined && updates.group !== p.groupName) {
      await this.assignKeyToGroup(keyId, updates.group);
    }
    if (updates.status !== undefined && updates.status !== p.status) {
      p.status = updates.status;
    }
    this.deps.keyService.updateKey(keyId, updates);
    await this.persist();
  }

  async deleteKey(keyId: string): Promise<void> {
    // Remove from all groups
    for (const g of this.groups) {
      const idx = g.keyIds.indexOf(keyId);
      if (idx >= 0) g.keyIds.splice(idx, 1);
    }
    this.passports.delete(keyId);
    await this.persist();
    this.deps.keyService.removeKey(keyId);
  }

  async syncKeyStatus(keyId: string, status: string, opts?: { reason?: string; latency?: number }): Promise<void> {
    const p = this.passports.get(keyId);
    if (!p) return;
    p.status = status;
    await this.persist();
    this.deps.keyService.updateKeyStatus(keyId, status as ApiKey['status'], opts?.latency);
    this.deps.eventBus.emit('key:state:changed', { id: keyId, status, reason: opts?.reason });
  }

  getAllKeys(): VaultApiKey[] {
    const keys = this.deps.keyService.getKeys();
    return keys.map(k => {
      const p = this.passports.get(k.id);
      if (!p) {
        if (this.loaded) console.warn(`[GroupManager] No passport for key ${k.id} (${k.label}) — raw key returned`);
        return k;
      }
      return { ...k, group: p.groupName, account: p.account, accountId: p.accountId, status: p.status };
    });
  }

  getKeyById(keyId: string): VaultApiKey | undefined {
    const k = this.deps.keyService.getKey(keyId);
    if (!k) return undefined;
    const p = this.passports.get(keyId);
    if (!p) {
      if (this.loaded) console.warn(`[GroupManager] No passport for key ${keyId} (${k.label}) — raw key returned`);
      return k;
    }
    return { ...k, group: p.groupName, account: p.account, accountId: p.accountId, status: p.status };
  }

  async syncExistingKeys(): Promise<{ passportAdded: number; assigned: number; reassigned: number }> {
    const keys = this.deps.keyService.getKeys();
    let passportAdded = 0;
    let assigned = 0;
    let reassigned = 0;

    // Collect existing non-default group names for account-based matching
    const accountGroupNames = new Set(
      this.groups.filter(g => g.id !== DEFAULT_GROUP_ID).map(g => g.name),
    );

    const resolveGroupName = (k: ApiKey): string => {
      // 1) Explicit group
      if (k.group) return k.group;
      // 2) Account name matches an existing group
      if (k.account && accountGroupNames.has(k.account)) return k.account;
      // 3) AccountId matches an existing group
      if (k.accountId && accountGroupNames.has(k.accountId)) return k.accountId;
      return DEFAULT_GROUP_NAME;
    };

    for (const k of keys) {
      if (!this.passports.has(k.id)) {
        const groupName = resolveGroupName(k);
        const gid = await this.createGroup(groupName);
        const group = this.groups.find(g => g.id === gid)!;
        this.passports.set(k.id, {
          keyId: k.id,
          keyLabel: k.label,
          provider: k.provider,
          groupId: gid,
          groupName,
          account: k.account,
          accountId: k.accountId,
          status: k.status,
          createdAt: k.createdAt || Date.now(),
          source: 'migration',
        });
        if (!group.keyIds.includes(k.id)) group.keyIds.push(k.id);
        passportAdded++;
      } else {
        // Reassign keys stuck in Default when they have account match
        const p = this.passports.get(k.id)!;
        if (p.groupId === DEFAULT_GROUP_ID) {
          const betterGroup = resolveGroupName(k);
          if (betterGroup !== DEFAULT_GROUP_NAME) {
            await this.assignKeyToGroup(k.id, betterGroup);
            p.account = k.account;
            p.accountId = k.accountId;
            reassigned++;
          }
        }
      }

      // Ensure every key is in at least one group
      const inGroup = this.groups.some(g => g.keyIds.includes(k.id));
      if (!inGroup) {
        const def = this.getDefaultGroup();
        if (!def.keyIds.includes(k.id)) def.keyIds.push(k.id);
        assigned++;
      }
    }
    await this.persist();
    this.deps.eventBus.emit('key:group:sync', { passportAdded, assigned, reassigned });
    return { passportAdded, assigned, reassigned };
  }
}
