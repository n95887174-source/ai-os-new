import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
  EVENTS: {
    NAVIGATE: 'navigate',
    KEY_UPDATED: 'key:updated',
    KEY_STATE_CHANGED: 'key:state:changed',
    SETTINGS_UPDATED: 'settings:updated',
    ROUTER_SIGNAL: 'router:signal',
  },
}));

vi.mock('../../kernel/instances', () => ({
  routerService: {
    getDecisionHistory: vi.fn(() => []),
    getRawConfig: vi.fn(() => ({
      fallbackChains: {},
      modelDowngradeChains: {},
    })),
    getABTest: vi.fn(() => null),
    setFallbackChain: vi.fn(),
    setDowngradeChain: vi.fn(),
    setActiveProfile: vi.fn(),
    updateActiveProfileWeights: vi.fn(),
    startABTest: vi.fn(),
    stopABTest: vi.fn(),
  },
  keyService: {
    getKeys: vi.fn(() => []),
  },
  settingsService: {
    getSettings: vi.fn(() => ({ slaMode: 'BALANCED' })),
    updateSettings: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

describe('RoutingIntelligence', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Routing Intelligence heading', async () => {
    const RoutingIntelligence = (await import('./RoutingIntelligence')).default;
    render(<RoutingIntelligence />);
    expect(await screen.findByText('Routing Intelligence')).toBeDefined();
  });

  it('renders three tab buttons', async () => {
    const RoutingIntelligence = (await import('./RoutingIntelligence')).default;
    render(<RoutingIntelligence />);
    expect(screen.getByText('Decision Trace')).toBeDefined();
    expect(screen.getByText('Decision Tree')).toBeDefined();
    expect(screen.getByText('Advanced Control')).toBeDefined();
  });

  it('shows empty state when no decisions', async () => {
    const RoutingIntelligence = (await import('./RoutingIntelligence')).default;
    render(<RoutingIntelligence />);
    expect(await screen.findByText(/No routing decisions yet/)).toBeDefined();
  });

  it('switches to decision tree tab', async () => {
    const RoutingIntelligence = (await import('./RoutingIntelligence')).default;
    render(<RoutingIntelligence />);
    fireEvent.click(screen.getByText('Decision Tree'));
    expect(await screen.findByText(/No routing decisions yet/)).toBeDefined();
  });

  it('switches to advanced control tab', async () => {
    const RoutingIntelligence = (await import('./RoutingIntelligence')).default;
    render(<RoutingIntelligence />);
    fireEvent.click(screen.getByText('Advanced Control'));
    expect(await screen.findByText('Fallback Chains')).toBeDefined();
    expect(screen.getByText('Model Downgrade Map')).toBeDefined();
  });
});
