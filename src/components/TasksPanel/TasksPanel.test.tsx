import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../kernel/instances', () => ({
  cognitiveService: {
    getTraces: vi.fn(() => [
      {
        id: 'trace-1',
        traceId: 'tr-1',
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        input: 'Test pipeline execution',
        output: 'Completed successfully',
        status: 'completed' as const,
        steps: [
          { id: 's1', type: 'reasoning' as const, label: 'Analyzing input', status: 'done' as const, timestamp: Date.now() - 5000, duration: 1200 },
          { id: 's2', type: 'reasoning' as const, label: 'Processing data', status: 'done' as const, timestamp: Date.now() - 3000, duration: 800 },
        ],
        decisionGraph: { nodes: [], edges: [] },
        totalLatency: 2000,
        totalTokens: 150,
        estimatedCost: 0.005,
        semanticConfidence: 0.92,
      },
      {
        id: 'trace-2',
        traceId: 'tr-2',
        startTime: Date.now() - 5000,
        input: 'Another pipeline',
        output: undefined,
        status: 'running' as const,
        steps: [
          { id: 's3', type: 'reasoning' as const, label: 'Initializing', status: 'active' as const, timestamp: Date.now() },
        ],
        decisionGraph: { nodes: [], edges: [] },
        totalLatency: 0,
        totalTokens: 0,
        estimatedCost: 0,
        semanticConfidence: 0.8,
      },
    ]),
  },
}));

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
}));

describe('TasksPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    const { container } = render(<TasksPanel />);
    expect(container).toBeDefined();
  });

  it('renders heading', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByText('Task Orchestrator')).toBeDefined();
  });

  it('renders all filter buttons', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByText('All Workflows')).toBeDefined();
    expect(screen.getByText('Active Pipeline')).toBeDefined();
    expect(screen.getByText('Succeeded')).toBeDefined();
    expect(screen.getByText('Failed')).toBeDefined();
  });

  it('renders stat cards', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByText('Active Runners')).toBeDefined();
    expect(screen.getByText('Queued')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
    expect(screen.getByText('Exceptions')).toBeDefined();
  });

  it('renders task items from traces', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByText('Test pipeline execution')).toBeDefined();
    expect(screen.getByText('Another pipeline')).toBeDefined();
  });

  it('renders search input with aria-label', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByLabelText('Search tasks by ID or instruction')).toBeDefined();
  });

  it('has refresh button with aria-label', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByLabelText('Refresh tasks')).toBeDefined();
  });

  it('has role="tablist" on filter controls', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByRole('tablist')).toBeDefined();
  });

  it('has role="tab" on filter buttons', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.length).toBe(4);
  });

  it('has role="article" on task items', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    const articles = await screen.findAllByRole('article');
    expect(articles.length).toBe(2);
  });

  it('has role="progressbar" on progress bars', async () => {
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    const progressbars = await screen.findAllByRole('progressbar');
    expect(progressbars.length).toBeGreaterThan(0);
  });

  it('shows empty state when no tasks', async () => {
    const { cognitiveService } = await import('../../kernel/instances');
    (cognitiveService.getTraces as ReturnType<typeof vi.fn>).mockReturnValueOnce([]);
    const TasksPanel = (await import('./TasksPanel')).default;
    render(<TasksPanel />);
    expect(await screen.findByText('No tasks yet')).toBeDefined();
  });
});
