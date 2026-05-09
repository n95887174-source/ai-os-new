import React from 'react';
import { motion } from 'framer-motion';
import type { ApiKey } from '../../types/metrics';

interface TracesTabProps {
  stats: ApiKey['stats']['extended'];
}

const TracesTab: React.FC<TracesTabProps> = ({ stats }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
  </motion.div>
);

export default TracesTab;
