import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, FolderOpen, FolderClosed, File, X, Loader2, ChevronRight, ChevronDown, HardDrive, Code, Settings, BookOpen, Terminal, Shield, FileText, FileJson, Braces, Image, List, BarChart3, Clock, ArrowUpDown } from 'lucide-react';
import { workspaceService } from '../../kernel/instances';
import type { FileNode } from '../../kernel/contracts/workspace';
import { useTranslation } from '../../i18n/useTranslation';

type FilterKey = 'all' | 'code' | 'config' | 'docs' | 'logs';

const FILTER_DIRS: Record<FilterKey, string[]> = {
  all: [],
  code: ['src/kernel', 'src/llm', 'src/core', 'src/stores', 'src/types', 'src/components'],
  config: ['config', 'src/config', '.superagents', 'src/styles'],
  docs: ['docs'],
  logs: ['logs', 'prompt-vault'],
};

const FILTER_ICONS: Record<FilterKey, React.ReactNode> = {
  all: <FolderOpen size={14} />,
  code: <Code size={14} />,
  config: <Settings size={14} />,
  docs: <BookOpen size={14} />,
  logs: <Terminal size={14} />,
};

const SENSITIVE_PATTERNS = /(?:secret|key|token|password|credential|\.env)/i;

const EXT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  ts: { icon: <Code size={14} />, color: '#3178c6' },
  tsx: { icon: <Braces size={14} />, color: '#3178c6' },
  js: { icon: <FileText size={14} />, color: '#f7df1e' },
  jsx: { icon: <Braces size={14} />, color: '#f7df1e' },
  json: { icon: <FileJson size={14} />, color: '#f59e0b' },
  md: { icon: <BookOpen size={14} />, color: '#10b981' },
  css: { icon: <FileText size={14} />, color: '#06b6d4' },
  scss: { icon: <FileText size={14} />, color: '#06b6d4' },
  html: { icon: <Code size={14} />, color: '#e34f26' },
  yaml: { icon: <FileJson size={14} />, color: '#f59e0b' },
  yml: { icon: <FileJson size={14} />, color: '#f59e0b' },
  env: { icon: <Shield size={14} />, color: '#ef4444' },
  mjs: { icon: <FileText size={14} />, color: '#f7df1e' },
  wasm: { icon: <Terminal size={14} />, color: '#654ff0' },
};

