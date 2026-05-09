import React, { useState } from 'react';
import { Activity, Shield } from 'lucide-react';
import { keyService } from '../../services/KeyService';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import type { ApiKey } from '../../types/metrics';

interface RoutingSLAViewProps {
  keys: ApiKey[];
}

const RoutingSLAView: React.FC<RoutingSLAViewProps> = ({ keys }) => {
  const [globalSLA, setGlobalSLAState] = useState('BALANCED');

  const handleSetGlobalSLA = (mode: string) => {
    setGlobalSLAState(mode);
    keyService.setGlobalSLA(mode);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Activity size={20} color="#3b82f6" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Global Routing Policy</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Global SLA Mode</label>
            <select 
              value={globalSLA}
              onChange={(e) => handleSetGlobalSLA(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'white' }}
            >
              <option value="LOW_LATENCY">Lowest Latency (Racing Mode)</option>
              <option value="HIGH_QUALITY">Maximum Reliability / Quality</option>
              <option value="BALANCED">Balanced (Smart Semantic)</option>
              <option value="ECONOMY">Economy (Lowest Cost)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Latency Threshold (ms)</label>
            <input type="range" min="100" max="5000" defaultValue="1500" style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              <span>100ms</span>
              <span>1500ms</span>
              <span>5000ms</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Automatic Fallback</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retry on alternative provider if primary fails</div>
            </div>
            <div style={{ width: 40, height: 20, borderRadius: 20, background: '#3b82f6', position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', right: 2, top: 2 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Shield size={20} color="#10b981" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Provider SLAs</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {keys.filter(k => k.status === 'active').map(key => {
            const ext = key.stats?.extended;
            const reputation = ext?.reputationScore || 0;
            const repColor = reputation > 80 ? '#10b981' : reputation > 50 ? '#f59e0b' : '#ef4444';
            return (
              <div key={key.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <ProviderIcon provider={key.provider} size={16} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{key.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Uptime: {key.stats?.successCount || key.stats?.errorCount ? (key.stats.successCount / (key.stats.successCount + key.stats.errorCount) * 100).toFixed(2) : '100'}% &middot; Latency: {Math.round(key.stats?.avgLatency || 0)}ms
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: repColor }}>
                  {ext?.state || 'HEALTHY'}
                </div>
              </div>
            );
          })}
          {keys.filter(k => k.status === 'active').length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem' }}>
              No active providers to monitor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutingSLAView;
