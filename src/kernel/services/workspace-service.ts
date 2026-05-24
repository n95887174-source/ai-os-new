import type { IWorkspaceService, FileNode } from '../contracts/workspace';
import { WORKSPACE_EVENTS } from '../contracts/workspace';
import type { ILifecycle } from '../contracts/lifecycle';

const MAX_DEPTH = 4;
const MAX_FILES = 1000;
const MAX_READ_SIZE = 500_000;
const BINARY_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.wasm',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wav', '.flac',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
]);
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.cache',
  '__pycache__', '.venv', 'venv', 'env', '.idea', '.vscode',
  'coverage', '.nyc_output', 'target', 'out',
]);

export interface WorkspaceServiceDeps {
  eventBus: { emit: (event: string, data?: unknown) => void };
}

export class WorkspaceService implements IWorkspaceService, ILifecycle {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private treeCache: FileNode[] | null = null;
  private attached = false;
  private workspaceName: string | null = null;
  private deps: WorkspaceServiceDeps;

  constructor(deps: WorkspaceServiceDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {
    // nothing to init — workspace starts detached
  }

  async start(): Promise<void> {
    // no-op
  }

  destroy(): void {
    this.detach();
  }

  isAttached(): boolean {
    return this.attached;
  }

  getWorkspaceName(): string | null {
    return this.workspaceName;
  }

  getRootDirName(): string | null {
    return this.workspaceName;
  }

  async attachDirectory(): Promise<void> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      const handle = await (window as any).showDirectoryPicker();
      this.rootHandle = handle as FileSystemDirectoryHandle;
      this.workspaceName = handle.name;
      this.attached = true;
      this.treeCache = null;
      this.deps.eventBus.emit(WORKSPACE_EVENTS.ATTACHED, { name: this.workspaceName, fileCount: 0 });
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      this.attached = false;
      this.rootHandle = null;
      this.workspaceName = null;
      throw e;
    }
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.rootHandle = null;
    this.workspaceName = null;
    this.treeCache = null;
    this.deps.eventBus.emit(WORKSPACE_EVENTS.DETACHED, {});
  }

  async listTree(dirPath?: string): Promise<FileNode[]> {
    const handle = this.rootHandle;
    if (!handle) return [];
    const dirHandle = dirPath ? await this.resolveDirHandle(handle, dirPath) : handle;
    return this.traverseDir(dirHandle, dirPath || '', 0);
  }

  async readFile(path: string): Promise<string> {
    const handle = this.rootHandle;
    if (!handle) throw new Error('No workspace attached');
    const fileHandle = await this.resolveFileHandle(handle, path);
    const file = await fileHandle.getFile();

    if (file.size > MAX_READ_SIZE) {
      throw new Error(`File too large (${file.size} bytes). Max ${MAX_READ_SIZE} bytes`);
    }
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      throw new Error(`Cannot read binary file: ${path}`);
    }

    const text = await file.text();
    this.deps.eventBus.emit(WORKSPACE_EVENTS.FILE_READ, { path });
    return text;
  }

  async search(pattern: string, rootDir?: string): Promise<string[]> {
    const handle = this.rootHandle;
    if (!handle) return [];
    const dirHandle = rootDir ? await this.resolveDirHandle(handle, rootDir) : handle;
    const results: string[] = [];
    await this.searchDir(dirHandle, rootDir || '', pattern.toLowerCase(), results);
    return results;
  }

  async getFileTreeSnapshot(maxDepth = 3): Promise<string> {
    const handle = this.rootHandle;
    if (!handle) return '(no workspace attached)';
    const name = this.workspaceName || 'workspace';
    const tree = await this.traverseDir(handle, '', 0, maxDepth);
    if (tree.length === 0) return `/${name}/\n  (empty)`;
    return `/${name}/\n${this.formatTree(tree, '')}`;
  }

  private async resolveDirHandle(
    root: FileSystemDirectoryHandle,
    dirPath: string,
  ): Promise<FileSystemDirectoryHandle> {
    const parts = dirPath.split('/').filter(Boolean);
    let handle = root;
    for (const part of parts) {
      handle = await handle.getDirectoryHandle(part);
    }
    return handle;
  }

  private async resolveFileHandle(
    root: FileSystemDirectoryHandle,
    filePath: string,
  ): Promise<FileSystemFileHandle> {
    const parts = filePath.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) throw new Error(`Invalid file path: ${filePath}`);
    let handle: FileSystemDirectoryHandle = root;
    for (const part of parts) {
      handle = await handle.getDirectoryHandle(part);
    }
    return handle.getFileHandle(fileName);
  }

  private async traverseDir(
    handle: FileSystemDirectoryHandle,
    prefix: string,
    depth: number,
    maxDepth = MAX_DEPTH,
  ): Promise<FileNode[]> {
    if (depth > maxDepth) return [];
    const nodes: FileNode[] = [];
    let count = 0;

    for await (const [name, entry] of (handle as any).entries()) {
      if (count >= MAX_FILES) break;
      const fullPath = prefix ? `${prefix}/${name}` : name;

      if (entry.kind === 'directory') {
        if (SKIP_DIRS.has(name)) continue;
        const children = await this.traverseDir(entry as FileSystemDirectoryHandle, fullPath, depth + 1, maxDepth);
        count += children.length + 1;
        nodes.push({
          name,
          path: fullPath,
          type: 'dir',
          children: children.length > 0 ? children : undefined,
        });
      } else {
        count++;
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          nodes.push({
            name,
            path: fullPath,
            type: 'file',
            size: file.size,
            lastModified: file.lastModified,
          });
        } catch {
          // permission error or file access issue — skip
        }
      }
    }

    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  private async searchDir(
    handle: FileSystemDirectoryHandle,
    prefix: string,
    pattern: string,
    results: string[],
  ): Promise<void> {
    for await (const [name, entry] of (handle as any).entries()) {
      const fullPath = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === 'directory') {
        if (SKIP_DIRS.has(name)) continue;
        await this.searchDir(entry as FileSystemDirectoryHandle, fullPath, pattern, results);
      } else if (name.toLowerCase().includes(pattern)) {
        results.push(fullPath);
      }
    }
  }

  private formatTree(nodes: FileNode[], indent: string): string {
    let out = '';
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isLast = i === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const sizeInfo = node.type === 'file' && node.size != null ? ` (${this.formatSize(node.size)})` : '';
      out += `${indent}${connector}${node.name}${sizeInfo}\n`;
      if (node.type === 'dir' && node.children) {
        const childIndent = indent + (isLast ? '    ' : '│   ');
        out += this.formatTree(node.children, childIndent);
      }
    }
    return out;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
