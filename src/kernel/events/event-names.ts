import { ProviderEvents } from './provider-events';
import { ChatEvents } from './chat-events';
import { SystemEvents } from './system-events';

/**
 * Unified event name enum composed from per-domain event name objects.
 * This is the primary runtime reference for emit/on calls across services.
 *
 * For type-safe payloads, use the per-domain EventMap types:
 *   ProviderEventMap, ChatEventMap, SystemEventMap
 */
export const EVENTS = {
  // ── Provider / Key Events ──────────────────────────────────────────
  KEYS_LOADED: ProviderEvents.KEYS_LOADED,
  KEY_ADDED: ProviderEvents.KEY_ADDED,
  KEY_REMOVED: ProviderEvents.KEY_REMOVED,
  KEY_UPDATED: ProviderEvents.KEY_UPDATED,
  KEY_STATE_CHANGED: ProviderEvents.KEY_STATE_CHANGED,
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
} as const;
