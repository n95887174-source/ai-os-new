import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AlertTriangle, Brain, TrendingUp, Activity, BarChart3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';
import { debateService } from '../kernel/instances';
import { analyzeDebate, FALLACY_LABELS } from '../kernel/utils/debate-analysis';
import type { TonePoint, PersuasionScore, DebateAnalysis } from '../kernel/utils/debate-analysis';
import { textMutedXs, textSecondaryXs, textWhiteXs, errorContainer, dismissBtnRed } from '../styles/common';
import { X } from 'lucide-react';

const DebateAnalysisPanel: React.FC = () => {
  const { t, lang } = useTranslation();
  const [sessionId, setSessionId] = useState<string>('');
  const [availableSessions, setAvailableSessions] = useState<Array<{ id: string; topic: string }>>([]);
  const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    try {
      const active = debateService.getSession();
      if (active && isMountedRef.current) {
        setAvailableSessions([{ id: active.id, topic: active.topic }]);
        if (!sessionId) setSessionId(active.id);
      }
    } catch (err) {
      if (isMountedRef.current) setError(String(err));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
    return () => { isMountedRef.current = false; };
  }, []);

  const runAnalysis = useMemo(() => {
    if (!sessionId) return null;
    try {
      const session = debateService.getSessionById(sessionId);
      if (!session) return null;
      const args = (session.arguments ?? []).map((a: { agentId: string; content: string; confidence: number; round: number; parentId?: string }) => ({
        agentId: a.agentId,
        content: a.content,
        confidence: typeof a.confidence === 'number' ? a.confidence : 0.5,
        round: a.round ?? 0,
        parentId: a.parentId,
      }));
      return analyzeDebate(args);
    } catch (err) {
      return null;
    }
  }, [sessionId]);

  useEffect(() => {
    if (runAnalysis) setAnalysis(runAnalysis);
  }, [runAnalysis]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={20} />
          {t('common.loading')}
        </motion.div>
      </div>
    );
  }

  if (availableSessions.length === 0) {
    return (
      <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
          <Brain size={26} color="#a855f7" /> {t('debate_analysis.title')}
        </h2>
        <p style={{ color: '#94a3b8' }}>{t('debate_analysis.no_sessions')}</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', overflow: 'auto' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Brain size={26} color="#a855f7" /> {t('debate_analysis.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('debate_analysis.subtitle')}</p>
        </div>
        <select
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem', minWidth: 240 }}
        >
          {availableSessions.map(s => (
            <option key={s.id} value={s.id}>{s.topic.slice(0, 60)}{s.topic.length > 60 ? '...' : ''}</option>
          ))}
        </select>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={errorContainer}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
        </motion.div>
      )}

      {analysis && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <StatCard
              icon={<AlertTriangle size={18} color="#ef4444" />}
              label={t('debate_analysis.total_fallacies')}
              value={String(analysis.totalFallacies)}
              color="#ef4444"
            />
            <StatCard
              icon={<TrendingUp size={18} color="#10b981" />}
              label={t('debate_analysis.overall_shift')}
              value={`${(analysis.persuasion.overallShift * 100).toFixed(0)}%`}
              color="#10b981"
            />
            <StatCard
              icon={<Activity size={18} color="#3b82f6" />}
              label={t('debate_analysis.volatility')}
              value={analysis.tone.volatility.toFixed(2)}
              color="#3b82f6"
            />
            <StatCard
              icon={<BarChart3 size={18} color="#f59e0b" />}
              label={t('debate_analysis.trend')}
              value={t(`debate_analysis.trend_${analysis.tone.trend}`)}
              color="#f59e0b"
            />
          </div>

          {analysis.fallacyStats.length > 0 && (
            <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fca5a5', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} /> {t('debate_analysis.fallacy_breakdown')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {analysis.fallacyStats.map(f => {
                  const label = FALLACY_LABELS[f.type]?.[lang === 'ru' ? 'ru' : 'en'] ?? f.type;
                  return (
                    <div key={f.type} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ ...textWhiteXs, fontSize: '0.8rem' }}>{label}</span>
                        <span style={{
                          padding: '0.1rem 0.4rem',
                          borderRadius: 6,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: f.severity === 'high' ? 'rgba(239,68,68,0.2)' : f.severity === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                          color: f.severity === 'high' ? '#fca5a5' : f.severity === 'medium' ? '#fbbf24' : '#93c5fd',
                        }}>{f.severity}</span>
                      </div>
                      <div style={textMutedXs}>{f.description}</div>
                      <div style={{ marginTop: 4, color: '#94a3b8', fontSize: '0.7rem' }}>{t('debate_analysis.count')}: {f.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analysis.persuasion.byAgent.length > 0 && (
            <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6ee7b7', margin: '0 0 0.75rem' }}>{t('debate_analysis.persuasion')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                {analysis.persuasion.byAgent.map(p => (
                  <PersuasionCard key={p.agentId} p={p} />
                ))}
              </div>
            </div>
          )}

          {analysis.tone.points.length > 0 && (
            <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.04)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#93c5fd', margin: '0 0 0.75rem' }}>{t('debate_analysis.tone_timeline')}</h3>
              <ToneChart points={analysis.tone.points} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ padding: '0.9rem 1rem', borderRadius: 12, border: `1px solid ${color}20`, background: `linear-gradient(145deg, ${color}05 0%, rgba(0,0,0,0.2) 100%)` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>{icon}<span style={{ ...textSecondaryXs, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span></div>
    <div style={{ ...textWhiteXs, fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
  </div>
);

const PersuasionCard: React.FC<{ p: PersuasionScore }> = ({ p }) => {
  const arrow = p.delta > 0.01 ? '↗' : p.delta < -0.01 ? '↘' : '→';
  const color = p.delta > 0.01 ? '#10b981' : p.delta < -0.01 ? '#ef4444' : '#94a3b8';
  return (
    <div style={{ padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ ...textWhiteXs, fontSize: '0.8rem' }}>{p.agentId.slice(0, 12)}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{arrow} {(p.delta * 100).toFixed(0)}%</span>
        <span style={textMutedXs}>{p.initialConfidence.toFixed(2)} → {p.finalConfidence.toFixed(2)}</span>
      </div>
      <div style={textMutedXs}>rounds: {p.roundsParticipated}</div>
    </div>
  );
};

const ToneChart: React.FC<{ points: TonePoint[] }> = ({ points }) => {
  if (points.length === 0) return null;
  const w = 100;
  const h = 30;
  const path = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h / 2 - (p.sentiment * h) / 2;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 80, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
        {points.map((p, i) => {
          const x = (i / Math.max(1, points.length - 1)) * w;
          const y = h / 2 - (p.sentiment * h) / 2;
          const color = p.sentiment > 0.1 ? '#10b981' : p.sentiment < -0.1 ? '#ef4444' : '#94a3b8';
          return <circle key={i} cx={x} cy={y} r="1.2" fill={color} />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...textMutedXs }}>
        <span>R{points[0].round}</span>
        <span>R{points[points.length - 1].round}</span>
      </div>
    </div>
  );
};

export default DebateAnalysisPanel;
