/**
 * Key Auto-Rotation Policy Service
 * Schedules automatic key rotation based on interval policies
 */

import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { rootLogger } from '../logger-service';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('KeyRotationPolicy');

export type RotationInterval = '7d' | '30d' | '90d' | 'manual';
export type RotationTrigger = 'interval' | 'quota-exceeded' | 'error-threshold' | 'manual';

export interface RotationPolicy {
  keyId: string;
  provider: string;
  interval: RotationInterval;
  notifyBefore: '24h' | '3d' | '7d';
  enabled: boolean;
  autoRotate: boolean;
  lastRotation?: number;
  nextRotation?: number;
  notifySent?: boolean;
}

export interface RotationEvent {
  keyId: string;
  provider: string;
  trigger: RotationTrigger;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const INTERVAL_MS: Record<RotationInterval, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  'manual': 0,
};

class KeyRotationPolicyService {
  private policies: Map<string, RotationPolicy> = new Map();
  private storage: StorageAdapter;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 3600000; // Check every hour
  private isRunning = false;

  constructor() {
    this.storage = StorageAdapter.PROVIDERS;
  }

  private initialized = false;
  private unsubs: Array<() => void> = [];

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    // Load policies
    const saved = await this.storage.get<RotationPolicy[]>('policies');
    if (saved) {
      for (const policy of saved) {
        this.policies.set(policy.keyId, policy);
      }
    }

    // Start scheduler
    this.start();

    // Listen for rotation events
    this.setupEventListeners();

