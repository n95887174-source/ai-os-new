import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, FolderOpen, FolderClosed, File, X, Loader2, ChevronRight, ChevronDown, HardDrive, Code, Settings, BookOpen, Terminal, Shield, FileText, FileJson, Braces, Image, List, BarChart3, Clock, ArrowUpDown, Copy, Lightbulb, Target, CornerDownRight, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workspaceService } from '../../kernel/instances';
import type { FileNode } from '../../kernel/contracts/workspace';
import { useTranslation } from '../../i18n/useTranslation';

type FilterKey = 'all' | 'code' | 'config' | 'docs' | 'logs';
type SortKey = 'name' | 'size' | 'type';

const FILTER_DIRS: Record<FilterKey, string[]> = {
  all: [],
  code: ['src/kernel', 'src/llm', 'src/core', 'src/stores', 'src/types', 'src/components'],
  config: ['config', 'src/config', '.superagents', 'src/styles'],
  docs: ['docs'],
  logs: ['logs', 'prompt-vault'],
};

const FILTER_ICONS: Record<FilterKey, React.ReactNode> = {
  all: <FolderOpen size={13} />,
  code: <Code size={13} />,
  config: <Settings size={13} />,
  docs: <BookOpen size={13} />,
  logs: <Terminal size={13} />,
};

const SENSITIVE_PATTERNS = /(?:secret|key|token|password|credential|\.env)/i;

const EXT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  ts: { icon: <Code size={13} />, color: '#3178c6' },
  tsx: { icon: <Braces size={13} />, color: '#3178c6' },
  js: { icon: <FileText size={13} />, color: '#f7df1e' },
  jsx: { icon: <Braces size={13} />, color: '#f7df1e' },
  json: { icon: <FileJson size={13} />, color: '#f59e0b' },
  md: { icon: <BookOpen size={13} />, color: '#10b981' },
  css: { icon: <FileText size={13} />, color: '#06b6d4' },
  scss: { icon: <FileText size={13} />, color: '#06b6d4' },
  html: { icon: <Code size={13} />, color: '#e34f26' },
  yaml: { icon: <FileJson size={13} />, color: '#f59e0b' },
  yml: { icon: <FileJson size={13} />, color: '#f59e0b' },
  env: { icon: <Shield size={13} />, color: '#ef4444' },
  mjs: { icon: <FileText size={13} />, color: '#f7df1e' },
  wasm: { icon: <Terminal size={13} />, color: '#654ff0' },
  png: { icon: <Image size={13} />, color: '#a855f7' },
  svg: { icon: <Image size={13} />, color: '#f59e0b' },
  ico: { icon: <Image size={13} />, color: '#06b6d4' },
  lock: { icon: <Shield size={13} />, color: '#64748b' },
};

