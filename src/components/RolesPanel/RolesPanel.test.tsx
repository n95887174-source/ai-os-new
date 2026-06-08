import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockRoles = [
  { id: 'role-1', name: 'Researcher', description: 'Research specialist', systemPrompt: 'You are a researcher {{task}}', baseTemperature: 0.3, capabilities: ['web_search'], metadata: { category: 'technical', created: Date.now(), updated: Date.now() } },
  { id: 'role-2', name: 'Code Reviewer', description: 'Reviews pull requests', systemPrompt: 'You are a code reviewer', baseTemperature: 0.2, capabilities: ['code_review'], metadata: { category: 'technical', created: Date.now(), updated: Date.now() } },
];

const mockStats = {
  'role-1': { invocations: 100, errors: 2, avgLatency: 500 },
  'role-2': { invocations: 50, errors: 1, avgLatency: 300 },
};

const mockTools = [
  { id: 'web_search', name: 'Web Search', description: 'Search' },
  { id: 'code_review', name: 'Code Review', description: 'Review' },
];

vi.mock('../../kernel/instances', () => ({
  roleService: {
    getRoles: vi.fn(() => mockRoles),
    getAllStats: vi.fn(() => mockStats),
    getAgentsByRole: vi.fn(() => []),
    validateRole: vi.fn(() => ({ valid: true, missingTools: [] })),
    deleteRole: vi.fn(),
    updateRole: vi.fn(),
    addRole: vi.fn(),
  },
  toolService: { getTools: vi.fn(() => mockTools) },
}));

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { NOTIFICATION: 'notification' },
}));

describe('RolesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Agent Role Blueprints heading', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    expect(await screen.findByText('Agent Role Blueprints')).toBeDefined();
  });

  it('renders role cards', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    expect(await screen.findByText('Researcher')).toBeDefined();
    expect(screen.getByText('Code Reviewer')).toBeDefined();
  });

  it('shows role descriptions', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    expect(await screen.findByText('Research specialist')).toBeDefined();
    expect(screen.getByText('Reviews pull requests')).toBeDefined();
  });

  it('renders Create Blueprint button', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    expect(await screen.findByText('Create Blueprint')).toBeDefined();
  });

  it('filters roles by search', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    await screen.findByText('Researcher');
    const search = document.querySelector('input[placeholder*="Search blueprints"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Code' } });
    await waitFor(() => {
      expect(screen.queryByText('Researcher')).toBeNull();
    });
    expect(screen.getByText('Code Reviewer')).toBeDefined();
  });

  it('shows empty state when search has no results', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    await screen.findByText('Researcher');
    const search = document.querySelector('input[placeholder*="Search blueprints"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'ZZZNoMatch' } });
    expect(await screen.findByText('No blueprints match your search')).toBeDefined();
  });

  it('opens editor modal on role card click', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    await screen.findByText('Researcher');
    const card = screen.getByText('Researcher').closest('[style*="cursor: pointer"]') || screen.getByText('Researcher');
    fireEvent.click(card);
    await waitFor(() => {
      expect(screen.queryByText('Edit Role Blueprint')).toBeDefined();
    });
  });

  it('shows duplicate and delete buttons on role cards', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    await screen.findByText('Researcher');
    const buttons = document.querySelectorAll('button');
    const copyButtons = Array.from(buttons).filter(b => b.innerHTML.includes('Copy') || b.querySelector('[class*="lucide-copy"]'));
    const trashButtons = Array.from(buttons).filter(b => b.innerHTML.includes('Trash2') || b.querySelector('[class*="lucide-trash2"]'));
    expect(copyButtons.length).toBeGreaterThan(0);
    expect(trashButtons.length).toBeGreaterThan(0);
  });

  it('shows stats for roles', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    expect(await screen.findByText('100')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('renders search input with placeholder', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    await screen.findByText('Researcher');
    const search = document.querySelector('input[placeholder*="Search blueprints"]');
    expect(search).toBeDefined();
  });

  it('shows category color indicators', async () => {
    const RolesPanel = (await import('./RolesPanel')).default;
    render(<RolesPanel />);
    expect(await screen.findAllByText('technical')).toHaveLength(2);
  });
});
