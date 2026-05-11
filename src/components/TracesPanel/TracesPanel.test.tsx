import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { eventBus } from '../../core/events';

vi.mock('../../services/CognitiveService', () => ({
  cognitiveService: {
    getTraces: vi.fn(() => [
      { id: 'trace-1', startTime: Date.now() - 10000, input: 'Test request', status: 'completed', steps: [], decisionGraph: { nodes: [], edges: [] }, totalLatency: 500, totalTokens: 100, estimatedCost: 0.01, semanticConfidence: 0.95, traceId: 'tr-1' },
      { id: 'trace-2', startTime: Date.now() - 5000, input: 'Another request', status: 'running', steps: [], decisionGraph: { nodes: [], edges: [] }, totalLatency: 0, totalTokens: 0, estimatedCost: 0, semanticConfidence: 0.8, traceId: 'tr-2' },
    ]),
  },
}));

vi.mock('./CognitiveMicroscope', () => ({ default: () => <div>Microscope</div> }));
vi.mock('./DecisionGraph', () => ({ default: () => <div>Graph</div> }));

describe('TracesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const TracesPanel = (await import('./TracesPanel')).default;
    const { container } = render(<TracesPanel />);
    expect(container).toBeDefined();
  });

  it('displays trace items', async () => {
    const TracesPanel = (await import('./TracesPanel')).default;
    render(<TracesPanel />);
    expect(screen.getByText('Test request')).toBeDefined();
    expect(screen.getByText('Another request')).toBeDefined();
  });

  it('shows trace input text', async () => {
    const TracesPanel = (await import('./TracesPanel')).default;
    render(<TracesPanel />);
    expect(screen.getByText('Test request')).toBeDefined();
  });
});
