import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => <div data-testid="react-flow">{children}</div>,
  Controls: () => <div>Controls</div>,
  Background: () => <div>Background</div>,
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  addEdge: vi.fn(() => ({})),
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Handle: () => <div>Handle</div>,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

const mockKeys = [
  { id: 'k1', provider: 'OpenRouter', status: 'active', availableModels: ['gpt-4'] },
];

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({ keys: mockKeys }),
}));

vi.mock('../../kernel/instances', () => ({
  toolService: { getTools: vi.fn(() => []) },
  orchestrator: { mount: vi.fn() },
}));

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
  EVENTS: { NOTIFICATION: 'notification' },
}));

describe('CognitiveBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Visual Graph Builder heading', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('Visual Graph Builder')).toBeDefined();
  });

  it('renders component palette items', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('Autonomous Agent')).toBeDefined();
    expect(screen.getByText('Semantic Router')).toBeDefined();
    expect(screen.getByText('Safety Guardrail')).toBeDefined();
    expect(screen.getByText('External Tool')).toBeDefined();
  });

  it('renders palette section title', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('INTELLIGENCE BLOCKS')).toBeDefined();
  });

  it('renders canvas react-flow container', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    const flows = document.querySelectorAll('[data-testid="react-flow"]');
    expect(flows.length).toBe(1);
  });

  it('renders Save Workflow button', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('Save Workflow')).toBeDefined();
  });

  it('renders Deploy to Engine button', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('Deploy to Engine')).toBeDefined();
  });

  it('renders PROPERTIES INSPECTOR section', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('PROPERTIES INSPECTOR')).toBeDefined();
  });

  it('shows RUNTIME IDLE status', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText(/RUNTIME: IDLE/)).toBeDefined();
  });

  it('shows "No Node Selected" by default', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('No Node Selected')).toBeDefined();
  });

  it('shows palette item descriptions', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('LLM-powered reasoning core')).toBeDefined();
    expect(screen.getByText('Directs execution flow via ML')).toBeDefined();
    expect(screen.getByText('Validates & sanitizes I/O')).toBeDefined();
    expect(screen.getByText('Executes API calls & scripts')).toBeDefined();
  });

  it('renders Controls component', async () => {
    const CognitiveBuilder = (await import('./CognitiveBuilder')).default;
    render(<CognitiveBuilder />);
    expect(await screen.findByText('Controls')).toBeDefined();
  });
});
