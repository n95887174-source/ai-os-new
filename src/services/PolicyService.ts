import { eventBus } from '../core/events';
import type { ISPolicy } from '../core/IntelligenceDSL';

/**
 * SuperAgents OS - Global Policy Guardrail Service
 * 
 * Enforces system-wide invariants (Latency, Privacy, Cost, Safety).
 * Acts as an active middleware in the cognitive event-stream.
 */
class PolicyService {
  private activePolicies: ISPolicy[] = [
    {
      id: 'p-latency-1', type: 'latency', target_nodes: ['all'],
      value: 2000, action: 'warn'
    },
    {
      id: 'p-privacy-1', type: 'privacy', target_nodes: ['all'],
      value: 'PII_REDACTION', action: 'block'
    }
  ];
  private unsubs: Array<() => void> = [];

  constructor() {
    this.setupListeners();
  }

<<<<<<< HEAD
  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private setupListeners() {
    this.unsubs.push(
      // Intercept completions to check for policy violations
      eventBus.on('cognitive:step:completed', (data) => {
        this.checkLatency(data);
      }),

      // Intercept data flow for privacy
      eventBus.on('cognitive:step:active', (data) => {
        this.enforcePrivacy(data);
      })
    );
  }

=======
  private setupListeners() {
    // Intercept completions to check for policy violations
    eventBus.on('cognitive:step:completed', (data) => {
      this.checkLatency(data);
    });

    // Intercept data flow for privacy
    eventBus.on('cognitive:step:active', (data) => {
      this.enforcePrivacy(data);
    });
  }

>>>>>>> 54e1276a5d5730e4e3edce0bb2038b8d9038b261
  private checkLatency(data: { nodeId: string; duration?: number }) {
    const policy = this.activePolicies.find(p => p.type === 'latency');
    if (policy && data.duration !== undefined && (policy.value as number) && data.duration > (policy.value as number)) {
      console.warn(`[PolicyViolation] Node ${data.nodeId} exceeded latency limit: ${data.duration}ms > ${policy.value}ms`);
      eventBus.emit('policy:violation', { 
        policyId: policy.id, 
        nodeId: data.nodeId, 
        type: 'latency',
        severity: 'warning'
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
    ];

    for (const { pattern, label } of piiPatterns) {
      if (pattern.test(contentToCheck)) {
        console.warn(`[PolicyViolation] Node ${data.nodeId} exposed PII (${label})`);
        eventBus.emit('policy:violation', {
          policyId: policy.id,
          nodeId: data.nodeId,
          type: 'privacy',
          severity: 'error',
          detail: `PII pattern detected: ${label}`
        });
        break;
      }
    }
  }

  getPolicies() {
    return this.activePolicies;
  }
}

export const policyService = new PolicyService();
