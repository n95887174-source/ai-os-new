import React, { useState, useEffect, useCallback } from 'react';
import {
  Thermometer, AlertTriangle, RefreshCw, Server,
  MessageCircle, CheckCircle2,
  Gauge,
} from 'lucide-react';
import { pressureMapService } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { getPressureLevelColor } from '../Common/status-vocabulary';
import type { PressureMapSnapshot, PressureTrendPoint, PressureAlert } from '../../kernel/instances';

function pLevelColor(level: string) {
  const t = getPressureLevelColor(level);
  const isLow = level.toLowerCase() === 'low';
  const r = parseInt(t.slice(1, 3), 16);
  const g = parseInt(t.slice(3, 5), 16);
  const b = parseInt(t.slice(5, 7), 16);
  return {
    bg: `rgba(${r},${g},${b},${isLow ? 0.1 : 0.12})`,
    border: `rgba(${r},${g},${b},${isLow ? 0.4 : 0.5})`,
    text: t,
  };
}

const CARD: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)',
  borderRadius: 12, padding: '1rem', backdropFilter: 'blur(12px)',
};

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function PressureGauge({ score }: { score: number }) {
  const level = score >= 0.8 ? 'critical' : score >= 0.6 ? 'high' : score >= 0.35 ? 'normal' : 'low';
  const c = pLevelColor(level);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - score * circ;
  return (
    <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={40} cy={40} r={r} fill="none" stroke={c.text} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

const PressureMapPanel: React.FC = () => {
  const { t: _t } = useTranslation();
  const [snapshot, setSnapshot] = useState<PressureMapSnapshot | null>(null);
  const [alerts, setAlerts] = useState<PressureAlert[]>([]);
  const [trends, setTrends] = useState<PressureTrendPoint[]>([]);
  const [activeTab, setActiveTab] = useState<'global' | 'providers' | 'sessions'>('global');

  const refresh = useCallback(() => {
    try {
      const snap = pressureMapService.getSnapshot();
      setSnapshot(snap ?? null);
      setAlerts(pressureMapService.getAlerts() ?? []);
      setTrends(pressureMapService.getPressureHistory('global') ?? []);
    } catch { console.warn('[PressureMapPanel] Failed to load pressure data'); }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAck = (id: string) => {
    pressureMapService.acknowledgeAlert(id);
    setAlerts(pressureMapService.getAlerts());
  };

  if (!snapshot) {
    return (
      <div style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>Loading pressure map...</div>
    );
  }

  const gc = pLevelColor(snapshot.global.level);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Thermometer size={22} color="#f97316" />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Runtime Pressure Map</h2>
      </div>
      <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: '#64748b' }}>System-wide pressure across providers, sessions, and global health signals</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('global')}
          style={{ ...TAB_BTN, background: activeTab === 'global' ? 'rgba(249,115,22,0.15)' : 'transparent', color: activeTab === 'global' ? '#f97316' : '#94a3b8', borderColor: activeTab === 'global' ? 'rgba(249,115,22,0.4)' : 'rgba(148,163,184,0.15)' }}>
          <Gauge size={14} /> Global
        </button>
        <button onClick={() => setActiveTab('providers')}
          style={{ ...TAB_BTN, background: activeTab === 'providers' ? 'rgba(59,130,246,0.15)' : 'transparent', color: activeTab === 'providers' ? '#3b82f6' : '#94a3b8', borderColor: activeTab === 'providers' ? 'rgba(59,130,246,0.4)' : 'rgba(148,163,184,0.15)' }}>
          <Server size={14} /> Providers ({snapshot.providers.length})
        </button>
        <button onClick={() => setActiveTab('sessions')}
          style={{ ...TAB_BTN, background: activeTab === 'sessions' ? 'rgba(168,85,247,0.15)' : 'transparent', color: activeTab === 'sessions' ? '#a855f7' : '#94a3b8', borderColor: activeTab === 'sessions' ? 'rgba(168,85,247,0.4)' : 'rgba(148,163,184,0.15)' }}>
          <MessageCircle size={14} /> Sessions ({snapshot.sessions.length})
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={refresh} style={{ ...TAB_BTN, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <PressureGauge score={snapshot.global.score} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: gc.text }}>{(snapshot.global.score * 100).toFixed(0)}</div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: gc.text }}>{snapshot.global.level}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.7rem', color: '#64748b' }}>
            <span>{snapshot.providers.length} providers</span>
            <span>{snapshot.sessions.length} sessions</span>
            <span style={{ color: snapshot.alertCount > 0 ? '#ef4444' : '#22c55e' }}>{snapshot.alertCount} alerts</span>
          </div>
        </div>

        <div style={{ ...CARD }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 8 }}>Pressure Trend</div>
          {trends.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', padding: 20 }}>No trend data yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, padding: '8px 0' }}>
              {trends.slice(0, 60).reverse().map((p, i) => {
                const c = pLevelColor(p.level);
                const h = Math.max(4, p.score * 80);
                return <div key={i} style={{ width: '100%', height: h, background: c.text, borderRadius: '2px 2px 0 0', opacity: 0.7 + (i / trends.length) * 0.3, transition: 'height 0.3s' }} title={`${(p.score * 100).toFixed(0)} — ${p.level}`} />;
              })}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
            <span>{(trends.length)} pts</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={14} color="#ef4444" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444' }}>
              Active Alerts ({alerts.filter(a => !a.acknowledged).length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {alerts.filter(a => !a.acknowledged).map(a => (
              <div key={a.id} style={{ ...CARD, borderLeft: `3px solid ${pLevelColor(a.level)?.text || '#64748b'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: pLevelColor(a.level)?.text }}>{a.scope}</span>
                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{a.message}</span>
                </div>
                <button onClick={() => handleAck(a.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}>
                  <CheckCircle2 size={12} /> Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'global' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={CARD}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 8 }}>Providers</div>
            {snapshot.providers.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>No providers</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {snapshot.providers.map(p => {
                  const c = pLevelColor(p.level);
                  return <div key={p.provider} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text }} />
                    <span style={{ flex: 1, color: '#cbd5e1' }}>{p.provider}</span>
                    <span style={{ color: c.text, fontWeight: 600 }}>{(p.score * 100).toFixed(0)}</span>
                    <MiniBar pct={p.score} color={c.text} />
                  </div>;
                })}
              </div>
            )}
          </div>
          <div style={CARD}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 8 }}>Sessions</div>
            {snapshot.sessions.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>No active sessions</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {snapshot.sessions.map(s => {
                  const c = pLevelColor(s.level);
                  return <div key={s.sessionId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text }} />
                    <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic || s.sessionId.slice(0, 16)}</span>
                    <span style={{ color: c.text, fontWeight: 600 }}>{s.level}</span>
                  </div>;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {snapshot.providers.length === 0 ? (
            <div style={{ ...CARD, textAlign: 'center', color: '#64748b', padding: 40 }}>No provider pressure data</div>
          ) : snapshot.providers.map(p => {
            const c = pLevelColor(p.level);
            return (
              <div key={p.provider} style={{ ...CARD, borderLeft: `3px solid ${c.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Server size={16} color={c.text} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0' }}>{p.provider}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: c.text }}>{(p.score * 100).toFixed(0)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', fontSize: '0.7rem', color: '#94a3b8' }}>
                  {Object.entries(p.breakdown).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <span>{(v * 100).toFixed(0)}%</span>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ marginTop: 8 }}>
                  <MiniBar pct={p.score} color={c.text} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {snapshot.sessions.length === 0 ? (
            <div style={{ ...CARD, textAlign: 'center', color: '#64748b', padding: 40 }}>No session pressure data</div>
          ) : snapshot.sessions.map(s => {
            const c = pLevelColor(s.level);
            return (
              <div key={s.sessionId} style={{ ...CARD, borderLeft: `3px solid ${c.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <MessageCircle size={16} color={c.text} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0' }}>{s.topic || s.sessionId.slice(0, 16)}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, color: c.text }}>{s.level}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', fontSize: '0.7rem', color: '#94a3b8' }}>
                  {Object.entries(s.breakdown).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <span>{(v * 100).toFixed(0)}%</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModuleInfo moduleKey="runtime_pressure_map" relatedModules={['health', 'debate_runtime']} />
    </div>
  );
};

const TAB_BTN: React.CSSProperties = {
  padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid',
  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: 6,
};

export default PressureMapPanel;
