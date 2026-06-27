/**
 * Data Access Layer (DAL) — index
 * 
 * Single entry point for all persistent data access.
 * Use this instead of importing DatabaseService directly.
 * 
 * Usage:
 *   const dal = container.get<DataAccessLayer>('dal');
 *   const memories = await dal.memory.getAll();
 *   const sessions = await dal.session.listRecent(10);
 */

export type { 
  DataAccessLayer, 
  KvRepository,
  DalFactory 
} from './types';

export { MemoryRepository } from './memory-repository';
export { SessionRepository } from './session-repository';
export { KeyRepository } from './key-repository';
export { NoteRepository } from './note-repository';
export { RoleRepository } from './role-repository';
export { DebateRepository } from './debate-repository';
export { TraceRepository } from './trace-repository';
export { CognitiveRepository } from './cognitive-repository';
export { DataAccessLayerImpl } from './data-access-layer';
export { WorkspaceRepository } from './workspace-repository';
