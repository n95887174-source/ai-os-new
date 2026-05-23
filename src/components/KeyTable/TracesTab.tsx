import React from 'react';
import { motion } from 'framer-motion';
import { routerService } from '../../kernel/instances';
import type { RouterDecision } from '../../kernel/services/provider-router';
import type { ApiKey } from '../../types/metrics';

interface TracesTabProps {
  keyId: string;
  stats: ApiKey['stats']['extended'];
}

const TracesTab: React.FC<TracesTabProps> = ({ keyId, stats }) => {
  const decisions = routerService.getSelectionTrace(keyId) as RouterDecision[];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {decisions.length > 0 && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Router Trace ({decisions.length} decisions)
          </div>
          {decisions.map(d => {
            const skipEntry = d.skipped.find(s => s.keyId === keyId);
            const wasSelected = d.selected === (stats && 'provider' in stats ? '' : '');
            const isSelected = d.skipped.length === 0 || !d.skipped.some(s => s.keyId === keyId);
            const finalState = skipEntry
              ? { label: skipEntry.stage === 'status' ? 'Skipped' : skipEntry.stage === 'policy' ? 'Blocked' : skipEntry.stage === 'quota' ? 'Quota' : skipEntry.stage === 'budget' ? 'Budget' : 'Skipped', color: '#f59e0b', reason: skipEntry.reason }
              : isSelected
                ? { label: 'Selected', color: '#22c55e', reason: 'Active routing choice' }
                : { label: 'Scored', color: '#3b82f6', reason: 'Scored but not selected' };

            return (
              <div key={d.requestId} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#3b82f6' }}>{d.requestId}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(d.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: `${finalState.color}20`, color: finalState.color, fontWeight: 600 }}>{finalState.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>strategy: {d.strategy}</span>
                  {d.selected && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>selected: {d.selected}</span>}
                </div>
                {(skipEntry || isSelected) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {finalState.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Execution Traces {stats ? `(${(stats.traces || []).length})` : ''}
        </div>
        {stats ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '0.75rem' }}>Trace ID</th>
                <th style={{ padding: '0.75rem' }}>Task</th>
                <th style={{ padding: '0.75rem' }}>Region</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats.traces || []).map(t => (
                <tr key={t.traceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '0.75rem', color: '#3b82f6', fontFamily: 'monospace' }}>{t.traceId}</td>
                  <td style={{ padding: '0.75rem' }}>{t.taskType}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{t.region}</td>
                  <td style={{ padding: '0.75rem' }}>{t.status === 'ok' ? 'success' : t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No traces available</div>
        )}
      </div>
    </motion.div>
  );
};

export default TracesTab;
