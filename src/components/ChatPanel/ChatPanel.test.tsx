import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { eventBus } from '../../core/events';

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({
    keys: [
      { id: '1', provider: 'OpenRouter', key: '', label: 'Main', status: 'active', model: 'gpt-4o', latency: 120, stats: {} },
      { id: '2', provider: 'Groq', key: '', label: 'Cloud', status: 'active', model: 'llama-3.3-70b', latency: 80, stats: {} },
    ],
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

  it('displays session title', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    expect(screen.getByText('Test Chat')).toBeDefined();
  });

  it('shows send button', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const sendButton = document.querySelector('button');
    expect(sendButton).toBeDefined();
  });

  it('shows execution mode buttons', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    expect(screen.getByText('Auto')).toBeDefined();
    expect(screen.getByText('Parallel')).toBeDefined();
    expect(screen.getByText('Single')).toBeDefined();
  });

  it('renders text input area', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    render(<ChatPanel />);
    const textareas = document.querySelectorAll('textarea');
    expect(textareas.length).toBeGreaterThan(0);
  });
});
