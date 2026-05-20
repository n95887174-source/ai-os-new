import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockKey = {
  id: 'test-key',
  provider: 'TestProvider',
  key: 'test-key-value',
  label: 'Test Key',
  status: 'active' as const,
  availableModels: ['test-model'],
  stats: {
    successCount: 0, errorCount: 0, totalTokens: 0,
    avgLatency: 0, minLatency: 0, maxLatency: 0,
  },
};

vi.mock('../utils/tokenEstimate', () => ({ estimateTokens: vi.fn(() => 100) }));

vi.mock('./KeyService', () => ({
  keyService: {
    getKeys: vi.fn(() => [mockKey]),
    recordUsage: vi.fn(),
    updateKeyStatus: vi.fn(),
  },
}));

vi.mock('./RouterService', () => ({
  routerService: {
    getRankedProviders: vi.fn(() => [mockKey]),
  },
}));

const mockSendMessage = vi.fn().mockResolvedValue({
  content: 'A test argument with sufficient length to pass the confidence heuristics and create a valid debate entry for testing purposes within the multi-agent system.',
});

vi.mock('./providers/AdapterRegistry', () => ({
  adapterRegistry: {
    getAdapter: vi.fn(() => ({ sendMessage: mockSendMessage })),
  },
}));

vi.mock('../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn(() => Promise.resolve(
    vi.fn(() => Promise.resolve({
      tolist: () => [[0.1, 0.2, 0.3]],
    }))
  )),
}));

const participants = [
  { id: 'agent-a', name: 'Agent A', role: 'pro' as const, systemPrompt: '' },
  { id: 'agent-b', name: 'Agent B', role: 'con' as const, systemPrompt: '' },
];

describe('DebateService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let debateService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./DebateService');
    debateService = mod.debateService;
  });

  afterEach(() => {
    debateService.destroy();
  });

  it('should export a singleton', () => {
    expect(debateService).toBeDefined();
  });

  it('should start as no active session', () => {
    expect(debateService.getSession()).toBeNull();
    expect(debateService.getArguments()).toEqual([]);
  });

  it('should reject debate with fewer than 2 participants', async () => {
    await expect(debateService.startDebate('Test topic', [], 'round_robin', 2)).rejects.toThrow('at least 2 participants');
  });

  it('should handle pause without active session', () => {
    expect(() => debateService.pauseDebate()).not.toThrow();
  });

  it('should handle resume without active session', () => {
    expect(() => debateService.resumeDebate()).not.toThrow();
  });

  it('should handle stop without active session', () => {
    expect(() => debateService.stopDebate()).not.toThrow();
  });

  it('should handle addArgument without active session', async () => {
    await debateService.addArgument('Human', 'test');
    expect(debateService.getArguments().length).toBe(0);
  });

  it('should return empty markdown without session', () => {
    expect(debateService.exportAsMarkdown()).toBe('');
  });

  it('should provide getSession and getArguments', () => {
    expect(debateService.getSession()).toBeNull();
    expect(debateService.getArguments()).toEqual([]);
  });

  describe('destroy lifecycle', () => {
    it('should clear session after destroy', async () => {
      await debateService.startDebate('Test', participants, 'round_robin', 3);
      expect(debateService.getSession()).not.toBeNull();

      debateService.destroy();

      expect(debateService.getSession()).toBeNull();
      expect(debateService.getArguments()).toEqual([]);
    });

    it('should prevent addArgument after destroy', async () => {
      await debateService.startDebate('Test', participants);
      debateService.destroy();

      await debateService.addArgument('Human', 'should not appear');

      expect(debateService.getArguments()).toEqual([]);
    });

    it('should be idempotent', () => {
      debateService.destroy();
      debateService.destroy();
      expect(debateService.getSession()).toBeNull();
    });
  });

  describe('convergence score', () => {
    it('should be 0 when no arguments', async () => {
      await debateService.startDebate('Test', participants, 'round_robin', 3);
      const session = debateService.getSession();
      expect(session.convergenceScore).toBe(0);
    });

    it('should be a number between 0 and 100', async () => {
      await debateService.startDebate('Test', participants, 'round_robin', 3);
      const session = debateService.getSession();
      expect(session.convergenceScore).toBeGreaterThanOrEqual(0);
      expect(session.convergenceScore).toBeLessThanOrEqual(100);
    });

    it('should change when arguments are added', async () => {
      await debateService.startDebate('Test', participants, 'round_robin', 3);
      const before = debateService.getSession().convergenceScore;

      await debateService.addArgument('Human', 'similar words repeated again similar words repeated again');
      await debateService.addArgument('Human', 'similar words repeated again similar words repeated again');

      const after = debateService.getSession().convergenceScore;
      // Opening statements + human args -> score should update
      expect(after).not.toBe(before);
    });
  });

  describe('addArgument with active session', () => {
    it('should add argument to session', async () => {
      await debateService.startDebate('Test topic', participants, 'round_robin', 3);
      await debateService.addArgument('Human', 'test injection', 0.9);

      const args = debateService.getArguments();
      const humanArg = args.find((a: { agentId: string }) => a.agentId === 'human');
      expect(humanArg).toBeDefined();
      expect(humanArg!.content).toBe('test injection');
      expect(humanArg!.confidence).toBe(0.9);
    });

    it('should emit debate:argument event', async () => {
      const { eventBus } = await import('../kernel/events/event-bus');
      await debateService.startDebate('Test', participants, 'round_robin', 3);
      await debateService.addArgument('Human', 'test');

      expect(eventBus.emit).toHaveBeenCalledWith('debate:argument', expect.any(Object));
      expect(eventBus.emit).toHaveBeenCalledWith('debate:updated', expect.any(Object));
    });
  });

  describe('exportAsMarkdown', () => {
    it('should include topic and status in markdown output', async () => {
      await debateService.startDebate('Climate policy', participants, 'round_robin', 3);
      const md = debateService.exportAsMarkdown();

      expect(md).toContain('Climate policy');
      expect(md).toContain('active');
      expect(md).toContain('Participants');
    });
  });
});
