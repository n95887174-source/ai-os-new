import React, { useState, useMemo, useCallback } from 'react';
import { Shield, Play, CheckCircle, AlertTriangle, XCircle, Loader2, Download, Search, X, Filter } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

interface TestScenario {
  name: string;
  description: string;
  category: string;
  policyViolated?: string;
  slaMode?: string;
  simulatedAction: string;
}

interface ScenarioResult {
  scenario: TestScenario;
  result: 'pass' | 'warn' | 'block';
  violatedRules: string[];
  suggestedMitigation: string;
}

const SCENARIOS: TestScenario[] = [
  { name: 'Excessive latency', description: 'Provider responds in 8s (SLA: 2s)', category: 'SLA', slaMode: 'LOW_LATENCY', simulatedAction: 'Provider latency 8000ms' },
  { name: 'High cost per request', description: 'Single request costs $0.50 (budget: $0.10)', category: 'Cost', policyViolated: 'cost', simulatedAction: 'Select expensive model' },
  { name: 'Privacy data leak', description: 'Agent tries to include PII in message', category: 'Privacy', policyViolated: 'privacy', simulatedAction: 'Send email with SSN' },
  { name: 'Rate limit burst', description: '50 requests in 1 second (limit: 10/s)', category: 'Rate Limit', policyViolated: 'rate_limit', simulatedAction: 'Burst 50 requests' },
  { name: 'Unsafe content output', description: 'Model generates harmful code', category: 'Safety', policyViolated: 'safety', simulatedAction: 'Generate exploit script' },
  { name: 'Content policy violation', description: 'Message contains prohibited terms', category: 'Content', policyViolated: 'content', simulatedAction: 'Post restricted content' },
  { name: 'ECONOMY mode cost breach', description: 'Request routed to premium model in ECONOMY mode', category: 'SLA', slaMode: 'ECONOMY', simulatedAction: 'Route to GPT-4' },
  { name: 'Auth token expiration', description: 'Expired API key used for request', category: 'Security', simulatedAction: 'Use expired key' },
  { name: 'Tool permission escalation', description: 'Agent tries to access filesystem tool without permission', category: 'Security', simulatedAction: 'Call readFile without access' },
  { name: 'Cross-agent prompt injection', description: 'Malicious input embedded in agent context', category: 'Safety', simulatedAction: 'Inject "ignore previous instructions"' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'SLA': '#06b6d4', 'Cost': '#f59e0b', 'Privacy': '#a855f7',
  'Rate Limit': '#3b82f6', 'Safety': '#ef4444', 'Content': '#f97316', 'Security': '#10b981',
};

function simulate(scenario: TestScenario): ScenarioResult {
  const rules: string[] = [];
  let result: 'pass' | 'warn' | 'block' = 'pass';
  if (scenario.policyViolated === 'cost') { rules.push('CostPolicy: max $0.10/request'); result = 'block'; }
  else if (scenario.policyViolated === 'privacy') { rules.push('PrivacyPolicy: PII must be masked'); result = 'block'; }
  else if (scenario.policyViolated === 'rate_limit') { rules.push('RateLimitPolicy: max 10 req/s'); result = 'warn'; }
  else if (scenario.policyViolated === 'safety') { rules.push('SafetyPolicy: harmful content blocked'); result = 'block'; }
  else if (scenario.policyViolated === 'content') { rules.push('ContentPolicy: prohibited terms detected'); result = 'warn'; }
  else if (scenario.slaMode === 'LOW_LATENCY') { rules.push('SLAPolicy: LOW_LATENCY mode max 2000ms'); result = 'block'; }
  else if (scenario.slaMode === 'ECONOMY') { rules.push('SLAPolicy: ECONOMY mode — premium models blocked'); result = 'warn'; }
  else if (scenario.category === 'Security') {
    rules.push('SecurityPolicy: auth required', 'ToolPolicy: permission check');
    result = scenario.name.includes('expir') ? 'warn' : 'block';
  }
  const mitigations: Record<string, string> = {
    'Excessive latency': 'Increase SLA timeout or switch provider',
    'High cost per request': 'Set cost cap or use ECONOMY mode routing',
    'Privacy data leak': 'Add PII detection middleware before agent output',
    'Rate limit burst': 'Implement client-side rate limiter with queue',
    'Unsafe content output': 'Enable content filter / safety guardrail',
    'Content policy violation': 'Add prohibited terms filter to input pipeline',
    'ECONOMY mode cost breach': 'Update SLA routing rules to enforce model tiers',
    'Auth token expiration': 'Add token refresh mechanism with pre-expiry check',
    'Tool permission escalation': 'Implement RBAC for tool execution permissions',
    'Cross-agent prompt injection': 'Add input sanitization and context boundary checks',
  };
  return { scenario, result, violatedRules: rules, suggestedMitigation: mitigations[scenario.name] || 'Review policy configuration' };
}

const GovStressTest: React.FC = () => {
  const { t } = useTranslation();
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [running, setRunning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const runAll = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      setResults(SCENARIOS.map(simulate));
      setRunning(false);
    }, 1000);
  }, []);

  const filtered = useMemo(() => {
    let list = results;
    if (categoryFilter !== 'all') list = list.filter(r => r.scenario.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.scenario.name.toLowerCase().includes(q) || r.scenario.description.toLowerCase().includes(q));
    }
    return list;
  }, [results, categoryFilter, searchQuery]);

  const summary = useMemo(() => {
    const passed = results.filter(r => r.result === 'pass').length;
    const warned = results.filter(r => r.result === 'warn').length;
    const blocked = results.filter(r => r.result === 'block').length;
    return { passed, warned, blocked, total: results.length };
  }, [results]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results) counts[r.scenario.category] = (counts[r.scenario.category] || 0) + 1;
    return counts;
  }, [results]);

  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ timestamp: Date.now(), summary, results }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `gov-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const iconForResult = (r: 'pass' | 'warn' | 'block') => {
    switch (r) {
      case 'pass': return <CheckCircle size={14} color="#10b981" />;
      case 'warn': return <AlertTriangle size={14} color="#f59e0b" />;
      case 'block': return <XCircle size={14} color="#ef4444" />;
    }
  };

  const badgeForResult = (r: 'pass' | 'warn' | 'block', color: string) => {
    const styles: Record<string, string> = {
      pass: '#10b981', warn: '#f59e0b', block: '#ef4444',
    };
    const c = styles[r];
    return <span style={{ padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: `${c}18`, color: c }}>{r}</span>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="#10b981" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Governance Stress Test</span>
          {results.length > 0 && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{summary.total} scenarios</span>}
        </div>
      </div>

      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={runAll} disabled={running} style={{ padding: '0.5rem 1.1rem', borderRadius: 7, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          {running ? <Loader2 size={14} /> : <Play size={14} />}
          {running ? 'Running...' : 'Run All'}
        </button>
        {summary.total > 0 && (
          <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem' }}>
            <span style={{ color: '#10b981' }}>{summary.passed} pass</span>
            <span style={{ color: '#f59e0b' }}>{summary.warned} warn</span>
            <span style={{ color: '#ef4444' }}>{summary.blocked} block</span>
          </div>
        )}
        {results.length > 0 && (
          <button onClick={exportReport} style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={12} /> Export
          </button>
        )}
      </div>

      {/* Summary bar */}
      {results.length > 0 && (
        <div style={{ padding: '0.4rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ height: 4, borderRadius: 2, display: 'flex', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
            {summary.total > 0 && (
              <>
                <div style={{ width: `${(summary.passed / summary.total) * 100}%`, background: '#10b981', transition: 'width 0.5s' }} />
                <div style={{ width: `${(summary.warned / summary.total) * 100}%`, background: '#f59e0b', transition: 'width 0.5s' }} />
                <div style={{ width: `${(summary.blocked / summary.total) * 100}%`, background: '#ef4444', transition: 'width 0.5s' }} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Category tabs */}
      {results.length > 0 && (
        <div style={{ padding: '0.4rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={11} color="#64748b" />
          <button onClick={() => setCategoryFilter('all')} style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: categoryFilter === 'all' ? 'rgba(100,116,139,0.2)' : 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}>All ({results.length})</button>
          {Object.keys(CATEGORY_COLORS).map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
              style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: categoryFilter === cat ? `${CATEGORY_COLORS[cat]}18` : 'transparent', color: categoryFilter === cat ? CATEGORY_COLORS[cat] : '#64748b', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}>
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '2px 6px' }}>
            <Search size={10} color="#64748b" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." style={{ width: 100, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.68rem' }} />
            {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={9} /></button>}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.85rem' }}>
            {running ? 'Simulating policy violations...' : 'Run governance stress tests to see results.'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: '0.8rem' }}>No matching scenarios</div>
        ) : (
          filtered.map((r, i) => (
            <div key={i} style={{ marginBottom: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: 9, background: 'rgba(0,0,0,0.2)', border: `1px solid ${r.result === 'pass' ? 'rgba(16,185,129,0.1)' : r.result === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.3rem' }}>
                {iconForResult(r.result)}
                {badgeForResult(r.result, r.result)}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{r.scenario.name}</span>
                <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: 3, background: `${(CATEGORY_COLORS[r.scenario.category] || '#64748b')}15` }}>{r.scenario.category}</span>
                <span style={{ fontSize: '0.6rem', color: '#475569', fontFamily: 'monospace' }}>{r.scenario.simulatedAction}</span>
              </div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', color: '#94a3b8' }}>{r.scenario.description}</p>
              {r.violatedRules.length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                  {r.violatedRules.map((rule, j) => (
                    <span key={j} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontFamily: 'monospace' }}>{rule}</span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.68rem', color: '#60a5fa' }}>→ {r.suggestedMitigation}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GovStressTest;
