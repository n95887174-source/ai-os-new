import { EVENT_REGISTRY, type EventMap } from './event-registry';

export const WorkspaceEvents = {
  ATTACHED: EVENT_REGISTRY.WORKSPACE_ATTACHED.name,
  DETACHED: EVENT_REGISTRY.WORKSPACE_DETACHED.name,
  FILE_READ: EVENT_REGISTRY.WORKSPACE_FILE_READ.name,
} as const;

export interface WorkspaceAttachedPayload {
  name: string;
  fileCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WorkspaceDetachedPayload {}

export interface WorkspaceFileReadPayload {
  path: string;
}

export type WorkspaceEventMap = Pick<EventMap,
  'workspace:attached' | 'workspace:detached' | 'workspace:file:read'
>;
