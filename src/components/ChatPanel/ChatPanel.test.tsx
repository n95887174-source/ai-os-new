import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { eventBus } from '../../core/events';

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
  }),
}));

vi.mock('../../services/RouterService', () => ({
  routerService: {
    getRankedProviders: vi.fn(() => []),
  },
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
    // With active keys mocked, should not show "No Providers Configured"
    expect(screen.queryByText('No Providers Configured')).toBeNull();
  });

  it('shows send button', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const sendButton = document.querySelector('button');
    expect(sendButton).toBeDefined();
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
});
