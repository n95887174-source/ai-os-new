import React, { useEffect, useState, useMemo } from 'react';
import { Terminal, AlertTriangle, Info, Zap, Activity, Search } from 'lucide-react';
import { adminService } from '../../kernel/instances';
import { eventBus } from '../../core/events';
import type { AdminAuditEntry } from '../../kernel/instances';

const SEVERITY_ICONS = {
  error: <AlertTriangle size={14} color="#ef4444" />,
  warning: <Zap size={14} color="#f59e0b" />,
  info: <Info size={14} color="#3b82f6" />,
};

const AuditLogView: React.FC = () => {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const refresh = () => setEntries(adminService.getAuditLog(200) ?? []);
    refresh();
    const unsub = eventBus.on('system:notification', () => setTimeout(refresh, 100));
    const interval = setInterval(refresh, 5000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const filtered = useMemo(() => {
    let result = entries;
    if (severityFilter !== 'all') result = result.filter(e => e.severity === severityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q)
      );
    }
    return result.reverse();
  }, [entries, severityFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={20} color="#3b82f6" />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>Request Audit Log</h2>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({entries.length} entries)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter entries..."
              style={{ padding: '0.4rem 0.75rem 0.4rem 2rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '0.8rem', width: 180, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.15rem' }}>
            {['all', 'info', 'warning', 'error'].map(s => (
              <button
                key={s} onClick={() => setSeverityFilter(s)}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: 6, border: 'none',
                  background: severityFilter === s ? 'rgba(59,130,246,0.2)' : 'transparent',
                  color: severityFilter === s ? '#60a5fa' : '#64748b',
                  cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {filtered.length > 0 ? filtered.map(e => (
          <div
            key={e.id}
            style={{
              display: 'flex', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 8,
              background: e.severity === 'error' ? 'rgba(239,68,68,0.05)' : 'rgba(0,0,0,0.15)',
              border: `1px solid ${e.severity === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)'}`,
              alignItems: 'center',
            }}
          >
            <span style={{ flexShrink: 0 }}>{SEVERITY_ICONS[e.severity]}</span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', flexShrink: 0, width: 60 }}>
              {new Date(e.timestamp).toLocaleTimeString()}
            </span>
            <span style={{
              padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
              background: 'rgba(255,255,255,0.05)', color: '#64748b', textTransform: 'uppercase', flexShrink: 0,
            }}>{e.action}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{e.actor}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0 }}>→</span>
            <span style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600, flexShrink: 0 }}>{e.target}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.details}
            </span>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Activity size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div>No audit entries</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
