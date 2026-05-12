import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../core/Kernel', () => ({
  kernel: {
    getState: vi.fn(() => ({
      providers: {
        openrouter: { id: 'OpenRouter', avgTTFT: 120, avgTPS: 30, reliability: 0.95, selectionRate: 0.6, status: 'healthy', totalRequests: 60, stabilityIndex: 0.9, reputationScore: 95 },
        groq: { id: 'Groq', avgTTFT: 80, avgTPS: 45, reliability: 0.98, selectionRate: 0.4, status: 'healthy', totalRequests: 40, stabilityIndex: 0.95, reputationScore: 90 },
      },
      weights: { base: { ttft: 0.4, tps: 0.2, reliability: 0.4 }, adaptiveDelta: { ttft: 0, tps: 0, reliability: 0 }, effective: { ttft: 0.4, tps: 0.2, reliability: 0.4 } },
      decisions: [
        { requestId: 'd1', strategy: 'performance', selected: 'Groq', secondBest: 'OpenRouter', scores: [{ p: 'Groq', s: '0.85' }, { p: 'OpenRouter', s: '0.72' }], timestamp: Date.now() - 5000 },
      ],
      totalRequests: 100,
      totalTokens: 50000,
      estimatedCost: 0.50,
      explorationFactor: 0.1,
      history: [],
      violations: [],
      activeSLA: 'BALANCED',
    })),
  },
}));

describe('AnalyticsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    const { container } = render(<AnalyticsPanel />);
    expect(container).toBeDefined();
  });

  it('displays Analytics heading', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    expect(screen.getByText(/Analytics & Fleet Telemetry/)).toBeDefined();
  });

  it('shows summary stats', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    expect(screen.getByText('Total Invocations')).toBeDefined();
    expect(screen.getByText('Total Tokens')).toBeDefined();
    expect(screen.getByText('Platform Spend')).toBeDefined();
    expect(screen.getByText('Fleet Latency (Avg)')).toBeDefined();
  });

  it('shows total request count', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    expect(screen.getByText('100')).toBeDefined();
  });

  it('shows tab buttons', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    expect(screen.getByText('Platform Overview')).toBeDefined();
    expect(screen.getByText('Provider Health')).toBeDefined();
    expect(screen.getByText('Router Log')).toBeDefined();
  });

  it('switches to providers tab on click', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    fireEvent.click(screen.getByText('Provider Health'));
    expect(screen.getByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Groq')).toBeDefined();
  });

  it('switches to decisions tab on click', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    fireEvent.click(screen.getByText('Router Log'));
    expect(screen.getByText('performance')).toBeDefined();
  });

  it('shows traffic distribution section', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    expect(screen.getByText('Traffic Distribution')).toBeDefined();
  });

  it('shows token throughput section', async () => {
    const AnalyticsPanel = (await import('./AnalyticsPanel')).default;
    render(<AnalyticsPanel />);
    expect(screen.getByText(/Token Throughput/)).toBeDefined();
  });
});
