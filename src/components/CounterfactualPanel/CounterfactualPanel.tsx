import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Zap, BarChart3, MessageSquare } from 'lucide-react'
import { causalTimelineService, counterfactualEngine, counterfactualExplanationService, counterfactualNarrativeService } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { CausalTraceEntry } from '../../kernel/contracts/causal-debugger';
import type { CounterfactualResult, CounterfactualOverride } from '../../kernel/contracts/counterfactual';
import type { DecisionExplanation } from '../../kernel/contracts/counterfactual-explanation';
import type { NarrativeExplanation } from '../../kernel/contracts/counterfactual-narrative';

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  padding: 16,
};

const PILL: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.15rem 0.4rem',
  borderRadius: 4,
  fontSize: '0.6rem',
  fontWeight: 600,
};



const RATE_PRESETS: CounterfactualOverride[] = [
  { global: { providerHealth: { groq: 'offline' } }, keys: {} },
  { global: { providerHealth: { gemini: 'offline' } }, keys: {} },
  { global: { providerHealth: { groq: 'degraded' } }, keys: {} },
  { global: { providerHealth: { nvidia: 'offline' } }, keys: {} },
];

const PRESET_LABELS = ['Groq offline', 'Gemini offline', 'Groq degraded', 'NVIDIA offline'];

