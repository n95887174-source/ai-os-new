import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import type { ISPolicy } from '../core/IntelligenceDSL';

export type PolicyType = 'latency' | 'privacy' | 'cost' | 'safety' | 'rate_limit' | 'content' | 'custom';
export type PolicyAction = 'block' | 'warn' | 'log' | 'throttle' | 'mask';
export type PolicySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface PolicyViolation {
  id: string;
  policyId: string;
  nodeId: string;
  type: PolicyType;
  severity: PolicySeverity;
  detail: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  resolved: boolean;
}

export interface PolicyStats {
  totalViolations: number;
  activeViolations: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  lastViolation: number | null;
}

const POLICIES_KEY = 'super_agents_policies';
const MAX_VIOLATIONS = 200;

class PolicyService {
  private activePolicies: ISPolicy[] = [];
  private violations: PolicyViolation[] = [];
  private initialPolicies: ISPolicy[] = [
    {
      id: 'p-latency-1', type: 'latency', target_nodes: ['all'],
      value: 2000, action: 'warn'
    },
    {
      id: 'p-privacy-1', type: 'privacy', target_nodes: ['all'],
      value: 'PII_REDACTION', action: 'block'
    },
    {
      id: 'p-cost-1', type: 'cost', target_nodes: ['all'],
      value: 0.05, action: 'warn'
    },
  ];
  private unsubs: Array<() => void> = [];

  constructor() {
    this.load();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private async load() {
    try {
      const saved = await db.getKv<(ISPolicy | { id: string; type: PolicyType })[]>(POLICIES_KEY);
      if (saved && saved.length > 0) {
        this.activePolicies = saved.map(s => ({
          ...s,
          value: (s as ISPolicy).value ?? 0,
          action: (s as ISPolicy).action ?? 'warn',
          target_nodes: (s as ISPolicy).target_nodes ?? ['all'],
        })) as ISPolicy[];
      } else {
        this.activePolicies = [...this.initialPolicies];
      }
    } catch (e) {
      console.error('[PolicyService] Failed to load policies', e);
      this.activePolicies = [...this.initialPolicies];
    }
  }

  private async persist() {
    try {
      await db.setKv(POLICIES_KEY, this.activePolicies);
    } catch (e) {
      console.error('[PolicyService] Failed to persist', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        this.checkLatency(data as { nodeId: string; duration?: number });
      }),
      eventBus.on('cognitive:step:active', (data) => {
        this.enforcePrivacy(data as { nodeId: string; output?: string });
      })
    );
  }

  private recordViolation(data: Omit<PolicyViolation, 'id' | 'timestamp'>) {
    const violation: PolicyViolation = {
      ...data,
      id: `violation-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    this.violations.unshift(violation);
    if (this.violations.length > MAX_VIOLATIONS) this.violations.pop();
    eventBus.emit('policy:violation', violation);
  }

  private checkLatency(data: { nodeId: string; duration?: number }) {
    const policy = this.activePolicies.find(p => p.type === 'latency');
    if (!policy || data.duration === undefined) return;
    const threshold = policy.value as number;
    if (threshold && data.duration > threshold) {
      this.recordViolation({
        policyId: policy.id, nodeId: data.nodeId, type: 'latency',
        severity: data.duration > threshold * 2 ? 'critical' : 'warning',
        detail: `Node ${data.nodeId} exceeded latency limit: ${data.duration}ms > ${threshold}ms`,
        value: data.duration, threshold, resolved: false,
      });
    }
  }

  private enforcePrivacy(data: { nodeId: string; output?: string }) {
    const policy = this.activePolicies.find(p => p.type === 'privacy');
    if (!policy || policy.action !== 'block') return;
    const contentToCheck = typeof data === 'string' ? data : data?.output || '';
    const piiPatterns = [
      { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/, label: 'email' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, label: 'phone' },
      { pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, label: 'ssn' },
      { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, label: 'credit_card' },
    ];
    for (const { pattern, label } of piiPatterns) {
      if (pattern.test(contentToCheck)) {
        this.recordViolation({
          policyId: policy.id, nodeId: data.nodeId, type: 'privacy',
          severity: 'error', detail: `PII pattern detected: ${label}`,
          resolved: false,
        });
        break;
      }
    }
  }

  addPolicy(policy: Omit<ISPolicy, 'id'>) {
    const newPolicy: ISPolicy = {
      ...policy,
      id: `p-${Date.now()}`,
    };
    this.activePolicies.push(newPolicy);
    this.persist();
    return newPolicy;
  }

  updatePolicy(id: string, updates: Partial<ISPolicy>) {
    this.activePolicies = this.activePolicies.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    this.persist();
  }

  removePolicy(id: string) {
    this.activePolicies = this.activePolicies.filter(p => p.id !== id);
    this.persist();
  }

  getPolicies(): ISPolicy[] {
    return [...this.activePolicies];
  }

  getViolations(includeResolved = false, limit = 50): PolicyViolation[] {
    const filtered = includeResolved ? this.violations : this.violations.filter(v => !v.resolved);
    return filtered.slice(0, limit);
  }

  resolveViolation(id: string) {
    const v = this.violations.find(v => v.id === id);
    if (v) v.resolved = true;
  }

  getStats(): PolicyStats {
    return {
      totalViolations: this.violations.length,
      activeViolations: this.violations.filter(v => !v.resolved).length,
      byType: this.violations.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: this.violations.reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      lastViolation: this.violations[0]?.timestamp || null,
    };
  }

  clearViolations() {
    this.violations = [];
  }
}

export const policyService = new PolicyService();
