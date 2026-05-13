import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentsPanel from './AgentsPanel';

const mockTools = [
  { id: 'web_search', name: 'Web Search', description: 'Search the web' },
  { id: 'summarize', name: 'Summarize', description: 'Summarize content' },
  { id: 'code_review', name: 'Code Review', description: 'Review code' },
];

const mockRoles = [
  { id: 'role-1', name: 'Researcher', systemPrompt: 'You are a researcher', capabilities: ['web_search'], baseTemperature: 0.3 },
];

vi.mock('../../core/events', () => {
  const TOPO = {
    id: 'topo-1', version: '1.0', name: 'Test Topo',
    nodes: [
      { id: 'agent-1', type: 'agent', label: 'Alpha Agent', config: { roleName: 'Research Analyst', prompt: 'Test prompt', tools: ['web_search', 'summarize'], temperature: 0.3, provider: 'openai', model: 'gpt-4' } },
      { id: 'agent-2', type: 'agent', label: 'Beta Agent', config: { roleName: 'Software Engineer', prompt: 'Code review', tools: ['code_review'], temperature: 0.2, provider: 'anthropic', model: 'claude-3' } },
    ],
    edges: [], policies: [],
  };
  return {
    eventBus: { 
      emit: vi.fn(), 
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => { 
        if (event === 'system:topology:mounted') {
          setTimeout(() => cb(TOPO), 0);
        }
        return vi.fn(); 
      }), 
      off: vi.fn() 
    },
  };
});

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({ keys: [{ id: 'key-1', status: 'active', provider: 'openai', availableModels: ['gpt-4'] }] }),
}));

vi.mock('../../services/ToolService', () => ({
  toolService: { getTools: vi.fn(() => mockTools) },
}));

vi.mock('../../services/RoleService', () => ({
  roleService: { getAllRoles: vi.fn(() => mockRoles), getRole: vi.fn((id: string) => mockRoles.find(r => r.id === id) || null) },
}));

vi.mock('../../services/OrchestrationService', () => ({
  orchestrator: {
    getActiveTopology: vi.fn(() => ({
      id: 'topo-1', version: '1.0', name: 'Test Topo',
      nodes: [
        { id: 'agent-1', type: 'agent', label: 'Alpha Agent', config: { roleName: 'Research Analyst', prompt: 'Test prompt', tools: ['web_search', 'summarize'], temperature: 0.3, provider: 'openai', model: 'gpt-4' } },
        { id: 'agent-2', type: 'agent', label: 'Beta Agent', config: { roleName: 'Software Engineer', prompt: 'Code review', tools: ['code_review'], temperature: 0.2, provider: 'anthropic', model: 'claude-3' } },
      ],
      edges: [], policies: [],
    })),
    mount: vi.fn(),
    isNodeDisabled: vi.fn(() => false),
    setNodeDisabled: vi.fn(),
  },
}));