    LOGGER.info('KeyRotationPolicyService', `Initialized with ${this.policies.size} policies`);
  }

  destroy(): void {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private setupEventListeners(): void {
    this.unsubs.push(
      EventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, ((data: { id: string; provider: string }) => {
        this.handleQuotaExceeded(data.id, data.provider);
      }) as unknown as (data: unknown) => void),
      EventBus.on(EVENTS.KEY_HEALTH_FAILED, ((data: { id: string; provider: string; error?: string }) => {
        this.handleHealthFailure(data.id, data.provider, data.error ?? '');
      }) as unknown as (data: unknown) => void),
      EventBus.on(EVENTS.KEY_REMOVED, ((data: string) => {
        this.deletePolicy(data);
      }) as unknown as (data: unknown) => void),
    );
  }

  /**
   * Start the rotation scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkRotations();
    }, this.checkIntervalMs);

    LOGGER.info('KeyRotationPolicyService', 'Rotation scheduler started');
  }

  /**
   * Stop the rotation scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    LOGGER.info('KeyRotationPolicyService', 'Rotation scheduler stopped');
  }

  /**
   * Create a rotation policy for a key
   */
  async createPolicy(data: {
    keyId: string;
    provider: string;
    interval?: RotationInterval;
    notifyBefore?: '24h' | '3d' | '7d';
    autoRotate?: boolean;
  }): Promise<RotationPolicy> {
    const interval = data.interval || '30d';
    const policy: RotationPolicy = {
      keyId: data.keyId,
      provider: data.provider,
      interval,
      notifyBefore: data.notifyBefore || '24h',
      enabled: true,
      autoRotate: data.autoRotate ?? false,
      nextRotation: interval !== 'manual' ? Date.now() + INTERVAL_MS[interval] : undefined,
    };

    this.policies.set(data.keyId, policy);
    await this.save();

    EventBus.emit(EVENTS.KEY_ROTATION_POLICY_CREATED, policy);
    LOGGER.info('KeyRotationPolicyService', 'Policy created', { keyId: data.keyId, interval });

    return policy;
  }

  /**
   * Update a rotation policy
   */
  async updatePolicy(keyId: string, data: Partial<RotationPolicy>): Promise<RotationPolicy | null> {
    const existing = this.policies.get(keyId);
    if (!existing) return null;

    const { keyId: _keyId, ...safeData } = data; void _keyId;
    const updated: RotationPolicy = {
      ...existing,
      ...safeData,
    };

    // Recalculate next rotation if interval changed
    if (data.interval && data.interval !== existing.interval) {
      updated.nextRotation = data.interval !== 'manual' 
        ? Date.now() + INTERVAL_MS[data.interval] 
        : undefined;
    }

    this.policies.set(keyId, updated);
    await this.save();

    EventBus.emit(EVENTS.KEY_ROTATION_POLICY_UPDATED, updated);
    LOGGER.info('KeyRotationPolicyService', 'Policy updated', { keyId });

    return updated;
  }

  /**
   * Delete a rotation policy
   */
  async deletePolicy(keyId: string): Promise<boolean> {
    const existed = this.policies.delete(keyId);
    if (existed) {
      await this.save();
      EventBus.emit(EVENTS.KEY_ROTATION_POLICY_DELETED, { keyId });
      LOGGER.info('KeyRotationPolicyService', 'Policy deleted', { keyId });
    }
    return existed;
  }

  /**
   * Get policy for a key
   */
  getPolicy(keyId: string): RotationPolicy | undefined {
    return this.policies.get(keyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): RotationPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policies due for rotation
   */
  getDuePolicies(): RotationPolicy[] {
    const now = Date.now();
    return this.getAllPolicies().filter(p => 
      p.enabled && 
      p.autoRotate && 
      p.nextRotation && 
      p.nextRotation <= now
    );
  }

  /**
   * Get policies due for notification
   */
  getNotificationDue(): RotationPolicy[] {
    const now = Date.now();
    return this.getAllPolicies().filter(p => {
      if (!p.enabled || !p.nextRotation || p.notifySent) return false;
      
      const notifyBeforeMs = this.getNotifyBeforeMs(p.notifyBefore);
      const timeUntilRotation = p.nextRotation - now;
      
      return timeUntilRotation > 0 && timeUntilRotation <= notifyBeforeMs;
    });
  }

  /**
   * Manual rotation trigger
   */
  async rotate(keyId: string): Promise<boolean> {
    const policy = this.policies.get(keyId);
    if (!policy) return false;

    LOGGER.info('KeyRotationPolicyService', 'Triggering rotation', { keyId });

    // Emit rotation event
    EventBus.emit(EVENTS.KEY_ROTATION_TRIGGERED, { keyId, provider: policy.provider, trigger: 'manual' as RotationTrigger, timestamp: Date.now() });

    // Update policy
    await this.updatePolicy(keyId, {
      lastRotation: Date.now(),
      nextRotation: policy.interval !== 'manual' 
        ? Date.now() + INTERVAL_MS[policy.interval] 
        : undefined,
      notifySent: false,
    });

    return true;
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(keyId: string): Promise<void> {
    await this.updatePolicy(keyId, { notifySent: true });
  }

  /**
   * Check and process due rotations
   */
  private async checkRotations(): Promise<void> {
    // Check for due rotations
    const dueRotations = this.getDuePolicies();
    for (const policy of dueRotations) {
      await this.rotate(policy.keyId);
    }

    // Check for notifications
    const dueNotifications = this.getNotificationDue();
    for (const policy of dueNotifications) {
      this.sendRotationNotification(policy);
    }
  }

  /**
   * Send rotation notification
   */
  private sendRotationNotification(policy: RotationPolicy): void {
    LOGGER.info('KeyRotationPolicyService', 'Sending rotation notification', {
      keyId: policy.keyId,
      provider: policy.provider,
      notifyBefore: policy.notifyBefore,
    });

    EventBus.emit(EVENTS.KEY_ROTATION_NOTIFICATION, { keyId: policy.keyId, provider: policy.provider, interval: policy.interval, notifyBefore: policy.notifyBefore, nextRotation: policy.nextRotation, message: `Key rotation triggered for ${policy.provider} (${policy.keyId.slice(0, 8)}...)` });
  }

  /**
   * Handle quota exceeded event
   */
  private async handleQuotaExceeded(keyId: string, provider: string): Promise<void> {
    const policy = this.policies.get(keyId);
    if (!policy?.enabled) return;

    LOGGER.info('KeyRotationPolicyService', 'Quota exceeded, triggering rotation', { keyId });

    EventBus.emit(EVENTS.KEY_ROTATION_TRIGGERED, { keyId, provider, trigger: 'quota-exceeded', timestamp: Date.now() });
  }

  /**
   * Handle health failure event
   */
  private async handleHealthFailure(keyId: string, provider: string, error: string): Promise<void> {
    const policy = this.policies.get(keyId);
    if (!policy?.enabled) return;

    // Check if error threshold exceeded
    if (error.includes('429') || error.includes('rate limit') || error.includes('quota')) {
      LOGGER.info('KeyRotationPolicyService', 'Health failure, triggering rotation', { keyId, error });

        EventBus.emit(EVENTS.KEY_ROTATION_TRIGGERED, { keyId, provider, trigger: 'error-threshold', timestamp: Date.now(), metadata: { error } });
    }
  }

  private getNotifyBeforeMs(notifyBefore: '24h' | '3d' | '7d'): number {
    switch (notifyBefore) {
      case '24h': return 24 * 60 * 60 * 1000;
      case '3d': return 3 * 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private async save(): Promise<void> {
    await this.storage.set('policies', this.getAllPolicies());
  }

  /**
   * Get rotation statistics
   */
  getStats(): {
    totalPolicies: number;
    autoRotateEnabled: number;
    last24h: number;
    last7d: number;
    last30d: number;
  } {
    const policies = this.getAllPolicies();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return {
      totalPolicies: policies.length,
      autoRotateEnabled: policies.filter(p => p.autoRotate).length,
      last24h: policies.filter(p => p.lastRotation && (now - p.lastRotation) <= dayMs).length,
      last7d: policies.filter(p => p.lastRotation && (now - p.lastRotation) <= 7 * dayMs).length,
      last30d: policies.filter(p => p.lastRotation && (now - p.lastRotation) <= 30 * dayMs).length,
    };
  }
}

// Singleton instance
export const keyRotationPolicyService = new KeyRotationPolicyService();

// Add missing events
if (!EVENTS.KEY_ROTATION_POLICY_CREATED) {
  (EVENTS as unknown as Record<string, string>).KEY_ROTATION_POLICY_CREATED = 'key:rotation:policy:created';
}
// Events are defined in event-names.ts — all KEY_ROTATION_* events are already there