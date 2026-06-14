import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GitCompare, AlertTriangle, CheckCircle2, Activity, X, Clock, BarChart3, GitBranch } from 'lucide-react';
import { keyStateStore, keyStateProjection, routerProjection, routerService } from '../../kernel/instances';
import { eventBus } from '../../kernel/events/event-bus';
import { EVENTS } from '../../kernel/events/event-names';
import { compareKeyState } from '../../kernel/services/projections/shadow-diff-engine';
import { compareRouterDecisions, type RouterDiffReport } from '../../kernel/services/projections/router-shadow-diff';

import ModuleInfo from '../ModuleInfo/ModuleInfo';
import type { DiffEntry, DiffReport } from '../../kernel/services/projections/shadow-diff-engine';

const CARD: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)',
  borderRadius: 12, padding: '1rem', backdropFilter: 'blur(12px)',
};

const BADGE: React.CSSProperties = {
  padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.6rem', fontWeight: 600,
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  high: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  medium: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  low: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
};

const KeyStateDiffView: React.FC<{ report: DiffReport; mismatchesBySeverity: Record<string, DiffEntry[]> }> = ({ report, mismatchesBySeverity }) => {
  const driftColor = report.driftScore === 0 ? '#22c55e' : report.driftScore < 20 ? '#f59e0b' : '#ef4444';

  if (report.mismatches.length === 0 && report.missingInProjection.length === 0 && report.missingInLegacy.length === 0) {
    return (
      <div style={{ ...CARD, textAlign: 'center', padding: 32, borderColor: 'rgba(34,197,94,0.2)' }}>
        <CheckCircle2 size={32} color="#22c55e" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: '1rem', color: '#22c55e', fontWeight: 600 }}>Fully Synchronized</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Legacy KeyStateStore and event-sourced projection are identical</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ ...CARD, borderLeft: `3px solid ${driftColor}` }}>
          <div><BarChart3 size={16} color={driftColor} /><span>Drift Score</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: driftColor }}>{report.driftScore}<span style={{ fontSize: '0.8rem', color: '#64748b' }}>/100</span></div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{report.criticalCount} critical / {report.mismatches.length} total</div>
        </div>
        <div style={CARD}>
          <div><Activity size={16} color="#3b82f6" /><span>Keys Compared</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>{report.totalKeys}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{report.matchedKeys} matched</div>
        </div>
        <div style={CARD}>
          <div><AlertTriangle size={16} color="#f59e0b" /><span>Missing in Projection</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: report.missingInProjection.length > 0 ? '#f59e0b' : '#22c55e' }}>{report.missingInProjection.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>keys only in legacy</div>
        </div>
        <div style={CARD}>
          <div><Clock size={16} color="#a78bfa" /><span>Missing in Legacy</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: report.missingInLegacy.length > 0 ? '#a78bfa' : '#22c55e' }}>{report.missingInLegacy.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>keys only in projection</div>
        </div>
      </div>

      {report.missingInProjection.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Keys Only in Legacy ({report.missingInProjection.length})</div>
          {report.missingInProjection.slice(0, 10).map(id => (
            <div key={id} style={{ ...CARD, padding: '0.4rem 0.75rem', marginBottom: 4, fontSize: '0.75rem', color: '#cbd5e1' }}>{id}</div>
          ))}
        </div>
      )}

      {(['critical', 'high', 'medium'] as const).map(sev => {
        const entries = mismatchesBySeverity[sev] || [];
        if (entries.length === 0) return null;
        const sc = SEVERITY_COLORS[sev];
        return (
          <div key={sev} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ ...BADGE, background: sc.bg, color: sc.text }}>{sev.toUpperCase()}</span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{entries.length} mismatch(es)</span>
            </div>
            {entries.slice(0, 5).map((m, i) => (
              <div key={`${m.keyId}-${m.field}`} style={{ ...CARD, padding: '0.4rem 0.75rem', marginBottom: 4, fontSize: '0.75rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', minWidth: 100 }}>{m.keyId}</span>
                <span style={{ ...BADGE, background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>{m.field}</span>
                <span style={{ color: '#94a3b8' }}>legacy: <span style={{ color: '#fca5a5' }}>{String(m.legacy)}</span></span>
                <span style={{ color: '#64748b' }}>→</span>
                <span style={{ color: '#94a3b8' }}>projection: <span style={{ color: '#22c55e' }}>{String(m.projection)}</span></span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const RouterDiffView: React.FC<{ report: RouterDiffReport }> = ({ report }) => {
  const driftColor = report.driftScore === 0 ? '#22c55e' : report.driftScore < 20 ? '#f59e0b' : '#ef4444';

  if (report.mismatches.length === 0 && report.missingInProjection.length === 0 && report.missingInLive.length === 0) {
    return (
      <div style={{ ...CARD, textAlign: 'center', padding: 32, borderColor: 'rgba(34,197,94,0.2)' }}>
        <CheckCircle2 size={32} color="#22c55e" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: '1rem', color: '#22c55e', fontWeight: 600 }}>Router Fully Synchronized</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>RouterService history and event-sourced projection are identical</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ ...CARD, borderLeft: `3px solid ${driftColor}` }}>
          <div><GitBranch size={16} color={driftColor} /><span>Drift Score</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: driftColor }}>{report.driftScore}<span style={{ fontSize: '0.8rem', color: '#64748b' }}>/100</span></div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{report.criticalCount} critical / {report.mismatches.length} total</div>
        </div>
        <div style={CARD}>
          <div><Activity size={16} color="#3b82f6" /><span>Live</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>{report.totalLive}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>decisions in router history</div>
        </div>
        <div style={CARD}>
          <div><Clock size={16} color="#a78bfa" /><span>Projected</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>{report.totalProjected}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>decisions in event projection</div>
        </div>
        <div style={CARD}>
          <div><AlertTriangle size={16} color="#f59e0b" /><span>Missing in Projection</span></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: report.missingInProjection.length > 0 ? '#f59e0b' : '#22c55e' }}>{report.missingInProjection.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>decisions not captured</div>
        </div>
      </div>

      {report.missingInProjection.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Live Decisions Missing from Projection ({report.missingInProjection.length})</div>
          {report.missingInProjection.slice(0, 10).map(id => (
            <div key={id} style={{ ...CARD, padding: '0.4rem 0.75rem', marginBottom: 4, fontSize: '0.75rem', color: '#cbd5e1' }}>{id}</div>
          ))}
        </div>
      )}

      {report.mismatches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {report.mismatches.map((m, i) => {
            const sc = SEVERITY_COLORS[m.severity] || SEVERITY_COLORS.medium;
            return (
              <div key={i} style={{ ...CARD, padding: '0.4rem 0.75rem', borderLeft: `3px solid ${sc.text}`, display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.requestId}>{m.requestId.slice(0, 8)}</span>
                <span style={{ ...BADGE, background: sc.bg, color: sc.text }}>{m.severity}</span>
                <span style={{ ...BADGE, background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>{m.field}</span>
                <span style={{ color: '#94a3b8' }}>live: <span style={{ color: '#fca5a5', fontWeight: 600 }}>{String(m.live)}</span></span>
                <span style={{ color: '#64748b' }}>→</span>
                <span style={{ color: '#94a3b8' }}>projection: <span style={{ color: '#22c55e', fontWeight: 600 }}>{String(m.projected)}</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ShadowPanel: React.FC = () => {
  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
  const [routerReport, setRouterReport] = useState<RouterDiffReport | null>(null);
  const [loading, setLoading] = useState(true);

  const runDiff = useCallback(() => {
    setLoading(true);
    try {
      // Key state diff: legacy (keyStateStore) vs projection (keyStateProjection)
      const legacyKeys = keyStateStore.getAll();
      const projMap = keyStateProjection.getState();
      const report = compareKeyState(legacyKeys, projMap);
      setDiffReport(report);

      // Router diff: live (routerService) vs projection (routerProjection)
      const liveDecisions = routerService.getDecisionHistory(200);
      const projRouterMap = routerProjection.getState();
      const rReport = compareRouterDecisions(liveDecisions, projRouterMap);
      setRouterReport(rReport);

      // OBS-80: emit drift events to monitoring
      if (report.driftScore > 0) {
        eventBus.emit('shadow:drift', {
          driftScore: report.driftScore,
          criticalCount: report.criticalCount,
          mismatchCount: report.mismatches.length,
          type: 'key-state',
          timestamp: Date.now(),
        });
      }
      if (rReport.driftScore > 0) {
        eventBus.emit('shadow:drift', {
          driftScore: rReport.driftScore,
          criticalCount: rReport.criticalCount,
          mismatchCount: rReport.mismatches.length,
          type: 'router',
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.error('[ShadowPanel] Diff failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runDiff();
    const unsubs = [
      eventBus.onSafe(EVENTS.KEY_STATE_CHANGED, runDiff),
      eventBus.onSafe(EVENTS.KEY_PROBE_RESULT, runDiff),
      eventBus.onSafe(EVENTS.DECISION, runDiff),
      eventBus.onSafe(EVENTS.KERNEL_UPDATED, runDiff),
    ];
    return () => unsubs.forEach(u => u());
  }, [runDiff]);

  const mismatchesBySeverity = useMemo(() => {
    if (!diffReport) return {};
    const grouped: Record<string, DiffEntry[]> = {};
    for (const m of diffReport.mismatches) {
      (grouped[m.severity] ||= []).push(m);
    }
    return grouped;
  }, [diffReport]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <GitCompare size={24} color="#8b5cf6" />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Shadow Projection Diff</h1>
      </div>

      {loading && !diffReport && !routerReport && (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Computing diffs…</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Key State Diff */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Activity size={18} color="#3b82f6" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Key State</h2>
          </div>
          {diffReport ? (
            <KeyStateDiffView report={diffReport} mismatchesBySeverity={mismatchesBySeverity} />
          ) : (
            <div style={{ ...CARD, textAlign: 'center', padding: 24, color: '#64748b' }}>No data</div>
          )}
        </div>

        {/* Router Diff */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <GitBranch size={18} color="#8b5cf6" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Router Decisions</h2>
          </div>
          {routerReport ? (
            <RouterDiffView report={routerReport} />
          ) : (
            <div style={{ ...CARD, textAlign: 'center', padding: 24, color: '#64748b' }}>No data</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          onClick={runDiff}
          style={{
            background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
            border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8,
            padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.8rem',
          }}
        >
          Re-run Diff
        </button>
      </div>
    </div>
  );
};

export default ShadowPanel;
