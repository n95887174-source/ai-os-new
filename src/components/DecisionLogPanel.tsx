import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardList, Search, Download, Trash2, ChevronDown, ChevronRight, X, Loader2, Clock, DollarSign, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';
import { storageAdapter } from '../kernel/instances';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, textWhiteXs } from '../styles/common';
import { useConfirm } from '../hooks/useConfirm';

const STORAGE_KEY = 'provider_decisions_v1';
const MAX_DECISIONS = 500;

export interface ProviderDecisionEntry {
  id: string;
  timestamp: number;
  requestType: string;
  promptPreview: string;
  chosenProvider: string;
  chosenModel: string;
  chosenKeyId: string;
  reason: string;
  rejectedKeys: Array<{ provider: string; model: string; keyId: string; reason: string }>;
  latencyMs: number;
  estimatedCost: number;
  tokensEstimate: number;
  scoring: { reliability: number; latency: number; cost: number; ttft: number; tps: number };
  policyApplied: string[];
}

function loadFromStorage(): ProviderDecisionEntry[] {
  try {
    const raw = storageAdapter.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProviderDecisionEntry[]) : [];
  } catch { return []; }
}

const DecisionLogPanel: React.FC = () => {
  const { t } = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [decisions, setDecisions] = useState<ProviderDecisionEntry[]>([]);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(() => {
    setDecisions(loadFromStorage());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();
    setLoading(false);
    const interval = setInterval(refresh, 3000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  const handleExport = useCallback(() => {
    try {
      const json = JSON.stringify(decisions, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-log-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    } catch (err) {
      setError(String(err));
    }
  }, [decisions]);

  const handleClear = useCallback(async () => {
    if (!await confirm({ title: 'Clear Decision Log', message: t('decision_log.confirm_clear'), variant: 'danger' })) return;
    storageAdapter.removeItem(STORAGE_KEY);
    refresh();
  }, [refresh, t, confirm]);

  const filtered = decisions.filter(d => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!d.chosenProvider.toLowerCase().includes(q) &&
          !d.chosenModel.toLowerCase().includes(q) &&
          !d.promptPreview.toLowerCase().includes(q) &&
          !d.reason.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (providerFilter && d.chosenProvider !== providerFilter) return false;
    return true;
  });

  const allProviders = Array.from(new Set(decisions.map(d => d.chosenProvider))).sort();
  const totalCost = filtered.reduce((s, d) => s + d.estimatedCost, 0);
  const totalTokens = filtered.reduce((s, d) => s + d.tokensEstimate, 0);
  const avgLatency = filtered.length === 0 ? 0 : filtered.reduce((s, d) => s + d.latencyMs, 0) / filtered.length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', overflow: 'auto' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <ClipboardList size={26} color="#10b981" /> {t('decision_log.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('decision_log.subtitle', { count: decisions.length })}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleExport} disabled={decisions.length === 0} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: decisions.length === 0 ? '#475569' : '#94a3b8', cursor: decisions.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={12} /> {t('decision_log.export')}
          </button>
          <button onClick={handleClear} disabled={decisions.length === 0} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: decisions.length > 0 ? '#ef4444' : 'rgba(239,68,68,0.2)', color: '#fff', cursor: decisions.length > 0 ? 'pointer' : 'not-allowed', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={12} /> {t('decision_log.clear')}
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={errorContainer}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
        </motion.div>
      )}

      {decisions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <StatBox icon={<ClipboardList size={14} color="#10b981" />} label={t('decision_log.total_decisions')} value={filtered.length} color="#10b981" />
          <StatBox icon={<DollarSign size={14} color="#f59e0b" />} label={t('decision_log.total_cost')} value={`$${totalCost.toFixed(4)}`} color="#f59e0b" />
          <StatBox icon={<Zap size={14} color="#3b82f6" />} label={t('decision_log.total_tokens')} value={totalTokens.toLocaleString()} color="#3b82f6" />
          <StatBox icon={<Clock size={14} color="#a855f7" />} label={t('decision_log.avg_latency')} value={`${avgLatency.toFixed(0)}ms`} color="#a855f7" />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 8, color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('decision_log.search_placeholder')}
            style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 28px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
          />
        </div>
        <select
          value={providerFilter}
          onChange={e => setProviderFilter(e.target.value)}
          style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
        >
          <option value="">{t('decision_log.all_providers')}</option>
          {allProviders.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <AnimatePresence>
          {filtered.slice(0, MAX_DECISIONS).map(d => {
            const isExpanded = expandedId === d.id;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  style={{ padding: '0.5rem 0.75rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto auto', gap: 8, alignItems: 'center', cursor: 'pointer' }}
                >
                  {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ padding: '0.1rem 0.5rem', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', fontSize: '0.7rem', fontWeight: 600 }}>{d.chosenProvider}</span>
                      <span style={textWhiteXs}>{d.chosenModel}</span>
                    </div>
                    <div style={{ ...textMutedXs, marginTop: 2 }}>{d.promptPreview.slice(0, 80)}{d.promptPreview.length > 80 ? '...' : ''}</div>
                  </div>
                  <span style={textMutedXs}>{d.latencyMs}ms</span>
                  <span style={{ ...textSecondaryXs, color: '#fbbf24' }}>${d.estimatedCost.toFixed(4)}</span>
                  <span style={textMutedXs}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={textSecondaryXs}>{t('decision_log.reason')}</div>
                          <div style={{ ...textWhiteXs, fontSize: '0.85rem', marginTop: 4 }}>{d.reason}</div>
                          {d.policyApplied.length > 0 && (
                            <>
                              <div style={{ ...textSecondaryXs, marginTop: 12 }}>{t('decision_log.policies')}</div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                {d.policyApplied.map(p => (
                                  <span key={p} style={{ padding: '0.1rem 0.4rem', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontSize: '0.7rem' }}>{p}</span>
                                ))}
                              </div>
                            </>
                          )}
                          <div style={{ ...textSecondaryXs, marginTop: 12 }}>{t('decision_log.scoring')}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
                            <ScoreRow label="reliability" value={d.scoring.reliability} />
                            <ScoreRow label="latency" value={d.scoring.latency} />
                            <ScoreRow label="cost" value={d.scoring.cost} />
                            <ScoreRow label="ttft" value={d.scoring.ttft} />
                            <ScoreRow label="tps" value={d.scoring.tps} />
                          </div>
                        </div>
                        <div>
                          <div style={textSecondaryXs}>{t('decision_log.rejected', { count: d.rejectedKeys.length })}</div>
                          {d.rejectedKeys.length === 0 ? (
                            <div style={textMutedXs}>{t('decision_log.no_rejections')}</div>
                          ) : (
                            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflow: 'auto' }}>
                              {d.rejectedKeys.map((r, i) => (
                                <div key={i} style={{ padding: '0.3rem 0.5rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ ...textWhiteXs, fontSize: '0.75rem' }}>{r.provider} / {r.model}</div>
                                  <div style={{ ...textMutedXs, fontSize: '0.7rem' }}>{r.reason}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {decisions.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <ClipboardList size={48} color="#475569" />
            <p style={{ marginTop: '1rem' }}>{t('decision_log.empty')}</p>
            <p style={textMutedXs}>{t('decision_log.empty_hint')}</p>
          </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: `1px solid ${color}20`, background: `linear-gradient(145deg, ${color}05, rgba(0,0,0,0.2))` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>{icon}<span style={{ ...textMutedXs, fontSize: '0.65rem' }}>{label}</span></div>
    <div style={{ ...textWhiteXs, fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
  </div>
);

const ScoreRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
    <span style={{ color: '#94a3b8', minWidth: 60 }}>{label}</span>
    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value * 100}%`, background: value > 0.7 ? '#10b981' : value > 0.4 ? '#f59e0b' : '#ef4444' }} />
    </div>
    <span style={{ color: '#cbd5e1', minWidth: 30, textAlign: 'right' }}>{(value * 100).toFixed(0)}%</span>
  </div>
);

export default DecisionLogPanel;