const KEYWORD_HIGHLIGHT: Record<string, { keywords: string[]; color: string }[]> = {
  ts: [
    { keywords: ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends', 'implements', 'async', 'await', 'new', 'throw', 'try', 'catch', 'finally', 'switch', 'case', 'default', 'break', 'continue', 'typeof', 'keyof', 'readonly'], color: '#c678dd' },
    { keywords: ['string', 'number', 'boolean', 'void', 'null', 'undefined', 'any', 'never', 'unknown'], color: '#e5c07b' },
    { keywords: ['true', 'false', 'this', 'super'], color: '#56b6c2' },
    { keywords: ['//'], color: '#5c6370', isComment: true as const },
  ],
  tsx: [],
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
  const [attached, setAttached] = useState(workspaceService.isAttached());
  const [workspaceName, setWorkspaceName] = useState(workspaceService.getWorkspaceName());
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
  const [sortBy, setSortBy] = useState<'name' | 'size'>('name');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentFiles(JSON.parse(raw));
    } catch {}
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
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (attached) refreshTree();
  }, [attached, refreshTree]);

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
    const parts = path.split('/');
    setBreadcrumbs(parts);
    try {
      const content = await workspaceService.readFile(path);
      setPreviewContent(content);
      persistRecent(path);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Failed to read file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await workspaceService.search(query);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, []);

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

  const sortedTree = useMemo(() => {
    if (sortBy === 'size') {
      return [...tree].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return (b.size || 0) - (a.size || 0);
      });
    }
    return tree;
  }, [tree, sortBy]);

  function highlightCode(content: string, ext: string): React.ReactNode[] {
    const rules = KEYWORD_HIGHLIGHT[ext];
    if (!rules || ext === 'tsx') {
      return content.split('\n').map((line, i) => <span key={i} style={{ display: 'block' }}>{line || ' '}</span>);
    }
    return content.split('\n').map((line, i) => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      const matches: { start: number; end: number; color: string }[] = [];
      for (const rule of rules) {
        if (rule.isComment) {
          const idx = remaining.indexOf('//');
          if (idx !== -1) matches.push({ start: idx, end: remaining.length, color: rule.color });
          continue;
        }
        const re = new RegExp(`\\b(${rule.keywords.join('|')})\\b`, 'g');
        let m;
        while ((m = re.exec(remaining)) !== null) {
          matches.push({ start: m.index, end: m.index + m[0].length, color: rule.color });
        }
      }
      if (matches.length === 0) return <span key={i} style={{ display: 'block' }}>{line || ' '}</span>;
      matches.sort((a, b) => a.start - b.start);
      let pos = 0;
      for (const m of matches) {
        if (m.start > pos) parts.push(<span key={`${i}-${pos}`}>{line.slice(pos, m.start)}</span>);
        parts.push(<span key={`${i}-${m.start}`} style={{ color: m.color }}>{line.slice(m.start, m.end)}</span>);
        pos = m.end;
      }
      if (pos < line.length) parts.push(<span key={`${i}-${pos}`}>{line.slice(pos)}</span>);
      return <span key={i} style={{ display: 'block' }}>{parts.length > 0 ? parts : line || ' '}</span>;
    });
  }

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode => {
    const sorted = [...nodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return a.name.localeCompare(b.name);
    });
    return sorted.map(node => {
      const isDir = node.type === 'dir';
      const isSense = isSensitivePath(node.path);
      if (!isDir && !matchesFilter(node.path)) return null;
      const ext = isDir ? '' : getExt(node.name);
      const fileIcon = EXT_ICONS[ext];
      const paddingLeft = 8 + depth * 14;

      return (
        <div key={node.path}>
          <div
            onClick={() => isDir ? handleToggleDir(node.path) : handleSelectFile(node.path)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isDir ? handleToggleDir(node.path) : handleSelectFile(node.path); } }}
            role="button" tabIndex={0}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', paddingLeft,
              cursor: 'pointer', borderRadius: 6, fontSize: '0.82rem',
              background: selectedPath === node.path ? 'rgba(168,85,247,0.12)' : 'transparent',
              color: selectedPath === node.path ? '#a855f7' : isDir ? '#e2e8f0' : '#94a3b8',
              opacity: isSense ? 0.4 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (selectedPath !== node.path) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { if (selectedPath !== node.path) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title={isSense ? 'Sensitive path — hidden from analysis' : node.path}
          >
            {isDir ? (
              expanded.has(node.path) ? <ChevronDown size={11} color="#64748b" /> : <ChevronRight size={11} color="#64748b" />
            ) : <span style={{ width: 11 }} />}
            {isDir
              ? (expanded.has(node.path) ? <FolderOpen size={13} color="#a855f7" /> : <FolderClosed size={13} color="#64748b" />)
              : fileIcon
                ? <span style={{ color: fileIcon.color }}>{fileIcon.icon}</span>
                : <File size={13} color="#64748b" />}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
            {node.type === 'file' && node.size != null && (
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#475569' }}>{formatSize(node.size)}</span>
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
      <div style={{ padding: '1rem 1.25rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code size={18} color="#8b5cf6" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>{t('project_os_explorer.title')}</span>
          {attached && workspaceName && (
            <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>{workspaceName}</span>
          )}
        </div>
        {attached && (
          <button onClick={handleDetach} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
            <X size={13} /> Detach
          </button>
        )}
      </div>

      {!attached ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem', color: '#64748b' }}>
          <Code size={48} opacity={0.3} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>No project attached</span>
          <span style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'center', maxWidth: 350 }}>
            Attach a folder to browse its structure, inspect source code, configs, and documentation for research analysis.
          </span>
          <button onClick={handleAttach} style={{ padding: '0.75rem 1.5rem', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.5rem', border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}>
            <FolderOpen size={18} /> Attach Project Folder
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
            {(Object.keys(FILTER_DIRS) as FilterKey[]).map(key => (
              <button key={key} onClick={() => setFilter(key)}
                style={{
                  padding: '0.25rem 0.55rem', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: filter === key ? 'rgba(139,92,246,0.2)' : 'transparent',
                  color: filter === key ? '#a855f7' : '#64748b',
                }}
              >{FILTER_ICONS[key]}{key.charAt(0).toUpperCase() + key.slice(1)}</button>
            ))}
            <div style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '4px 8px', marginLeft: 4 }}>
              <Search size={12} color="#64748b" />
              <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search files..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.75rem' }} />
              {searching && <Loader2 size={11} />}
              {searchQuery && <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={11} /></button>}
            </div>
            <button onClick={() => setSortBy(s => s === 'name' ? 'size' : 'name')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}>
              <ArrowUpDown size={12} /> {sortBy === 'name' ? 'Name' : 'Size'}
            </button>
            <button onClick={() => setShowStats(!showStats)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}>
              <BarChart3 size={12} /> Stats
            </button>
          </div>

          {/* Safety badge */}
          <div style={{ padding: '0.2rem 1rem 0.3rem', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6rem', color: '#f59e0b', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
            <Shield size={9} /> Sensitive paths are dimmed and excluded from analysis
          </div>

          {/* Stats panel */}
          {showStats && (
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.15)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.7rem' }}>
              <div><span style={{ color: '#64748b' }}>Files:</span> <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{projectStats.total}</span></div>
              <div><span style={{ color: '#64748b' }}>Code:</span> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{projectStats.codeFiles}</span></div>
              <div><span style={{ color: '#64748b' }}>Est. lines:</span> <span style={{ color: '#f8fafc', fontWeight: 700 }}>{projectStats.totalLines.toLocaleString()}</span></div>
              <div><span style={{ color: '#64748b' }}>Size:</span> <span style={{ color: '#f8fafc', fontWeight: 700 }}>{formatSize(projectStats.totalSize)}</span></div>
              <div style={{ display: 'flex', gap: 6 }}>
                {projectStats.byExt.slice(0, 6).map(([ext, count]) => (
                  <span key={ext} style={{ background: 'rgba(100,116,139,0.15)', padding: '0.1rem 0.35rem', borderRadius: 3, color: '#94a3b8' }}>.{ext} {count}</span>
                ))}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* File tree sidebar */}
            <div style={{ width: '45%', minWidth: 220, overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.03)', padding: '0.25rem 0' }}>
              {searchQuery ? (
                searchResults.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>No matching files</div>
                ) : (
                  <div>
                    <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{searchResults.length} file{searchResults.length !== 1 ? 's' : ''}</div>
                    {searchResults.map(path => (
                      <div key={path} onClick={() => handleSelectFile(path)} onKeyDown={(e) => { if (e.key === 'Enter') handleSelectFile(path); }} role="button" tabIndex={0}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 12px', cursor: 'pointer', borderRadius: 5, fontSize: '0.78rem',
                          color: selectedPath === path ? '#a855f7' : '#94a3b8', background: selectedPath === path ? 'rgba(168,85,247,0.12)' : 'transparent' }}>
                        <span style={{ color: EXT_ICONS[getExt(path)]?.color || '#64748b' }}>{EXT_ICONS[getExt(path)]?.icon || <File size={12} />}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : treeLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}><Loader2 size={18} /></div>
              ) : tree.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>Empty directory</div>
              ) : (
                <div>{renderTree(sortedTree)}</div>
              )}
            </div>

            {/* Preview pane */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {selectedPath ? (
                <>
                  {/* Breadcrumbs */}
                  <div style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.72rem', overflow: 'hidden', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', cursor: 'pointer' }} onClick={() => setSelectedPath(null)}>root</span>
                    {breadcrumbs.map((part, i) => (
                      <React.Fragment key={i}>
                        <ChevronRight size={10} color="#475569" />
                        <span style={{ color: i === breadcrumbs.length - 1 ? '#a855f7' : '#94a3b8', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part}</span>
                      </React.Fragment>
                    ))}
                    {isSensitivePath(selectedPath) && <Shield size={10} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
                    <button onClick={() => { setSelectedPath(null); setPreviewContent(null); setPreviewError(null); setBreadcrumbs([]); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                  </div>

                  {/* File content with line numbers */}
                  <div ref={previewRef} style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
                    {previewLoading ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b', fontSize: '0.8rem' }}><Loader2 size={14} /> Loading...</div>
                    ) : previewError ? (
                      <div style={{ padding: '1rem', color: '#ef4444', fontSize: '0.8rem' }}>{previewError}</div>
                    ) : previewContent ? (
                      <div style={{ display: 'flex', width: '100%' }}>
                        {/* Line numbers */}
                        <div style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.72rem', lineHeight: 1.5, fontFamily: 'monospace', userSelect: 'none', minWidth: 40, borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                          {previewContent.split('\n').map((_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>
                        {/* Code */}
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', lineHeight: 1.5, color: '#cbd5e1', whiteSpace: 'pre', fontFamily: 'monospace', overflow: 'auto', flex: 1 }}>
                          {highlightCode(previewContent, getExt(selectedPath))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: '1rem', padding: '2rem' }}>
                  <Code size={36} opacity={0.2} />
                  <span style={{ fontSize: '0.85rem' }}>Select a file to preview</span>

                  {/* Recent files */}
                  {recentFiles.length > 0 && (
                    <div style={{ marginTop: '1rem', width: '100%', maxWidth: 350 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={11} /> Recent
                      </div>
                      {recentFiles.slice(0, 5).map(path => (
                        <div key={path} onClick={() => handleSelectFile(path)} onKeyDown={(e) => { if (e.key === 'Enter') handleSelectFile(path); }} role="button" tabIndex={0}
                          style={{ padding: '0.3rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: EXT_ICONS[getExt(path)]?.color || '#64748b' }}>{EXT_ICONS[getExt(path)]?.icon || <File size={11} />}</span>
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
    </div>
  );
};

export default ProjectOsExplorer;
