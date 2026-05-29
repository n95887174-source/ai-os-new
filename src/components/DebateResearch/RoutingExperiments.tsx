import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Route, Play, Download, ArrowUp, ArrowDown, Loader2, X, Clock, History, ChevronDown, ChevronRight, Trash2, BarChart3, Zap, Lightbulb, Target, CheckCircle, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import { adapterRegistry } from '../../kernel/instances';
import { dexieDb } from '../../core/DatabaseService';

interface ExperimentResult {
  provider: string;
  model: string;
  strategy: string;
  avgLatency: number;
  avgTokens: number;
  errorRate: number;
  cost: number;
  repetition: number;
  uniqueness: number;
}

interface ExperimentRun {
  id: string;
  timestamp: number;
  providers: string[];
  models: string[];
  strategies: string[];
  runsPerCell: number;
  totalRuns: number;
  results: ExperimentResult[];
  estimatedCost: number;
  realMode: boolean;
}

const STRATEGIES = ['round-robin', 'latency-first', 'cost-first', 'random'];
const STORAGE_KEY = 'routing_experiment_history';

function generateMockResults(providers: string[], models: string[], strategies: string[], seed?: number): ExperimentResult[] {
  const results: ExperimentResult[] = [];
  let s = seed || Date.now();
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (const p of providers) {
    for (const m of models) {
      for (const st of strategies) {
        const latency = Math.round(200 + rng() * 3000);
        results.push({
          provider: p, model: m, strategy: st,
          avgLatency: latency,
          avgTokens: Math.round(100 + rng() * 900),
          errorRate: Math.round(rng() * 30) / 100,
          cost: Math.round((rng() * 5 + 0.1) * 100) / 100,
          repetition: Math.round(rng() * 40) / 100,
          uniqueness: Math.round((30 + rng() * 70) * 100) / 100,
        });
      }
    }
  }
  return results;
}

function computeComparison(results: ExperimentResult[]): { strategy: string; avgLatency: number; avgCost: number; avgErrorRate: number; avgUniqueness: number }[] {
  const grouped: Record<string, ExperimentResult[]> = {};
  for (const r of results) {
    if (!grouped[r.strategy]) grouped[r.strategy] = [];
    grouped[r.strategy].push(r);
  }
  return Object.entries(grouped).map(([strategy, items]) => ({
    strategy,
    avgLatency: Math.round(items.reduce((s, r) => s + r.avgLatency, 0) / items.length),
    avgCost: Math.round(items.reduce((s, r) => s + r.cost, 0) / items.length * 1000) / 1000,
    avgErrorRate: Math.round(items.reduce((s, r) => s + r.errorRate, 0) / items.length * 100) / 100,
    avgUniqueness: Math.round(items.reduce((s, r) => s + r.uniqueness, 0) / items.length),
  }));
}

