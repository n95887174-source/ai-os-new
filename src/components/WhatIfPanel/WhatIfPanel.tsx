import React, { useState, useMemo } from 'react';
import { BarChart3, Plus, ArrowRight, DollarSign } from 'lucide-react';
import type { ApiKey } from '../../types/metrics';
import { whatIfService, type WhatIfScenario } from '../../services/WhatIfService';

interface WhatIfPanelProps {
  keys: ApiKey[];
}

const PROVIDERS = ['groq', 'google', 'openrouter', 'nvidia'];

const WhatIfPanel: React.FC<WhatIfPanelProps> = ({ keys }) => {
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]);
  const [selectedFrom, setSelectedFrom] = useState(PROVIDERS[0]);
  const [selectedTo, setSelectedTo] = useState(PROVIDERS[1]);
  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const scenarios = useMemo(() => {
    const results: WhatIfScenario[] = [];
    if (lastRun === 'add') results.push(whatIfService.analyzeAddKey(keys, selectedProvider));
    if (lastRun === 'switch') results.push(whatIfService.analyzeSwitchProvider(keys, selectedFrom, selectedTo));
    return results;
  }, [keys, selectedProvider, selectedFrom, selectedTo, lastRun]);

  const displayScenario = scenario || scenarios[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BarChart3 size={18} color="#f59e0b" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>What-If Analysis</h3>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Simulate changes before applying</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={14} color="#10b981" /> Add Another Key
          </div>
          <select
            value={selectedProvider}
            onChange={e => { setSelectedProvider(e.target.value); setLastRun(null); setScenario(null); }}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', marginBottom: '0.5rem', outline: 'none' }}
          >
            {PROVIDERS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <button
            onClick={() => { setLastRun('add'); setScenario(whatIfService.analyzeAddKey(keys, selectedProvider)); }}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
          >
            Analyze
          </button>
        </div>

        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRight size={14} color="#f59e0b" /> Switch Provider
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <select
              value={selectedFrom}
              onChange={e => setSelectedFrom(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', outline: 'none' }}
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <ArrowRight size={16} color="#64748b" style={{ alignSelf: 'center' }} />
            <select
              value={selectedTo}
              onChange={e => setSelectedTo(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', outline: 'none' }}
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setLastRun('switch'); setScenario(whatIfService.analyzeSwitchProvider(keys, selectedFrom, selectedTo)); }}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
          >
            Analyze
          </button>
        </div>
      </div>

      {displayScenario && (
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderLeft: `4px solid #f59e0b` }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>{displayScenario.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '0.75rem' }}>{displayScenario.description}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
            {displayScenario.impact.dailyLimitIncrease > 0 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Daily Limit ↑</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>+{displayScenario.impact.dailyLimitIncrease.toLocaleString()}</div>
              </div>
            )}
            {displayScenario.impact.probability429Reduction !== 0 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>429 Risk ↓</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: displayScenario.impact.probability429Reduction > 0 ? '#10b981' : '#ef4444' }}>
                  {displayScenario.impact.probability429Reduction > 0 ? '-' : '+'}{Math.abs(displayScenario.impact.probability429Reduction)}%
                </div>
              </div>
            )}
            {displayScenario.impact.costChange !== 0 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Cost Change</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: displayScenario.impact.costChange > 0 ? '#ef4444' : '#10b981' }}>
                  {displayScenario.impact.costChange > 0 ? '+' : ''}{displayScenario.impact.costChange.toFixed(1)}%
                </div>
              </div>
            )}
            <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Latency</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>{displayScenario.impact.latencyImpact}</div>
            </div>
          </div>
        </div>
      )}

      {!displayScenario && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
          Select a scenario above and click Analyze to see projected impact.
        </div>
      )}
    </div>
  );
};

export default WhatIfPanel;
