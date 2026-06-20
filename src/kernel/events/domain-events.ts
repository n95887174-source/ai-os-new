import type { AgentLifecycleState } from '../contracts/topology';
import type { AgentHealth } from '../contracts/agent-health';
import type { VirtualKey } from '../contracts/virtual-key';
import type { ToolDefinition } from '../contracts/tool-types';
import type { MemoryEntry } from '../types/memory-types';
import type { Role } from '../types/role-types';
import type { KeyState } from '../contracts/key-state';
import type { CognitiveSkill } from '../types/domain-types';
import type { DebateVerdict } from '../contracts/debate-types';

export const DomainEvents = {
  DEBATE_UPDATED: 'debate:updated',
  DEBATE_STARTED: 'debate:started',
  DEBATE_ARGUMENT: 'debate:argument',
  DEBATE_CONSENSUS: 'debate:consensus',
  MEMORY_UPDATED: 'memory:updated',
  TOOLS_UPDATED: 'tools:updated',
  TOOL_EXECUTION_START: 'tool:execution:start',
  TOOL_EXECUTION_SUCCESS: 'tool:execution:success',
  TOOL_EXECUTION_ERROR: 'tool:execution:error',
  ROLES_UPDATED: 'roles:updated',
  ROLE_ASSIGNED: 'role:assigned',
  ROLE_UNASSIGNED: 'role:unassigned',
  MCP_UPDATED: 'mcp:updated',
  SETTINGS_UPDATED: 'settings:updated',
  POLICY_VIOLATION: 'policy:violation',
  SKILLS_UPDATED: 'skills:updated',
  PRICING_UPDATED: 'pricing:updated',
  BUDGET_ALERT: 'budget:alert',
  KEYSTATE_UPDATED: 'keystate:updated',
  KEYSTATE_REMOVED: 'keystate:removed',
  SNAPSHOT_CAPTURED: 'snapshot:captured',
  SNAPSHOT_RESTORED: 'snapshot:restored',
  AGENT_CONFIG_UPDATED: 'agent:config:updated',
  AGENT_LIFECYCLE_CHANGE: 'agent:lifecycle:change',
  AGENT_HEALTH_CHANGE: 'agent:health:change',
  AGENT_RESTARTED: 'agent:restarted',
  AGENT_RATE_LIMITED: 'agent:rate:limited',
  AGENT_BLACKBOARD_UPDATED: 'agent:blackboard:updated',
  AGENT_HANDOFF_INITIATED: 'agent:handoff:initiated',
  ROUTER_SIGNAL: 'router:signal',
  ADVISOR_SUGGESTION: 'advisor:suggestion',
  ADVISOR_SUGGESTION_EXECUTED: 'advisor:suggestion:executed',
  ADVISOR_SUGGESTION_DISMISSED: 'advisor:suggestion:dismissed',
  DIAGNOSTIC_COMPLETE: 'diagnostic:complete',
  SYSTEM_TOPOLOGY_MOUNTED: 'system:topology:mounted',
  SYSTEM_NODE_SPAWN: 'system:node:spawn',
  SYSTEM_NODE_REMOVED: 'system:node:removed',
  SETTINGS_LATENCY_THRESHOLD: 'settings:latency-threshold',
  VIRTUAL_KEY_CREATED: 'virtual:key:created',
  VIRTUAL_KEY_RESOLVED: 'virtual:key:resolved',
  VIRTUAL_KEY_REVOKED: 'virtual:key:revoked',
  DEBATE_ENDED: 'debate:ended',
  DEBATE_FACT_CHECKED: 'debate:fact:checked',
  ELO_RATING_UPDATED: 'elo:rating:updated',
  CACHE_INVALIDATED: 'cache:invalidated',
  DEBATE_VERDICT_GENERATED: 'debate:verdict:generated',
} as const;

export type DomainEventMap = {
  // ... (add entry)
  'debate:verdict:generated': { sessionId: string; verdict: DebateVerdict };
  'debate:updated': { sessionId: string; type: string; override?: unknown; event?: unknown };
  'debate:started': { sessionId: string; topic: string };
  'debate:argument': { sessionId: string; argumentId: string; content: string; speaker: string; round: number };
  'debate:consensus': { topic: string; consensus: string; convergenceScore: number; synthesis?: string };
  'memory:updated': MemoryEntry[];
  'tools:updated': ToolDefinition[];
  'tool:execution:start': { toolId: string; input: unknown };
  'tool:execution:success': { toolId: string; output: unknown };
  'tool:execution:error': { toolId: string; error: string };
  'roles:updated': Role[];
  'role:assigned': { roleId: string; agentId: string };
  'role:unassigned': { roleId: string; agentId: string };
  'mcp:updated': unknown[];
  'settings:updated': { settings: Record<string, unknown>; changes: Record<string, unknown> };
  'policy:violation': { policyId: string; provider: string; reason: string };
  'skills:updated': CognitiveSkill[];
  'pricing:updated': void;
  'budget:alert': { type: 'global' | 'provider' | 'agent'; level: number; entity: string; current: number; limit: number; message: string; timestamp: number };
  'keystate:updated': { id: string; state: KeyState };
  'keystate:removed': { id: string };
  'snapshot:captured': { snapshotId: string; label: string };
  'snapshot:restored': { snapshotId: string; timestamp: number };
  'agent:config:updated': { id: string; config: unknown };
  'agent:lifecycle:change': { id: string; from: AgentLifecycleState; to: AgentLifecycleState };
  'agent:health:change': { id: string; from: AgentHealth; to: AgentHealth; errorRate: number; consecutiveErrors: number };
  'agent:restarted': { id: string };
  'router:signal': { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number };
  'advisor:suggestion': { id: string; type: string; description: string };
  'advisor:suggestion:executed': { id: string; estimatedSavings?: { latency?: number; cost?: number } };
  'advisor:suggestion:dismissed': { id: string };
  'diagnostic:complete': { id: string; scope: string; health: string; score: number; issueCount: number; timestamp: number };
  'system:topology:mounted': { topologyId: string };
  'system:node:spawn': { nodeId: string; type: string };
  'system:node:removed': { nodeId: string };
  'settings:latency-threshold': { keyId?: string; threshold?: number };
  'virtual:key:created': { virtualKey: VirtualKey };
  'virtual:key:resolved': { virtualKeyId: string };
  'virtual:key:revoked': { virtualKeyId: string };
  'debate:ended': { sessionId: string; topic: string; rounds: number; durationMs: number; consensus?: string };
  'debate:fact:checked': { argumentId: string; factCheck: unknown };
  'elo:rating:updated': { agentId: string; newRating: number; change: number };
  'cache:invalidated': { reason: string; section?: string };
};
