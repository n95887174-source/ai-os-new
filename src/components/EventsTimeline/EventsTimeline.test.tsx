import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSubscribeAll = vi.fn(() => vi.fn());

vi.mock('../../kernel/events/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    subscribeAll: (...args: unknown[]) => mockSubscribeAll(...args),
  },
}));

describe('EventsTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Events Timeline heading', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(await screen.findByText('Events Timeline')).toBeDefined();
  });

  it('shows event count', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(await screen.findByText(/(0 events)/)).toBeDefined();
  });

  it('renders severity filter buttons', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(screen.getByText('all')).toBeDefined();
    expect(screen.getByText('info')).toBeDefined();
    expect(screen.getByText('error')).toBeDefined();
  });

  it('renders group mode toggles', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(screen.getByText('Flat')).toBeDefined();
    expect(screen.getByText('By Time')).toBeDefined();
    expect(screen.getByText('By Event')).toBeDefined();
  });

  it('renders search input', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(screen.getByPlaceholderText('Search events...')).toBeDefined();
  });

  it('renders live and clear buttons', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(screen.getByText('LIVE')).toBeDefined();
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('toggles pause state', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    const liveBtn = screen.getByText('LIVE');
    fireEvent.click(liveBtn);
    expect(await screen.findByText('PAUSED')).toBeDefined();
  });

  it('subscribes to all events on mount', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(mockSubscribeAll).toHaveBeenCalled();
  });

  it('shows empty state', async () => {
    const EventsTimeline = (await import('./EventsTimeline')).default;
    render(<EventsTimeline />);
    expect(screen.getByText('No events recorded yet')).toBeDefined();
  });
});
