import React, { useState, useRef, useCallback } from 'react';
import { BookText, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, Shield, Wrench, Search, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { consistencyChecker, consistencyHealingPipeline } from '../kernel/instances';
import type { ConsistencyReport, ConsistencyCheckItem, HealingPlan } from '../kernel/instances';
import { eventBus } from '../kernel/events/event-bus';
import { useTranslation } from '../i18n/useTranslation';
import { useAutoClearError } from '../hooks/useAutoClearError';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, textWhiteXs, textSm, flexBetween, button, buttonSm, badge } from '../styles/common';

const DOC_FILES = [
  'docs/00-overview.md', 'docs/01-system-architecture.md', 'docs/02-core-concepts.md',
  'docs/03-cognitive-layers.md', 'docs/04-behavior-modifiers.md', 'docs/05-metrics-system.md',
  'docs/06-interpretation-engine.md', 'docs/07-ui-layer.md', 'docs/08-data-flow.md',
  'docs/09-design-principles.md', 'docs/10-experiments-framework.md', 'docs/events.md',
  'docs/STRUCTURE.md', 'docs/SERVICES_RU.md', 'docs/01-system-architecture_RU.md',
  'docs/02-core-concepts_RU.md', 'docs/03-cognitive-layers_RU.md', 'docs/04-behavior-modifiers_RU.md',
  'docs/05-metrics-system_RU.md', 'docs/06-interpretation-engine_RU.md', 'docs/07-ui-layer_RU.md',
  'docs/08-data-flow_RU.md', 'docs/09-design-principles_RU.md', 'docs/10-experiments-framework_RU.md',
  'docs/00-overview_RU.md', 'docs/SYSTEM_MANIFEST.md', 'docs/SYSTEM_MANIFEST_RU.md',
  'docs/SYSTEM_PASSPORT.md', 'docs/COGNITIVE_RUNTIME_SPEC.md',
  'docs/ПОЛНЫЙ_РЕЕСТР.md', 'docs/ДЛЯ_ДЕДУШКИ.md', 'docs/DEBT_REPORT.md', 'docs/BACKLOG_UI.md',
];

