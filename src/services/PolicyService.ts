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
const PATTERNS_KEY = 'super_agents_policy_patterns';
const MAX_VIOLATIONS = 200;

export interface SecurityPattern {
  id: string;
  pattern: string;
  replacement: string;
  label: string;
  type: 'pii' | 'toxic' | 'blocklist';
}

export class PolicyService {
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
    {
      id: 'p-rate-limit-1', type: 'rate_limit', target_nodes: ['all'],
      value: 100, action: 'throttle'
    },
    {
      id: 'p-content-safety-1', type: 'content', target_nodes: ['all'],
      value: 'SAFETY_CHECK', action: 'mask'
    },
    {
      id: 'p-model-blacklist-1', type: 'custom', target_nodes: ['all'],
      value: 'BLOCKED_MODELS', action: 'block'
    },
  ];
  private securityPatterns: SecurityPattern[] = [
    { id: 'pii-email', type: 'pii', label: 'email', pattern: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b', replacement: '[EMAIL REDACTED]' },
    { id: 'pii-phone', type: 'pii', label: 'phone', pattern: '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b', replacement: '[PHONE REDACTED]' },
    { id: 'pii-ssn', type: 'pii', label: 'ssn', pattern: '\\b\\d{3}[-]?\\d{2}[-]?\\d{4}\\b', replacement: '[SSN REDACTED]' },
    { id: 'pii-cc', type: 'pii', label: 'credit_card', pattern: '\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b', replacement: '[CC REDACTED]' },
    { id: 'toxic-hate', type: 'toxic', label: 'toxic_content', pattern: '\\b(hate|racist|violent|explicit|nsfw)\\b', replacement: '[CONTENT MASKED]' },
    { id: 'blocklist-gpt4', type: 'blocklist', label: 'gpt-4', pattern: 'gpt-4', replacement: '' },
    { id: 'blocklist-opus', type: 'blocklist', label: 'claude-3-opus', pattern: 'claude-3-opus', replacement: '' },
    { id: 'blocklist-405b', type: 'blocklist', label: 'llama-3.1-405b', pattern: 'llama-3.1-405b', replacement: '' },
  ];
  private unsubs: Array<() => void> = [];

  constructor() {
    this.activePolicies = [...this.initialPolicies];
    this.setupListeners();
  }

  async init() {
    await this.load();
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
      }
      const savedPatterns = await db.getKv<SecurityPattern[]>(PATTERNS_KEY);
      if (savedPatterns) this.securityPatterns = savedPatterns;
    } catch (e) {
      console.error('[PolicyService] Failed to load policies', e);
    }
  }

  private async persist() {
    try {
      await db.setKv(POLICIES_KEY, this.activePolicies);
      await db.setKv(PATTERNS_KEY, this.securityPatterns);
    } catch (e) {
      console.error('[PolicyService] Failed to persist', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        this.checkLatency(data as { nodeId: string; duration?: number });
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

  sanitizeOutput(nodeId: string, output: string): string {
    const policy = this.activePolicies.find(p => p.type === 'privacy');
    if (!policy || policy.action !== 'block') return output;
    const patterns = this.securityPatterns.filter(p => p.type === 'pii');
    let sanitized = output;
    for (const { pattern, replacement, label } of patterns) {
      const regex = new RegExp(pattern, 'gi');
      if (sanitized.match(regex)) {
        sanitized = sanitized.replace(regex, replacement);
        this.recordViolation({
          policyId: policy.id, nodeId, type: 'privacy',
          severity: 'error', detail: `PII pattern detected: ${label}`,
          resolved: false,
        });
      }
    }
    return sanitized;
  }

  enforcePrivacy(data: { nodeId: string; output?: string }): { blocked: boolean; sanitized?: string } {
    const policy = this.activePolicies.find(p => p.type === 'privacy');
    if (!policy || policy.action !== 'block') return { blocked: false };
    const contentToCheck = typeof data === 'string' ? data : data?.output || '';
    const patterns = this.securityPatterns.filter(p => p.type === 'pii');
    let sanitized = contentToCheck;
    let detected = false;
    for (const { pattern, replacement, label } of patterns) {
      const regex = new RegExp(pattern, 'gi');
      if (sanitized.match(regex)) {
        detected = true;
        sanitized = sanitized.replace(regex, replacement);
        this.recordViolation({
          policyId: policy.id, nodeId: data.nodeId, type: 'privacy',
          severity: 'error', detail: `PII pattern detected: ${label}`,
          resolved: false,
        });
      }
    }
    if (detected) {
      return { blocked: true, sanitized };
    }
    return { blocked: false };
  }

  // Shorthand: sanitize + return new object (immutable)
  applyPrivacy(data: { nodeId: string; output?: string }): { blocked: boolean; sanitized?: string; output?: string } {
    const result = this.enforcePrivacy(data);
    if (result.blocked) {
      return { ...result, output: result.sanitized };
    }
    return { ...result, output: data.output };
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

  checkContentSafety(data: { nodeId: string; output?: string }): { blocked: boolean; sanitized?: string } {
    const policy = this.activePolicies.find(p => p.type === 'content');
    if (!policy || policy.action === 'warn') return { blocked: false };
    const contentToCheck = typeof data === 'string' ? data : data?.output || '';
    const patterns = this.securityPatterns.filter(p => p.type === 'toxic');
    let sanitized = contentToCheck;
    let detected = false;
    for (const { pattern, label, replacement } of patterns) {
      const regex = new RegExp(pattern, 'gi');
      if (sanitized.match(regex)) {
        detected = true;
        sanitized = sanitized.replace(regex, replacement);
        this.recordViolation({
          policyId: policy.id, nodeId: data.nodeId, type: 'content',
          severity: 'warning', detail: `Content safety match: ${label}`,
          resolved: false,
        });
      }
    }
    if (detected) {
      return { blocked: true, sanitized };
    }
    return { blocked: false };
  }

  checkRateLimit(data: { nodeId: string; requestCount?: number }): boolean {
    const policy = this.activePolicies.find(p => p.type === 'rate_limit');
    if (!policy) return true;
    const limit = policy.value as number;
    if (limit && (data.requestCount || 0) > limit) {
      this.recordViolation({
        policyId: policy.id, nodeId: data.nodeId, type: 'rate_limit',
        severity: 'warning', detail: `Rate limit exceeded: ${data.requestCount} > ${limit}`,
        value: data.requestCount, threshold: limit,
        resolved: false,
      });
      return false;
    }
    return true;
  }

  checkModelBlacklist(model: string, nodeId: string): boolean {
    const policy = this.activePolicies.find(p => p.type === 'custom' && p.value === 'BLOCKED_MODELS');
    if (!policy) return true;
    // Blocked models are now user-configurable via Security Lab (blocklist type patterns)
    const blockedPatterns = this.securityPatterns.filter(p => p.type === 'blocklist');
    const isBlocked = blockedPatterns.some(p => model.toLowerCase().includes(p.pattern.toLowerCase()));
    if (isBlocked) {
      this.recordViolation({
        policyId: policy.id, nodeId, type: 'custom',
        severity: 'error', detail: `Model "${model}" is blacklisted`,
        resolved: false,
      });
      return false;
    }
    return true;
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

  getPatterns(): SecurityPattern[] {
    return [...this.securityPatterns];
  }

  setPatterns(patterns: SecurityPattern[]) {
    this.securityPatterns = patterns;
    this.persist();
  }

  addPattern(pattern: Omit<SecurityPattern, 'id'>) {
    const newPattern: SecurityPattern = {
      ...pattern,
      id: `pattern-${Date.now()}`,
    };
    this.securityPatterns.push(newPattern);
    this.persist();
    return newPattern;
  }

  getBlockedModels(): string[] {
    return this.securityPatterns
      .filter(p => p.type === 'blocklist')
      .map(p => p.pattern);
  }

  addBlockedModel(model: string) {
    const exists = this.securityPatterns.some(p => p.type === 'blocklist' && p.pattern === model);
    if (!exists) {
      this.addPattern({ type: 'blocklist', label: model, pattern: model, replacement: '' });
    }
  }

  removeBlockedModel(model: string) {
    this.securityPatterns = this.securityPatterns.filter(
      p => !(p.type === 'blocklist' && p.pattern === model)
    );
    this.persist();
  }
}

export const policyService = new PolicyService();
