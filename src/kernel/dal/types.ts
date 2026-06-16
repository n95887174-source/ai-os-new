/**
 * Data Access Layer (DAL)
 * 
 * Single entry point for all persistent data access.
 * Replaces direct Dexie table access throughout the codebase.
 * 
 * ЗАКОН 1: Каждый domain имеет ровно ОДИН repository в DAL.
 * ЗАКОН 2: Все storage-операции проходят через DAL, не напрямую в Dexie.
 */

import type { MemoryEntry } from '../types/memory-types';
import type { ChatSession } from '../contracts/storage/session-store';
import type { KeyNote, ApiKey } from '../types/metrics-types';
import type { Role } from '../types/role-types';
import type { CognitiveTrace, CognitiveSkill, Connector } from '../types/domain-types';
import type { ExecutionTrace } from '../contracts/observability';
import type { DebateSessionRecord, DebateVerdictRecord } from '../contracts/storage/debate-store';

// =============================================================================
// Repository Interfaces
// =============================================================================

/** Memory domain — stores conversation context and learned patterns */
export interface MemoryRepository {
  getAll(): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | undefined>;
  store(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry>;
  upsert(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry>;
  delete(id: string): Promise<void>;
  search(query: string, options?: { limit?: number }): Promise<MemoryEntry[]>;
  prune(beforeTimestamp: number): Promise<number>;
  clear(): Promise<void>;
}

/** Session domain — chat conversation history */
export interface SessionRepository {
  getAll(): Promise<ChatSession[]>;
  get(id: string): Promise<ChatSession | undefined>;
  save(session: ChatSession): Promise<void>;
  delete(id: string): Promise<void>;
  listRecent(limit?: number): Promise<ChatSession[]>;
}

/** API Keys domain — provider credentials */
export interface KeyRepository {
  getAll(): Promise<ApiKey[]>;
  get(id: string): Promise<ApiKey | undefined>;
  save(key: ApiKey): Promise<void>;
  delete(id: string): Promise<void>;
  listByProvider(provider: string): Promise<ApiKey[]>;
}

/** Key Notes domain — analytics and observations */
export interface NoteRepository {
  getAll(): Promise<KeyNote[]>;
  get(id: string): Promise<KeyNote | undefined>;
  save(note: KeyNote): Promise<void>;
  delete(id: string): Promise<void>;
  listByKey(keyId: string): Promise<KeyNote[]>;
}

/** Role domain — agent personas and configurations */
export interface RoleRepository {
  getAll(): Promise<Role[]>;
  get(id: string): Promise<Role | undefined>;
  save(role: Role): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Debate domain — structured multi-agent discussions */
export interface DebateRepository {
  // Sessions
  listSessions(): Promise<DebateSessionRecord[]>;
  getSession(id: string): Promise<DebateSessionRecord | undefined>;
  saveSession(session: DebateSessionRecord): Promise<void>;
  deleteSession(id: string): Promise<void>;
  
  // Verdicts
  getVerdict(sessionId: string): Promise<DebateVerdictRecord | undefined>;
  saveVerdict(verdict: DebateVerdictRecord): Promise<void>;
  
  // Maintenance
  clearAll(): Promise<void>;
}

/** Trace domain — execution telemetry and performance data */
export interface TraceRepository {
  getAll(limit?: number): Promise<ExecutionTrace[]>;
  get(id: string): Promise<ExecutionTrace | undefined>;
  save(trace: ExecutionTrace): Promise<void>;
  delete(id: string): Promise<void>;
  listRecent(limit?: number): Promise<ExecutionTrace[]>;
}

/** Cognitive domain — skills and connectors */
export interface CognitiveRepository {
  // Skills
  getAllSkills(): Promise<CognitiveSkill[]>;
  getSkill(id: string): Promise<CognitiveSkill | undefined>;
  saveSkill(skill: CognitiveSkill): Promise<void>;
  deleteSkill(id: string): Promise<void>;
  
  // Connectors
  getAllConnectors(): Promise<Connector[]>;
  getConnector(id: string): Promise<Connector | undefined>;
  saveConnector(connector: Connector): Promise<void>;
  deleteConnector(id: string): Promise<void>;
  
  // Cognitive Traces
  getAllCognitiveTraces(): Promise<CognitiveTrace[]>;
  getCognitiveTrace(id: string): Promise<CognitiveTrace | undefined>;
  saveCognitiveTrace(trace: CognitiveTrace): Promise<void>;
  deleteCognitiveTrace(id: string): Promise<void>;
}

/** Key-Value store — generic key-value persistence */
export interface KvRepository {
  get<T>(id: string): Promise<T | null>;
  set<T>(id: string, value: T): Promise<void>;
  delete(id: string): Promise<void>;
  list(prefix?: string): Promise<Array<{ id: string; value: unknown }>>;
  clear(): Promise<void>;
}

// =============================================================================
// DAL Interface — единая точка входа
// =============================================================================

export interface DataAccessLayer {
  memory: MemoryRepository;
  session: SessionRepository;
  keys: KeyRepository;
  notes: NoteRepository;
  roles: RoleRepository;
  debate: DebateRepository;
  trace: TraceRepository;
  cognitive: CognitiveRepository;
  kv: KvRepository;
}

// =============================================================================
// Factory type
// =============================================================================

export type DalFactory = (db: import('../services/database-service').DatabaseService) => DataAccessLayer;