const DocsHealthPanel: React.FC = () => {
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [plan, setPlan] = useState<HealingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [healing, setHealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const isMountedRef = useRef(true);
  const clearError = useAutoClearError(setError);

  const loadLastReport = useCallback(() => {
    try {
      const last = consistencyChecker.getLastReport();
      if (last) setReport(last);
      const lastPlan = consistencyHealingPipeline.getPlan();
      if (lastPlan) setPlan(lastPlan);
    } catch { /* noop */ }
  }, []);

  const fetchDocs = async (): Promise<Record<string, string>> => {
    const contents: Record<string, string> = {};
    for (const file of DOC_FILES) {
      try {
        const resp = await fetch(`/${file}`);
        if (resp.ok) {
          contents[file] = await resp.text();
        }
      } catch { /* skip unavailable docs */ }
    }
    return contents;
  };

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const docContents = await fetchDocs();
      if (Object.keys(docContents).length === 0) {
        setError(t('docs_health.error_fetch'));
        return;
      }
      const newReport = consistencyChecker.checkDocs(docContents);
      if (isMountedRef.current) {
        setReport(newReport);
        eventBus.emit('system:notification', { message: t('docs_health.check_done'), type: 'success' });
      }
    } catch (e) {
      if (isMountedRef.current) {
        setError(t('docs_health.error_check'));
        clearError();
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleAutoFix = async () => {
    if (!report) return;
    setHealing(true);
    setError(null);
    try {
      const docContents = await fetchDocs();
      const newPlan = consistencyHealingPipeline.analyze(docContents);
      if (isMountedRef.current) {
        setPlan(newPlan);
        const executed = await consistencyHealingPipeline.executeAll();
        const succeeded = executed.filter(t => t.status === 'completed').length;
        eventBus.emit('system:notification', { message: t('docs_health.fix_done', { count: succeeded }), type: 'success' });
      }
    } catch (e) {
      if (isMountedRef.current) {
        setError(t('docs_health.error_fix'));
        clearError();
      }
    } finally {
      if (isMountedRef.current) setHealing(false);
    }
  };

  React.useEffect(() => {
    isMountedRef.current = true;
    loadLastReport();
    return () => { isMountedRef.current = false; };
  }, [loadLastReport]);

  const brokenItems = report?.items.filter(i => !i.found) ?? [];
  const okItems = report?.items.filter(i => i.found) ?? [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <FileText size={28} color="#22c55e" /> {t('docs_health.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('docs_health.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCheck} disabled={loading} style={{ ...button, display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <Loader2 size={16} /> : <Search size={16} />}
            {loading ? t('docs_health.checking') : t('docs_health.run_check')}
          </button>
          {brokenItems.length > 0 && (
            <button onClick={handleAutoFix} disabled={healing} style={{ ...button, background: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
              {healing ? <Loader2 size={16} /> : <Wrench size={16} />}
              {healing ? t('docs_health.fixing') : t('docs_health.auto_fix')}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={errorContainer}>
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {!report ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
          <Shield size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#94a3b8' }}>{t('docs_health.no_report')}</div>
          <div>{t('docs_health.no_report_desc')}</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: t('docs_health.total'), value: report.total, color: '#3b82f6', icon: <FileText size={18} /> },
              { label: t('docs_health.passed'), value: report.passed, color: '#10b981', icon: <CheckCircle2 size={18} /> },
              { label: t('docs_health.failed'), value: report.failed, color: '#ef4444', icon: <XCircle size={18} /> },
              { label: t('docs_health.health'), value: report.total > 0 ? `${Math.round((report.passed / report.total) * 100)}%` : '--', color: (report.total > 0 ? report.passed / report.total : 1) > 0.8 ? '#10b981' : '#f59e0b', icon: <Shield size={18} /> },
            ].map(stat => (
              <div key={stat.label} style={{ padding: '1.25rem', borderRadius: 16, border: `1px solid ${stat.color}20`, background: `linear-gradient(145deg, ${stat.color}05 0%, rgba(0,0,0,0.2) 100%)`, backdropFilter: 'blur(10px)' }}>
                <div style={flexBetween}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.5rem' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {brokenItems.length > 0 && (
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fca5a5', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={18} color="#ef4444" /> {t('docs_health.broken')} ({brokenItems.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {brokenItems.map((item, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{item.type}</div>
                      <div style={{ fontSize: '0.85rem', color: '#f1f5f9', ...textSm }}>{item.name}</div>
                      <div style={textMutedXs}>{item.docFile}</div>
                    </div>
                    {item.note && <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic' }}>{item.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan && (
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.03)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={18} /> {t('docs_health.healing_plan')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={textSecondaryXs}>{t('docs_health.total_tasks')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>{plan.totalTasks}</div>
                </div>
                <div>
                  <div style={textSecondaryXs}>{t('docs_health.completed_tasks')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{plan.completedTasks}</div>
                </div>
                <div>
                  <div style={textSecondaryXs}>{t('docs_health.failed_tasks')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{plan.failedTasks}</div>
                </div>
              </div>
              {plan.tasks.map(task => (
                <div key={task.id} style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{task.docFile}</div>
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: task.status === 'completed' ? 'rgba(16,185,129,0.15)' : task.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: task.status === 'completed' ? '#10b981' : task.status === 'failed' ? '#ef4444' : '#f59e0b' }}>
                      {task.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{task.failedItems.length} {t('docs_health.broken')} — {task.suggestedFixes.length} {t('docs_health.fixes')}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem' }}>{t('docs_health.by_category')}</h3>
              {Object.entries(report.byCategory).map(([cat, stats]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0', textTransform: 'capitalize' }}>{cat}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>{stats.passed}/{stats.total}</span>
                    {stats.failed > 0 && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>-{stats.failed}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem' }}>{t('docs_health.summary')}</h3>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>{report.summary}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocsHealthPanel;
