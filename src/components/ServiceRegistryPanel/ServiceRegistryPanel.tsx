import React, { useState, useEffect, useMemo } from 'react';
import { runtime } from '../../kernel/runtime';
import { useTranslation } from '../../i18n/useTranslation';
import { Search, Box, Circle, ChevronRight } from 'lucide-react';
import ModuleInfo from '../ModuleInfo/ModuleInfo';

const UI_PANELS: Record<string, string> = {
  chat: '/chat',
  logs: '/logs',
  routing: '/routing',
  settings: '/settings',
  pricing: '/pricing',
  analytics: '/analytics',
  memory: '/memory',
  tools: '/tools',
  roles: '/roles',
  groups: '/groups',
  agents: '/agents',
  patterns: '/patterns',
  knowledge: '/knowledge',
  files: '/files',
  docs: '/docs',
  policy: '/policy',
  timeline: '/timeline',
  traces: '/traces',
  skills: '/skills',
  health: '/health',
  events: '/events',
  debate: '/debate',
  'debate-runtime': '/debate-runtime',
  'cognitive-builder': '/cognitive-builder',
  'argument-graph': '/argument-graph',
  'causal-debugger': '/causal-debugger',
  'dependency-map': '/dependency-map',
  'router-config': '/router-config',
  connectors: '/connectors',
  'provider-analytics': '/provider-analytics',
  'shadow-copilot': '/shadow-copilot',
  counterfactual: '/counterfactual',
  'system-health': '/system-health',
  'sre-agent': '/sre-agent',
  'model-router': '/model-router',
  sandbox: '/sandbox',
  chatAdmin: '/chat-admin',
  budget: '/budget',
  rotations: '/rotations',
  cache: '/cache',
  webhooks: '/webhooks',
  'docs-health': '/docs-health',
};

const CORE_SERVICES = new Set([
  'eventBus', 'container', 'database', 'storageLayer', 'runtime',
  'lifecycleManager', 'securityService',
]);

const ServiceRegistryPanel: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [deps, setDeps] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<{ phase: string; uptime: number; servicesReady: number; servicesTotal: number } | null>(null);

  useEffect(() => {
    setServices(runtime.getServices().sort());
    setDeps(runtime.getDependencies());
    setStatus(runtime.getStatus());
  }, []);

  const groupedServices = useMemo(() => {
    const hasUi: string[] = [];
    const noUi: string[] = [];
    const core: string[] = [];
    const other: string[] = [];
    for (const s of services) {
      if (CORE_SERVICES.has(s)) { core.push(s); continue; }
      const matched = Object.keys(UI_PANELS).some(key => s.toLowerCase().includes(key.toLowerCase()));
      if (matched) hasUi.push(s);
      else noUi.push(s);
    }
    return { hasUi, noUi, core, other };
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(s => s.toLowerCase().includes(q));
  }, [services, search]);

  const serviceHasUI = (name: string): string | null => {
    if (CORE_SERVICES.has(name)) return null;
    for (const [key, path] of Object.entries(UI_PANELS)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return path;
    }
    return null;
  };

  const selectedService = useMemo(() => {
    if (filteredServices.length === 1) return filteredServices[0];
    return null;
  }, [filteredServices]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: 16, overflow: 'hidden' }}>
      <ModuleInfo moduleKey="service-registry" />

      {status && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Phase', value: status.phase, color: status.phase === 'ready' ? '#22c55e' : '#eab308' },
            { label: 'Services', value: `${status.servicesReady}/${status.servicesTotal}`, color: '#60a5fa' },
            { label: 'Uptime', value: `${Math.floor(status.uptime / 60000)}m`, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '8px 16px', border: `1px solid ${s.color}40`, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '4px 12px', border: '1px solid rgba(148,163,184,0.15)' }}>
        <Search size={16} color="#64748b" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search') || 'Search services...'} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f8fafc', fontSize: 14, padding: '8px 0' }} />
        <span style={{ fontSize: 11, color: '#475569' }}>{services.length} services</span>
      </div>

      {search ? (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredServices.map(s => (
            <ServiceRow key={s} name={s} uiPath={serviceHasUI(s)} deps={deps[s] || []} />
          ))}
          {filteredServices.length === 0 && <div style={{ color: '#64748b', padding: 16, textAlign: 'center' }}>No services match "{search}"</div>}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ServiceGroup label="Core" services={groupedServices.core} deps={deps} uiPathFn={serviceHasUI} />
          <ServiceGroup label="Has UI" services={groupedServices.hasUi} deps={deps} uiPathFn={serviceHasUI} />
          <ServiceGroup label="No UI" services={groupedServices.noUi} deps={deps} uiPathFn={serviceHasUI} />
        </div>
      )}

      {selectedService && deps[selectedService] && deps[selectedService].length > 0 && (
        <div style={{ background: 'rgba(15,23,42,0.8)', borderRadius: 10, padding: 12, border: '1px solid rgba(148,163,184,0.15)', fontSize: 12 }}>
          <div style={{ color: '#94a3b8', marginBottom: 6 }}>Dependencies of <span style={{ color: '#60a5fa' }}>{selectedService}</span>:</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {deps[selectedService].map(d => (
              <span key={d} style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{d}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceGroup: React.FC<{ label: string; services: string[]; deps: Record<string, string[]>; uiPathFn: (name: string) => string | null }> = ({ label, services, deps, uiPathFn }) => {
  const [collapsed, setCollapsed] = useState(false);
  if (services.length === 0) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.1)', overflow: 'hidden' }}>
      <div onClick={() => setCollapsed(!collapsed)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid rgba(148,163,184,0.1)' }}>
        <ChevronRight size={14} color="#64748b" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
        <Box size={14} color={label === 'No UI' ? '#f59e0b' : '#22c55e'} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#475569' }}>{services.length}</span>
      </div>
      {!collapsed && services.map(s => (
        <ServiceRow key={s} name={s} uiPath={uiPathFn(s)} deps={deps[s] || []} />
      ))}
    </div>
  );
};

const ServiceRow: React.FC<{ name: string; uiPath: string | null; deps: string[] }> = ({ name, uiPath, deps }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid rgba(148,163,184,0.06)', hover: { background: 'rgba(148,163,184,0.05)' } }}>
    <Circle size={8} color={uiPath ? '#22c55e' : '#f59e0b'} fill={uiPath ? '#22c55e' : '#f59e0b'} />
    <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#e2e8f0', flex: 1 }}>{name}</span>
    {uiPath && <a href={`#${uiPath}`} style={{ fontSize: 11, color: '#60a5fa', textDecoration: 'none' }}>UI</a>}
    {deps.length > 0 && <span style={{ fontSize: 10, color: '#475569' }}>{deps.length} dep{deps.length > 1 ? 's' : ''}</span>}
  </div>
);

export default ServiceRegistryPanel;
