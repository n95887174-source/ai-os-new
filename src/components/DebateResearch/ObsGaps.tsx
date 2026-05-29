import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Eye, Play, CheckCircle, XCircle, Loader2, Download, AlertTriangle, Search, FileCode, FolderOpen, HardDrive, X } from 'lucide-react';
import { workspaceService } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';

interface ServiceObsInfo {
  name: string;
  hasEvents: boolean;
  hasLogger: boolean;
  hasLifecycle: boolean;
  hasHealthCheck: boolean;
  hasTracing: boolean;
  notes?: string;
}

const STATIC_SERVICES: ServiceObsInfo[] = [
  { name: 'configService', hasEvents: false, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'settingsService', hasEvents: true, hasLogger: false, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'keyService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: true, hasTracing: false },
  { name: 'toolService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'sandboxService', hasEvents: false, hasLogger: false, hasLifecycle: true, hasHealthCheck: false, hasTracing: false, notes: 'No events, no logger' },
  { name: 'agentService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'memoryService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: true, hasTracing: false },
  { name: 'featureFlagService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'cognitiveService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: true },
  { name: 'policyService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'roleService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'snapshotService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'debateService', hasEvents: true, hasLogger: false, hasLifecycle: true, hasHealthCheck: false, hasTracing: false, notes: 'No logger (uses console.warn)' },
  { name: 'metricsService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: true },
  { name: 'advisorService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'pricingService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'budgetService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'usageTracker', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'cacheService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'chatService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: true },
  { name: 'timelineService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: true },
  { name: 'adminService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: true, hasTracing: false },
  { name: 'healthCheckService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: true, hasTracing: false },
  { name: 'monitoringService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: true, hasTracing: true },
  { name: 'routingPolicyService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'whatIfService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'pressureMapService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: true },
  { name: 'diagnosticService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: true },
  { name: 'notificationWebhookService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'compromiseWebhookService', hasEvents: true, hasLogger: false, hasLifecycle: true, hasHealthCheck: false, hasTracing: false, notes: 'No logger' },
  { name: 'externalSecretsService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'workspaceService', hasEvents: true, hasLogger: false, hasLifecycle: true, hasHealthCheck: false, hasTracing: false, notes: 'No logger' },
  { name: 'probeService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'consistencyChecker', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'consistencyHealingPipeline', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
  { name: 'groupManagerService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false, notes: 'Recently migrated' },
  { name: 'systemStatusService', hasEvents: true, hasLogger: true, hasLifecycle: true, hasHealthCheck: false, hasTracing: false },
];

const SERVICE_FILE_MAP: Record<string, string> = {
  configService: 'src/kernel/services/config-service.ts',
  settingsService: 'src/kernel/services/settings-service.ts',
  keyService: 'src/kernel/services/key-management/key-service.ts',
  toolService: 'src/kernel/services/tool-executor.ts',
  sandboxService: 'src/kernel/services/sandbox-service.ts',
  agentService: 'src/kernel/services/agent-service.ts',
  memoryService: 'src/kernel/services/memory-engine.ts',
  featureFlagService: 'src/kernel/services/feature-flag-service.ts',
  cognitiveService: 'src/kernel/services/cognitive-service.ts',
  policyService: 'src/kernel/services/policy-service.ts',
  roleService: 'src/kernel/services/role-service.ts',
  snapshotService: 'src/kernel/services/snapshot-service.ts',
  debateService: 'src/kernel/services/debate-service.ts',
  metricsService: 'src/kernel/services/metrics-service.ts',
  advisorService: 'src/kernel/services/advisor-service.ts',
  pricingService: 'src/kernel/services/pricing-service.ts',
  budgetService: 'src/kernel/services/budget-service.ts',
  usageTracker: 'src/kernel/services/usage-tracker.ts',
  cacheService: 'src/kernel/services/cache-service.ts',
  chatService: 'src/kernel/services/chat-service.ts',
  timelineService: 'src/kernel/services/timeline-service.ts',
  adminService: 'src/kernel/services/admin-service.ts',
  healthCheckService: 'src/kernel/services/health-check-service.ts',
  monitoringService: 'src/kernel/services/monitoring-service.ts',
  routingPolicyService: 'src/kernel/services/provider-router.ts',
  whatIfService: 'src/kernel/services/what-if-service.ts',
  pressureMapService: 'src/kernel/services/pressure-map-service.ts',
  diagnosticService: 'src/kernel/services/diagnostic-service.ts',
  notificationWebhookService: 'src/kernel/services/notification-webhook-service.ts',
  compromiseWebhookService: 'src/kernel/services/compromise-webhook-service.ts',
  externalSecretsService: 'src/kernel/services/external-secrets-service.ts',
  workspaceService: 'src/kernel/services/workspace-service.ts',
  probeService: 'src/kernel/services/probe-service.ts',
  consistencyChecker: 'src/kernel/services/consistency-checker.ts',
  consistencyHealingPipeline: 'src/kernel/services/consistency-healing-pipeline.ts',
  groupManagerService: 'src/kernel/services/group-manager.ts',
  systemStatusService: 'src/kernel/services/system-status-service.ts',
};

const ObsGaps: React.FC = () => {
  const { t } = useTranslation();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [liveServices, setLiveServices] = useState<ServiceObsInfo[] | null>(null);
  const [wsAttached, setWsAttached] = useState(workspaceService.isAttached());
  const [searchQuery, setSearchQuery] = useState('');

  const runScan = useCallback(async () => {
    setScanning(true);
    const services: ServiceObsInfo[] = [];
    const entries = Object.entries(SERVICE_FILE_MAP);
    let processed = 0;
    for (const [name, filePath] of entries) {
      try {
        if (wsAttached) {
          const content = await workspaceService.readFile(filePath);
          services.push({
            name,
            hasEvents: /\.emit\(/.test(content) || /EVENTS\./.test(content),
            hasLogger: /ILogger/.test(content) || /logger\.(info|warn|error|debug)\(/.test(content),
            hasLifecycle: /ILifecycle/.test(content) || /init\(|start\(|destroy\(/.test(content) && /class/.test(content),
            hasHealthCheck: /IHealthCheck/.test(content) || /healthCheck/.test(content) || /getHealth\(/.test(content),
            hasTracing: /ITraceContext/.test(content) || /TraceContext/.test(content) || /traceId/.test(content),
          });
        } else {
          services.push(STATIC_SERVICES.find(s => s.name === name) || { name, hasEvents: false, hasLogger: false, hasLifecycle: false, hasHealthCheck: false, hasTracing: false });
        }
      } catch {
        const staticSvc = STATIC_SERVICES.find(s => s.name === name);
        services.push(staticSvc || { name, hasEvents: false, hasLogger: false, hasLifecycle: false, hasHealthCheck: false, hasTracing: false });
      }
      processed++;
    }
    setLiveServices(services);
    setScanned(true);
    setScanning(false);
  }, [wsAttached]);

  const services = liveServices || STATIC_SERVICES;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q));
  }, [services, searchQuery]);

  const coverage = useMemo(() => {
    const total = services.length;
    const withEvents = services.filter(s => s.hasEvents).length;
    const withLogger = services.filter(s => s.hasLogger).length;
    const withLifecycle = services.filter(s => s.hasLifecycle).length;
    const withHealth = services.filter(s => s.hasHealthCheck).length;
    const withTracing = services.filter(s => s.hasTracing).length;
    const gaps = services.filter(s => !s.hasEvents || !s.hasLogger || !s.hasTracing).length;
    const eventScore = Math.round((withEvents / total) * 100);
    const loggerScore = Math.round((withLogger / total) * 100);
    const lifecycleScore = Math.round((withLifecycle / total) * 100);
    const healthScore = Math.round((withHealth / total) * 100);
    const tracingScore = Math.round((withTracing / total) * 100);
    const overall = Math.round((eventScore + loggerScore + healthScore + tracingScore) / 4);
    return { total, withEvents, withLogger, withLifecycle, withHealth, withTracing, gaps, eventScore, loggerScore, lifecycleScore, healthScore, tracingScore, overall };
  }, [services]);

  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ timestamp: Date.now(), coverage, services }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `obs-gaps-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = (pct: number) => pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const barStyle: React.CSSProperties = { height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flex: 1, minWidth: 60 };
  const fillBar = (pct: number, color: string): React.CSSProperties => ({ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.5s' });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Eye size={20} color="#06b6d4" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Observability Gaps</span>
          {wsAttached && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>Live scan</span>}
        </div>
      </div>

      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={runScan} disabled={scanning} style={{ padding: '0.5rem 1.1rem', borderRadius: 7, border: 'none', background: '#06b6d4', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
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
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter..." style={{ width: 120, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.68rem' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={9} /></button>}
        </div>
        {scanned && (
          <button onClick={exportReport} style={{ padding: '0.35rem 0.75rem', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Download size={11} /> Export
          </button>
        )}
      </div>

      {!scanned && !scanning ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: 8 }}>
          <Eye size={40} opacity={0.25} />
          <span style={{ fontSize: '0.9rem' }}>No scan results yet</span>
          <span style={{ fontSize: '0.75rem' }}>Run a scan to check observability coverage across {STATIC_SERVICES.length} services.</span>
        </div>
      ) : scanning ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 8 }}>
          <Loader2 size={18} /> <span>Scanning service files...</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
          {/* Stat cards */}
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

          {/* Dimension bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {([
              ['Events', coverage.eventScore, '#a855f7', coverage.withEvents + '/' + coverage.total],
              ['Logger', coverage.loggerScore, '#3b82f6', coverage.withLogger + '/' + coverage.total],
              ['Health', coverage.healthScore, '#10b981', coverage.withHealth + '/' + coverage.total],
              ['Tracing', coverage.tracingScore, '#06b6d4', coverage.withTracing + '/' + coverage.total],
              ['Lifecycle', coverage.lifecycleScore, '#f59e0b', coverage.withLifecycle + '/' + coverage.total],
            ] as const).map(([label, score, color, count]) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: scoreColor(score), fontWeight: 700 }}>{score}% ({count})</span>
                </div>
                <div style={barStyle}><div style={fillBar(score, color)} /></div>
              </div>
            ))}
          </div>

          {/* Service breakdown */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Service Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {filtered.map(s => {
              const checks = [s.hasEvents, s.hasLogger, s.hasLifecycle, s.hasHealthCheck, s.hasTracing];
              const passed = checks.filter(Boolean).length;
              const total = checks.length;
              return (
                <div key={s.name} style={{ padding: '0.4rem 0.65rem', borderRadius: 7, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, fontSize: '0.72rem', color: '#e2e8f0', fontFamily: 'monospace' }}>{s.name}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {s.hasEvents ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#ef4444" />}
                    {s.hasLogger ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#ef4444" />}
                    {s.hasLifecycle ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#ef4444" />}
                    {s.hasHealthCheck ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#64748b" />}
                    {s.hasTracing ? <CheckCircle size={10} color="#10b981" /> : <XCircle size={10} color="#64748b" />}
                  </div>
                  <span style={{ fontSize: '0.6rem', color: passed === total ? '#10b981' : '#f59e0b', minWidth: 28, textAlign: 'right', fontWeight: 700 }}>{passed}/{total}</span>
                  {s.notes && <span style={{ fontSize: '0.6rem', color: '#f59e0b' }}>{s.notes}</span>}
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          <div style={{ marginTop: '1.25rem', padding: '0.85rem', borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.4rem' }}>
              <AlertTriangle size={13} color="#f59e0b" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>Recommendations</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {coverage.eventScore < 100 && <li>Add event emission to {services.filter(s => !s.hasEvents).map(s => s.name).join(', ')}</li>}
              {coverage.loggerScore < 100 && <li>Add ILogger to {services.filter(s => !s.hasLogger).map(s => s.name).join(', ')}</li>}
              {coverage.healthScore < 80 && <li>Implement health checks for more services ({coverage.withHealth}/{coverage.total})</li>}
              {coverage.tracingScore < 50 && <li>Add tracing spans to high-value services (debate, routing, chat)</li>}
              {coverage.lifecycleScore < 100 && <li>Ensure all services implement ILifecycle</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObsGaps;
