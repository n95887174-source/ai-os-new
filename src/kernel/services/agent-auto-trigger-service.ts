/**
 * Agent Auto-Trigger Service
 * Event-based agent spawning
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('AgentAutoTrigger');

export interface TriggerRule {
  id: string;
  name: string;
  event: string; // EventBus event name
  agentId: string;
  agentConfig: {
    name?: string;
    roleId?: string;
    tools?: string[];
  };
  conditions?: {
    field: string;
    operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
    value: string | number;
  }[];
  enabled: boolean;
  cooldownMs: number;
  lastTriggered: number;
}

export interface TriggerHistory {
  ruleId: string;
  triggeredAt: number;
  event: string;
  agentSpawned: string;
  success: boolean;
  error?: string;
}

class AgentAutoTriggerService {
  private storage: StorageAdapter;
  private rules: Map<string, TriggerRule> = new Map();
  private history: TriggerHistory[] = [];
  private listeners: Map<string, () => void> = new Map();
  private pendingTriggers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.storage = StorageAdapter.AGENTS;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      rules: [string, TriggerRule][];
      history: TriggerHistory[];
    }>('data');

    if (saved) {
      for (const [id, rule] of saved.rules || []) {
        this.rules.set(id, rule);
      }
      this.history = saved.history || [];
    }

    // Register listeners for all rules
    this.registerEventListeners();

    LOGGER.info('AgentAutoTrigger', `Initialized with ${this.rules.size} rules`);
  }

  /**
   * Create trigger rule
   */
  async createRule(data: Omit<TriggerRule, 'id' | 'lastTriggered'>): Promise<TriggerRule> {
    const id = `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rule: TriggerRule = {
      ...data,
      id,
      lastTriggered: 0,
    };

    this.rules.set(id, rule);
    this.registerEventListener(rule);
    await this.save();

    EventBus.emit(EVENTS.AGENT_TRIGGER_CREATED, rule);
    LOGGER.info('AgentAutoTrigger', 'Rule created', { id, name: data.name, event: data.event });

    return rule;
  }

  /**
   * Update trigger rule
   */
  async updateRule(id: string, data: Partial<TriggerRule>): Promise<TriggerRule | null> {
    const existing = this.rules.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, id };
    this.rules.set(id, updated);
    
    // Re-register listener if event changed
    if (data.event && data.event !== existing.event) {
      this.unregisterEventListener(id);
      this.registerEventListener(updated);
    }

    await this.save();
    return updated;
  }

  /**
   * Delete trigger rule
   */
  async deleteRule(id: string): Promise<boolean> {
    const deleted = this.rules.delete(id);
    if (deleted) {
      this.unregisterEventListener(id);
      await this.save();
    }
    return deleted;
  }

  /**
   * Enable/disable rule
   */
  async toggleRule(id: string, enabled: boolean): Promise<boolean> {
    const rule = this.rules.get(id);
    if (!rule) return false;

    rule.enabled = enabled;
    await this.save();
    LOGGER.info('AgentAutoTrigger', `Rule ${enabled ? 'enabled' : 'disabled'}`, { id });
    return true;
  }

  /**
   * Get all rules
   */
  getRules(): TriggerRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active rules
   */
  getActiveRules(): TriggerRule[] {
    return this.getRules().filter(r => r.enabled);
  }

  /**
   * Get trigger history
   */
  getHistory(limit = 100): TriggerHistory[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Test trigger manually
   */
  async testTrigger(ruleId: string, eventData: Record<string, unknown>): Promise<boolean> {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    return this.evaluateAndTrigger(rule, eventData, true);
  }

  private registerEventListeners(): void {
    for (const rule of this.rules.values()) {
      this.registerEventListener(rule);
    }
  }

  private registerEventListener(rule: TriggerRule): void {
    if (this.listeners.has(rule.id)) return;

    const listener = (data: unknown) => {
      if (!rule.enabled) return;
      this.evaluateAndTrigger(rule, data as Record<string, unknown>);
    };

    EventBus.on(rule.event, listener);
    this.listeners.set(rule.id, () => EventBus.off(rule.event, listener));
  }

  private unregisterEventListener(ruleId: string): void {
    const unsub = this.listeners.get(ruleId);
    if (unsub) {
      unsub();
      this.listeners.delete(ruleId);
    }
  }

  private async evaluateAndTrigger(rule: TriggerRule, eventData: Record<string, unknown>, isTest = false): Promise<boolean> {
    // Check cooldown
    const now = Date.now();
    if (!isTest && now - rule.lastTriggered < rule.cooldownMs) {
      LOGGER.debug('AgentAutoTrigger', 'Cooldown active', { ruleId: rule.id });
      return false;
    }

    // Evaluate conditions
    if (rule.conditions && rule.conditions.length > 0) {
      for (const condition of rule.conditions) {
        const value = this.getNestedValue(eventData, condition.field);
        if (!this.evaluateCondition(value, condition.operator, condition.value)) {
          return false;
        }
      }
    }

    // Trigger agent spawn
    try {
      // This would call AgentService.spawnAgent in real implementation
      const agentSpawned = `auto-agent-${Date.now()}`;

      rule.lastTriggered = now;

      const historyEntry: TriggerHistory = {
        ruleId: rule.id,
        triggeredAt: now,
        event: rule.event,
        agentSpawned,
        success: true,
      };

      this.history.push(historyEntry);
      await this.save();

      EventBus.emit(EVENTS.AGENT_TRIGGER_FIRED, {
        ruleId: rule.id,
        agentSpawned,
        event: rule.event,
      });

      LOGGER.info('AgentAutoTrigger', 'Trigger fired', {
        ruleId: rule.id,
        event: rule.event,
        agentSpawned,
      });

      return true;
    } catch (error) {
      const historyEntry: TriggerHistory = {
        ruleId: rule.id,
        triggeredAt: now,
        event: rule.event,
        agentSpawned: '',
        success: false,
        error: String(error),
      };

      this.history.push(historyEntry);
      await this.save();

      LOGGER.error('AgentAutoTrigger', 'Trigger failed', { ruleId: rule.id, error });
      return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key: string) => 
      acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined, obj);
  }

  private evaluateCondition(value: unknown, operator: NonNullable<TriggerRule['conditions']>[0]['operator'], target: string | number): boolean {
    switch (operator) {
      case 'eq': return value === target;
      case 'neq': return value !== target;
      case 'contains': return String(value).includes(String(target));
      case 'gt': return Number(value) > Number(target);
      case 'lt': return Number(value) < Number(target);
      default: return false;
    }
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      rules: Array.from(this.rules.entries()),
      history: this.history.slice(-1000),
    });
  }
}

// Singleton
export const agentAutoTriggerService = new AgentAutoTriggerService();

// Add events
if (!EVENTS.AGENT_TRIGGER_CREATED) {
  (EVENTS as unknown as Record<string, string>).AGENT_TRIGGER_CREATED = 'agent:trigger:created';
}
if (!EVENTS.AGENT_TRIGGER_FIRED) {
  (EVENTS as unknown as Record<string, string>).AGENT_TRIGGER_FIRED = 'agent:trigger:fired';
}