const KEYWORD_HIGHLIGHT: Record<string, { keywords: string[]; color: string; isComment?: boolean }[]> = {
  ts: [
    { keywords: ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends', 'implements', 'async', 'await', 'new', 'throw', 'try', 'catch', 'finally', 'switch', 'case', 'default', 'break', 'continue', 'typeof', 'keyof', 'readonly', 'in', 'of', 'as', 'is', 'satisfies'], color: '#c678dd' },
    { keywords: ['string', 'number', 'boolean', 'void', 'null', 'undefined', 'any', 'never', 'unknown', 'bigint', 'symbol'], color: '#e5c07b' },
    { keywords: ['true', 'false', 'this', 'super'], color: '#56b6c2' },
    { keywords: ['//'], color: '#5c6370', isComment: true },
  ],
  json: [
    { keywords: ['true', 'false', 'null'], color: '#56b6c2' },
  ],
};

const RECENT_KEY = 'project_os_recent';

function getExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function estimateLines(size: number): number {
  return Math.round(size / 50);
}

const ProjectOsExplorer: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [attached, setAttached] = useState(() => { try { return workspaceService.isAttached(); } catch { return false; } });
  const [workspaceName, setWorkspaceName] = useState(() => { try { return workspaceService.getWorkspaceName(); } catch { return null; } });
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [showSensitive, setShowSensitive] = useState(false);
  const [goToLine, setGoToLine] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'content' | 'info'>('content');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentFiles(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const persistRecent = (path: string) => {
    const next = [path, ...recentFiles.filter(f => f !== path)].slice(0, 10);
    setRecentFiles(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };

  const refreshTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const nodes = await workspaceService.listTree();
      setTree(nodes);
    } finally { setTreeLoading(false); }
  }, []);

  useEffect(() => {
    if (attached) refreshTree();
  }, [attached, refreshTree]);

  useEffect(() => {
    const fileParam = searchParams.get('file');
    if (fileParam && tree.length > 0) {
      const flat = flattenTree(tree).filter(n => n.type === 'file');
      if (flat.some(f => f.path === fileParam)) {
        handleSelectFile(fileParam);
        window.history.replaceState({}, '', '/project-os');
      }
    }
  }, [searchParams, tree]);

  const handleAttach = async () => {
    try {
      await workspaceService.attachDirectory();
      setAttached(true);
      setWorkspaceName(workspaceService.getWorkspaceName());
      await refreshTree();
    } catch {}
  };

  const handleDetach = () => {
    workspaceService.detach();
    setAttached(false); setWorkspaceName(null); setTree([]);
    setExpanded(new Set()); setSelectedPath(null); setPreviewContent(null);
    setPreviewError(null); setFilter('all'); setSearchQuery(''); setSearchResults([]);
    setBreadcrumbs([]);
  };

  const handleToggleDir = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const handleSelectFile = async (path: string) => {
    setSelectedPath(path);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewContent(null);
    setActivePreviewTab('content');
    setGoToLine('');
    setBreadcrumbs(path.split('/'));
    try {
      const content = await workspaceService.readFile(path);
      setPreviewContent(content);
      persistRecent(path);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Failed to read file');
    } finally { setPreviewLoading(false); }
  };

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {}
    setContextMenu(null);
  };

  const handleCreateHypothesis = (path: string) => {
    setContextMenu(null);
    navigate(`/hypothesis-gen?source=${encodeURIComponent(path)}`);
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await workspaceService.search(query);
      setSearchResults(results);
    } finally { setSearching(false); }
  }, []);

  const handleGoToLine = () => {
    const line = parseInt(goToLine, 10);
    if (isNaN(line) || line < 1 || !previewRef.current) return;
    const el = previewRef.current.querySelector(`[data-line="${line}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const flattenTree = (nodes: FileNode[], base: FileNode[] = []): FileNode[] => {
    for (const n of nodes) { base.push(n); if (n.type === 'dir' && n.children) flattenTree(n.children, base); }
    return base;
  };

  const allFiles = useMemo(() => flattenTree(tree).filter(n => n.type === 'file'), [tree]);

  const projectStats = useMemo(() => {
    const byExt: Record<string, number> = {};
    let totalSize = 0;
    for (const f of allFiles) {
      const ext = getExt(f.name);
      byExt[ext] = (byExt[ext] || 0) + 1;
      totalSize += f.size || 0;
    }
    const sorted = Object.entries(byExt).sort((a, b) => b[1] - a[1]);
    const codeFiles = allFiles.filter(f => /\.(ts|tsx|js|jsx|mjs)$/i.test(f.name));
    return { byExt: sorted, total: allFiles.length, totalSize, totalLines: estimateLines(totalSize), codeFiles: codeFiles.length };
  }, [allFiles]);

  const isSensitivePath = (path: string) => SENSITIVE_PATTERNS.test(path);

  const matchesFilter = (path: string): boolean => {
    if (filter === 'all') return true;
    return FILTER_DIRS[filter].some(d => path.startsWith(d));
  };

  const dirSort = (nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'type') {
        const extA = getExt(a.name);
        const extB = getExt(b.name);
        if (extA !== extB) return extA.localeCompare(extB);
      }
      return a.name.localeCompare(b.name);
    });
  };

  function highlightCode(content: string, ext: string): React.ReactNode[] {
    const rules = KEYWORD_HIGHLIGHT[ext];
    if (!rules || ext === 'tsx') {
      return content.split('\n').map((line, i) => <span key={i} data-line={i + 1} style={{ display: 'block' }}>{line || ' '}</span>);
    }
    return content.split('\n').map((line, i) => {
      const parts: React.ReactNode[] = [];
      const matches: { start: number; end: number; color: string }[] = [];
      for (const rule of rules) {
        if (rule.isComment) {
          const idx = line.indexOf('//');
          if (idx !== -1 && matches.every(m => m.start > idx || m.end < idx)) {
            matches.push({ start: idx, end: line.length, color: rule.color });
          }
          continue;
        }
        const re = new RegExp(`\\b(${rule.keywords.join('|').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'g');
        let m;
        while ((m = re.exec(line)) !== null) {
          matches.push({ start: m.index, end: m.index + m[0].length, color: rule.color });
        }
      }
      if (matches.length === 0) return <span key={i} data-line={i + 1} style={{ display: 'block' }}>{line || ' '}</span>;
      matches.sort((a, b) => a.start - b.start);
      let pos = 0;
      for (const m of matches) {
        if (m.start > pos) parts.push(<span key={`${i}-${pos}`}>{line.slice(pos, m.start)}</span>);
        parts.push(<span key={`${i}-${m.start}`} style={{ color: m.color }}>{line.slice(m.start, m.end)}</span>);
        pos = m.end;
      }
      if (pos < line.length) parts.push(<span key={`${i}-${pos}`}>{line.slice(pos)}</span>);
      return <span key={i} data-line={i + 1} style={{ display: 'block' }}>{parts.length > 0 ? parts : line || ' '}</span>;
    });
  }

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode => {
    const sorted = dirSort(nodes);
    return sorted.map(node => {
      const isDir = node.type === 'dir';
      const isSense = isSensitivePath(node.path);
      if (isSense && !showSensitive) return null;
      if (!isDir && !matchesFilter(node.path)) return null;
      const ext = isDir ? '' : getExt(node.name);
      const fileIcon = EXT_ICONS[ext];
      const paddingLeft = 6 + depth * 14;

      return (
        <div key={node.path}>
          <div
            onClick={() => isDir ? handleToggleDir(node.path) : handleSelectFile(node.path)}
            onContextMenu={(e) => { if (!isDir) handleContextMenu(e, node.path); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { isDir ? handleToggleDir(node.path) : handleSelectFile(node.path); } }}
            role="button" tabIndex={0}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', paddingLeft,
              cursor: 'pointer', borderRadius: 5, fontSize: '0.78rem',
              background: selectedPath === node.path ? 'rgba(168,85,247,0.12)' : 'transparent',
              color: selectedPath === node.path ? '#c084fc' : isDir ? '#e2e8f0' : '#94a3b8',
              opacity: isSense ? 0.35 : 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { if (selectedPath !== node.path) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; }}
            onMouseLeave={(e) => { if (selectedPath !== node.path) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title={isSense ? 'Sensitive path' : node.path}
          >
            {isDir ? (
              expanded.has(node.path) ? <ChevronDown size={10} color="#64748b" /> : <ChevronRight size={10} color="#64748b" />
            ) : <span style={{ width: 10 }} />}
            {isDir
              ? (expanded.has(node.path) ? <FolderOpen size={12} color="#a855f7" /> : <FolderClosed size={12} color="#64748b" />)
              : fileIcon ? <span style={{ color: fileIcon.color }}>{fileIcon.icon}</span> : <File size={12} color="#64748b" />}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{node.name}</span>
            {node.type === 'file' && node.size != null && (
              <span style={{ fontSize: '0.6rem', color: '#475569' }}>{formatSize(node.size)}</span>
            )}
          </div>
          {isDir && expanded.has(node.path) && node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.85rem 1.25rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code size={18} color="#8b5cf6" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>Project OS Explorer</span>
          {attached && workspaceName && (
            <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.1rem 0.45rem', borderRadius: 4 }}>{workspaceName}</span>
          )}
        </div>
        {attached && (
          <button onClick={handleDetach} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem' }}>
            <X size={12} /> Detach
          </button>
        )}
      </div>

      {!attached ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem', color: '#64748b' }}>
          <Code size={48} opacity={0.3} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>No project attached</span>
          <span style={{ fontSize: '0.8rem', color: '#475569', textAlign: 'center', maxWidth: 350 }}>
            Attach a folder to browse its structure, inspect source code, configs, and documentation for research analysis.
          </span>
          <button onClick={handleAttach} style={{ padding: '0.7rem 1.4rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.25rem', border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}>
            <FolderOpen size={16} /> Attach Project Folder
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
            {(Object.keys(FILTER_DIRS) as FilterKey[]).map(key => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, background: filter === key ? 'rgba(139,92,246,0.2)' : 'transparent', color: filter === key ? '#a855f7' : '#64748b' }}>
                {FILTER_ICONS[key]}{key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
            <div style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 5, padding: '3px 7px', marginLeft: 4 }}>
              <Search size={11} color="#64748b" />
              <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.72rem' }} />
              {searching && <Loader2 size={10} />}
              {searchQuery && <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={10} /></button>}
            </div>
            <button onClick={() => setSortBy(s => s === 'name' ? 'size' : s === 'size' ? 'type' : 'name')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 3, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpDown size={11} /> {sortBy === 'name' ? 'Name' : sortBy === 'size' ? 'Size' : 'Type'}
            </button>
            <button onClick={() => setShowSensitive(!showSensitive)} style={{ background: 'none', border: 'none', color: showSensitive ? '#f59e0b' : '#64748b', cursor: 'pointer', padding: 3, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 2 }}>
              {showSensitive ? <EyeOff size={11} /> : <Eye size={11} />} {showSensitive ? 'Hide' : 'Sensitive'}
            </button>
            <button onClick={() => setShowStats(!showStats)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 3, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 2 }}>
              <BarChart3 size={11} /> Stats
            </button>
          </div>

          {/* Stats panel */}
          {showStats && (
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.15)', display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.68rem', alignItems: 'center' }}>
              <div><span style={{ color: '#64748b' }}>Files:</span> <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{projectStats.total}</span></div>
              <div><span style={{ color: '#64748b' }}>Code:</span> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{projectStats.codeFiles}</span></div>
              <div><span style={{ color: '#64748b' }}>Lines:</span> <span style={{ color: '#f8fafc', fontWeight: 700 }}>{projectStats.totalLines.toLocaleString()}</span></div>
              <div><span style={{ color: '#64748b' }}>Size:</span> <span style={{ color: '#f8fafc', fontWeight: 700 }}>{formatSize(projectStats.totalSize)}</span></div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {projectStats.byExt.slice(0, 7).map(([ext, count]) => (
                  <span key={ext} style={{ background: 'rgba(100,116,139,0.15)', padding: '0.1rem 0.3rem', borderRadius: 2, color: '#94a3b8' }}>.{ext} {count}</span>
                ))}
              </div>
            </div>
          )}

          {/* Main */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Tree */}
            <div style={{ width: '42%', minWidth: 200, overflowY: 'auto', padding: '0.15rem 0', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
              {searchQuery ? (
                searchResults.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>No matching files</div>
                ) : (
                  <div>
                    <div style={{ padding: '0.35rem 0.75rem', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{searchResults.length} results</div>
                    {searchResults.map(path => (
                      <div key={path} onClick={() => handleSelectFile(path)} onContextMenu={(e) => handleContextMenu(e, path)} onKeyDown={(e) => { if (e.key === 'Enter') handleSelectFile(path); }} role="button" tabIndex={0}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 10px', cursor: 'pointer', borderRadius: 4, fontSize: '0.72rem', color: selectedPath === path ? '#c084fc' : '#94a3b8', background: selectedPath === path ? 'rgba(168,85,247,0.12)' : 'transparent' }}>
                        <span style={{ color: EXT_ICONS[getExt(path)]?.color || '#64748b' }}>{EXT_ICONS[getExt(path)]?.icon || <File size={11} />}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : treeLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}><Loader2 size={16} /></div>
              ) : tree.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>Empty directory</div>
              ) : (
                <div>{renderTree(tree)}</div>
              )}
            </div>

            {/* Preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {selectedPath ? (
                <>
                  {/* Preview header */}
                  <div style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.68rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => { setSelectedPath(null); setPreviewContent(null); setPreviewError(null); setBreadcrumbs([]); }}>root</span>
                    {breadcrumbs.map((part, i) => (
                      <React.Fragment key={i}>
                        <ChevronRight size={9} color="#475569" />
                        <span style={{ color: i === breadcrumbs.length - 1 ? '#a855f7' : '#94a3b8', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part}</span>
                      </React.Fragment>
                    ))}
                    {isSensitivePath(selectedPath) && <Shield size={9} color="#f59e0b" />}
                    <div style={{ flex: 1 }} />
                    {/* Preview tabs */}
                    <button onClick={() => setActivePreviewTab('content')} style={{ padding: '0.15rem 0.4rem', borderRadius: 3, border: 'none', background: activePreviewTab === 'content' ? 'rgba(139,92,246,0.2)' : 'transparent', color: activePreviewTab === 'content' ? '#a855f7' : '#64748b', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 600 }}>Content</button>
                    <button onClick={() => setActivePreviewTab('info')} style={{ padding: '0.15rem 0.4rem', borderRadius: 3, border: 'none', background: activePreviewTab === 'info' ? 'rgba(139,92,246,0.2)' : 'transparent', color: activePreviewTab === 'info' ? '#a855f7' : '#64748b', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 600 }}>Info</button>
                    <button onClick={() => { setSelectedPath(null); setPreviewContent(null); setPreviewError(null); setBreadcrumbs([]); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}><X size={11} /></button>
                  </div>

                  {activePreviewTab === 'info' ? (
                    /* Info tab */
                    <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {[
                          ['Path', selectedPath],
                          ['Extension', getExt(selectedPath).toUpperCase() || '(none)'],
                          ['Size', formatSize(allFiles.find(f => f.path === selectedPath)?.size || 0)],
                          ['Est. Lines', estimateLines(allFiles.find(f => f.path === selectedPath)?.size || 0).toLocaleString()],
                          ['Sensitive', isSensitivePath(selectedPath) ? 'Yes' : 'No'],
                        ].map(([label, val]) => (
                          <div key={label} style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(0,0,0,0.15)' }}>
                            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{label}</div>
                            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all' }}>{String(val)}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: '1rem' }}>
                        <button onClick={() => handleCopyPath(selectedPath)} style={{ padding: '0.4rem 0.8rem', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}><Copy size={11} /> Copy Path</button>
                        <button onClick={() => handleCreateHypothesis(selectedPath)} style={{ padding: '0.4rem 0.8rem', borderRadius: 5, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#a855f7', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}><Lightbulb size={11} /> Hypothesis from File</button>
                      </div>
                    </div>
                  ) : (
                    /* Content tab */
                    <>
                      {/* Go-to-line bar */}
                      <div style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.65rem' }}>
                        <Target size={10} color="#64748b" />
                        <span style={{ color: '#64748b' }}>Go to line:</span>
                        <input type="number" min={1} value={goToLine} onChange={e => setGoToLine(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGoToLine(); }} style={{ width: 50, padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: '0.65rem' }} />
                        <button onClick={handleGoToLine} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 1, fontSize: '0.62rem' }}>Go</button>
                        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.6rem' }}>
                          {previewContent ? `${previewContent.split('\n').length} lines` : ''}
                          {allFiles.find(f => f.path === selectedPath)?.size && ` · ${formatSize(allFiles.find(f => f.path === selectedPath)!.size!)}`}
                        </span>
                        <button onClick={() => handleCopyPath(selectedPath)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}><Copy size={10} /></button>
                        <button onClick={() => handleCreateHypothesis(selectedPath)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', padding: 2 }} title="Create hypothesis from this file"><Lightbulb size={10} /></button>
                      </div>

                      {/* Content */}
                      <div ref={previewRef} style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
                        {previewLoading ? (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem' }}><Loader2 size={13} /> Loading...</div>
                        ) : previewError ? (
                          <div style={{ padding: '1rem', color: '#ef4444', fontSize: '0.75rem' }}>{previewError}</div>
                        ) : previewContent ? (
                          <div style={{ display: 'flex', width: '100%' }}>
                            <div style={{ padding: '0.75rem 0.4rem', textAlign: 'right', color: '#475569', fontSize: '0.68rem', lineHeight: 1.5, fontFamily: 'monospace', userSelect: 'none', minWidth: 36, borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                              {previewContent.split('\n').map((_, i) => (
                                <div key={i}><a href={`#line-${i + 1}`} onClick={(e) => { e.preventDefault(); }} style={{ color: '#475569', textDecoration: 'none' }}>{i + 1}</a></div>
                              ))}
                            </div>
                            <div style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', lineHeight: 1.5, color: '#cbd5e1', whiteSpace: 'pre', fontFamily: 'monospace', overflow: 'auto', flex: 1 }}>
                              {highlightCode(previewContent, getExt(selectedPath))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: '0.75rem', padding: '2rem' }}>
                  <Code size={32} opacity={0.2} />
                  <span style={{ fontSize: '0.8rem' }}>Select a file to preview</span>
                  {recentFiles.length > 0 && (
                    <div style={{ marginTop: '0.75rem', width: '100%', maxWidth: 320 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> Recent
                      </div>
                      {recentFiles.slice(0, 6).map(path => (
                        <div key={path} onClick={() => handleSelectFile(path)} onKeyDown={(e) => { if (e.key === 'Enter') handleSelectFile(path); }} role="button" tabIndex={0}
                          style={{ padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: EXT_ICONS[getExt(path)]?.color || '#64748b' }}>{EXT_ICONS[getExt(path)]?.icon || <File size={10} />}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 10000, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.25rem', minWidth: 180, boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
          onClick={e => e.stopPropagation()}>
          <div onClick={() => handleCopyPath(contextMenu.path)} style={{ padding: '0.4rem 0.7rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <Copy size={12} /> Copy Path
          </div>
          <div onClick={() => { handleCreateHypothesis(contextMenu.path); }} style={{ padding: '0.4rem 0.7rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.08)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <Lightbulb size={12} /> Create Hypothesis
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectOsExplorer;
