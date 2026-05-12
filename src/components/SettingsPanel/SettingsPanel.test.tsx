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

vi.mock('../../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => mockSettings),
    updateSettings: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    reset: vi.fn(),
  },
}));

vi.mock('../../services/KeyService', () => ({
  keyService: {
    unlockVault: vi.fn(() => Promise.resolve(true)),
    clearAllData: vi.fn(),
  },
}));

vi.mock('../../core/SecurityService', () => ({
  securityService: {
    isLocked: vi.fn(() => true),
    initialize: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock('../../core/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { NOTIFICATION: 'notification' },
}));

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders System Configuration heading', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText('System Configuration')).toBeDefined();
  });

  it('renders navigation tabs', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText('General Settings')).toBeDefined();
    expect(screen.getByText('Interaction & Memory')).toBeDefined();
    expect(screen.getByText('Routing Engine')).toBeDefined();
    expect(screen.getByText('Security & Vault')).toBeDefined();
  });

  it('shows General Preferences by default', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText('General Preferences')).toBeDefined();
    expect(screen.getByText('Interface Theme')).toBeDefined();
    expect(screen.getByText('System Language')).toBeDefined();
    expect(screen.getByText('System Notifications')).toBeDefined();
  });

  it('switches to Interaction & Memory tab', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('General Preferences');
    fireEvent.click(screen.getByText('Interaction & Memory'));
    expect(await screen.findByText('Default Chat Strategy')).toBeDefined();
    expect(screen.getByText('Token Streaming')).toBeDefined();
    expect(screen.getByText('Persistent History')).toBeDefined();
  });

  it('switches to Routing Engine tab', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('General Preferences');
    fireEvent.click(screen.getByText('Routing Engine'));
    expect(await screen.findByText('Reinforcement Router (UCB1)')).toBeDefined();
    expect(screen.getByText('Fallback Chains')).toBeDefined();
    expect(screen.getByText('Heartbeat Monitoring')).toBeDefined();
    expect(screen.getByText('SLA Mode')).toBeDefined();
  });

  it('switches to Security & Vault tab', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('General Preferences');
    fireEvent.click(screen.getByText('Security & Vault'));
    expect(await screen.findByText('Vault Master Key')).toBeDefined();
    expect(screen.getByText('Kernel Debug Output')).toBeDefined();
    expect(screen.getByText('Reset Settings')).toBeDefined();
    expect(screen.getByText('Factory Reset')).toBeDefined();
  });

  it('shows OS Telemetry sidebar section', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText('OS Telemetry')).toBeDefined();
  });

  it('renders theme select dropdown', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('Interface Theme');
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders toggle switch for notifications', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('System Notifications');
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders exploration factor slider in Routing Engine', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    await screen.findByText('General Preferences');
    fireEvent.click(screen.getByText('Routing Engine'));
    await screen.findByText('Reinforcement Router (UCB1)');
    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('shows version info in sidebar', async () => {
    const SettingsPanel = (await import('./SettingsPanel')).default;
    render(<SettingsPanel />);
    expect(await screen.findByText('v4.0.0-rc')).toBeDefined();
    expect(screen.getByText('a9f3b2c')).toBeDefined();
    expect(screen.getByText('ONLINE')).toBeDefined();
  });
});
