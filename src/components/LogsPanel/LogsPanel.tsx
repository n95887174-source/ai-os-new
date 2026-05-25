import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Terminal, Search, Filter, Trash2 } from 'lucide-react';
import { rootLogger } from '../../kernel/instances';
import type { LogEntry, LogLevel } from '../../kernel/contracts/logger';

const LEVEL_CONFIG: Record<LogLevel, { color: string; bg: string }> = {
  debug: { color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  warn: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

function formatTime(ts: number): string {
  return new Date(ts).toISOString().slice(11, 23);
}

export const LogsPanel: React.FC = () => {
  const [entries, setEntries] = useState<ReadonlyArray<LogEntry>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setEntries(rootLogger.getBuffer());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const services = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) {
      if (e.service) s.add(e.service);
    }
    return Array.from(s).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries.slice();
    if (levelFilter !== 'all') {
      result = result.filter(e => e.level === levelFilter);
    }
    if (serviceFilter !== 'all') {
      result = result.filter(e => e.service === serviceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.message.toLowerCase().includes(q) ||
        (e.traceId && e.traceId.toLowerCase().includes(q)) ||
        e.service.toLowerCase().includes(q)
      );
    }
    return result.reverse();
  }, [entries, levelFilter, serviceFilter, searchQuery]);

  const handleClear = useCallback(() => {
    rootLogger.clear();
    setEntries([]);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Terminal size={28} color="#94a3b8" /> Logs
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
            Buffered log entries from the kernel logger ({entries.length} entries)
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', borderRadius: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 8,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="#64748b" />
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem', borderRadius: 8, fontSize: '0.8rem',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#f8fafc', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="#64748b" />
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem', borderRadius: 8, fontSize: '0.8rem',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#f8fafc', outline: 'none', cursor: 'pointer', maxWidth: 160,
            }}
          >
            <option value="all">All Services</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
          <button
            onClick={handleClear}
            title="Clear logs"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.75rem',
              borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
              fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
            }}
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div
        className="glass-panel"
        ref={el => { if (el && autoScroll) el.scrollTop = 0; }}
        style={{ flex: 1, borderRadius: 12, overflowY: 'auto', padding: 0, minHeight: 0 }}
      >
        {filtered.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', flexDirection: 'column', gap: '1rem' }}>
            <Terminal size={48} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No log entries yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', width: 90 }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', width: 70 }}>Level</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', width: 120 }}>Service</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', width: 100 }}>Trace ID</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const lc = LEVEL_CONFIG[entry.level] ?? LEVEL_CONFIG.info;
                return (
                  <tr
                    key={`${entry.timestamp}-${i}`}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: entry.level === 'error' ? 'rgba(239,68,68,0.03)' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {formatTime(entry.timestamp)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 4,
                        background: lc.bg, color: lc.color, fontWeight: 700, fontSize: '0.7rem',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {entry.level}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {entry.service}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {entry.traceId ? entry.traceId.slice(0, 12) : '-'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#e2e8f0', wordBreak: 'break-word' }}>
                      {entry.message}
                      {entry.action && <span style={{ color: '#64748b', marginLeft: 8, fontSize: '0.75rem' }}>({entry.action})</span>}
                      {entry.latency !== undefined && <span style={{ color: '#64748b', marginLeft: 8, fontSize: '0.75rem' }}>{entry.latency}ms</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
