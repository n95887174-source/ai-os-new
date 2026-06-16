import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FolderOpen, AlertTriangle, AlertCircle, Info, Loader2, HardDrive, X, ChevronDown, ChevronRight, Search, FileCode, ArrowRight, Layers, Lightbulb, CheckCircle2, Circle, FileWarning } from 'lucide-react'
import { workspaceService, architectureReviewService } from '../../kernel/instances';
import type { FileNode } from '../../kernel/contracts/workspace';
import type { ArchFinding, ArchDebtItem } from '../../kernel/contracts/architecture-review';
import { useTranslation } from '../../i18n/useTranslation';

const DEBT_REPORT_PATH = 'docs/DEBT_REPORT.md';

const ArchitectureReview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [attached, setAttached] = useState(() => { try { return workspaceService.isAttached(); } catch { return false; } });
  const [workspaceName, setWorkspaceName] = useState(() => { try { return workspaceService.getWorkspaceName(); } catch { return null; } });
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [findings, setFindings] = useState<ArchFinding[]>([]);
  const [scanning, setScanning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['error']));
  const [searchQuery, setSearchQuery] = useState('');
  const [debtItems, setDebtItems] = useState<ArchDebtItem[]>([]);
  const [debtOpen, setDebtOpen] = useState(true);

  const navigateFile = (path: string) => navigate(`/project-os?file=${encodeURIComponent(path)}`);
  const createHypothesis = (source: string, title: string) => navigate(`/hypothesis-gen?source=${encodeURIComponent(source)}&title=${encodeURIComponent(title)}`);

  // Parse DEBT_REPORT.md
  useEffect(() => {
    if (!attached) return;
    (async () => {
      try {
        const content = await workspaceService.readFile(DEBT_REPORT_PATH);
        setDebtItems(architectureReviewService.parseDebtReport(content));
      } catch (e) { console.warn('[ArchitectureReview] debt report load error:', e); }
    })();
  }, [attached]);

  const refreshTree = useCallback(async () => {
    setLoading(true);
    try {
      const nodes = await workspaceService.listTree();
      setTree(nodes);
    } finally {
      setLoading(false);
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
    } catch (e) { console.warn('[ArchitectureReview] attach error:', e); }
  };
  
  const handleDetach = () => {
    workspaceService.detach();
    setAttached(false);
    setWorkspaceName(null);
    setTree([]);
    setFindings([]);
  };

  const runAnalysis = useCallback(async () => {
    if (tree.length === 0) return;
    setScanning(true);
    setFindings([]);
    try {
      const result = await architectureReviewService.runFullAnalysis(tree, (path) =>
        workspaceService.readFile(path),
      );
      setFindings(result);
    } finally {
      setScanning(false);
    }
  }, [tree]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const grouped = useMemo(() => {
    let list = findings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.message.toLowerCase().includes(q) || f.file?.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    }
    const groups: Record<string, ArchFinding[]> = { error: [], warning: [], info: [] };
    for (const f of list) groups[f.type].push(f);
    return groups;
  }, [findings, searchQuery]);

  const typeColor = (type: string) => type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#60a5fa';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={20} color="#a855f7" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{t('arch_review.title')}</span>
        </div>
      </div>

      {!attached ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem', color: '#64748b' }}>
          <Zap size={48} opacity={0.3} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>No project attached</span>
          <span style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'center', maxWidth: 350 }}>
            Attach a project to analyze its architecture — file sizes, directory nesting, and structure stats.
          </span>
          <button onClick={handleAttach} style={{ padding: '0.75rem 1.5rem', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.5rem', border: 'none', background: '#a855f7', color: '#fff', cursor: 'pointer' }}>
            <FolderOpen size={18} /> Attach Project Folder
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <HardDrive size={14} color="#10b981" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workspaceName}</span>
            <button onClick={handleDetach} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Detach
            </button>
          </div>

          {/* Stats dashboard */}
          {findings.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {(['error', 'warning', 'info'] as const).map(t => (
                <div key={t} style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, background: `${typeColor(t)}08`, border: `1px solid ${typeColor(t)}15`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t === 'error' ? <AlertCircle size={14} color={typeColor(t)} /> : t === 'warning' ? <AlertTriangle size={14} color={typeColor(t)} /> : <Info size={14} color={typeColor(t)} />}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: typeColor(t) }}>{grouped[t].length}</div>
                  </div>
                </div>
              ))}
              <div style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} color="#a855f7" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categories</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a855f7' }}>{new Set(findings.map(f => f.category)).size}</div>
                </div>
              </div>
            </div>
          )}

          {/* Debt Report section */}
          {debtItems.length > 0 && (
            <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ marginBottom: '0.5rem', borderRadius: 10, border: '1px solid rgba(234,179,8,0.15)', overflow: 'hidden' }}>
                <div style={{ padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: 'rgba(234,179,8,0.05)' }}
                  onClick={() => setDebtOpen(v => !v)} onKeyDown={(e) => { if (e.key === 'Enter') setDebtOpen(v => !v); }} role="button" tabIndex={0}>
                  {debtOpen ? <ChevronDown size={12} color="#64748b" /> : <ChevronRight size={12} color="#64748b" />}
                  <FileWarning size={14} color="#f59e0b" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Debt Report</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{debtItems.filter(d => d.status === 'open').length} open</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                    {debtItems.filter(d => d.status === 'resolved').length > 0 && <CheckCircle2 size={12} color="#10b981" />}
                    <Circle size={12} color="#f59e0b" />
                  </span>
                </div>
                {debtOpen && debtItems.map((d, i) => (
                  <div key={d.id} style={{ padding: '0.5rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ fontSize: '0.6rem', color: '#475569', marginTop: 2, minWidth: 20 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 3,
                          background: d.priority === 'P0' ? 'rgba(239,68,68,0.15)' : d.priority === 'P1' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.1)',
                          color: d.priority === 'P0' ? '#ef4444' : d.priority === 'P1' ? '#f59e0b' : '#60a5fa',
                        }}>{d.priority}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1' }}>{d.id}: {d.title}</span>
                        {d.effort && <span style={{ fontSize: '0.62rem', color: '#64748b' }}>({d.effort})</span>}
                        <button onClick={() => createHypothesis(DEBT_REPORT_PATH, `${d.id}: ${d.title}`)}
                          style={{ marginLeft: 'auto', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a855f7', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Lightbulb size={10} /> Hypothesis
                        </button>
                      </div>
                      {d.description && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: 3 }}>{d.description}</div>}
                      {d.files.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {d.files.map(f => (
                            <span key={f} onClick={() => navigateFile(f)}
                              style={{ fontSize: '0.62rem', color: '#60a5fa', fontFamily: 'monospace', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(59,130,246,0.06)', cursor: 'pointer', borderBottom: '1px dashed rgba(59,130,246,0.2)' }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <button onClick={runAnalysis} disabled={scanning || tree.length === 0} style={{ padding: '0.55rem 1.1rem', borderRadius: 7, border: 'none', background: '#a855f7', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              {scanning ? <Loader2 size={14} /> : <Zap size={14} />}
              {scanning ? 'Scanning...' : 'Run Scan'}
            </button>
            <button onClick={refreshTree} style={{ padding: '0.55rem 0.9rem', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem' }}>
              Refresh
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.3)', borderRadius: 5, padding: '3px 7px' }}>
              <Search size={11} color="#64748b" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter..." style={{ width: 140, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.72rem' }} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={10} /></button>}
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}><Loader2 size={20} /></div>
            ) : findings.length === 0 && !scanning ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.85rem' }}>
                Run a scan to see architecture findings.
              </div>
            ) : scanning ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 8 }}><Loader2 size={18} /> <span>Analyzing project structure...</span></div>
            ) : (
              (['error', 'warning', 'info'] as const).map(type => {
                const items = grouped[type];
                if (items.length === 0) return null;
                const expanded = expandedCategories.has(type);
                return (
                  <div key={type} style={{ marginBottom: '0.6rem', borderRadius: 10, border: `1px solid ${typeColor(type)}15`, overflow: 'hidden' }}>
                    <div style={{ padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: `${typeColor(type)}06` }}
                      onClick={() => toggleCategory(type)} onKeyDown={(e) => { if (e.key === 'Enter') toggleCategory(type); }} role="button" tabIndex={0}>
                      {expanded ? <ChevronDown size={12} color="#64748b" /> : <ChevronRight size={12} color="#64748b" />}
                      {type === 'error' ? <AlertCircle size={14} color="#ef4444" /> : type === 'warning' ? <AlertTriangle size={14} color="#f59e0b" /> : <Info size={14} color="#60a5fa" />}
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: typeColor(type), textTransform: 'uppercase', letterSpacing: '0.03em' }}>{type}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{items.length} findings</span>
                    </div>
                    {expanded && items.map((f, i) => (
                      <div key={i} style={{ padding: '0.5rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ fontSize: '0.6rem', color: '#475569', marginTop: 2, minWidth: 20 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(255,255,255,0.04)' }}>{f.category}</span>
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{f.message}</span>
                          </div>
                          {f.file && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FileCode size={10} color="#60a5fa" />
                              <span onClick={() => navigateFile(f.file!)}
                                style={{ fontSize: '0.68rem', color: '#60a5fa', fontFamily: 'monospace', cursor: 'pointer', borderBottom: '1px dashed rgba(59,130,246,0.2)' }}>{f.file}</span>
                              {f.value && <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: 'auto' }}>{f.value}</span>}
                              <button onClick={() => createHypothesis(f.file!, f.message)}
                                style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', padding: '1px 4px', borderRadius: 3, fontSize: '0.62rem', opacity: 0.6 }}>
                                <Lightbulb size={10} />
                              </button>
                            </div>
                          )}
                          {/* Cycle path */}
                          {f.items && f.items.length > 1 && (
                            <div style={{ marginTop: 3, padding: '0.3rem 0.5rem', borderRadius: 5, background: 'rgba(239,68,68,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                {f.items.map((item, idx) => (
                                  <React.Fragment key={idx}>
                                    <span onClick={() => navigateFile(item)}
                                      style={{ fontSize: '0.62rem', color: '#94a3b8', fontFamily: 'monospace', cursor: 'pointer', borderBottom: '1px dashed rgba(148,163,184,0.2)' }}>{item.split('/').pop()}</span>
                                    {idx < f.items!.length - 1 && <ArrowRight size={10} color="#ef444460" />}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Duplicate pair */}
                          {f.items && f.items.length === 2 && f.category === 'Duplicate' && (
                            <div style={{ marginTop: 3, display: 'flex', gap: 4 }}>
                              {f.items.map((item, idx) => (
                                <span key={idx} onClick={() => navigateFile(item)}
                                  style={{ fontSize: '0.62rem', color: '#60a5fa', fontFamily: 'monospace', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(59,130,246,0.06)', cursor: 'pointer', borderBottom: '1px dashed rgba(59,130,246,0.2)' }}>
                                  {item.split('/').pop()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ArchitectureReview;
