import { describe, it, expect } from 'vitest';

async function ensureLoaded() {
  const { skillService } = await import('./SkillService');
  // load() is async in constructor; wait for it
  for (let i = 0; i < 10; i++) {
    if (skillService.getSkills().length > 0) return skillService;
    await new Promise(r => setTimeout(r, 10));
  }
  return skillService;
}

describe('SkillService', () => {
  it('should load default skills', async () => {
    const svc = await ensureLoaded();
    expect(svc.getSkills().length).toBeGreaterThanOrEqual(5);
  });

  it('should have installed and available skills', async () => {
    const svc = await ensureLoaded();
    expect(svc.getInstalled().length).toBeGreaterThan(0);
    expect(svc.getAvailable().length).toBeGreaterThan(0);
  });

  it('should toggle skill status', async () => {
    const svc = await ensureLoaded();
    const skills = svc.getSkills();
    const activeSkill = skills.find(s => s.status === 'active');
    if (activeSkill) {
      svc.toggleActive(activeSkill.id);
      expect(svc.getSkills().find(s => s.id === activeSkill.id)?.status).toBe('installed');
      svc.toggleActive(activeSkill.id);
    }
  });

  it('should install a skill', async () => {
    const svc = await ensureLoaded();
    const available = svc.getAvailable();
    if (available.length > 0) {
      svc.installSkill(available[0].id);
      expect(svc.getSkills().find(s => s.id === available[0].id)?.status).toBe('installed');
    }
  });

  it('should increment execution count', async () => {
    const svc = await ensureLoaded();
    const skills = svc.getSkills();
    const target = skills[0];
    const before = target.executionCount;
    svc.incrementExecution(target.id);
    const after = svc.getSkills().find(s => s.id === target.id)?.executionCount;
    expect(after).toBe(before + 1);
  });
});