const RoutingExperiments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(['round-robin']);
  const [runsPerCell, setRunsPerCell] = useState(3);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [running, setRunning] = useState(false);
  const [sortCol, setSortCol] = useState('avgLatency');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [history, setHistory] = useState<ExperimentRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [realMode, setRealMode] = useState(false);
  const [realProgress, setRealProgress] = useState('');

  const providers = useMemo(() => adapterRegistry.getAllProviders(), []);
  const models = useMemo(() => ['llama-3.3-70b', 'gemini-2.0-flash', 'mixtral-8x7b', 'gpt-4o-mini', 'qwen-2.5-7b', 'llama-3.1-8b'], []);

  useEffect(() => {
    setSelectedProviders([providers[0] || 'Groq']);
    setSelectedModels([models[0]]);
  }, [providers, models]);

  useEffect(() => {
    dexieDb.keyValue.get(STORAGE_KEY).then((record: unknown) => {
      const data = record as { value: ExperimentRun[] } | undefined;
      if (data?.value) setHistory(data.value);
    });
  }, []);

  const persistHistory = useCallback(async (runs: ExperimentRun[]) => {
    setHistory(runs);
    await dexieDb.keyValue.put({ id: STORAGE_KEY, value: runs });
  }, []);

  const estimatedCost = useMemo(() => {
    return selectedProviders.length * selectedModels.length * selectedStrategies.length * runsPerCell * 0.02;
  }, [selectedProviders, selectedModels, selectedStrategies, runsPerCell]);

  const totalRuns = useMemo(() => {
    return selectedProviders.length * selectedModels.length * selectedStrategies.length * runsPerCell;
  }, [selectedProviders, selectedModels, selectedStrategies, runsPerCell]);

  const toggleSelection = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const runExperiment = useCallback(async () => {
    if (selectedProviders.length === 0 || selectedModels.length === 0 || selectedStrategies.length === 0) return;
    setRunning(true);
    setResults([]);

    let newResults: ExperimentResult[];

    if (realMode) {
      newResults = [];
      const testPrompt = 'Reply only: OK';
      for (const p of selectedProviders) {
        for (const m of selectedModels) {
          const adapter = adapterRegistry.getAdapter(p);
          if (!adapter) { setRealProgress(`${p}: no adapter`); continue; }
          for (const st of selectedStrategies) {
            setRealProgress(`${p}/${m}/${st}...`);
            const latencies: number[] = [];
            const errors: number[] = [];
            for (let i = 0; i < runsPerCell; i++) {
              const start = Date.now();
              try {
                const resp = await adapter.sendMessage([{ role: 'user', content: testPrompt }], m, '', undefined, undefined);
                latencies.push(Date.now() - start);
                if (!resp.content) errors.push(1);
              } catch {
                errors.push(1);
                latencies.push(Date.now() - start);
              }
            }
            newResults.push({
              provider: p, model: m, strategy: st,
              avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
              avgTokens: 10,
              errorRate: errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0,
              cost: 0,
              repetition: 0,
              uniqueness: 100,
            });
          }
        }
      }
    } else {
      newResults = generateMockResults(selectedProviders, selectedModels, selectedStrategies);
    }

    setResults(newResults);
    const run: ExperimentRun = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      providers: [...selectedProviders],
      models: [...selectedModels],
      strategies: [...selectedStrategies],
      runsPerCell,
      totalRuns: totalRuns,
      results: newResults,
      estimatedCost,
      realMode,
    };
    persistHistory([run, ...history]);
    setRunning(false);
    setRealProgress('');
  }, [selectedProviders, selectedModels, selectedStrategies, runsPerCell, estimatedCost, totalRuns, history, persistHistory, realMode]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const aVal = a[sortCol as keyof ExperimentResult] as number;
      const bVal = b[sortCol as keyof ExperimentResult] as number;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [results, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ config: { providers: selectedProviders, models: selectedModels, strategies: selectedStrategies, runsPerCell, realMode }, results }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `routing-experiment-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const comparison = useMemo(() => results.length > 0 ? computeComparison(results) : [], [results]);

  const loadExperiment = (run: ExperimentRun) => {
    setResults(run.results);
    setRealMode(run.realMode);
    setShowHistory(false);
  };

  const deleteExperiment = (id: string) => {
    persistHistory(history.filter(h => h.id !== id));
  };

  const chipStyle = (selected: boolean, color: string): React.CSSProperties => ({
    padding: '0.25rem 0.55rem', borderRadius: 5, border: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`,
    background: selected ? `${color}18` : 'transparent', color: selected ? color : '#64748b',
    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
  });

  const thStyle: React.CSSProperties = {
    padding: '0.35rem 0.55rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.3rem 0.55rem', fontSize: '0.72rem', color: '#cbd5e1', textAlign: 'right', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Route size={20} color="#f59e0b" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Routing Experiments</span>
          {history.length > 0 && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{history.length} saved</span>}
        </div>
        <button onClick={() => setShowHistory(!showHistory)} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} /> History
        </button>
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', maxHeight: 180, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>Past Experiments</div>
          {history.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.3rem 0.5rem', borderRadius: 5, marginBottom: 2, cursor: 'pointer', background: results === h.results ? 'rgba(245,158,11,0.08)' : 'transparent' }}
              onClick={() => loadExperiment(h)} onKeyDown={(e) => { if (e.key === 'Enter') loadExperiment(h); }} role="button" tabIndex={0}>
              <BarChart3 size={12} color="#f59e0b" />
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{new Date(h.timestamp).toLocaleString()}</span>
              <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{h.totalRuns} runs</span>
              {h.realMode && <Cpu size={10} color="#a855f7" />}
              <span style={{ fontSize: '0.62rem', color: '#64748b' }}>${h.estimatedCost.toFixed(2)}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteExperiment(h.id); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Config */}
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Providers</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {providers.map(p => <button key={p} onClick={() => toggleSelection(p, selectedProviders, setSelectedProviders)} style={chipStyle(selectedProviders.includes(p), '#f59e0b')}>{p}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Models</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {models.map(m => <button key={m} onClick={() => toggleSelection(m, selectedModels, setSelectedModels)} style={chipStyle(selectedModels.includes(m), '#3b82f6')}>{m}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strategies</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {STRATEGIES.map(s => <button key={s} onClick={() => toggleSelection(s, selectedStrategies, setSelectedStrategies)} style={chipStyle(selectedStrategies.includes(s), '#10b981')}>{s}</button>)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Runs/cell:</span>
            <input type="number" min={1} max={10} value={runsPerCell} onChange={e => setRunsPerCell(Math.max(1, Math.min(10, Number(e.target.value))))} style={{ width: 45, padding: '0.25rem 0.4rem', borderRadius: 5, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: '0.75rem', textAlign: 'center' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{totalRuns} runs, ~${estimatedCost.toFixed(2)} est.</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: realMode ? '#a855f7' : '#64748b', cursor: 'pointer' }}>
            <input type="checkbox" checked={realMode} onChange={e => setRealMode(e.target.checked)} style={{ accentColor: '#a855f7' }} />
            <Cpu size={11} /> Real LLM
          </label>
          <button onClick={runExperiment} disabled={running || totalRuns === 0} style={{ marginLeft: 'auto', padding: '0.5rem 1.1rem', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#1e293b', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            {running ? <Loader2 size={14} /> : <Play size={14} />}
            {running ? (realProgress || 'Running...') : 'Run'}
          </button>
        </div>
      </div>

      {/* Strategy comparison */}
      {comparison.length > 1 && (
        <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Target size={12} /> Strategy Comparison
            <button onClick={() => navigate(`/hypothesis-gen?source=${encodeURIComponent('routing-experiments')}&title=${encodeURIComponent('Routing experiment: ' + comparison.length + ' strategies compared')}`)}
              style={{ marginLeft: 'auto', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a855f7', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Lightbulb size={10} /> Hypothesis
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {comparison.map(c => {
              const bestLatency = Math.min(...comparison.map(x => x.avgLatency));
              const bestCost = Math.min(...comparison.map(x => x.avgCost));
              const bestError = Math.min(...comparison.map(x => x.avgErrorRate));
              const bestUniqueness = Math.max(...comparison.map(x => x.avgUniqueness));
              const isBestLatency = c.avgLatency === bestLatency;
              const isBestCost = c.avgCost === bestCost;
              const isBestError = c.avgErrorRate === bestError;
              const isBestUnique = c.avgUniqueness === bestUniqueness;
              const score = (isBestLatency ? 1 : 0) + (isBestCost ? 1 : 0) + (isBestError ? 1 : 0) + (isBestUnique ? 1 : 0);
              return (
                <div key={c.strategy} style={{ flex: 1, padding: '0.5rem 0.65rem', borderRadius: 8, background: score >= 2 ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.2)', border: `1px solid ${score >= 2 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: score >= 2 ? '#34d399' : '#94a3b8' }}>{c.strategy}</span>
                    {score >= 2 && <CheckCircle size={10} color="#10b981" />}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: isBestLatency ? '#10b981' : '#64748b' }}>Latency: {c.avgLatency}ms{isBestLatency ? ' ✓' : ''}</div>
                  <div style={{ fontSize: '0.62rem', color: isBestCost ? '#10b981' : '#64748b' }}>Cost: ${c.avgCost.toFixed(3)}{isBestCost ? ' ✓' : ''}</div>
                  <div style={{ fontSize: '0.62rem', color: isBestError ? '#10b981' : '#64748b' }}>Error: {(c.avgErrorRate * 100).toFixed(0)}%{isBestError ? ' ✓' : ''}</div>
                  <div style={{ fontSize: '0.62rem', color: isBestUnique ? '#10b981' : '#64748b' }}>Unique: {c.avgUniqueness}%{isBestUnique ? ' ✓' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem 1.25rem' }}>
        {sortedResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
            {running ? 'Running experiment cells...' : 'Select providers, models, and strategies, then run.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Provider</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Model</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Strategy</th>
                {['avgLatency', 'avgTokens', 'errorRate', 'cost', 'repetition', 'uniqueness'].map(col => (
                  <th key={col} onClick={() => toggleSort(col)} style={thStyle}>
                    {col === 'avgLatency' ? 'Latency' : col === 'avgTokens' ? 'Tokens' : col === 'errorRate' ? 'Error%' : col === 'cost' ? 'Cost' : col === 'repetition' ? 'Rep%' : 'Unique%'}
                    {sortCol === col && (sortDir === 'asc' ? <ArrowUp size={9} style={{ marginLeft: 1, display: 'inline' }} /> : <ArrowDown size={9} style={{ marginLeft: 1, display: 'inline' }} />)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'transparent' }}>
                  <td style={{ ...tdStyle, textAlign: 'left', color: '#f59e0b' }}>{r.provider}</td>
                  <td style={{ ...tdStyle, textAlign: 'left', color: '#60a5fa' }}>{r.model}</td>
                  <td style={{ ...tdStyle, textAlign: 'left', color: '#94a3b8' }}>{r.strategy}</td>
                  <td style={tdStyle}>{r.avgLatency}ms</td>
                  <td style={tdStyle}>{r.avgTokens}</td>
                  <td style={{ ...tdStyle, color: r.errorRate > 0.2 ? '#ef4444' : '#10b981' }}>{(r.errorRate * 100).toFixed(0)}%</td>
                  <td style={tdStyle}>${r.cost.toFixed(3)}</td>
                  <td style={{ ...tdStyle, color: r.repetition > 0.3 ? '#ef4444' : '#10b981' }}>{(r.repetition * 100).toFixed(0)}%</td>
                  <td style={tdStyle}>{r.uniqueness}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sortedResults.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.6rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={exportJson} style={{ padding: '0.4rem 0.9rem', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={12} /> Export JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default RoutingExperiments;