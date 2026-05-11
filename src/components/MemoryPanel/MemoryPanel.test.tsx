import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { eventBus } from '../../core/events';

vi.mock('../../services/MemoryService', () => ({
  memoryService: {
    getMemories: vi.fn(() => [
      { id: 'm1', content: 'Important fact about AI', metadata: { source: 'test', type: 'fact', timestamp: Date.now(), importance: 0.9 } },
      { id: 'm2', content: 'User preference stored', metadata: { source: 'chat', type: 'observation', timestamp: Date.now(), importance: 0.5 } },
    ]),
  },
}));

describe('MemoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    const { container } = render(<MemoryPanel />);
    expect(container).toBeDefined();
  });

  it('displays memory items', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(screen.getByText('Important fact about AI')).toBeDefined();
    expect(screen.getByText('User preference stored')).toBeDefined();
  });

  it('has search input', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
