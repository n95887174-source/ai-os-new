import { describe, it, expect } from 'vitest';

async function ensureLoaded() {
  const { roleService } = await import('./RoleService');
  for (let i = 0; i < 10; i++) {
    if (roleService.getRoles().length > 0) return roleService;
    await new Promise(r => setTimeout(r, 10));
  }
  return roleService;
}

describe('RoleService', () => {
  it('should return default roles', async () => {
    const svc = await ensureLoaded();
    expect(svc.getRoles().length).toBeGreaterThanOrEqual(3);
  });

  it('should find a role by id', async () => {
    const svc = await ensureLoaded();
    const roles = svc.getRoles();
    const first = roles[0];
    const found = svc.getRole(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });

  it('should return undefined for unknown role', async () => {
    const svc = await ensureLoaded();
    const found = svc.getRole('nonexistent');
    expect(found).toBeUndefined();
  });

  it('should add a new role', async () => {
    const svc = await ensureLoaded();
    const newRole = svc.addRole({
      name: 'Test Role',
      description: 'A test role',
      systemPrompt: 'You are a test assistant.',
      baseTemperature: 0.5,
      capabilities: []
    });
    expect(newRole).toHaveProperty('id');
    expect(newRole.name).toBe('Test Role');
    expect(svc.getRole(newRole.id)).toBeDefined();
  });

  it('should update an existing role', async () => {
    const svc = await ensureLoaded();
    const roles = svc.getRoles();
    const target = roles[0];
    svc.updateRole(target.id, { name: 'Updated Name' });
    const updated = svc.getRole(target.id);
    expect(updated?.name).toBe('Updated Name');
  });

  it('should delete a role', async () => {
    const svc = await ensureLoaded();
    const before = svc.getRoles().length;
    const newRole = svc.addRole({
      name: 'Delete Me',
      description: 'Will be deleted',
      systemPrompt: 'Temp.',
      baseTemperature: 0.3,
      capabilities: []
    });
    svc.deleteRole(newRole.id);
    expect(svc.getRoles().length).toBe(before);
    expect(svc.getRole(newRole.id)).toBeUndefined();
  });

  it('should validate role and return missing tools', async () => {
    const svc = await ensureLoaded();
    const result = svc.validateRole('r-architect');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('missingTools');
    expect(Array.isArray(result.missingTools)).toBe(true);
  });

  it('should return invalid for unknown role', async () => {
    const svc = await ensureLoaded();
    const result = svc.validateRole('nonexistent');
    expect(result.valid).toBe(false);
  });

  it('should record and retrieve role usage stats', async () => {
    const svc = await ensureLoaded();
    svc.recordRoleUsage('r-architect', true, 100);
    const stats = svc.getRoleStats('r-architect');
    expect(stats).not.toBeNull();
    expect(stats!.invocations).toBeGreaterThanOrEqual(1);
  });

  it('should return all usage stats', async () => {
    const svc = await ensureLoaded();
    const all = svc.getAllStats();
    expect(typeof all).toBe('object');
  });
});
