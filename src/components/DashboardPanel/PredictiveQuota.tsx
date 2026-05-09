import React from 'react';
import { Clock, BatteryCharging, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PredictiveQuotaProps {
  usedTokens: number;
  maxTokens: number;
  requestsCount: number;
}

const PredictiveQuota: React.FC<PredictiveQuotaProps> = ({ usedTokens, maxTokens, requestsCount: _requestsCount }) => {
  const percent = Math.min(100, (usedTokens / (maxTokens || 1000000)) * 100);
  
  // Assuming the current usage was accumulated over the last 4 hours (average session)
  const tokensPerHour = usedTokens / 4;
  const tokensRemaining = maxTokens - usedTokens;
  const hoursRemaining = tokensPerHour > 0 ? Math.min(48, Math.round(tokensRemaining / tokensPerHour)) : 24;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <BatteryCharging size={16} color="#3b82f6" />
        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Quota Analysis (Prediction)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Daily Token Budget</span>
            <span style={{ fontWeight: 700 }}>{Math.round(usedTokens / 1000)}k / {Math.round(maxTokens / 1000)}k</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              style={{ 
                height: '100%', 
                background: percent > 80 ? '#ef4444' : percent > 50 ? '#f59e0b' : '#3b82f6',
                boxShadow: percent > 80 ? '0 0 10px rgba(239,68,68,0.5)' : 'none'
              }}
            />
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={18} color={percent > 80 ? '#ef4444' : '#10b981'} />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ESTIMATED TIME REMAINING</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>~{hoursRemaining}h</div>
            </div>
          </div>
        </div>

        {percent > 70 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.7rem' }}>
            <AlertCircle size={12} />
            <span>High usage detected. System may activate throttling.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveQuota;
