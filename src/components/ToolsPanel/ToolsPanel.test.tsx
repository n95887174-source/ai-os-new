import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockTools = [
  { id: 't1', name: 'Web Search', description: 'Search the web via APIs', type: 'api', enabled: true, language: 'typescript' },
  { id: 't2', name: 'Code Runner', description: 'Execute Python in sandbox', type: 'script', enabled: false, language: 'python' },
  { id: 't3', name: 'DB Query', description: 'Query PostgreSQL', type: 'database', enabled: true, language: 'sql' },
];

vi.mock('../../kernel/instances', () => ({
  toolService: {
    getTools: vi.fn(() => mockTools),
    exportTools: vi.fn(() => '[]'),
    importTools: vi.fn(() => 2),
    execute: vi.fn(() => Promise.resolve({ status: 'success', data: { result: 'ok' } })),
    toggleTool: vi.fn(),
  },
  settingsService: {
    getSettings: vi.fn(() => ({ language: 'en' })),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn(), onSafe: vi.fn(() => vi.fn()) },
  EVENTS: { NOTIFICATION: 'notification' },
}));

describe('ToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Tool heading', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    expect(await screen.findByText('Tool & Capability Registry')).toBeDefined();
  });

  it('renders all tool cards initially', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    expect(await screen.findByText('Web Search')).toBeDefined();
    expect(screen.getByText('Code Runner')).toBeDefined();
    expect(screen.getByText('DB Query')).toBeDefined();
  });

  it('filters tools by search query', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    const search = document.querySelector('input[placeholder*="Search tools"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Code' } });
    await waitFor(() => {
      expect(screen.queryByText('Web Search')).toBeNull();
    });
    expect(screen.getByText('Code Runner')).toBeDefined();
  });

  it('filters tools by type dropdown', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'script' } });
    await waitFor(() => {
      expect(screen.queryByText('Web Search')).toBeNull();
    });
    expect(screen.getByText('Code Runner')).toBeDefined();
  });

  it('shows empty state when no tools match filter', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    const search = document.querySelector('input[placeholder*="Search tools"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'ZZZNoMatch' } });
    expect(screen.getByText('No tools match current filters')).toBeDefined();
  });

  it('shows inspector panel when tool is selected', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    fireEvent.click(screen.getByText('Web Search'));
    await waitFor(() => {
      expect(screen.getByText(/ID: t1/)).toBeDefined();
    });
  });

  it('shows three inspector tabs (Sandbox, Schema, Security)', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    fireEvent.click(screen.getByText('Web Search'));
    expect(await screen.findByText('Sandbox')).toBeDefined();
    expect(screen.getByText('Schema')).toBeDefined();
    expect(screen.getByText('Security')).toBeDefined();
  });

  it('switches inspector tab to Security', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    fireEvent.click(screen.getByText('Web Search'));
    await screen.findByText('Sandbox');
    fireEvent.click(screen.getByText('Security'));
    expect(await screen.findByText('Execution Isolation Active')).toBeDefined();
  });

  it('shows execution output area in Sandbox tab', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    fireEvent.click(screen.getByText('Web Search'));
    await screen.findByText('Sandbox');
    expect(await screen.findByText('Execution Output')).toBeDefined();
  });

  it('renders Export and Import and Register buttons', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Tool & Capability Registry');
    expect(screen.getByText('Export')).toBeDefined();
    expect(screen.getByText('Import')).toBeDefined();
    expect(screen.getByText('Register Capability')).toBeDefined();
  });

  it('shows Run Capability Test button', async () => {
    const ToolsPanel = (await import('./ToolsPanel')).default;
    render(<ToolsPanel />);
    await screen.findByText('Web Search');
    fireEvent.click(screen.getByText('Web Search'));
    await screen.findByText('Sandbox');
    expect(screen.getByText('Run Capability Test')).toBeDefined();
  });
});
