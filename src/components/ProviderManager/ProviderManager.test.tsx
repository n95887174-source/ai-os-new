import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { FC } from 'react';
import type { ApiKey } from '../../types/metrics';

interface InstalledProvidersViewProps {
  keys: ApiKey[];
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
  onToggleStatus: (keyId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  checkingKeys: Set<string>;
}

interface RoutingSLAViewProps {
  keys: ApiKey[];
}

interface BrowseModelsViewProps {
  onAddProvider: () => void;
}

interface ProviderDetailModalProps {
  profile: ApiKey;
  initialTab: 'overview' | 'sandbox';
  onClose: () => void;
  onCheckHealth: (id: string) => void;
  onRemove: (id: string) => void;
  checkingKeys?: Set<string>;
}

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

const mockKeys: ApiKey[] = [
  { id: 'k1', provider: 'OpenRouter', key: 'sk-or-1', label: 'OpenRouter Pro', status: 'active', availableModels: ['gpt-4'], stats: { successCount: 50, errorCount: 2, totalTokens: 10000, avgLatency: 1200, minLatency: 800, maxLatency: 2000, extended: { reputationScore: 85, state: 'HEALTHY', latencyBreakdown: { tokensPerSec: 45 }, coldStartLatency: 0, warmStartLatency: 0, throughputHistory: [] } } },
  { id: 'k2', provider: 'Gemini', key: 'sk-gem-1', label: 'Gemini Pro', status: 'error', availableModels: ['gemini-pro'], stats: { successCount: 10, errorCount: 5, totalTokens: 2000, avgLatency: 800, minLatency: 600, maxLatency: 1200 } },
];

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: vi.fn(() => ({
    keys: mockKeys,
    activeKeys: mockKeys.filter(k => k.status === 'active'),
    removeKey: vi.fn(),
    checkHealth: vi.fn(),
    checkAllHealth: vi.fn(),
  })),
}));

vi.mock('../../services/KeyService', () => ({
  keyService: {
    setGlobalSLA: vi.fn(),
  },
}));

vi.mock('../../core/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
  EVENTS: {
    KEYS_LOADED: 'key:loaded',
    KEY_ADDED: 'key:added',
    KEY_REMOVED: 'key:removed',
    CHECK_HEALTH: 'health:check',
    CHECK_ALL_HEALTH: 'health:check_all',
  },
}));

describe('ProviderManager', () => {
  let ProviderManager: FC;

  beforeAll(async () => {
    ProviderManager = (await import('./ProviderManager')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    const { container } = render(<ProviderManager />);
    expect(container).toBeDefined();
  });

  it('shows heading and description', () => {
    render(<ProviderManager />);
    expect(screen.getByText('AI Providers')).toBeDefined();
    expect(screen.getByText(/1 active/)).toBeDefined();
  });

  it('shows tab buttons', () => {
    render(<ProviderManager />);
    expect(screen.getByText('Installed (2)')).toBeDefined();
    expect(screen.getByText('Browse Models')).toBeDefined();
    expect(screen.getByText('Routing & SLA')).toBeDefined();
  });

  it('shows Add Custom Provider button', () => {
    render(<ProviderManager />);
    expect(screen.getByText('Add Custom Provider')).toBeDefined();
  });

  it('shows Check All Health button', () => {
    render(<ProviderManager />);
    expect(screen.getByText('Check All Health')).toBeDefined();
  });

  it('sets aria-selected on active tab', () => {
    render(<ProviderManager />);
    const installedTab = screen.getByText('Installed (2)').closest('button')!;
    expect(installedTab.getAttribute('aria-selected')).toBe('true');
  });

  it('switches to Browse Models tab on click', async () => {
    render(<ProviderManager />);
    fireEvent.click(screen.getByText('Browse Models'));
    await waitFor(() => expect(screen.getByText('OpenRouter')).toBeDefined());
  });

  it('switches to Routing & SLA tab on click', async () => {
    render(<ProviderManager />);
    fireEvent.click(screen.getByText('Routing & SLA'));
    await waitFor(() => expect(screen.getByText('Global Routing Policy')).toBeDefined());
  });

  it('navigates tabs with ArrowRight key', () => {
    render(<ProviderManager />);
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.queryByRole('tab', { selected: true })?.textContent).toMatch(/Browse Models/);
  });

  it('navigates tabs with ArrowLeft key', () => {
    render(<ProviderManager />);
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(screen.queryByRole('tab', { selected: true })?.textContent).toMatch(/Routing & SLA/);
  });

  it('shows provider table with key labels', () => {
    render(<ProviderManager />);
    expect(screen.getByText('OpenRouter Pro')).toBeDefined();
    expect(screen.getByText('Gemini Pro')).toBeDefined();
  });

  it('shows empty state description when no keys', async () => {
    const { useKeyStore } = await import('../../stores/useKeyStore');
    vi.mocked(useKeyStore).mockReturnValueOnce({ keys: [], removeKey: vi.fn(), checkHealth: vi.fn(), checkAllHealth: vi.fn() });
    render(<ProviderManager />);
    expect(screen.getByText((content) => content.includes('Add your first provider'))).toBeDefined();
  });

});