const CounterfactualPanel: React.FC = () => {
  const [traces, setTraces] = useState<CausalTraceEntry[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<CausalTraceEntry | null>(null);
  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const explanation = useMemo<DecisionExplanation | null>(() => {
    if (!result) return null;
    try {
      return counterfactualExplanationService?.explain(result.original, result.simulated) ?? null;
    } catch { return null; }
  }, [result]);

  const narrative = useMemo<NarrativeExplanation | null>(() => {
    if (!explanation) return null;
    try {
      return counterfactualNarrativeService?.generate(explanation) ?? null;
    } catch { return null; }
  }, [explanation]);

  const refresh = useCallback(() => {
    try {
      setTraces(causalTimelineService?.listTraces(50) ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = eventBus.on(EVENTS.DECISION, refresh);
    return () => { unsub(); };
  }, [refresh]);

  const runCounterfactual = useCallback((trace: CausalTraceEntry, presetIndex: number | null) => {
    setSelectedTrace(trace);
    setActivePreset(presetIndex);
    try {
      const overrides = presetIndex !== null ? RATE_PRESETS[presetIndex] : { keys: {}, global: {} };
      const r = counterfactualEngine?.run({ baseTrace: trace, overrides, prompt: '' });
      setResult(r ?? null);
    } catch { setResult(null); }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', padding: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Zap size={20} color="#f59e0b" />
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Counterfactual Router</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{traces.length} traces available</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Trace list */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {traces.length === 0 && (
            <div style={{ ...CARD, textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.8rem' }}>
              No traces — make a request first
            </div>
          )}
          {traces.map(t => (
            <div key={t.causalId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => runCounterfactual(t, null)}
                style={{
                  ...CARD, padding: '0.4rem 0.75rem', cursor: 'pointer', textAlign: 'left', border: 'none',
                  background: selectedTrace?.causalId === t.causalId ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                  borderLeft: `3px solid ${selectedTrace?.causalId === t.causalId ? '#f59e0b' : 'transparent'}`,
                  transition: 'all 0.15s', fontSize: '0.75rem',
                }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                  {String(t.decision.selected) || '(none)'} ← {String(t.decision.strategy) || '?'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{t.causalId}</div>
              </button>
              {/* Override presets for this trace */}
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', paddingLeft: 8 }}>
                {PRESET_LABELS.map((label, i) => (
                  <button key={i} onClick={() => runCounterfactual(t, i)}
                    style={{
                      fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)',
                      background: activePreset === i && selectedTrace?.causalId === t.causalId ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: activePreset === i && selectedTrace?.causalId === t.causalId ? '#f59e0b' : '#64748b',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Result panel */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!result && (
            <div style={{ ...CARD, textAlign: 'center', padding: 32, color: '#64748b', fontSize: '0.8rem' }}>
              Select a trace and optional override preset to run a counterfactual simulation
            </div>
          )}

          {result && (
            <>
              {/* Summary */}
              <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 16 }}>
                {result.switchProvider ? (
                  <AlertTriangle size={20} color="#f59e0b" />
                ) : (
                  <CheckCircle2 size={20} color="#22c55e" />
                )}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
                    {result.switchProvider ? 'Provider Switch' : 'Same Provider'}
                  </div>
                  {result.switchReason && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{result.switchReason}</div>
                  )}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b' }}>
                  {result.meta.durationMs.toFixed(1)}ms
                </div>
              </div>

              {/* Provider comparison */}
              <div style={CARD}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Score Comparison
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.scoreDiffs.map(d => {
                    const deltaStr = `${d.delta > 0 ? '+' : ''}${d.delta.toFixed(3)}`;
                    const deltaColor = d.delta > 0.05 ? '#22c55e' : d.delta < -0.05 ? '#ef4444' : '#64748b';
                    const isSelectedOriginal = d.provider === result.original.selected;
                    const isSelectedSim = d.provider === result.simulated.selected;
                    return (
                      <div key={d.provider} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: '#e2e8f0', minWidth: 80 }}>{d.provider}</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, display: 'flex' }}>
                          <div style={{ width: `${Math.min(d.originalScore * 100, 100)}%`, height: '100%', background: '#3b82f6', borderRadius: 2, opacity: 0.6 }} />
                          <div style={{ width: `${Math.min(d.simulatedScore * 100, 100)}%`, height: '100%', background: deltaColor, borderRadius: 2, marginLeft: 2, opacity: 0.8 }} />
                        </div>
                        <span style={{ color: deltaColor, minWidth: 60, textAlign: 'right', fontFamily: 'monospace' }}>{deltaStr}</span>
                        {isSelectedOriginal && <span style={{ ...PILL, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>ORIG</span>}
                        {isSelectedSim && <span style={{ ...PILL, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>SIM</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overrides applied */}
              <div style={CARD}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Overrides Applied
                </div>
                <pre style={{ fontSize: '0.65rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>
                  {JSON.stringify(result.meta.overridesApplied, null, 2)}
                </pre>
              </div>

              {/* Narrative */}
              {narrative && (
                <div style={CARD}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <MessageSquare size={14} color="#60a5fa" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Causal Narrative
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: 4, background: narrative.confidence > 0.7 ? 'rgba(34,197,94,0.1)' : narrative.confidence > 0.4 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: narrative.confidence > 0.7 ? '#22c55e' : narrative.confidence > 0.4 ? '#f59e0b' : '#ef4444' }}>
                      conf {(narrative.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#e2e8f0', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                    {narrative.summary}
                  </p>
                  {narrative.causalChain.map((step, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '2px 0', paddingLeft: 12, borderLeft: '2px solid rgba(96,165,250,0.2)', marginBottom: 4 }}>
                      {step}
                    </div>
                  ))}
                </div>
              )}

              {/* Why it changed */}
              {explanation && explanation.switched && (
                <div style={CARD}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <BarChart3 size={14} color="#f59e0b" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Why it changed — Causal Attribution
                    </span>
                  </div>

                  {explanation.decisiveComponents.length > 0 && (
                    <>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Primary trigger</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#fbbf24', marginBottom: 8 }}>
                        {String(explanation.decisiveComponents[0].component)} ({explanation.decisiveComponents[0].provider}):
                        {' '}{explanation.decisiveComponents[0].contribution > 0 ? '+' : ''}{explanation.decisiveComponents[0].contribution.toFixed(3)}
                      </div>
                    </>
                  )}

                  {explanation.decisiveComponents.length > 1 && (
                    <>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Secondary</div>
                      {explanation.decisiveComponents.slice(1).map((dc, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', marginBottom: 2 }}>
                          {String(dc.component)} ({dc.provider}): {dc.contribution > 0 ? '+' : ''}{dc.contribution.toFixed(3)}
                        </div>
                      ))}
                    </>
                  )}

                  {explanation.providerExplanations.filter(pe => pe.componentDiffs.length > 0).map(pe => (
                    <div key={pe.provider} style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{pe.provider}</div>
                      {pe.componentDiffs
                        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                        .slice(0, 5)
                        .map(cd => {
                          const color = cd.delta > 0.01 ? '#22c55e' : cd.delta < -0.01 ? '#ef4444' : '#64748b';
                          return (
                            <div key={String(cd.component)} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontFamily: 'monospace' }}>
                              <span style={{ color: '#94a3b8' }}>{String(cd.component)}</span>
                              <span style={{ color }}>{cd.delta > 0 ? '+' : ''}{cd.delta.toFixed(3)}</span>
                            </div>
                          );
                        })}
                    </div>
                  ))}

                  <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Decision margin shift</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: explanation.marginShift > 0 ? '#22c55e' : explanation.marginShift < 0 ? '#ef4444' : '#64748b' }}>
                      {explanation.marginShift > 0 ? '+' : ''}{explanation.marginShift.toFixed(3)}
                      <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: '0.65rem' }}>
                        ({explanation.originalWinner} → {explanation.simulatedWinner})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CounterfactualPanel;
