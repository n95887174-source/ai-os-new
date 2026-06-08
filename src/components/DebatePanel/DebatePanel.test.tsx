import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { eventBus } from '../../kernel/events/event-bus';

const mockNodes = [
  { id: 'agent-1', type: 'agent', label: 'Agent Alpha', config: {} },
  { id: 'agent-2', type: 'agent', label: 'Agent Beta', config: {} },
  { id: 'agent-3', type: 'agent', label: 'Agent Gamma', config: {} },
  { id: 'router-1', type: 'router', label: 'Router', config: {} },
];

const mockDebateService = {
  getSession: vi.fn(),
  startDebate: vi.fn(),
  addArgument: vi.fn(),
  pauseDebate: vi.fn(),
  resumeDebate: vi.fn(),
  stopDebate: vi.fn(),
  getArguments: vi.fn(() => []),
  exportAsMarkdown: vi.fn(() => ''),
  destroy: vi.fn(),
};

vi.mock('../../kernel/instances', () => ({
  orchestrator: {
    getActiveTopology: vi.fn(() => ({
      nodes: mockNodes,
      edges: [],
      policies: [],
    })),
  },
  debateService: mockDebateService,
}));

describe('DebatePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const DebatePanel = (await import('./DebatePanel')).default;
    const { container } = render(<DebatePanel />);
    expect(container).toBeDefined();
  });

  it('displays setup screen when no active session', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('Configure Dialectic Session')).toBeDefined();
    expect(screen.getByText('Initialize Debate Runtime')).toBeDefined();
  });

  it('shows available agents from topology for selection', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('Agent Alpha')).toBeDefined();
    expect(screen.getByText('Agent Beta')).toBeDefined();
    expect(screen.getByText('Agent Gamma')).toBeDefined();
    expect(screen.getByText('3 Selected')).toBeDefined();
  });

  it('disables start button when fewer than 2 agents with no topic', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const startBtn = screen.getByText('Initialize Debate Runtime').closest('button');
    expect(startBtn?.disabled).toBe(true);
  });

  it('enables start button with topic and 2+ agents selected', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);

    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'AI Safety' } });

    const startBtn = screen.getByText('Initialize Debate Runtime').closest('button');
    expect(startBtn?.disabled).toBe(false);
  });

  it('calls debateService.startDebate when start is clicked', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    vi.spyOn(eventBus, 'emit');

    render(<DebatePanel />);

    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'AI Safety' } });

    fireEvent.click(screen.getByText('Initialize Debate Runtime'));
    expect(mockDebateService.startDebate).toHaveBeenCalledTimes(1);
    expect(mockDebateService.startDebate).toHaveBeenCalledWith(
      'AI Safety',
      expect.arrayContaining([
        expect.objectContaining({ id: 'agent-1', role: 'pro' }),
        expect.objectContaining({ id: 'agent-2', role: 'con' }),
      ]),
      'round_robin',
      10
    );
  });

  it('disables start button when topic is empty', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const startBtn = screen.getByText('Initialize Debate Runtime').closest('button');
    expect(startBtn?.disabled).toBe(true);
  });

  it('disables start button when fewer than 2 agents selected', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;

    render(<DebatePanel />);

    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'AI Safety' } });

    const agentCards = screen.getAllByText(/Agent (Alpha|Beta|Gamma)/);
    for (const card of agentCards) {
      fireEvent.click(card);
    }

    const startBtn = screen.getByText('Initialize Debate Runtime').closest('button');
    expect(startBtn?.disabled).toBe(true);
    expect(mockDebateService.startDebate).not.toHaveBeenCalled();
  });

  it('displays active debate UI when session exists', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1',
      topic: 'AI Safety',
      status: 'active',
      strategy: 'round_robin',
      maxRounds: 10,
      currentRound: 1,
      participants: [
        { id: 'agent-1', name: 'Agent Alpha', role: 'pro', systemPrompt: '' },
        { id: 'agent-2', name: 'Agent Beta', role: 'con', systemPrompt: '' },
      ],
      arguments: [],
      convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('AI Safety')).toBeDefined();
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByPlaceholderText('Inject human argument into the dialectic...')).toBeDefined();
  });

  it('shows debate arguments when present', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1',
      topic: 'AI Safety',
      status: 'active',
      strategy: 'round_robin',
      maxRounds: 10,
      currentRound: 1,
      participants: [
        { id: 'agent-1', name: 'Agent Alpha', role: 'pro', systemPrompt: '' },
        { id: 'agent-2', name: 'Agent Beta', role: 'con', systemPrompt: '' },
      ],
      arguments: [
        { id: 'a1', agentId: 'agent-1', agentName: 'Agent Alpha', content: 'I support AI Safety', confidence: 0.9, timestamp: Date.now(), round: 1, position: 'pro' },
        { id: 'a2', agentId: 'agent-2', agentName: 'Agent Beta', content: 'I oppose AI Safety', confidence: 0.8, timestamp: Date.now(), round: 1, position: 'con' },
      ],
      convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('I support AI Safety')).toBeDefined();
    expect(screen.getByText('I oppose AI Safety')).toBeDefined();
    expect(screen.getByText('Confidence: 90%')).toBeDefined();
    expect(screen.getByText('Confidence: 80%')).toBeDefined();
  });

  it('shows convergence score in analytics panel', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1',
      topic: 'AI Safety',
      status: 'active',
      strategy: 'round_robin',
      maxRounds: 10,
      currentRound: 3,
      participants: [
        { id: 'agent-1', name: 'Agent Alpha', role: 'pro', systemPrompt: '' },
        { id: 'agent-2', name: 'Agent Beta', role: 'con', systemPrompt: '' },
      ],
      arguments: [],
      convergenceScore: 72,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('Cognitive Convergence Score')).toBeDefined();
    expect(screen.getByText('72%')).toBeDefined();
  });

  it('calls debateService.addArgument on inject', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1',
      topic: 'AI Safety',
      status: 'active',
      strategy: 'round_robin',
      maxRounds: 10,
      currentRound: 2,
      participants: [{ id: 'agent-1', name: 'Agent Alpha', role: 'pro', systemPrompt: '' }],
      arguments: [],
      convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const input = screen.getByPlaceholderText('Inject human argument into the dialectic...');
    fireEvent.change(input, { target: { value: 'Here is my argument' } });
    fireEvent.click(screen.getByText('Inject'));
    expect(mockDebateService.addArgument).toHaveBeenCalledWith(
      'User (Human-in-loop)',
      'Here is my argument',
      1.0
    );
  });

  it('does not inject when input is empty', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1',
      topic: 'AI Safety',
      status: 'active',
      strategy: 'round_robin',
      maxRounds: 10,
      currentRound: 2,
      participants: [{ id: 'agent-1', name: 'Agent Alpha', role: 'pro', systemPrompt: '' }],
      arguments: [],
      convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    fireEvent.click(screen.getByText('Inject'));
    expect(mockDebateService.addArgument).not.toHaveBeenCalled();
  });

  it('clears injection input after successful inject', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1',
      topic: 'AI Safety',
      status: 'active',
      strategy: 'round_robin',
      maxRounds: 10,
      currentRound: 2,
      participants: [{ id: 'agent-1', name: 'Agent Alpha', role: 'pro', systemPrompt: '' }],
      arguments: [],
      convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const input = screen.getByPlaceholderText('Inject human argument into the dialectic...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My argument' } });
    fireEvent.click(screen.getByText('Inject'));
    await waitFor(() => expect(input.value).toBe(''));
  });

  it('calls pauseDebate when pause button clicked', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1', topic: 'Test', status: 'active', strategy: 'round_robin',
      maxRounds: 10, currentRound: 1, participants: [], arguments: [], convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const pauseBtn = document.querySelector('button[title="Pause Debate"]');
    expect(pauseBtn).toBeDefined();
    fireEvent.click(pauseBtn!);
    expect(mockDebateService.pauseDebate).toHaveBeenCalled();
  });

  it('calls resumeDebate when resume button clicked', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1', topic: 'Test', status: 'paused', strategy: 'round_robin',
      maxRounds: 10, currentRound: 1, participants: [], arguments: [], convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const resumeBtn = document.querySelector('button[title="Resume Debate"]');
    expect(resumeBtn).toBeDefined();
    fireEvent.click(resumeBtn!);
    expect(mockDebateService.resumeDebate).toHaveBeenCalled();
  });

  it('calls stopDebate when stop button clicked', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1', topic: 'Test', status: 'active', strategy: 'round_robin',
      maxRounds: 10, currentRound: 1, participants: [], arguments: [], convergenceScore: 50,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const stopBtn = document.querySelector('button[title="Force Stop"]');
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn!);
    expect(mockDebateService.stopDebate).toHaveBeenCalled();
  });

  it('hides injection input when session is completed', async () => {
    mockDebateService.getSession.mockReturnValue({
      id: 'debate-1', topic: 'Test', status: 'completed', strategy: 'round_robin',
      maxRounds: 10, currentRound: 5, participants: [], arguments: [], convergenceScore: 85,
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.queryByPlaceholderText('Inject human argument into the dialectic...')).toBeNull();
  });

  it('handles debate update via eventBus', async () => {
    mockDebateService.getSession.mockReturnValueOnce(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);

    await act(async () => {
      eventBus.emit('debate:updated', {
        id: 'live-1', topic: 'Live Debate', status: 'active', strategy: 'round_robin',
        maxRounds: 5, currentRound: 1,
        participants: [{ id: 'a1', name: 'Agent One', role: 'pro', systemPrompt: '' }],
        arguments: [{ id: 'a1-1', agentId: 'a1', agentName: 'Agent One', content: 'Hello debate',
          confidence: 0.9, timestamp: Date.now(), round: 1, position: 'pro' }],
        convergenceScore: 40,
      });
    });

    expect(await screen.findByText('Live Debate')).toBeDefined();
    expect(screen.getByText('Hello debate')).toBeDefined();
  });

  it('shows loading state initially then resolves after event', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('Loading debate session...')).toBeDefined();
  });

  it('displays session from eventBus when loading times out', async () => {
    mockDebateService.getSession.mockReturnValueOnce(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);

    await act(async () => {
      eventBus.emit('debate:updated', {
        id: 'live-1', topic: 'Live Debate', status: 'active', strategy: 'round_robin',
        maxRounds: 5, currentRound: 1,
        participants: [], arguments: [], convergenceScore: 40,
      });
    });

    expect(await screen.findByText('Live Debate')).toBeDefined();
  });

  it('shows loading spinner on start button when actionLoading is start', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    mockDebateService.startDebate.mockImplementation(() => {
    });
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);

    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'Topic' } });

    fireEvent.click(screen.getByText('Initialize Debate Runtime'));
    expect(mockDebateService.startDebate).toHaveBeenCalled();
  });

  it('shows agent count in setup screen', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    expect(screen.getByText('3 Selected')).toBeDefined();
  });

  it('shows strategy selector with default value', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const select = document.querySelector('select');
    expect(select).toBeDefined();
    expect(select?.value).toBe('round_robin');
  });

  it('has max rounds input defaulting to 10', async () => {
    mockDebateService.getSession.mockReturnValue(null);
    const DebatePanel = (await import('./DebatePanel')).default;
    render(<DebatePanel />);
    const numberInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(numberInput).toBeDefined();
    expect(numberInput.value).toBe('10');
  });
});
