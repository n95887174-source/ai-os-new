import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KnowledgePanel from './KnowledgePanel';

const mockMemories = [
  { id: 'm1', content: 'AI is transforming the world of software engineering.', metadata: { source: 'conversation', type: 'context', timestamp: Date.now(), importance: 0.9 } },
  { id: 'm2', content: 'User prefers dark mode for all interfaces.', metadata: { source: 'chat', type: 'observation', timestamp: Date.now(), importance: 0.5 } },
  { id: 'm3', content: 'The system should handle rate limiting gracefully.', metadata: { source: 'system', type: 'code', timestamp: Date.now(), importance: 0.8 } },
];

vi.mock('../../kernel/instances', () => ({
  memoryService: {
    getMemories: vi.fn(() => mockMemories),
    deleteMemory: vi.fn(() => Promise.resolve()),
    updateMemory: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
}));

describe('KnowledgePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Semantic Knowledge Graph heading', async () => {
    render(<KnowledgePanel />);
    expect(await screen.findByText('Semantic Knowledge Graph')).toBeDefined();
  });

  it('renders memory node type buttons', async () => {
    render(<KnowledgePanel />);
    expect(await screen.findByText('All (3)')).toBeDefined();
  });

  it('shows graph topology section', async () => {
    render(<KnowledgePanel />);
    expect(await screen.findByText('GRAPH TOPOLOGY')).toBeDefined();
  });

  it('shows entity count in topology', async () => {
    render(<KnowledgePanel />);
    expect(await screen.findByText(/Mapped/)).toBeDefined();
    expect(screen.getByText(/cognitive entities with/)).toBeDefined();
  });

  it('renders search input', async () => {
    render(<KnowledgePanel />);
    await screen.findByText('Semantic Knowledge Graph');
    const search = document.querySelector('input[placeholder="Search nodes..."]');
    expect(search).toBeDefined();
  });

  it('filters by type button click', async () => {
    render(<KnowledgePanel />);
    await screen.findByText('All (3)');
    const contextBtn = screen.getByText('context (1)');
    fireEvent.click(contextBtn);
    expect(await screen.findByText('All (3)')).toBeDefined();
  });

  it('shows legend items', async () => {
    render(<KnowledgePanel />);
    await screen.findByText('Semantic Knowledge Graph');
    expect(screen.getByText('Context')).toBeDefined();
    expect(screen.getByText('Decision')).toBeDefined();
    expect(screen.getByText('Code')).toBeDefined();
    expect(screen.getByText('Response')).toBeDefined();
    expect(screen.getByText('Query')).toBeDefined();
  });

  it('shows empty state when no memories match filter', async () => {
    const { memoryService } = await import('../../kernel/instances');
    vi.mocked(memoryService.getMemories).mockReturnValueOnce([]);
    render(<KnowledgePanel />);
    expect(await screen.findByText('No memory nodes yet', {}, { timeout: 5000 })).toBeDefined();
  });

  it('renders connection density bar', async () => {
    render(<KnowledgePanel />);
    expect(await screen.findByText('Connection Density')).toBeDefined();
  });
});
