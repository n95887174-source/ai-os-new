import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSettings = {
  notifications: true,
  autoHealthCheck: true,
  defaultMode: 'smart' as const,
  streamingEnabled: true,
  historyPersistence: true,
  fallbackEnabled: true,
  debugMode: false,
  theme: 'dark' as const,
  language: 'en' as const,
  explorationFactor: 0.1,
  slaMode: 'BALANCED' as const,
};

vi.mock('../../kernel/instances', () => ({
  settingsService: {
    getSettings: vi.fn(() => mockSettings),
    updateSettings: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    reset: vi.fn(),
  },
  keyService: {
    unlockVault: vi.fn(() => Promise.resolve(true)),
    clearAllData: vi.fn(),
  },
  configService: {
    getMonitoring: vi.fn(() => ({
      healthCheckStaleIntervalMs: 30000,
      latencyPenalty: { thresholdMs: 1000, divisor: 2, cap: 5000 },
      errorRatePenalty: { threshold: 0.1, multiplier: 2, cap: 0.5 },
      successRatePenalty: { floor: 0.5, multiplier: 2 },
      alertPenalty: { perAlert: 5, cap: 50 },
    })),
    getMetrics: vi.fn(() => ({
      maxHistoryPoints: 100,
      autoCaptureIntervalMs: 60000,
    })),
    getTraces: vi.fn(() => ({
      maxEntries: 1000,
      dbLoadLimit: 100,
      tokenEstimateDivisor: 1000,
    })),
    getWebhooks: vi.fn(() => ({
      eventOptions: ['key:added', 'key:removed', 'key:health:check:failed'],
      providers: ['slack', 'telegram', 'discord'],
    })),
    updateMonitoring: vi.fn(),
    updateMetrics: vi.fn(),
    updateTraces: vi.fn(),
  },
  notificationWebhookService: {
    getWebhooks: vi.fn(() => []),
  },
  externalSecretsService: {
    getStatus: vi.fn(() => Promise.resolve([])),
    activateBackend: vi.fn(),
  },
}));

vi.mock('../../kernel/security', () => ({
  securityService: {
    isLocked: vi.fn(() => true),
    initialize: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { NOTIFICATION: 'notification' },
}));

vi.mock('../../kernel/events/event-names', () => ({
  EVENTS: {
    SETTINGS_UPDATED: 'settings:updated',
    NOTIFICATION: 'notification',
  },
}));

function getTab(name: string) {
  return screen.getByRole('tab', { name });
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Settings heading', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    const heading = await screen.findByRole('heading', { name: /Settings/i }, { timeout: 10000 });
    expect(heading).toBeDefined();
  }, 15000);

  it('renders navigation tabs', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByRole('tab', { name: /General Preferences/i }, { timeout: 10000 });
    const tabNames = screen.getAllByRole('tab').map((t) => t.textContent?.trim());
    expect(tabNames).toContain('General Preferences');
    expect(tabNames).toContain('Interaction & Memory');
    expect(tabNames).toContain('Routing AI');
    expect(tabNames).toContain('Security & Core Access');
  }, 15000);

  it('shows General Preferences by default', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByRole('tab', { name: /General Preferences/i }, { timeout: 10000 });
    expect(screen.getAllByText('General Preferences').length).toBeGreaterThan(0);
    expect(screen.getByText('Interface Theme')).toBeDefined();
    expect(screen.getByText('System Language')).toBeDefined();
    expect(screen.getByText('System Notifications')).toBeDefined();
  }, 15000);

  it('switches to Interaction & Memory tab', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByRole('tab', { name: /General Preferences/i }, { timeout: 10000 });
    fireEvent.click(getTab('Interaction & Memory'));
    expect(await screen.findByText('Default Chat Strategy')).toBeDefined();
    expect(screen.getByText('Streaming Responses')).toBeDefined();
    expect(screen.getByText('History Persistence')).toBeDefined();
  }, 15000);

  it('switches to Routing AI tab', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByRole('tab', { name: /General Preferences/i }, { timeout: 10000 });
    fireEvent.click(getTab('Routing AI'));
    expect(await screen.findByText('Reinforcement Router (UCB1)')).toBeDefined();
    expect(screen.getByText('Fallback Routing')).toBeDefined();
    expect(screen.getByText('Auto Health Check')).toBeDefined();
  }, 15000);

  it('switches to Security & Core Access tab', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByRole('tab', { name: /General Preferences/i }, { timeout: 10000 });
    fireEvent.click(getTab('Security & Core Access'));
    expect(await screen.findByText('Vault Master Key')).toBeDefined();
    expect(screen.getByText('Debug Mode')).toBeDefined();
    expect(screen.getByText('Reset Settings')).toBeDefined();
    expect(screen.getByText('Factory Reset')).toBeDefined();
  }, 15000);

  it('shows OS Telemetry sidebar section', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText('OS Telemetry', {}, { timeout: 10000 })).toBeDefined();
  }, 15000);

  it('renders theme select dropdown', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('Interface Theme', {}, { timeout: 10000 });
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('renders toggle switch for notifications', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('System Notifications', {}, { timeout: 10000 });
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  }, 15000);

  it('renders exploration factor slider in Routing AI', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByRole('tab', { name: /General Preferences/i }, { timeout: 10000 });
    fireEvent.click(getTab('Routing AI'));
    await screen.findByText('Reinforcement Router (UCB1)');
    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);
  }, 15000);

  it('shows version info in sidebar', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText(/v0\.0\.0/, {}, { timeout: 10000 })).toBeDefined();
    expect(screen.getByText('dev')).toBeDefined();
    expect(screen.getByText('HEALTHY')).toBeDefined();
  }, 15000);
});
