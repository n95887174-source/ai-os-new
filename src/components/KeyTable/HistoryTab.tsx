import React from 'react';
import { Clock, Activity, AlertTriangle, RotateCw, Plus, Zap, Ban, CheckCircle2, MessageSquare } from 'lucide-react';
import type { ApiKey, KeyHistoryEntry } from '../../types/metrics';

interface HistoryTabProps {
  apiKey: ApiKey;
}

const ACTION_META: Record<KeyHistoryEntry['action'], { icon: React.ReactNode; color: string; label: string }> = {
  added: { icon: <Plus size={14} />, color: '#3b82f6', label: 'Added' },
  probed: { icon: <Activity size={14} />, color: '#10b981', label: 'Probe' },
  quota_exceeded: { icon: <AlertTriangle size={14} />, color: '#f59e0b', label: 'Quota Exceeded' },
  error: { icon: <Ban size={14} />, color: '#ef4444', label: 'Error' },
  rotated: { icon: <RotateCw size={14} />, color: '#8b5cf6', label: 'Rotated' },
  status_changed: { icon: <Zap size={14} />, color: '#f97316', label: 'Status Changed' },
  latency_burst: { icon: <Clock size={14} />, color: '#ec4899', label: 'Latency Burst' },
  reputation_changed: { icon: <CheckCircle2 size={14} />, color: '#06b6d4', label: 'Reputation Changed' },
  note_added: { icon: <MessageSquare size={14} />, color: '#64748b', label: 'Note Added' },
};

const HistoryTab: React.FC<HistoryTabProps> = ({ apiKey }) => {
  const history = apiKey.history || [];

  if (history.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: '#64748b' }}>
        <Clock size={32} opacity={0.3} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>No history yet</span>
        <span style={{ fontSize: '0.75rem' }}>Events will appear as the key is used and probed.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.72rem' }}>
        <Clock size={14} />
        <span>{history.length} event{history.length !== 1 ? 's' : ''}</span>
      </div>
      {[...history].reverse().map((entry) => {
        const meta = ACTION_META[entry.action];
        const time = new Date(entry.timestamp).toLocaleString();
        return (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              borderLeft: `3px solid ${meta?.color || '#64748b'}`,
              fontSize: '0.78rem',
            }}
          >
            <div style={{ color: meta?.color || '#64748b', flexShrink: 0, marginTop: 2 }}>
              {meta?.icon || <Clock size={14} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: meta?.color || '#e2e8f0', fontSize: '0.72rem' }}>
                  {meta?.label || entry.action}
                </span>
                <span style={{ color: '#475569', fontSize: '0.65rem' }}>{time}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                {entry.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTab;
