import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockKeys = [
  { id: 'k1', provider: 'OpenRouter', key: 'sk-1', label: 'OpenRouter Pro', status: 'active', availableModels: ['gpt-4'], stats: { successCount: 50, errorCount: 2, totalTokens: 10000, avgLatency: 1200, minLatency: 800, maxLatency: 2000, extended: { reputationScore: 85, state: 'HEALTHY', latencyBreakdown: { tokensPerSec: 45 } } } },
  { id: 'k2', provider: 'Gemini', key: 'sk-2', label: 'Gemini Ultra', status: 'active', availableModels: ['gemini-pro'], stats: { successCount: 10, errorCount: 1, totalTokens: 2000, avgLatency: 800, minLatency: 600, maxLatency: 1200, extended: { reputationScore: 70, state: 'HEALTHY', latencyBreakdown: { tokensPerSec: 30 } } } },
];

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({ keys: mockKeys }),
}));

vi.mock('../../core/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { MESSAGE_RESPONSE: 'message:response', NAVIGATE: 'navigate', SELECT_MODEL: 'select:model' },
}));

describe('AquariumPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders aquarium heading in Russian', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText('Аквариум Интеллекта')).toBeDefined();
  });

  it('renders provider fishes', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Gemini')).toBeDefined();
  });

  it('shows temperature badge with reputation', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText(/ТЕМП. СРЕДЫ/)).toBeDefined();
  });

  it('renders feed button', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText('ПОКОРМИТЬ РЫБ')).toBeDefined();
  });

  it('renders legend with provider colors', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText('Популяция провайдеров')).toBeDefined();
    expect(screen.getByText('openrouter')).toBeDefined();
    expect(screen.getByText('gemini')).toBeDefined();
  });

  it('shows fish hover hint', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText(/ДВИГАЙТЕ КУРСОРОМ/)).toBeDefined();
  });

  it('shows ecosystem health footer', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText(/Здоровье экосистемы/)).toBeDefined();
    expect(screen.getByText(/Популяция агентов/)).toBeDefined();
  });

  it('shows fish count in footer', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    expect(await screen.findByText(/активных сущностей/)).toBeDefined();
  });

  it('fish buttons have aria-labels', async () => {
    const AquariumPanel = (await import('./AquariumPanel')).default;
    render(<AquariumPanel />);
    await screen.findByText('OpenRouter');
    const buttons = screen.getAllByRole('button');
    const fishBtns = buttons.filter(b => b.getAttribute('aria-label')?.toLowerCase().includes('активен'));
    expect(fishBtns.length).toBeGreaterThan(0);
  });
});
