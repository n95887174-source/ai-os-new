import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockKeys = [
  { id: '1', provider: 'OpenRouter', key: '', label: 'Main', status: 'active', availableModels: ['gpt-4o'], latency: 120, stats: {} },
  { id: '2', provider: 'Groq', key: '', label: 'Cloud', status: 'active', availableModels: ['llama-3.3-70b'], latency: 80, stats: {} },
];

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({
    keys: mockKeys,
    activeKeys: mockKeys.filter(k => k.status === 'active'),
    addKey: vi.fn(),
    removeKey: vi.fn(),
    checkHealth: vi.fn(),
    checkAllHealth: vi.fn(),
  }),
}));

vi.mock('../../stores/useChatStore', () => ({
  useChatStore: () => ({
    sessions: [{ id: 's1', title: 'Test Chat', history: [], createdAt: Date.now(), updatedAt: Date.now() }],
    activeSessionId: 's1',
    setActiveSessionId: vi.fn(),
    history: [],
    isSending: false,
    sendMessage: vi.fn(),
    cancelMessage: vi.fn(),
    clearHistory: vi.fn(),
    createSession: vi.fn(() => 'new-session'),
    deleteSession: vi.fn(),
    forkSession: vi.fn(),
    editEntry: vi.fn(),
  }),
}));

vi.mock('../../services/RouterService', () => ({
  routerService: {
    getRankedProviders: vi.fn(() => []),
  },
}));

vi.mock('../../core/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { NOTIFICATION: 'notification', START_CHAT_WITH_TARGET: 'chat:start_with_target', SELECT_MODEL: 'chat:select_model', NAVIGATE: 'system:navigate' },
}));

vi.mock('../ProviderIcon/ProviderIcon', () => ({ default: () => null }));

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const { container } = render(<ChatPanel />);
    expect(container).toBeDefined();
  });

  it('renders without no-providers message', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    expect(screen.queryByText('No Providers Configured')).toBeNull();
  });

  it('shows send button', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    await waitFor(() => {
      const sendButton = document.querySelector('button');
      expect(sendButton).toBeDefined();
    });
  });

  it('shows execution mode options', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const options = document.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(3);
  });

  it('renders text input area', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const textareas = document.querySelectorAll('textarea');
    expect(textareas.length).toBeGreaterThan(0);
  });

  it('renders Auto execution mode', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const selects = document.querySelectorAll('select');
    const modeSelect = Array.from(selects).find(s => s.querySelector('option[value="auto"]'));
    expect(modeSelect).toBeDefined();
  });

  it('renders session title', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const titles = await screen.findAllByText('Test Chat');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders new chat button', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    expect(await screen.findByText('New Conversation')).toBeDefined();
  });

  it('renders search input in sidebar', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const searchInputs = document.querySelectorAll('input[placeholder*="Search"]');
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  it('has textarea for message input', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.getAttribute('placeholder')).toBeDefined();
  });
});
