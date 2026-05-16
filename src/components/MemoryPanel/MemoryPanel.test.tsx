import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockMemories = [
  { id: 'm1', content: 'Important fact about AI', metadata: { source: 'test', type: 'fact', timestamp: Date.now(), importance: 0.9 } },
  { id: 'm2', content: 'User preference stored', metadata: { source: 'chat', type: 'observation', timestamp: Date.now(), importance: 0.5 } },
  { id: 'm3', content: 'System configuration saved', metadata: { source: 'system', type: 'config', timestamp: Date.now(), importance: 0.7 } },
];

vi.mock('../../services/MemoryService', () => ({
  memoryService: {
    getMemories: vi.fn(() => mockMemories),
    search: vi.fn(() => Promise.resolve(mockMemories.slice(0, 2))),
    deleteMemory: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    ensureSemantic: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../core/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },
}));

describe('MemoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Vector Memory Mesh heading', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Vector Memory Mesh')).toBeDefined();
  });

  it('displays memory items', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Important fact about AI')).toBeDefined();
    expect(screen.getByText('User preference stored')).toBeDefined();
    expect(screen.getByText('System configuration saved')).toBeDefined();
  });

  it('has search input', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    await screen.findByText('Vector Memory Mesh');
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('renders collection tabs', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Long-Term Memory')).toBeDefined();
    expect(screen.getByText('Ephemeral Context')).toBeDefined();
    expect(screen.getByText('RAG Knowledge')).toBeDefined();
  });

  it('renders Wipe Index button', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Wipe Index')).toBeDefined();
  });

  it('renders Export Vectors button', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Export Vectors')).toBeDefined();
  });

  it('shows index parameters panel', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Index Parameters')).toBeDefined();
  });

  it('shows Knowledge Growth panel', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Knowledge Growth')).toBeDefined();
  });

  it('shows semantic toggle button', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    expect(await screen.findByText('Semantic')).toBeDefined();
  });

  it('displays total vectors count', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    await screen.findByText('Vector Memory Mesh');
    const entries = await screen.findByText('Memory Entries');
    const countEl = entries.nextElementSibling;
    expect(countEl?.textContent).toBe('3');
  });

  it('shows memory type badges', async () => {
    const MemoryPanel = (await import('./MemoryPanel')).default;
    render(<MemoryPanel />);
    await screen.findByText('Important fact about AI');
    const badges = document.querySelectorAll('[style*="text-transform: uppercase"]');
    const typeBadges = Array.from(badges).filter(b => b.textContent?.match(/^(fact|observation|config)$/i));
    expect(typeBadges.length).toBeGreaterThan(0);
  });
});
