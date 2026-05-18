import { ProviderEvents } from './provider-events';
import { ChatEvents } from './chat-events';
import { SystemEvents } from './system-events';
import { ObservabilityEvents } from './observability-events';
import { DebateRuntimeEvents } from './debate-runtime-events';

/**
 * Unified event name enum composed from per-domain event name objects.
 * This is the primary runtime reference for emit/on calls across services.
 *
 * For type-safe payloads, use the per-domain EventMap types:
 *   ProviderEventMap, ChatEventMap, SystemEventMap, ObservabilityEventMap
 */
export const EVENTS = {
  // ── Provider / Key Events ──────────────────────────────────────────
  KEYS_LOADED: ProviderEvents.KEYS_LOADED,
  KEY_ADDED: ProviderEvents.KEY_ADDED,
  KEY_REMOVED: ProviderEvents.KEY_REMOVED,
  KEY_UPDATED: ProviderEvents.KEY_UPDATED,
  KEY_STATE_CHANGED: ProviderEvents.KEY_STATE_CHANGED,
  KEY_COMPROMISED: ProviderEvents.KEY_COMPROMISED,
  COMPROMISE_SIGNAL: ProviderEvents.COMPROMISE_SIGNAL,
  KEY_HEALTH_STARTED: ProviderEvents.KEY_HEALTH_CHECK_STARTED,
  KEY_HEALTH_COMPLETED: ProviderEvents.KEY_HEALTH_CHECK_COMPLETED,
  KEY_HEALTH_FAILED: ProviderEvents.KEY_HEALTH_CHECK_FAILED,
  KEY_LATENCY_BURST: ProviderEvents.KEY_LATENCY_BURST,
  KEY_QUOTA_EXCEEDED: ProviderEvents.KEY_QUOTA_EXCEEDED,
  KEY_REPUTATION_DOWN: ProviderEvents.KEY_REPUTATION_THRESHOLD_CROSSED,
  CHECK_HEALTH: ProviderEvents.CHECK_HEALTH,
  CHECK_ALL_HEALTH: ProviderEvents.CHECK_ALL_HEALTH,

  // ── Chat Events ────────────────────────────────────────────────────
  SEND_MESSAGE: ChatEvents.SEND,
  CANCEL_MESSAGE: ChatEvents.CANCEL,
  MESSAGE_RESPONSE: ChatEvents.RESPONSE,
  SELECT_MODEL: ChatEvents.SELECT_MODEL,
  START_CHAT_WITH_TARGET: ChatEvents.START_WITH_TARGET,
  STREAM_START: ChatEvents.STREAM_START,
  STREAM_CHUNK: ChatEvents.STREAM_CHUNK,
  STREAM_END: ChatEvents.STREAM_END,
  STREAM_ERROR: ChatEvents.STREAM_ERROR,

  // ── System Events ──────────────────────────────────────────────────
  NAVIGATE: SystemEvents.NAVIGATE,
  NOTIFICATION: SystemEvents.NOTIFICATION,
  DECISION: SystemEvents.DECISION,
  KERNEL_UPDATED: SystemEvents.KERNEL_UPDATED,
  RUNTIME_READY: SystemEvents.RUNTIME_READY,
  SHUTDOWN: SystemEvents.SHUTDOWN,
  CLEAR_DATA: SystemEvents.CLEAR_DATA,
  RELOAD: SystemEvents.RELOAD,
  COMMAND: SystemEvents.COMMAND,

  // ── Provider Runtime Events ────────────────────────────────────────
  PROVIDER_RUNTIME_STATE: 'provider-runtime:state',
  PROVIDER_RUNTIME_BUDGET: 'provider-runtime:budget',

  // ── Debate Runtime Events ──────────────────────────────────────────
  DEBATE_SESSION_CREATED: DebateRuntimeEvents.SESSION_CREATED,
  DEBATE_SESSION_STARTED: DebateRuntimeEvents.SESSION_STARTED,
  DEBATE_SESSION_PAUSED: DebateRuntimeEvents.SESSION_PAUSED,
  DEBATE_SESSION_RESUMED: DebateRuntimeEvents.SESSION_RESUMED,
  DEBATE_SESSION_CANCELLED: DebateRuntimeEvents.SESSION_CANCELLED,
  DEBATE_SESSION_COMPLETED: DebateRuntimeEvents.SESSION_COMPLETED,
  DEBATE_SESSION_FAILED: DebateRuntimeEvents.SESSION_FAILED,
  DEBATE_PHASE_CHANGED: DebateRuntimeEvents.PHASE_CHANGED,
  DEBATE_AGENT_PHASE_CHANGED: DebateRuntimeEvents.AGENT_PHASE_CHANGED,
  DEBATE_ROUND_STARTED: DebateRuntimeEvents.ROUND_STARTED,
  DEBATE_ROUND_ENDED: DebateRuntimeEvents.ROUND_ENDED,
  DEBATE_AGENT_THINKING: DebateRuntimeEvents.AGENT_THINKING,
  DEBATE_AGENT_RESPONDED: DebateRuntimeEvents.AGENT_RESPONDED,
  DEBATE_AGENT_ERROR: DebateRuntimeEvents.AGENT_ERROR,
  DEBATE_AGENT_FALLBACK: DebateRuntimeEvents.AGENT_FALLBACK,
  DEBATE_AGENT_TIMEOUT: DebateRuntimeEvents.AGENT_TIMEOUT,
  DEBATE_BUDGET_UPDATED: DebateRuntimeEvents.BUDGET_UPDATED,
  DEBATE_PRESSURE_CHANGED: DebateRuntimeEvents.PRESSURE_CHANGED,
  DEBATE_CONSENSUS_REACHED: DebateRuntimeEvents.CONSENSUS_REACHED,
  DEBATE_CONFLICT_DETECTED: DebateRuntimeEvents.CONFLICT_DETECTED,
  DEBATE_CONFIDENCE_UPDATED: DebateRuntimeEvents.CONFIDENCE_UPDATED,
  DEBATE_CLAIM_RECORDED: DebateRuntimeEvents.CLAIM_RECORDED,
  DEBATE_CHAIN_UPDATED: DebateRuntimeEvents.CHAIN_UPDATED,

  // ── Observability Events ───────────────────────────────────────────
  TIMELINE_EVENT_ADDED: ObservabilityEvents.TIMELINE_EVENT_ADDED,
  TIMELINE_CLEARED: ObservabilityEvents.TIMELINE_CLEARED,
  METRICS_SNAPSHOT: ObservabilityEvents.METRICS_SNAPSHOT,
  METRICS_ALERT: ObservabilityEvents.METRICS_ALERT,
  METRICS_ALERT_RESOLVED: ObservabilityEvents.METRICS_ALERT_RESOLVED,
  TRACE_CREATED: ObservabilityEvents.TRACE_CREATED,
  TRACE_UPDATED: ObservabilityEvents.TRACE_UPDATED,
  TRACE_COMPLETED: ObservabilityEvents.TRACE_COMPLETED,
  SYSTEM_HEALTH_CHANGED: ObservabilityEvents.SYSTEM_HEALTH_CHANGED,
} as const;
