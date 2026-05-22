import type { KeyStore } from './key-store';
import type { MemoryStore } from './memory-store';
import type { TraceStore } from './trace-store';
import type { SessionStore } from './session-store';
import type { ConfigStore } from './config-store';
import type { RolesStore } from './roles-store';
import type { SkillsStore } from './skills-store';

export interface StorageLayer {
  keys: KeyStore;
  memory: MemoryStore;
  traces: TraceStore;
  sessions: SessionStore;
  config: ConfigStore;
  roles: RolesStore;
  skills: SkillsStore;
}

export type { KeyStore, MemoryStore, TraceStore, SessionStore, ConfigStore, RolesStore, SkillsStore };
export type { ChatSession, ChatEntry } from './session-store';
export type { CognitiveTrace } from './trace-store';
export type { MemoryEntry } from './memory-store';
export type { ApiKey } from '../../types/metrics-types';
