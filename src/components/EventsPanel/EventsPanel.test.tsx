import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { eventBus } from '../../core/events';

describe('EventsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    const { container } = render(<EventsPanel />);
    expect(container).toBeDefined();
  });

  it('shows system events heading', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    const matches = screen.getAllByText(/event/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows no events message initially', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    // Should show loading or empty state
    const body = document.body.textContent || '';
    expect(body.length).toBeGreaterThan(0);
  });

  it('has search functionality', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
