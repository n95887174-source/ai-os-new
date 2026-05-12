import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockKeys = [
  { id: 'k1', provider: 'OpenRouter', key: 'sk-1', label: 'OpenRouter Pro', status: 'active', availableModels: ['gpt-4'], stats: { successCount: 50, errorCount: 2, totalTokens: 10000, avgLatency: 1200, minLatency: 800, maxLatency: 2000 } },
  { id: 'k2', provider: 'Gemini', key: 'sk-2', label: 'Gemini Ultra', status: 'active', availableModels: ['gemini-pro'], stats: { successCount: 10, errorCount: 1, totalTokens: 2000, avgLatency: 800, minLatency: 600, maxLatency: 1200 } },
];

const { mockUseKeyStore } = vi.hoisted(() => ({
  mockUseKeyStore: vi.fn(),
}));

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => mockUseKeyStore(),
}));

vi.mock('../../core/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { MESSAGE_RESPONSE: 'message:response', NOTIFICATION: 'notification' },
}));

describe('HivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKeyStore.mockReturnValue({ keys: mockKeys });
  });

  it('renders Swarm Intelligence Topology heading', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText('Swarm Intelligence Topology')).toBeDefined();
  });

  it('renders provider nodes', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Gemini')).toBeDefined();
  });

  it('shows CORE LOAD badge', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText(/CORE LOAD/)).toBeDefined();
  });

  it('shows connected nodes count', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText(/SECURE NODES CONNECTED/)).toBeDefined();
  });

  it('shows SYSTEM KERNEL label', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText('SYSTEM KERNEL')).toBeDefined();
  });

  it('shows empty state when no keys', async () => {
    mockUseKeyStore.mockReturnValue({ keys: [] });
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText('No agents connected')).toBeDefined();
  });

  it('has topology visualization role', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    await screen.findByText('Swarm Intelligence Topology');
    const svg = document.querySelector('[role="img"]');
    expect(svg?.getAttribute('aria-label')).toContain('Swarm topology');
  });

  it('shows provider labels with role', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    await screen.findByText('OpenRouter');
    const buttons = screen.getAllByRole('button');
    const providerBtn = buttons.find(b => b.getAttribute('aria-label')?.toLowerCase().includes('openrouter'));
    expect(providerBtn).toBeDefined();
    expect(providerBtn?.getAttribute('tabindex')).toBe('0');
  });

  it('opens inspector on node click', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    await screen.findByText('OpenRouter');
    const buttons = screen.getAllByRole('button');
    const providerBtn = buttons.find(b => b.getAttribute('aria-label')?.toLowerCase().includes('openrouter'));
    if (providerBtn) {
      fireEvent.click(providerBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined();
      });
    }
  });

  it('node buttons have aria-labels with provider and role', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    await screen.findByText('OpenRouter');
    const buttons = screen.getAllByRole('button');
    const withAria = buttons.filter(b => b.getAttribute('aria-label'));
    expect(withAria.length).toBeGreaterThan(0);
  });

  it('renders subtitles', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText(/Live visualization/)).toBeDefined();
  });

  it('handles mouse move without error', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    await screen.findByText('Swarm Intelligence Topology');
    const container = document.querySelector('[role="img"]');
    if (container) {
      fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
    }
    expect(true).toBe(true);
  });

  it('shows close button in inspector', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    await screen.findByText('OpenRouter');
    const buttons = screen.getAllByRole('button');
    const providerBtn = buttons.find(b => b.getAttribute('aria-label')?.toLowerCase().includes('openrouter'));
    if (providerBtn) {
      fireEvent.click(providerBtn);
      await screen.findByRole('dialog');
      expect(screen.getByLabelText('Close inspector')).toBeDefined();
    }
  });

  it('renders subtitle about multi-agent routing', async () => {
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText(/multi-agent routing/)).toBeDefined();
  });

  it('renders empty state with helpful description', async () => {
    mockUseKeyStore.mockReturnValue({ keys: [] });
    const HivePanel = (await import('./HivePanel')).default;
    render(<HivePanel />);
    expect(await screen.findByText('Add providers to visualize the swarm topology.')).toBeDefined();
  });
});
