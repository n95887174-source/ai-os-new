export const WorkspaceEvents = {
  ATTACHED: 'workspace:attached',
  DETACHED: 'workspace:detached',
  FILE_READ: 'workspace:file:read',
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

export type WorkspaceEventMap = {
  'workspace:attached': WorkspaceAttachedPayload;
  'workspace:detached': WorkspaceDetachedPayload;
  'workspace:file:read': WorkspaceFileReadPayload;
};
