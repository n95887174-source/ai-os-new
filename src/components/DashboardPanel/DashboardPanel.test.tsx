import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({
    keys: [
      { id: '1', provider: 'OpenRouter', label: 'Main', status: 'active', latency: 120, stats: { successCount: 50 } },
      { id: '2', provider: 'Groq', label: 'Cloud', status: 'inactive', stats: { successCount: 0 } },
    ],
    checkAllHealth: vi.fn(),
  }),
}));

vi.mock('../../core/Kernel', () => ({
  kernel: {
    getState: vi.fn(() => ({
      providers: {
        openrouter: { id: 'OpenRouter', avgTTFT: 120, avgTPS: 30, reliability: 0.95 },
      },
      weights: { base: { ttft: 0.4, tps: 0.2, reliability: 0.4 }, adaptiveDelta: { ttft: 0, tps: 0, reliability: 0 }, effective: { ttft: 0.4, tps: 0.2, reliability: 0.4 } },
      decisions: [],
      totalRequests: 100,
      totalTokens: 5000,
      estimatedCost: 0.05,
      explorationFactor: 0.1,
      history: [],
      violations: [],
      activeSLA: 'BALANCED',
    })),
  },
}));

vi.mock('../../services/PricingService', () => ({
  pricingService: {
    getBudgetInfo: vi.fn(() => ({ spentThisMonth: 0.05 })),
  },
}));

vi.mock('../../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => ({
      notifications: true,
      autoHealthCheck: true,
      defaultMode: 'smart',
      streamingEnabled: true,
      historyPersistence: true,
      fallbackEnabled: true,
      debugMode: false,
      theme: 'dark',
      language: 'en',
      explorationFactor: 0.1,
      slaMode: 'BALANCED',
    })),
  },
}));

vi.mock('../../services/RouterService', () => ({
  routerService: {
    getDecisionHistory: vi.fn(() => []),
    getRawConfig: vi.fn(() => ({ fallbackChains: {}, modelDowngradeChains: {} })),
  },
}));

vi.mock('../../services/KeyService', () => ({
  FREE_TIER_LIMITS: { groq: { requestsPerDay: 1000 }, openrouter: { requestsPerDay: 500 } },
}));

vi.mock('../../services/CognitiveService', () => ({
  cognitiveService: {
    getTraces: vi.fn(() => [
      { id: 't1', startTime: Date.now() - 1000, totalTokens: 100 },
      { id: 't2', startTime: Date.now() - 2000, totalTokens: 200 },
    ]),
  },
}));

describe('DashboardPanel', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    const { container } = render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(container).toBeDefined();
  });

  it('displays Mission Control heading', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(screen.getByText('Mission Control')).toBeDefined();
  });

  it('shows system online indicator', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(screen.getByText('System Online')).toBeDefined();
  });

  it('displays provider stats', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(screen.getByText('Active LLMs')).toBeDefined();
    expect(screen.getByText('Global Throughput')).toBeDefined();
    expect(screen.getByText('Token Burn')).toBeDefined();
    expect(screen.getByText('Calculated Cost')).toBeDefined();
  });

  it('shows active LLM count', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('renders provider rows', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    const mains = screen.getAllByText('Main');
    expect(mains.length).toBeGreaterThanOrEqual(1);
    const clouds = screen.getAllByText('Cloud');
    expect(clouds.length).toBeGreaterThanOrEqual(1);
  });

  it('shows event log area', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(screen.getByText('Awaiting telemetry data...')).toBeDefined();
  });

  it('has Run Diagnostics button', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    expect(screen.getByText('Run Diagnostics')).toBeDefined();
  });

  it('has Add Provider button that navigates', async () => {
    const DashboardPanel = (await import('./DashboardPanel')).default;
    render(<DashboardPanel onNavigate={mockNavigate} />);
    const addBtn = screen.getByText('Add Provider');
    fireEvent.click(addBtn);
    expect(mockNavigate).toHaveBeenCalledWith('keys');
  });
});
