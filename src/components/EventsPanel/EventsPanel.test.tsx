import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../core/events', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    subscribeAll: vi.fn(() => vi.fn()),
  },
  EVENTS: {
    CHAT_MESSAGE: 'chat:message',
    NOTIFICATION: 'notification',
    HEALTH_CHECK: 'health:check',
  },
}));

describe('EventsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Telemetry & Event Stream heading', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    expect(await screen.findByText('Telemetry & Event Stream')).toBeDefined();
  });

  it('shows LIVE LOGGING indicator', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    expect(await screen.findByText('LIVE LOGGING')).toBeDefined();
  });

  it('renders stat cards', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    expect(await screen.findByText('Total Events Logged')).toBeDefined();
    expect(screen.getByText('Events Per Second')).toBeDefined();
    expect(screen.getByText('Error Rate')).toBeDefined();
    expect(screen.getByText('Buffer Usage')).toBeDefined();
  });

  it('renders search input', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    await screen.findByText('Telemetry & Event Stream');
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('renders severity filter dropdown', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    await screen.findByText('Telemetry & Event Stream');
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders Pause and Resume buttons', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    expect(await screen.findByText('Pause')).toBeDefined();
  });

  it('shows terminal header with root path', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    expect(await screen.findByText(/root@super-agents-os/)).toBeDefined();
  });

  it('shows empty state message', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    expect(await screen.findByText(/Listening for incoming events/, {}, { timeout: 5000 })).toBeDefined();
  });

  it('toggles to STREAM PAUSED on pause click', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    await screen.findByText('LIVE LOGGING');
    fireEvent.click(screen.getByText('Pause'));
    expect(await screen.findByText('STREAM PAUSED')).toBeDefined();
  });

  it('shows Resume after pause', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    await screen.findByText('LIVE LOGGING');
    fireEvent.click(screen.getByText('Pause'));
    expect(await screen.findByText('Resume')).toBeDefined();
  });

  it('shows download button', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    await screen.findByText('Telemetry & Event Stream');
    const buttons = document.querySelectorAll('button');
    const downloadBtns = Array.from(buttons).filter(b => b.querySelector('[class*="lucide-download"]'));
    expect(downloadBtns.length).toBeGreaterThan(0);
  });

  it('shows clear (trash) button', async () => {
    const EventsPanel = (await import('./EventsPanel')).default;
    render(<EventsPanel />);
    await screen.findByText('Telemetry & Event Stream');
    const buttons = document.querySelectorAll('button');
    const trashBtns = Array.from(buttons).filter(b => b.querySelector('[class*="lucide-trash2"]'));
    expect(trashBtns.length).toBeGreaterThan(0);
  });
});
