import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../core/events', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
  EVENTS: { KEY_UPDATED: 'key:updated' },
}));

vi.mock('../../services/KeyService', () => ({
  keyService: {
    getKeys: vi.fn(() => []),
    getFreeTierLimits: vi.fn(() => ({})),
  },
}));

describe('PoolStatusPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Resource Pools heading', async () => {
    const PoolStatusPanel = (await import('./PoolStatusPanel')).default;
    render(<PoolStatusPanel />);
    expect(await screen.findByText('Resource Pools')).toBeDefined();
  });

  it('renders pool grouping tabs', async () => {
    const PoolStatusPanel = (await import('./PoolStatusPanel')).default;
    render(<PoolStatusPanel />);
    expect(screen.getByText('Pools')).toBeDefined();
    expect(screen.getByText('Providers')).toBeDefined();
  });

  it('renders all four pool config names', async () => {
    const PoolStatusPanel = (await import('./PoolStatusPanel')).default;
    render(<PoolStatusPanel />);
    expect(screen.getByText('Fast Compute')).toBeDefined();
    expect(screen.getByText('Balanced')).toBeDefined();
    expect(screen.getByText('Free Tier')).toBeDefined();
    expect(screen.getByText('Experimental')).toBeDefined();
  });

  it('shows No providers in this pool when keys empty', async () => {
    const PoolStatusPanel = (await import('./PoolStatusPanel')).default;
    render(<PoolStatusPanel />);
    const emptyMessages = screen.getAllByText('No providers in this pool');
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it('switches to providers view on tab click', async () => {
    const PoolStatusPanel = (await import('./PoolStatusPanel')).default;
    render(<PoolStatusPanel />);
    const btn = screen.getByText('Providers');
    btn.click();
    expect(await screen.findByText('Quota Cap')).toBeDefined();
  });
});
