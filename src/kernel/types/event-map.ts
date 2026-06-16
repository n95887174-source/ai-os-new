import type { ApiKey, SystemState } from '../../types/metrics';
import type { ChatResponse } from '../../types/chat';
import type { ChatMessage } from '../../llm/core/types';
import type { SystemSettings } from '../contracts/settings';
import type { AgentLifecycleState } from '../contracts/topology';
import type { AgentHealth } from '../contracts/agent-health';
import type { CognitiveSkill } from '../../types/domain';
import type { EventPayloads } from '../../types/domain';
import type { DecisionPayload } from '../events/system-events';
import type { ToolDefinition } from '../contracts/tool-types';
import type { MemoryEntry } from '../types/memory-types';
import type { Role } from '../types/role-types';
import type { KeyState } from '../contracts/key-state';
import type { VirtualKey } from '../contracts/virtual-key';

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
  'debate:consensus': { topic: string; consensus: string; convergenceScore: number; synthesis?: string };
  
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
  'db:row-inserted': { table: string; id: string | number };
  'system:runtime:ready': { timestamp: number } | void;
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
  'cognitive:step:completed': EventPayloads['cognitive:step:completed'];
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
  'observability:health:changed': { status: string; score: number; timestamp: number };
  'observability:error-boundary:caught': { name?: string; message: string; componentStack?: string; stack?: string; timestamp: number };

  // Scheduler
  'scheduler:heartbeat': { lastCheckTime: number };
  'schedule:created': { id: string; name: string; cronExpression: string; enabled: boolean; agentId?: string; taskParams?: unknown };
  'schedule:updated': { id: string; name?: string; cronExpression?: string; enabled?: boolean; agentId?: string; taskParams?: unknown };
  'schedule:deleted': { id: string };
  'schedule:triggered': { scheduleId: string; agentId?: string; taskParams?: unknown; timestamp: number };
  'schedule:completed': { scheduleId: string; success: boolean; error?: string; timestamp: number };

  // Metrics
  'metrics:key-store-gauges': { activeCount: number; errorCount: number; alertCount: number; totalCount?: number };

  // System Activity
  '*': { event: string; data: Record<string, unknown> };
};
