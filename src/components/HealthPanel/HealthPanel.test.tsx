import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../stores/useKeyStore', () => ({
  useKeyStore: () => ({
    keys: [
      { id: '1', provider: 'OpenRouter', key: '', label: 'Main', status: 'active', stats: {} },
      { id: '2', provider: 'Groq', key: '', label: 'Cloud', status: 'inactive', stats: {} },
    ],
  }),
}));

vi.mock('../../services/AdminService', () => ({
  adminService: {
    getSystemHealth: vi.fn(() => ({
      status: 'healthy',
      version: '2.4.0',
      uptime: 3600,
      vitals: { cpu: 45, memory: 512, throughput: 120, totalRequests: 1000, totalTokens: 50000 },
      services: [
        { name: 'Kernel', status: 'ready' },
        { name: 'Event Bus', status: 'active' },
        { name: 'Agent Mesh', status: 'online' },
      ],
    })),
    reloadRuntime: vi.fn(),
  },
}));

describe('HealthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    const { container } = render(<HealthPanel />);
    expect(container).toBeDefined();
  });

  it('displays system health matrix heading', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('System Health Matrix')).toBeDefined();
  });

  it('shows all systems operational', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('ALL SYSTEMS OPERATIONAL')).toBeDefined();
  });

  it('displays CPU vitals', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('45.0%')).toBeDefined();
  });

  it('displays memory allocation', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('512 MB')).toBeDefined();
  });

  it('displays system uptime', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('3600s')).toBeDefined();
  });

  it('displays throughput', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('120')).toBeDefined();
  });

  it('renders service statuses', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('Kernel')).toBeDefined();
    expect(screen.getByText('Event Bus')).toBeDefined();
    expect(screen.getByText('Agent Mesh')).toBeDefined();
  });

  it('renders provider nodes from store', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Groq')).toBeDefined();
  });

  it('shows offline status for inactive key', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText('OFFLINE')).toBeDefined();
  });

  it('shows security footer', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText(/AES-256/)).toBeDefined();
  });

  it('shows build version', async () => {
    const HealthPanel = (await import('./HealthPanel')).default;
    render(<HealthPanel />);
    expect(screen.getByText(/BUILD_VER/)).toBeDefined();
  });
});
