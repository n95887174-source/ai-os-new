import React, { useEffect, useState, useMemo } from 'react';
import { GitBranch, ArrowRight, Activity, Zap, Server, Shield, Wifi, Layers, Box, Search } from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import type { ApiKey, DecisionTrace } from '../../types/metrics';
import { eventBus } from '../../core/events';
import { keyService } from '../../services/KeyService';

interface RoutingIntelligenceViewProps {
  keys: ApiKey[];
}

const CLASSIFICATIONS = [
  { type: 'simple', desc: 'Simple Q&A / short prompts → Groq/Gemini Flash', icon: <Zap size={14} />, color: '#10b981' },
  { type: 'medium', desc: 'Analysis / summarization → Groq Llama 3.3 70B', icon: <Activity size={14} />, color: '#3b82f6' },
  { type: 'complex_code', desc: 'Code generation / debugging → Gemini Pro', icon: <Layers size={14} />, color: '#8b5cf6' },
  { type: 'complex_general', desc: 'Complex reasoning → OpenRouter Claude 3.5', icon: <GitBranch size={14} />, color: '#f59e0b' },
  { type: 'long_context', desc: 'Long documents (1M+) → Gemini', icon: <Server size={14} />, color: '#06b6d4' },
  { type: 'multimodal', desc: 'Images / audio / video → Gemini Vision', icon: <Wifi size={14} />, color: '#ec4899' },
];

const RoutingIntelligenceView: React.FC<RoutingIntelligenceViewProps> = ({ keys }) => {
  const [decisions, setDecisions] = useState<DecisionTrace[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = eventBus.on('system:decision', (trace) => {
      setDecisions(prev => [trace, ...prev].slice(0, 100));
    });
    return unsub;
  }, []);

  const filteredDecisions = useMemo(() => {
    if (!searchQuery.trim()) return decisions;
    const q = searchQuery.toLowerCase();
    return decisions.filter(d =>
      d.finalProvider?.toLowerCase().includes(q) ||
      d.strategy?.toLowerCase().includes(q) ||
      d.explanation?.toLowerCase().includes(q)
    );
  }, [decisions, searchQuery]);

  const activeKeys = keys.filter(k => k.status === 'active');
  const currentSLA = keyService['_globalSLAMode'] || 'BALANCED';
  const latencyThreshold = keyService['_latencyThreshold'] || 1500;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <GitBranch size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>Decision Flow</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['Request', 'Classify', 'Pool', 'Provider', 'Key'].map((step, i, arr) => (
              <React.Fragment key={step}>
                <div style={{ padding: '0.5rem 1rem', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 700 }}>
                  {step}
                </div>
                {i < arr.length - 1 && <ArrowRight size={16} color="#64748b" />}
              </React.Fragment>
            ))}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <strong style={{ color: '#e2e8f0' }}>Current Mode:</strong> {currentSLA} &middot; 
            <strong style={{ color: '#e2e8f0', marginLeft: '0.5rem' }}>Latency Threshold:</strong> {latencyThreshold}ms &middot;
            <strong style={{ color: '#e2e8f0', marginLeft: '0.5rem' }}>Active Keys:</strong> {activeKeys.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Search size={18} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>Request Classifier</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {CLASSIFICATIONS.map(c => (
              <div key={c.type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                <span style={{ color: c.color }}>{c.icon}</span>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color="#a855f7" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>Recent Routing Decisions</h3>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({filteredDecisions.length})</span>
          </div>
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter decisions..."
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              aria-label="Filter routing decisions"
            />
          </div>
        </div>

        {filteredDecisions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredDecisions.slice(0, 20).map((d, i) => {
              const isSelected = selectedDecision === i;
              return (
                <div
                  key={`${i}-${d.timestamp}`}
                  onClick={() => setSelectedDecision(isSelected ? null : i)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.15)',
                    border: `1px solid ${isSelected ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.03)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', flexShrink: 0 }}>
                        {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : '--'}
                      </span>
                      {d.finalProvider && (
                        <ProviderIcon provider={d.finalProvider} size={14} />
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.finalProvider || 'unknown'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{d.strategy}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: d.success ? '#10b981' : '#ef4444', fontWeight: 700, flexShrink: 0 }}>
                      {d.success ? 'OK' : 'FAIL'}
                    </span>
                  </div>
                  {isSelected && d.explanation && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      {d.explanation}
                      {d.latency && <span style={{ display: 'block', marginTop: '0.25rem' }}>Latency: {Math.round(d.latency)}ms</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
            No routing decisions recorded yet. Send a chat request to see routing intelligence in action.
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutingIntelligenceView;