describe('InstalledProvidersView', () => {
  let InstalledProvidersView: FC<InstalledProvidersViewProps>;

  beforeAll(async () => {
    InstalledProvidersView = (await import('./InstalledProvidersView')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  const baseProps: InstalledProvidersViewProps = { keys: mockKeys, onSelect: vi.fn(), onCheckHealth: vi.fn(), onToggleStatus: vi.fn(), onEnableAll: vi.fn(), onDisableAll: vi.fn(), checkingKeys: new Set<string>() };

  it('renders search input', () => {
    render(<InstalledProvidersView {...baseProps} />);
    expect(screen.getByPlaceholderText('Search installed providers...')).toBeDefined();
  });

  it('filters providers on search', () => {
    render(<InstalledProvidersView {...baseProps} />);
    const input = screen.getByPlaceholderText('Search installed providers...');
    fireEvent.change(input, { target: { value: 'Gemini' } });
    expect(screen.getByText((_, el) => el?.textContent === 'Gemini Pro')).toBeDefined();
    expect(screen.queryByText((_, el) => el?.textContent === 'OpenRouter Pro')).toBeNull();
  });

  it('shows empty state when no matches', () => {
    render(<InstalledProvidersView {...baseProps} />);
    const input = screen.getByPlaceholderText('Search installed providers...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No providers found')).toBeDefined();
  });

  it('shows view mode toggles', () => {
    render(<InstalledProvidersView {...baseProps} />);
    expect(screen.getByText('Table')).toBeDefined();
    expect(screen.getByText('Cards')).toBeDefined();
  });

  it('switches to cards view', () => {
    render(<InstalledProvidersView {...baseProps} />);
    fireEvent.click(screen.getByText('Cards'));
    expect(screen.getByText('1200ms')).toBeDefined();
  });

  it('calls onSelect when row clicked', () => {
    const onSelect = vi.fn();
    render(<InstalledProvidersView {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('OpenRouter Pro'));
    expect(onSelect).toHaveBeenCalledWith(mockKeys[0], 'overview');
  });

  it('calls onSelect on Enter key on row', () => {
    const onSelect = vi.fn();
    render(<InstalledProvidersView {...baseProps} onSelect={onSelect} />);
    const row = screen.getByText('OpenRouter Pro').closest('tr')!;
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockKeys[0], 'overview');
  });

  it('calls onSelect on Space key on row', () => {
    const onSelect = vi.fn();
    render(<InstalledProvidersView {...baseProps} onSelect={onSelect} />);
    const row = screen.getByText('OpenRouter Pro').closest('tr')!;
    fireEvent.keyDown(row, { key: ' ' });
    expect(onSelect).toHaveBeenCalledWith(mockKeys[0], 'overview');
  });

  it('calls onCheckHealth when health button clicked in table', () => {
    const onCheckHealth = vi.fn();
    render(<InstalledProvidersView {...baseProps} onCheckHealth={onCheckHealth} />);
    const healthBtns = screen.getAllByTitle('Check Health');
    fireEvent.click(healthBtns[1]);
    expect(onCheckHealth).toHaveBeenCalledWith('k1');
  });

  it('calls onCheckHealth when health button clicked in card view', () => {
    const onCheckHealth = vi.fn();
    render(<InstalledProvidersView {...baseProps} onCheckHealth={onCheckHealth} />);
    fireEvent.click(screen.getByText('Cards'));
    const healthBtns = screen.getAllByTitle('Check Health');
    fireEvent.click(healthBtns[1]);
    expect(onCheckHealth).toHaveBeenCalledWith('k1');
  });

  it('shows em dash for missing TPS', () => {
    render(<InstalledProvidersView {...baseProps} keys={[{ ...mockKeys[1], stats: { successCount: 0, errorCount: 0, totalTokens: 0, avgLatency: 0, minLatency: 0, maxLatency: 0 } }]} />);
    const tpsCells = screen.getAllByText('\u2014');
    expect(tpsCells.length).toBeGreaterThan(0);
  });

  it('stops propagation on action button click', () => {
    const onSelect = vi.fn();
    const onCheckHealth = vi.fn();
    render(<InstalledProvidersView {...baseProps} onSelect={onSelect} onCheckHealth={onCheckHealth} />);
    const healthBtns = screen.getAllByTitle('Check Health');
    fireEvent.click(healthBtns[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('RoutingSLAView', () => {
  let RoutingSLAView: FC<RoutingSLAViewProps>;

  beforeAll(async () => {
    RoutingSLAView = (await import('./RoutingSLAView')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders global routing policy section', () => {
    render(<RoutingSLAView keys={mockKeys} />);
    expect(screen.getByText('Global Routing Policy')).toBeDefined();
    expect(screen.getByText('Active Provider SLAs')).toBeDefined();
  });

  it('renders active provider SLA cards', () => {
    render(<RoutingSLAView keys={mockKeys} />);
    expect(screen.getByText('OpenRouter Pro')).toBeDefined();
    expect(screen.queryByText('Gemini Pro')).toBeNull();
  });

  it('shows no-active-providers message when none active', () => {
    render(<RoutingSLAView keys={[]} />);
    expect(screen.getByText('No active providers to monitor.')).toBeDefined();
  });

  it('toggles fallback switch on click', () => {
    render(<RoutingSLAView keys={mockKeys} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles fallback switch on Enter key', () => {
    render(<RoutingSLAView keys={mockKeys} />);
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('updates latency threshold slider', () => {
    render(<RoutingSLAView keys={mockKeys} />);
    const slider = screen.getByLabelText('Latency threshold');
    fireEvent.change(slider, { target: { value: '3000' } });
    expect(screen.getByText('3000ms')).toBeDefined();
  });
});

describe('BrowseModelsView', () => {
  let BrowseModelsView: FC<BrowseModelsViewProps>;

  beforeAll(async () => {
    BrowseModelsView = (await import('./BrowseModelsView')).default;
  });

  it('renders provider catalog cards', () => {
    render(<BrowseModelsView onAddProvider={vi.fn()} />);
    expect(screen.getByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Gemini')).toBeDefined();
    expect(screen.getByText('Groq')).toBeDefined();
    expect(screen.getByText('NVIDIA')).toBeDefined();
  });

  it('calls onAddProvider on configure button click', () => {
    const onAddProvider = vi.fn();
    render(<BrowseModelsView onAddProvider={onAddProvider} />);
    fireEvent.click(screen.getByText('Configure OpenRouter'));
    expect(onAddProvider).toHaveBeenCalledOnce();
  });
});

describe('ProviderIcon', () => {
  let ProviderIcon: FC<ProviderIconProps>;

  beforeAll(async () => {
    ProviderIcon = (await import('../ProviderIcon/ProviderIcon')).default;
  });

  it('renders with default size', () => {
    const { container } = render(<ProviderIcon provider="OpenRouter" />);
    expect(container.querySelector('.provider-icon-wrapper')).toBeDefined();
  });

  it('renders with custom size', () => {
    const { container } = render(<ProviderIcon provider="Gemini" size={32} />);
    expect(container.querySelector('.provider-icon-wrapper')).toBeDefined();
  });
});

describe('ProviderDetailModal', () => {
  let ProviderDetailModal: FC<ProviderDetailModalProps>;
  const profile = mockKeys[0];

  beforeAll(async () => {
    ProviderDetailModal = (await import('./ProviderDetailModal')).default;
  });

  const baseProps: ProviderDetailModalProps = { profile, initialTab: 'overview', onClose: vi.fn(), onCheckHealth: vi.fn(), onRemove: vi.fn() };

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders provider details', () => {
    render(<ProviderDetailModal {...baseProps} />);
    expect(screen.getByText('OpenRouter Pro')).toBeDefined();
    expect(screen.getByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Run Health Check')).toBeDefined();
    expect(screen.getByText('Remove Provider')).toBeDefined();
  });

  it('has dialog role and aria-modal', () => {
    render(<ProviderDetailModal {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<ProviderDetailModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close provider details'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn();
    render(<ProviderDetailModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<ProviderDetailModal {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows Confirm Remove after first click on Remove Provider', () => {
    render(<ProviderDetailModal {...baseProps} />);
    fireEvent.click(screen.getByText('Remove Provider'));
    expect(screen.getByText('Confirm Remove')).toBeDefined();
  });

  it('calls onRemove and onClose after confirming remove', () => {
    const onRemove = vi.fn();
    const onClose = vi.fn();
    render(<ProviderDetailModal {...baseProps} onRemove={onRemove} onClose={onClose} />);
    fireEvent.click(screen.getByText('Remove Provider'));
    fireEvent.click(screen.getByText('Confirm Remove'));
    expect(onRemove).toHaveBeenCalledWith('k1');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancels remove on Escape when in confirm state', () => {
    render(<ProviderDetailModal {...baseProps} />);
    fireEvent.click(screen.getByText('Remove Provider'));
    expect(screen.getByText('Confirm Remove')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Confirm Remove')).toBeNull();
  });

  it('calls onCheckHealth when health check clicked', () => {
    const onCheckHealth = vi.fn();
    render(<ProviderDetailModal {...baseProps} onCheckHealth={onCheckHealth} />);
    fireEvent.click(screen.getByText('Run Health Check'));
    expect(onCheckHealth).toHaveBeenCalledWith('k1');
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    render(<ProviderDetailModal {...baseProps} onClose={onClose} />);
    const backdrop = document.querySelector('.provider-modal-backdrop')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