vi.mock('../../services/AgentService', () => ({
  agentService: {
    getAllStats: vi.fn(() => ({ 'agent-1': { calls: 10, tokens: 500, latency: 200 }, 'agent-2': { calls: 5, tokens: 200, latency: 800 } })),
    spawnAgent: vi.fn(() => 'agent-new'),
    toggleAgent: vi.fn(),
    pauseAllAgents: vi.fn(),
    resumeAllAgents: vi.fn(),
    resetStats: vi.fn(),
    resetAllStats: vi.fn(),
    exportAgents: vi.fn(() => '[]'),
    importAgents: vi.fn(() => 1),
  },
}));

  describe('AgentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Agent Workforce heading', async () => {
    render(<AgentsPanel />);
    expect(await screen.findByText('Agent Workforce')).toBeDefined();
  });

  it('renders agent cards from topology', async () => {
    render(<AgentsPanel />);
    expect(await screen.findByText('Alpha Agent')).toBeDefined();
    expect(screen.getByText('Research Analyst')).toBeDefined();
    expect(screen.getByText('Beta Agent')).toBeDefined();
  });

  it('renders quick start template buttons', async () => {
    render(<AgentsPanel />);
    expect(await screen.findByText('Quick Start:')).toBeDefined();
    expect(screen.getByText('Research')).toBeDefined();
    expect(screen.getByText('Coding')).toBeDefined();
  });

  it('renders search input with aria-label', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    expect(screen.getByLabelText('Search agents')).toBeDefined();
  });

  it('filters agents by search query', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const search = screen.getByLabelText('Search agents');
    fireEvent.change(search, { target: { value: 'Beta' } });
    expect(screen.getByText('Beta Agent')).toBeDefined();
    expect(screen.queryByText('Alpha Agent')).toBeNull();
  });

  it('filters agents by status filter', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const pausedBtn = screen.getByText('Paused');
    fireEvent.click(pausedBtn);
    expect(screen.getByText('No agents deployed')).toBeDefined();
  });

  it('has aria-pressed on filter buttons', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const allBtn = screen.getByText('All');
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    const activeBtn = screen.getByText('Active');
    expect(activeBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('has view toggle with radio role', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const gridBtn = screen.getByLabelText('Grid view');
    const listBtn = screen.getByLabelText('List view');
    expect(gridBtn.getAttribute('role')).toBe('radio');
    expect(listBtn.getAttribute('role')).toBe('radio');
  });

  it('opens modal on card click', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const card = screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ });
    fireEvent.click(card);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });
    expect(screen.getByText('Identity & Routing')).toBeDefined();
  });

  it('modal has role="dialog" and aria-modal', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    fireEvent.click(screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toContain('Alpha Agent');
  });

  it('modal sidebar has role="tablist" with tabs', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    fireEvent.click(screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('tablist')).toBeDefined();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(5);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('switches tab on sidebar click', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    fireEvent.click(screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ }));
    await screen.findByRole('dialog');
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    await waitFor(() => {
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    });
  });

  it('closes modal on X button click', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    fireEvent.click(screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ }));
    await screen.findByRole('dialog');
    const closeBtn = screen.getByLabelText('Close agent details');
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('renders export and import buttons', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Agent Workforce');
    expect(screen.getByText('Export')).toBeDefined();
    expect(screen.getByText('Import')).toBeDefined();
  });

  it('renders agent cards with aria-label', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const card = screen.getByLabelText(/Alpha Agent - Research Analyst/);
    expect(card).toBeDefined();
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('shows empty state description placeholder for stat cards', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const invocations = screen.getAllByText('Invocations');
    expect(invocations.length).toBeGreaterThanOrEqual(1);
    const latency = screen.getAllByText('Latency');
    expect(latency.length).toBeGreaterThanOrEqual(1);
  });

  it('renders duplicate button in modal', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    fireEvent.click(screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ }));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Duplicate agent')).toBeDefined();
  });

  it('spawns agent on template click', async () => {
    const { agentService } = await import('../../services/AgentService');
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const codingBtn = screen.getByLabelText('Deploy Coding agent');
    fireEvent.click(codingBtn);
    expect(agentService.spawnAgent).toHaveBeenCalled();
  });

  it('renders error banner with alert role', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const { orchestrator } = await import('../../services/OrchestrationService');
    (orchestrator.getActiveTopology as ReturnType<typeof vi.fn>).mockImplementationOnce(() => { throw new Error('fail'); });
    const spawnBtn = screen.getByText('Spawn Agent');
    fireEvent.click(spawnBtn);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  it('Keyboard Enter on card opens modal', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    const card = screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ });
    fireEvent.keyDown(card, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });

  it('Escape key closes modal', async () => {
    render(<AgentsPanel />);
    await screen.findByText('Alpha Agent');
    fireEvent.click(screen.getByRole('button', { name: /Alpha Agent - Research Analyst/ }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
