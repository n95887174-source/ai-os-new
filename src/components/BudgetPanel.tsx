import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, AlertTriangle, Loader2, X, BarChart3, TrendingUp, Users, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { budgetService } from '../kernel/instances';
import type { SpendSummary, BudgetAlert } from '../kernel/contracts/budget';
import { useTranslation } from '../i18n/useTranslation';
import { useAutoClearError } from '../hooks/useAutoClearError';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, textWhiteXs, flexBetween, button, buttonSm, input, selectBase, badge } from '../styles/common';

const fmtUSD = (v: number, locale: string): string => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: 'USD' }).format(v);

const BudgetPanel: React.FC = () => {
  const { t, lang } = useTranslation();
  const [summary, setSummary] = useState<SpendSummary | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const clearError = useAutoClearError(setError);

  const load = useCallback(() => {
    try {
      const s = budgetService.getSpendSummary();
      const a = budgetService.getAlerts();
      if (isMountedRef.current) {
        setSummary(s);
        setAlerts(a);
      }
    } catch {
      if (isMountedRef.current) setError(t('budget.error_load'));
    }
    if (isMountedRef.current) setLoading(false);
  }, [t]);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    const interval = setInterval(load, 30000);
    return () => { isMountedRef.current = false; clearInterval(interval); };
  }, [load]);

  const handleClearAlerts = () => {
    try {
      budgetService.clearAlerts();
      setAlerts([]);
    } catch {
      setError(t('budget.error_clear'));
      clearError();
    }
  };

  const usageColor = (pct: number) => {
    if (pct >= 90) return '#ef4444';
    if (pct >= 75) return '#f59e0b';
    if (pct >= 50) return '#3b82f6';
    return '#10b981';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={20} /> {t('common.loading')}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <DollarSign size={28} color="#10b981" /> {t('budget.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('budget.subtitle')}</p>
        </div>
        {alerts.length > 0 && (
          <button onClick={handleClearAlerts} style={{ ...buttonSm, background: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={14} /> {t('budget.clear_alerts')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={errorContainer}>
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {!summary ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
          <BarChart3 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#94a3b8' }}>{t('budget.empty')}</div>
          <div>{t('budget.empty_desc')}</div>
        </div>
      ) : (
        <>
          {/* Global Budget */}
          <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <TrendingUp size={18} color="#10b981" />
              <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{t('budget.global_section')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <StatCard label={t('budget.budget')} value={fmtUSD(summary.global.budget, lang)} color="#10b981" />
              <StatCard label={t('budget.spent')} value={fmtUSD(summary.global.spent, lang)} color="#f59e0b" />
              <StatCard label={t('budget.remaining')} value={fmtUSD(summary.global.remaining, lang)} color={summary.global.remaining > 0 ? '#3b82f6' : '#ef4444'} />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                <span>{t('budget.usage')}</span>
                <span>{summary.global.pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(summary.global.pct, 100)}%`, background: usageColor(summary.global.pct), transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>

          {/* Per-Provider */}
          {summary.providers.length > 0 && (
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <Shield size={18} color="#a855f7" />
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{t('budget.providers_section')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {summary.providers.map(p => (
                  <div key={p.provider} style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0' }}>{p.provider}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{fmtUSD(p.spent, lang)} / {fmtUSD(p.budget, lang)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      <span>{t('budget.remaining')}: {fmtUSD(p.remaining, lang)}</span>
                      <span>{p.pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(p.pct, 100)}%`, background: usageColor(p.pct), transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-Agent */}
          {summary.agents.length > 0 && (
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <Users size={18} color="#3b82f6" />
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{t('budget.agents_section')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {summary.agents.map(a => (
                  <div key={a.agentId} style={{ padding: '0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: '#e2e8f0' }}>{a.name || a.agentId}</span>
                      <span style={{ color: '#94a3b8' }}>{fmtUSD(a.spent, lang)} / {fmtUSD(a.budget, lang)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', marginTop: '0.3rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(a.pct, 100)}%`, background: usageColor(a.pct), transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <AlertTriangle size={18} color="#ef4444" />
                <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: '1rem' }}>{t('budget.alerts_section')} ({alerts.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {alerts.slice(0, 20).map((alert, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(239,68,68,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ padding: '0.1rem 0.3rem', borderRadius: 3, fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', marginRight: 6 }}>
                        {alert.type}
                      </span>
                      <span style={{ color: '#e2e8f0' }}>{alert.message}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {alert.current.toFixed(2)}/{alert.limit.toFixed(2)} ({alert.level}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {t('budget.footer', { alerts: alerts.length })}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{value}</div>
  </div>
);

export default BudgetPanel;
