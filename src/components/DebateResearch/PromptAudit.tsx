import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, CheckCircle, Search, Thermometer, Wrench, X, ChevronDown, ChevronRight, Layers, Lightbulb, Target } from 'lucide-react';
import { promptAuditService } from '../../kernel/instances';
import type { AuditedAgentPrompt } from '../../kernel/contracts/prompt-audit';

const GROUP_COLORS: Record<string, string> = {
  Technical: '#3b82f6', Analytical: '#a855f7', Creative: '#f59e0b',
  Management: '#06b6d4', Specialized: '#10b981', Documentation: '#8b5cf6',
};

const STRATEGY_COLORS: Record<string, string> = {
  Critical: '#ef4444', Analytical: '#a855f7', Creative: '#f59e0b',
  Documentary: '#3b82f6', Managerial: '#06b6d4', General: '#64748b',
};

const GROUP_ORDER = ['Technical', 'Analytical', 'Creative', 'Management', 'Specialized', 'Documentation'];

const PromptAudit: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'temp' | 'words'>('name');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const report = useMemo(() => promptAuditService.buildAuditReport(), []);
  const agents = report.agents;

  const filtered = useMemo(() => {
    let list: AuditedAgentPrompt[] = agents;
    if (groupFilter !== 'all') list = list.filter(a => a.group === groupFilter);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      if (sortBy === 'temp') return b.temperature - a.temperature;
      if (sortBy === 'words') return b.wordCount - a.wordCount;
      return a.name.localeCompare(b.name);
    });
  }, [agents, search, sortBy, groupFilter]);

  const collisions = report.collisions;
  const avgWords = report.avgWords;
  const withToolsCount = report.withToolsCount;
  const withKeyTerms = report.withKeyTermsCount;
  const avgTemp = report.avgTemperature;
  const groupCounts = report.groupCounts;
  const strategyCounts = report.strategyCoverage;
  const suggestions = report.suggestions;

  const tempBuckets = useMemo(() => {
    const buckets = [
      { label: '0-0.2', min: 0, max: 0.2, agents: [] as string[], color: '#3b82f6' },
      { label: '0.2-0.4', min: 0.2, max: 0.4, agents: [] as string[], color: '#10b981' },
      { label: '0.4-0.6', min: 0.4, max: 0.6, agents: [] as string[], color: '#f59e0b' },
      { label: '0.6+', min: 0.6, max: 1, agents: [] as string[], color: '#ef4444' },
    ];
    for (const a of agents) {
      const b = buckets.find(b => a.temperature >= b.min && a.temperature < b.max) || buckets[buckets.length - 1];
      b.agents.push(a.name);
    }
    return buckets;
  }, [agents]);

  const mostCommonTools = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of agents) for (const t of a.tools) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [agents]);

  const suggestionTypeColor = (type: string) => type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#60a5fa';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={20} color="#3b82f6" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Prompt Audit</span>
          <span style={{ fontSize: '0.65rem', color: '#10b981' }}>{report.strategyCount} strategies</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>{agents.length}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Agents</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{avgWords}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Avg words</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{withToolsCount}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>With tools</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{withKeyTerms}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Constraints</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#a855f7' }}>{avgTemp.toFixed(2)}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Avg temp</div>
        </div>
      </div>

      {/* Temperature distribution */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Thermometer size={12} /> Temperature Distribution
        </div>
        <div style={{ display: 'flex', gap: 4, height: 24 }}>
          {tempBuckets.map(b => {
            const pct = agents.length > 0 ? (b.agents.length / agents.length) * 100 : 0;
            return (
              <div key={b.label} style={{ flex: `${pct}`, minWidth: pct > 0 ? 30 : 0, background: `${b.color}25`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${b.color}30`, position: 'relative' }} title={b.agents.join(', ')}>
                <span style={{ fontSize: '0.6rem', color: b.color, fontWeight: 700 }}>{b.label} ({b.agents.length})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Group distribution */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={12} /> Groups
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {GROUP_ORDER.filter(g => groupCounts[g]).map(g => {
            const pct = agents.length > 0 ? ((groupCounts[g] || 0) / agents.length) * 100 : 0;
            const color = GROUP_COLORS[g] || '#64748b';
            return (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.2rem 0.5rem', borderRadius: 5, background: `${color}10`, border: groupFilter === g ? `1px solid ${color}` : '1px solid transparent', cursor: 'pointer' }}
                onClick={() => setGroupFilter(groupFilter === g ? 'all' : g)}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{g}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{groupCounts[g]} ({Math.round(pct)}%)</span>
              </div>
            );
          })}
          {groupFilter !== 'all' && (
            <button onClick={() => setGroupFilter('all')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>Clear</button>
          )}
        </div>
      </div>

      {/* Most common tools */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wrench size={12} /> Most Used Tools
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {mostCommonTools.map(([tool, count]) => (
            <span key={tool} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 3, background: 'rgba(16,185,129,0.12)', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
              {tool} <span style={{ color: '#64748b', fontSize: '0.6rem' }}>{count}x</span>
            </span>
          ))}
        </div>
      </div>

      {/* Strategy distribution */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Target size={12} /> Strategy Distribution
        </div>
        <div style={{ display: 'flex', gap: 4, height: 22 }}>
          {Object.entries(strategyCounts).sort((a, b) => b[1] - a[1]).map(([strategy, count]) => {
            const pct = agents.length > 0 ? (count / agents.length) * 100 : 0;
            const color = STRATEGY_COLORS[strategy] || '#64748b';
            return (
              <div key={strategy} style={{ flex: `${pct}`, minWidth: pct > 5 ? 50 : 0, background: `${color}20`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
                <span style={{ fontSize: '0.55rem', color, fontWeight: 600 }}>{strategy} ({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ marginBottom: '0.3rem', borderRadius: 10, border: '1px solid rgba(245,158,11,0.12)', overflow: 'hidden' }}>
            <div style={{ padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: 'rgba(245,158,11,0.04)' }}
              onClick={() => setShowSuggestions(v => !v)} onKeyDown={(e) => { if (e.key === 'Enter') setShowSuggestions(v => !v); }} role="button" tabIndex={0}>
              {showSuggestions ? <ChevronDown size={12} color="#64748b" /> : <ChevronRight size={12} color="#64748b" />}
              <Lightbulb size={13} color="#f59e0b" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b' }}>Suggestions ({suggestions.length})</span>
            </div>
            {showSuggestions && suggestions.map((s, i) => (
              <div key={i} style={{ padding: '0.3rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={10} color={suggestionTypeColor(s.type)} />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>{s.agent}:</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '0.5rem 1.25rem', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '4px 8px' }}>
          <Search size={12} color="#64748b" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter agents..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.75rem' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={10} /></button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ padding: '0.3rem 0.5rem', borderRadius: 5, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.7rem', outline: 'none' }}>
          <option value="name">Name</option>
          <option value="temp">Temperature</option>
          <option value="words">Length</option>
        </select>
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 1.25rem' }}>
        {filtered.map(a => {
          const tempColor = a.temperature < 0.2 ? '#3b82f6' : a.temperature < 0.4 ? '#10b981' : a.temperature < 0.6 ? '#f59e0b' : '#ef4444';
          return (
            <div key={a.id} style={{ marginBottom: '0.4rem', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.3rem' }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: GROUP_COLORS[a.group] || '#64748b' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{a.name}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(255,255,255,0.04)' }}>{a.group}</span>
                <span style={{ fontSize: '0.62rem', color: tempColor, fontWeight: 600 }}>T:{a.temperature}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{a.wordCount}w</span>
                {a.hasTools && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{a.tools.length}t</span>}
                {a.hasKeyTerms && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>C</span>}
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>{a.prompt}</p>
            </div>
          );
        })}
      </div>

      {/* Collisions */}
      {collisions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.6rem 1.25rem', maxHeight: 150, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={12} /> {collisions.length} similar pairs ({'>'}50%)
            <button onClick={() => navigate(`/hypothesis-gen?source=${encodeURIComponent('src/kernel/state/topology-defaults.ts')}&title=${encodeURIComponent('Prompt collisions: ' + collisions.length + ' similar pairs')}`)}
              style={{ marginLeft: 'auto', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a855f7', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Lightbulb size={10} /> Hypothesis
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {collisions.map((c, i) => (
              <span key={i} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 3, background: 'rgba(245,158,11,0.08)', color: '#d4a04a' }}>
                {c.a} ↔ {c.b} ({c.similarity}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptAudit;
