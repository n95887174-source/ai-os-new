import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Play, CheckCircle, XCircle, Loader2, Download, AlertTriangle, Search, X, Lightbulb, FileText } from 'lucide-react';
import { workspaceService, obsGapsService } from '../../kernel/instances';
import type { ServiceObsInfo, DocEventCoverage } from '../../kernel/contracts/obs-gaps';

const SERVICE_COUNT = obsGapsService.getServiceCount();

const ObsGaps: React.FC = () => {
  const navigate = useNavigate();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [liveServices, setLiveServices] = useState<ServiceObsInfo[] | null>(null);
  const [wsAttached] = useState(() => {
    try {
      return workspaceService.isAttached();
    } catch {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [docEvents, setDocEvents] = useState<DocEventCoverage[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  useEffect(() => {
    if (!wsAttached) return;
    (async () => {
      try {
        const content = await workspaceService.readFile('docs/events.md');
        const parsed = obsGapsService.parseEventsDocumentation(content);
        setDocEvents(obsGapsService.crossReferenceEvents(parsed, obsGapsService.getStaticInventory()));
        setEventsLoaded(true);
      } catch {
        /* events.md unavailable */
      }
    })();
  }, [wsAttached]);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const readFile = wsAttached
        ? (path: string) => workspaceService.readFile(path)
        : undefined;
      const services = await obsGapsService.scanServices(readFile);
      setLiveServices(services);
      setDocEvents((prev) => {
        if (prev.length === 0) return prev;
        const rawEvents = prev.map(({ name, source }) => ({ name, source }));
        return obsGapsService.crossReferenceEvents(rawEvents, services);
      });
      setScanned(true);
    } finally {
      setScanning(false);
    }
  }, [wsAttached]);

  const services = liveServices ?? obsGapsService.getStaticInventory();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, searchQuery]);

  const coverage = useMemo(() => obsGapsService.computeCoverage(services), [services]);

  const exportReport = () => {
    const rawEvents = docEvents.map(({ name, source }) => ({ name, source }));
    const report = obsGapsService.buildReport(services, rawEvents);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obs-gaps-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recommendations = useMemo(
    () => obsGapsService.buildReport(services, docEvents.map(({ name, source }) => ({ name, source }))).recommendations,
    [services, docEvents],
  );

  const scoreColor = (pct: number) => (pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444');
  const barStyle: React.CSSProperties = {
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    flex: 1,
    minWidth: 60,
  };
  const fillBar = (pct: number, color: string): React.CSSProperties => ({
    width: `${pct}%`,
    height: '100%',
    borderRadius: 3,
    background: color,
    transition: 'width 0.5s',
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Eye size={20} color="#06b6d4" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Observability Gaps</span>
          {wsAttached && scanned && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>Live scan</span>}
        </div>
        <button
          onClick={() =>
            navigate(
              `/hypothesis-gen?source=${encodeURIComponent('docs/events.md')}&title=${encodeURIComponent('Observability gaps analysis')}`,
            )
          }
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 6,
            border: '1px solid rgba(139,92,246,0.2)',
            background: 'rgba(139,92,246,0.08)',
            color: '#a855f7',
            cursor: 'pointer',
            fontSize: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Lightbulb size={11} /> Hypothesis
        </button>
      </div>

      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: 7,
            border: 'none',
            background: '#06b6d4',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {scanning ? <Loader2 size={14} /> : <Play size={14} />}
          {scanning ? 'Scanning...' : scanned ? 'Re-scan' : 'Scan'}
        </button>
        {scanned && (
          <span style={{ fontSize: '0.7rem', color: wsAttached ? '#10b981' : '#f59e0b' }}>
            {wsAttached ? 'Workspace analysis' : 'Static data'}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '2px 6px' }}>
          <Search size={10} color="#64748b" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter..."
            style={{ width: 120, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.68rem' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
              <X size={9} />
            </button>
          )}
        </div>
        {scanned && (
          <button
            onClick={exportReport}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 5,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.68rem',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Download size={11} /> Export
          </button>
        )}
      </div>

      {!scanned && !scanning ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: 8 }}>
          <Eye size={40} opacity={0.25} />
          <span style={{ fontSize: '0.9rem' }}>No scan results yet</span>
          <span style={{ fontSize: '0.75rem' }}>
            Run a scan to check observability coverage across {SERVICE_COUNT} services.
          </span>
        </div>
      ) : scanning ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 8 }}>
          <Loader2 size={18} /> <span>Scanning service files...</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: scoreColor(coverage.overall) }}>{coverage.overall}%</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Overall</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{coverage.gaps}</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Services w/ gaps</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#94a3b8' }}>{coverage.total}</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Total services</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {(
              [
                ['Events', coverage.eventScore, '#a855f7', `${coverage.withEvents}/${coverage.total}`],
                ['Logger', coverage.loggerScore, '#3b82f6', `${coverage.withLogger}/${coverage.total}`],
                ['Health', coverage.healthScore, '#10b981', `${coverage.withHealth}/${coverage.total}`],
                ['Tracing', coverage.tracingScore, '#06b6d4', `${coverage.withTracing}/${coverage.total}`],
                ['Lifecycle', coverage.lifecycleScore, '#f59e0b', `${coverage.withLifecycle}/${coverage.total}`],
              ] as const
            ).map(([label, score, color, count]) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: scoreColor(score), fontWeight: 700 }}>
                    {score}% ({count})
                  </span>
                </div>
                <div style={barStyle}>
                  <div style={fillBar(score, color)} />
                </div>
              </div>
            ))}
          </div>

          {eventsLoaded && docEvents.length > 0 && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.35rem' }}>
                <FileText size={12} color="#60a5fa" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa' }}>Events.md Cross-Reference</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{docEvents.length} documented events</span>
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxHeight: 120, overflowY: 'auto' }}>
                {docEvents.slice(0, 30).map((d) => (
                  <span
                    key={d.name}
                    style={{
                      fontSize: '0.6rem',
                      padding: '0.1rem 0.35rem',
                      borderRadius: 3,
                      background: d.covered ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      color: d.covered ? '#34d399' : '#f87171',
                      fontFamily: 'monospace',
                    }}
                  >
                    {d.name}
                  </span>
                ))}
                {docEvents.length > 30 && (
                  <span style={{ fontSize: '0.6rem', color: '#64748b' }}>+{docEvents.length - 30} more</span>
                )}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Service Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {filtered.map((s) => {
              const checks = [s.hasEvents, s.hasLogger, s.hasLifecycle, s.hasHealthCheck, s.hasTracing];
              const passed = checks.filter(Boolean).length;
              const total = checks.length;
              return (
                <div
                  key={s.name}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: 7,
                    background: 'rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ flex: 1, fontSize: '0.72rem', color: '#e2e8f0', fontFamily: 'monospace' }}>{s.name}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {s.hasEvents ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#ef4444" />}
                    {s.hasLogger ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#ef4444" />}
                    {s.hasLifecycle ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#ef4444" />}
                    {s.hasHealthCheck ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#64748b" />}
                    {s.hasTracing ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#64748b" />}
                  </div>
                  <span style={{ fontSize: '0.6rem', color: passed === total ? '#10b981' : '#f59e0b', minWidth: 28, textAlign: 'right', fontWeight: 700 }}>
                    {passed}/{total}
                  </span>
                  {s.notes && <span style={{ fontSize: '0.6rem', color: '#f59e0b' }}>{s.notes}</span>}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.25rem', padding: '0.85rem', borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.4rem' }}>
              <AlertTriangle size={13} color="#f59e0b" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>Recommendations</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObsGaps;
