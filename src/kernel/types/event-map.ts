import type { ApiKey, SystemState } from '../types/metrics-types';
import type { CognitiveSkill } from '../types/domain-types';
import type { EventPayloads } from '../types/domain-types';
import type { AgentLifecycleState } from '../contracts/topology';
import type { AgentHealth } from '../contracts/agent-health';
import type { DecisionPayload } from '../events/system-events';
import type { ToolDefinition } from '../contracts/tool-types';
import type { MemoryEntry } from '../types/memory-types';
import type { Role } from '../types/role-types';
import type { KeyState } from '../contracts/key-state';
import type { VirtualKey } from '../contracts/virtual-key';
import type { ChatMessage } from '../../llm/core/types';
import type { ChatResponse } from './chat-types';

export type EventMap = {
  // Key Management
  'key:loaded': ApiKey[];
  'key:added': ApiKey;
  'key:removed': string;
  'key:updated': ApiKey[];
  
  // Key State
  'keystate:updated': { id: string; state: KeyState };
  'keystate:removed': { id: string };

  // Health
  'key:health:check': string;
  'key:health:check:all': void;
  'key:health:check:failed': { id: string; provider: string; error: string };
  'key:latency:burst': { id: string; provider: string; latency: number };
  'key:quota:exceeded': { id: string; provider: string; quotaType: 'tokens' | 'requests'; limit?: number; current?: number; resetAt?: number };
  'key:reputation:threshold:crossed': { id: string; provider: string; score: number };
  'key:state:changed': { id: string; provider: string; state: string; previousState: string };
  'key:compromised': { id: string; provider: string; source: string };
  'key:compromise:signal': { id?: string; fingerprint?: string; source?: string };
  'key:group:sync': { passportAdded?: number; assigned?: number; reassigned?: number };
  'key:probe:result': { status: string; provider: string; keyId: string; keyLabel: string; model: string; latency: number; quotaRemaining?: number; quotaLimit?: number; rateLimited: boolean; circuitOpen: boolean; error?: string; statusCode?: number; timestamp: number };
  'provider:state-changed': { provider: string; status: string };
  'provider:circuit-breaker:synced': { provider: string; keyId: string; status: string; failureCount: number; lastFailure: number };
  'provider:rate-limit:synced': { provider: string; keyId: string; remaining: number; resetAt: number };
  'provider:error:synced': { provider: string; keyId: string; error: string; timestamp: number; statusCode?: number };
  'provider:state:desync': { localHash: string; remoteHash: string; mismatches: number };
  'cognitive:trace:updated': Array<{ id: string; startTime: number; endTime?: number; input: string; output?: string; status: string; steps: unknown[]; provider?: string; model?: string; totalTokens?: number; latency?: number; error?: string }>;
  'debate:updated': unknown;
  'debate:started': unknown;
  'debate:argument': unknown;
  'debate:consensus': { topic: string; consensus: string; convergenceScore: number; synthesis?: { consensus: string; coreDisagreement: string; resolvedPoints: string[]; unresolvedPoints: string[]; phase: string } };
  
  // Debate Runtime
  'debate-runtime:session:created': { sessionId: string; topic: string; topologyType: string };
  'debate-runtime:session:started': { sessionId: string };
  'debate-runtime:session:paused': { sessionId: string };
  'debate-runtime:session:resumed': { sessionId: string };
  'debate-runtime:session:cancelled': { sessionId: string };
  'debate-runtime:session:completed': { sessionId: string; consensus: unknown };
  'debate-runtime:session:failed': { sessionId: string; error: string };
  'debate-runtime:phase:changed': { sessionId: string; from: string; to: string };
  'debate-runtime:agent:phase:changed': { sessionId: string; agentId: string; from: string; to: string };
  'debate-runtime:round:started': { sessionId: string; round: number; nodes: string[] };
  'debate-runtime:round:ended': { sessionId: string; round: number };
  'debate-runtime:agent:thinking': { sessionId: string; agentId: string };
  'debate-runtime:agent:responded': { sessionId: string; agentId: string; content: string };
  'debate-runtime:agent:error': { sessionId: string; agentId: string; error: string };
  'debate-runtime:agent:fallback': { sessionId: string; agentId: string; fromProvider: string; toProvider: string };
  'debate-runtime:agent:timeout': { sessionId: string; agentId: string; timeoutMs: number };
  'debate-runtime:budget:updated': { sessionId: string; pressure: string; used: number; limit: number };
  'debate-runtime:budget:pressure': { sessionId: string; level: string; action: unknown };
  'debate-runtime:budget:exceeded': { sessionId: string; reason: string; limit: number; used: number };
  'debate-runtime:consensus:reached': { sessionId: string; confidence: number; agreements: number; conflicts: number };
  'debate-runtime:consensus:conflict': { sessionId: string; claimA: string; claimB: string };
  'debate-runtime:consensus:confidence': { sessionId: string; confidence: number };
  'debate-runtime:round:early-exit': { sessionId: string; confidence: number; round: number };
  'debate-runtime:memory:claim': { sessionId: string; agentId: string; claim: string };
  'debate-runtime:memory:chain': { sessionId: string; agentId: string; steps: number };
  'session:binding:expired': { sessionId: string; keyId: string; provider: string; participantId?: string; boundAt: number; evictedAt: number; reason: string };
 
  // Core Data
  'memory:updated': MemoryEntry[];
  'tools:updated': ToolDefinition[];
  'roles:updated': Role[];
  'role:assigned': { roleId: string; agentId: string };
  'role:unassigned': { roleId: string; agentId: string };
  'policy:violation': { policyId: string; provider: string; reason: string };
  'pricing:updated': void;
  'virtual:key:created': { virtualKey: VirtualKey };
  'virtual:key:resolved': { virtualKeyId: string };
  'virtual:key:revoked': { virtualKeyId: string };
  
  // UI & Selection
  'chat:model:select': { provider: string; model: string };
  'chat:target:start': { provider: string; model: string; keyId: string };
  'system:navigate': string;
  'system:notification': { message: string; type: 'success' | 'error' | 'info' | 'warning'; source?: string; savings?: { latency?: number; cost?: number } };
  
  // Chat Lifecycle (Legacy/Full)
  'chat:send': { 
    provider: string; 
    model: string; 
    messages: ChatMessage[];
    requestId?: string;
    strategy?: string;
    keyId?: string;
    options?: unknown;
  };
  'chat:cancel': { requestId: string };
  'chat:response': ChatResponse;

  // Chat Lifecycle (Streaming)
  'chat:stream:start': { requestId: string; provider: string; model: string; keyId?: string };
  'chat:stream:chunk': { requestId: string; provider: string; chunk: string; keyId?: string };
  'chat:stream:end':   { requestId: string; fullContent: string; latency: number; tokens?: number; provider?: string; model?: string; keyId?: string; ttft?: number; tps?: number };
  'chat:stream:error': { requestId: string; provider: string; error: string; keyId?: string };
  
  // System Internal Events
  'system:decision': DecisionPayload;
  'router:signal': { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number };
  'kernel:updated': SystemState;
  'kernel:heartbeat': { phase: string; uptime: number };
  'kernel:bootstrap:phase': { bootstrapPhase: number; totalPhases: number; phase: string };
  'db:row-inserted': { table: string; id: string | number };
  'system:runtime:ready': { timestamp: number } | void;
  'system:runtime:failed': { error: string; phase?: string; failedServices?: string[] };
  'system:shutdown': { reason?: string } | void;
  'system:data:clear': void;
  'system:reload': { timestamp: number };
  'system:command': unknown;

  // Health
  'key:health:check:started': string | void;
  'key:health:check:completed': { id?: string; provider?: string; status?: string } | void;

  // Control & Trace
  'trace:updated': unknown[];
  'agent:config:updated': { id: string; config: unknown };
  'agent:lifecycle:change': { id: string; from: AgentLifecycleState; to: AgentLifecycleState };
  'agent:health:change': { id: string; from: AgentHealth; to: AgentHealth; errorRate: number; consecutiveErrors: number };
  'agent:restarted': { id: string };

  // Cognitive Pipeline
  'cognitive:step:active': EventPayloads['cognitive:step:active'];
  'cognitive:step:completed': { nodeId: string; traceId: string; status: 'done' | 'error'; duration: number; output: string; fullContent?: string; provider?: string; model?: string };
  'cognitive:decision:made': unknown;
  'request:incoming': { requestId: string; messages: unknown[] };
  'request:completed': { final_data: { traceId: string; output: string } };

  // Tool Execution
  'tool:execution:start': { toolId: string; input: unknown };
  'tool:execution:success': { toolId: string; output: unknown };
  'tool:execution:error': { toolId: string; error: string };

  // Settings
  'settings:updated': { settings: Record<string, unknown>; changes: Record<string, unknown> };
  'settings:latency-threshold': { keyId?: string; threshold?: number } | void;

  // Skills
  'skills:updated': CognitiveSkill[];

  // MCP
  'mcp:updated': Record<string, unknown>[];

  // Budget & Diagnostics
  'budget:alert': { type: 'global' | 'provider' | 'agent'; level: number; entity: string; current: number; limit: number; message: string; timestamp: number };
  'diagnostic:complete': { id: string; scope: string; health: string; score: number; issueCount: number; timestamp: number };

  // Advisor
  'advisor:suggestion': unknown;
  'advisor:suggestion:executed': { id: string; estimatedSavings?: { latency?: number; cost?: number } };
  'advisor:suggestion:dismissed': { id: string };

  // ELO Rating
  'elo:rating:updated': { agentId: string; newRating: number; change: number };

  // Observability
  'observability:timeline:event:added': { eventId: string; type: string; category: string; timestamp: number; title: string };
  'observability:timeline:cleared': { count: number; timestamp: number };
  'observability:metrics:snapshot': { timestamp: number; totalRequests: number; totalTokens: number; estimatedCost: number; avgLatency: number; successRate: number };
  'observability:metrics:alert': { id: string; metric: string; value: number; severity: 'warning' | 'critical'; timestamp: number };
  'observability:metrics:alert:resolved': { id: string; timestamp: number };
  'observability:trace:created': { traceId: string; timestamp: number };
  'observability:trace:completed': { traceId: string; duration: number; status: string; timestamp: number };
  'observability:trace:updated': { traceId: string; status: string; timestamp: number };
  'observability:health:changed': { status: string; score: number; timestamp: number };
  'observability:error-boundary:caught': { name?: string; message: string; componentStack?: string; stack?: string; timestamp: number };

  // Scheduler
  'scheduler:heartbeat': { lastCheckTime: number };
  'schedule:created': { id: string; name: string; cronExpression: string; enabled: boolean; agentId?: string; taskParams?: unknown };
  'schedule:updated': { id: string; name?: string; cronExpression?: string; enabled?: boolean; agentId?: string; taskParams?: unknown };
  'schedule:deleted': { id: string };
  'schedule:triggered': { scheduleId: string; agentId?: string; taskParams?: unknown; timestamp: number };
  'schedule:completed': { scheduleId: string; success: boolean; error?: string; timestamp: number };

  // Execution Queue
  'queue:task:failed': { taskId: string; priority: string; error: string; timestamp: number };

  // Metrics
  'metrics:key-store-gauges': { activeCount: number; errorCount: number; alertCount: number; totalCount?: number };
  'metrics:alert-fired': { type: string; title: string; message: string; timestamp: number };

  // Achievements
  'achievement:unlocked': unknown;

  // Agent Delegation
  'agent:delegation:created': unknown;
  'agent:delegation:started': unknown;
  'agent:delegation:completed': unknown;
  'agent:delegation:failed': unknown;
  'agent:delegation:cancelled': unknown;

  // Agent Journal
  'agent:journal:added': unknown;
  'agent:journal:removed': unknown;
  'agent:journal:cleared': unknown;

  // Agent Wizard
  'agent:wizard:config-generated': unknown;

  // Aquarium
  'aquarium:screenshot:captured': unknown;

  // Arch Review
  'arch-review:snapshot:created': unknown;
  'arch-review:diff:created': unknown;

  // Chat Bookmarks
  'chat:bookmark:added': unknown;
  'chat:bookmark:removed': unknown;
  'chat:bookmark:cleared': unknown;
  'chat:bookmark:request': unknown;
  'chat:bookmark:save': unknown;

  // Chat Lifecycle
  'chat:forked': unknown;
  'chat:restored-from-snapshot': unknown;
  'chat:rewound': unknown;
  'chat:undo-rewind': unknown;
  'chat:summary:created': { sessionId: string; messageCount: number; keyFactsCount: number };
  'chat:template:created': unknown;
  'chat:template:updated': unknown;
  'chat:template:deleted': unknown;
  'chat:stream:provider-switch': { streamId: string; fromProvider: string; toProvider: string; prependTag?: boolean };
  'chat:stream:reconnecting': { streamId: string; retry: number; maxRetries?: number; lastIndex: number };

  // Citations
  'citations:added': unknown;

  // Collab Research
  'collab-research:session:created': unknown;
  'collab-research:session:completed': unknown;
  'collab-research:user:joined': unknown;
  'collab-research:user:left': unknown;
  'collab-research:contribution:added': unknown;
  'collab-research:finding:added': unknown;

  // Consistency
  'consistency:drift-detected': unknown;

  // Debate
  'debate:fact:checked': unknown;
  'debate:verdict:generated': { sessionId: string; verdict: unknown };
  'debate-runtime:agent:chunk': { sessionId: string; agentId: string; chunk: string };

  // Experiment
  'experiment:created-from-hypothesis': unknown;

  // Findings
  'findings:aggregated': unknown;

  // Hypotheses
  'hypotheses:updated': unknown;
  'hypothesis:experiment:result': unknown;
  'hypothesis:validated': unknown;

  // Kernel
  'kernel:load-failed': { error: string };
  'kernel:persist-failed': { error: string };

  // Key
  'key:reconciliation:complete': unknown;
  'key:rotation:triggered': { keyId: string; provider?: string; trigger?: string; reason?: string; timestamp?: number; autoRotate?: boolean; metadata?: { error: string } };
  'key:rotation:notification': { keyId: string; message: string; provider?: string; interval?: number; notifyBefore?: number; nextRotation?: number };
  'key:rotation-policy:created': unknown;
  'key:rotation-policy:updated': unknown;
  'key:rotation-policy:deleted': unknown;
  'key-intelligence:pipeline-error': unknown;

  // Local Provider
  'local-provider:detected': unknown;

  // Message
  'message:feedback:submitted': unknown;

  // Persona
  'persona:created': unknown;
  'persona:updated': unknown;
  'persona:deleted': unknown;
  'persona:changed': unknown;
  'persona:tone:changed': unknown;

  // Prompt Audit
  'prompt-audit:baseline:set': unknown;
  'prompt-audit:comparison:created': unknown;

  // Provider
  'provider:catalog:added': unknown;
  'provider:catalog:probed': unknown;
  'provider:personality:calibrated': unknown;
  'provider:personality:updated': unknown;
  'provider-runtime:budget': unknown;
  'provider-runtime:state': unknown;

  // Proxy
  'proxy:down': { url: string; error?: string };
  'proxy:up': { url: string; latencyMs?: number };

  // Research
  'research:triggered': unknown;
  'research:finding:resolved': unknown;
  'research:finding:synced': unknown;
  'research:findings:available': unknown;
  'research:goal:created': unknown;
  'research:goal:paused': unknown;
  'research:goal:progress-updated': unknown;
  'research:goal:resumed': unknown;
  'research:key-result:updated': unknown;
  'research:recommendation:applied': unknown;
  'research:recommendation:created': unknown;
  'research:recommendation:dismissed': unknown;
  'research:schedule:created': unknown;
  'research:schedule:updated': unknown;
  'research:schedule:deleted': unknown;

  // Roles
  'role:created': unknown;
  'role:updated': unknown;
  'role:deleted': unknown;
  'role:library:installed': unknown;
  'role:library:uninstalled': unknown;
  'role:model-preferences:updated': unknown;
  'role:sandbox-test:completed': unknown;
  'role:sandbox-test:failed': unknown;

  // Shadow
  'shadow:drift': unknown;

  // Snapshot
  'snapshot:captured': unknown;

  // STT
  'stt:error': { error: string };
  'stt:state:changed': { state: string };

  // System
  'system:node:removed': { id: string };
  'system:runtime:metrics': Record<string, unknown>;
  'system:topology:mounted': unknown;

  // Topology
  'topology:evaluated': unknown;

  // Versus User
  'versus-user:started': unknown;
  'versus-user:round-complete': unknown;
  'versus-user:completed': unknown;

  // System Activity
  '*': { event: string; data: Record<string, unknown> };
};
