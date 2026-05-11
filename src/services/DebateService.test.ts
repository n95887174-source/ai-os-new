import { describe, it, expect } from 'vitest';

describe('DebateService', () => {
  it('should export a singleton', async () => {
    const { debateService } = await import('./DebateService');
    expect(debateService).toBeDefined();
  });

  it('should start as no active session', async () => {
    const { debateService } = await import('./DebateService');
    expect(debateService.getSession()).toBeNull();
    expect(debateService.getArguments()).toEqual([]);
  });

  it('should reject debate with fewer than 2 participants', async () => {
    const { debateService } = await import('./DebateService');
    await expect(debateService.startDebate('Test topic', [], 'round_robin', 2)).rejects.toThrow('at least 2 participants');
  });

  it('should handle pause without active session', async () => {
    const { debateService } = await import('./DebateService');
    expect(() => debateService.pauseDebate()).not.toThrow();
  });

  it('should handle resume without active session', async () => {
    const { debateService } = await import('./DebateService');
    expect(() => debateService.resumeDebate()).not.toThrow();
  });

  it('should handle stop without active session', async () => {
    const { debateService } = await import('./DebateService');
    expect(() => debateService.stopDebate()).not.toThrow();
  });

  it('should handle addArgument without active session', async () => {
    const { debateService } = await import('./DebateService');
    expect(() => debateService.addArgument('Human', 'test')).not.toThrow();
    expect(debateService.getArguments().length).toBe(0);
  });

  it('should return empty markdown without session', async () => {
    const { debateService } = await import('./DebateService');
    expect(debateService.exportAsMarkdown()).toBe('');
  });

  it('should provide getSession and getArguments', async () => {
    const { debateService } = await import('./DebateService');
    expect(debateService.getSession()).toBeNull();
    expect(debateService.getArguments()).toEqual([]);
  });
});
