/**
 * Proxy Health Monitor Service
 * Monitors Vite proxy health
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';

const LOGGER = rootLogger.child('ProxyMonitor');

export interface ProxyStatus {
  route: string;
  target: string;
  status: 'up' | 'down' | 'unknown';
  lastCheck: number;
  latencyMs: number;
  consecutiveFailures: number;
}

export interface ProxyConfig {
  route: string;
  target: string;
  checkIntervalMs: number;
  timeoutMs: number;
  failureThreshold: number;
}

const DEFAULT_PROXIES: ProxyConfig[] = [
  { route: '/proxy/groq', target: 'https://api.groq.com', checkIntervalMs: 30000, timeoutMs: 5000, failureThreshold: 3 },
  { route: '/proxy/nvidia', target: 'https://integrate.api.nvidia.com', checkIntervalMs: 30000, timeoutMs: 5000, failureThreshold: 3 },
  { route: '/proxy/openai', target: 'https://api.openai.com', checkIntervalMs: 30000, timeoutMs: 5000, failureThreshold: 3 },
  { route: '/proxy/anthropic', target: 'https://api.anthropic.com', checkIntervalMs: 30000, timeoutMs: 5000, failureThreshold: 3 },
  { route: '/proxy/openrouter', target: 'https://openrouter.ai', checkIntervalMs: 30000, timeoutMs: 5000, failureThreshold: 3 },
];

class ProxyHealthMonitor {
  private status: Map<string, ProxyStatus> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private configs: Map<string, ProxyConfig> = new Map();
  private inFlight = new Set<string>();

  constructor() {
    for (const config of DEFAULT_PROXIES) {
      this.configs.set(config.route, config);
      this.status.set(config.route, {
        route: config.route,
        target: config.target,
        status: 'unknown',
        lastCheck: 0,
        latencyMs: 0,
        consecutiveFailures: 0,
      });
    }
  }

  private _started = false;

  /**
   * Start monitoring
   */
  start(): void {
    if (this._started) return;
    this._started = true;
    for (const [route, config] of this.configs.entries()) {
      this.scheduleCheck(route, config);
    }
    LOGGER.info('ProxyMonitor', 'Monitoring started', { proxies: this.configs.size });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this._started = false;
    LOGGER.info('ProxyMonitor', 'Monitoring stopped');
  }

  /**
   * Get proxy status
   */
  getStatus(route: string): ProxyStatus | undefined {
    return this.status.get(route);
  }

  /**
   * Get all statuses
   */
  getAllStatuses(): ProxyStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * Get healthy proxies
   */
  getHealthyProxies(): ProxyStatus[] {
    return Array.from(this.status.values()).filter(s => s.status === 'up');
  }

  /**
   * Get unhealthy proxies
   */
  getUnhealthyProxies(): ProxyStatus[] {
    return Array.from(this.status.values()).filter(s => s.status === 'down');
  }

  /**
   * Check if proxy is up
   */
  isUp(route: string): boolean {
    const status = this.status.get(route);
    return status?.status === 'up';
  }

  /**
   * Add custom proxy to monitor
   */
  addProxy(config: ProxyConfig): void {
    this.configs.set(config.route, config);
    this.status.set(config.route, {
      route: config.route,
      target: config.target,
      status: 'unknown',
      lastCheck: 0,
      latencyMs: 0,
      consecutiveFailures: 0,
    });
    this.scheduleCheck(config.route, config);
    LOGGER.info('ProxyMonitor', 'Proxy added', { route: config.route });
  }

  /**
   * Remove proxy from monitoring
   */
  removeProxy(route: string): void {
    const timer = this.timers.get(route);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(route);
    }
    this.configs.delete(route);
    this.status.delete(route);
  }

  /**
   * Force check a proxy
   */
  async checkNow(route: string): Promise<ProxyStatus | null> {
    const config = this.configs.get(route);
    if (!config) return null;

    return this.performCheck(route, config);
  }

  private scheduleCheck(route: string, config: ProxyConfig): void {
    const existing = this.timers.get(route);
    if (existing) clearInterval(existing);

    // Check immediately
    this.performCheck(route, config).catch((e) => LOGGER.warn('ProxyMonitor', 'check failed', { route, error: (e as Error).message }));

    // Then schedule periodic checks
    const timer = setInterval(() => {
      this.performCheck(route, config).catch((e) => LOGGER.warn('ProxyMonitor', 'periodic check failed', { route, error: (e as Error).message }));
    }, config.checkIntervalMs);

    this.timers.set(route, timer);
  }

  private async performCheck(route: string, config: ProxyConfig): Promise<ProxyStatus | null> {
    if (this.inFlight.has(route)) return null;
    this.inFlight.add(route);

    const status = this.status.get(route)!;
    const startTime = Date.now();

    try {
      // Use a lightweight endpoint to check proxy health
      const response = await fetch('/api/proxy-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        status.status = 'up';
        status.consecutiveFailures = 0;
        status.latencyMs = latencyMs;
        status.lastCheck = Date.now();
        EventBus.emit(EVENTS.PROXY_UP, { url: route, latencyMs });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      status.consecutiveFailures++;
      status.latencyMs = 0;
      status.lastCheck = Date.now();

      LOGGER.debug('ProxyMonitor', 'Proxy check failed', { route, consecutiveFailures: status.consecutiveFailures, error: String(error) });

      if (status.consecutiveFailures >= config.failureThreshold) {
        if (status.status !== 'down') {
          status.status = 'down';
          EventBus.emit(EVENTS.PROXY_DOWN, { url: route, error: String(error) });
          LOGGER.error('ProxyMonitor', 'Proxy down', { route, error });
        }
      }
    } finally {
      this.inFlight.delete(route);
    }

    return status;
  }
}

// Singleton
export const proxyHealthMonitor = new ProxyHealthMonitor();

// Events are defined in event-names.ts — PROXY_DOWN and PROXY_UP are already there