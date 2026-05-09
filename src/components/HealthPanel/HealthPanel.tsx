import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, ShieldCheck, Activity, Cpu, Database, 
  Globe, Zap, AlertCircle, CheckCircle2, Clock, 
  Server, HardDrive, RefreshCw, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useKeyStore } from '../../stores/useKeyStore';
import { adminService } from '../../services/AdminService';

const HealthPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [health, setHealth] = useState(adminService.getSystemHealth());

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(adminService.getSystemHealth());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* Vitals Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Cpu size={24} color="#3b82f6" />
            <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800 }}>CPU LOAD</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{health.vitals.cpu.toFixed(1)}%</div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: '1rem' }}>
            <motion.div animate={{ width: `${health.vitals.cpu}%` }} style={{ height: '100%', background: '#3b82f6', borderRadius: 2 }} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <HardDrive size={24} color="#a855f7" />
            <span style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 800 }}>MEMORY USAGE</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{health.vitals.memory} MB</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Allocated JS Heap</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Clock size={24} color="#10b981" />
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>SYSTEM UPTIME</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{health.uptime}s</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Since last core update</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Activity size={24} color="#f59e0b" />
            <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800 }}>THROUGHPUT</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{health.vitals.throughput} req/m</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Real-time requests/min</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Core Services */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={20} color="#3b82f6" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Kernel Services</h3>
            </div>
            <button className="btn-secondary" onClick={() => adminService.reloadRuntime()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><RefreshCw size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {health.services.map(svc => (
              <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{svc.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: Active</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: svc.status === 'ready' || svc.status === 'active' || svc.status === 'online' ? '#10b981' : '#f59e0b' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: svc.status === 'ready' || svc.status === 'active' || svc.status === 'online' ? '#10b981' : '#f59e0b' }} />
                  {svc.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Node Infrastructure */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Globe size={20} color="#10b981" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Runtime Node Status</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {keys.map(key => (
              <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                    <Zap size={16} color="#f59e0b" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{key.provider}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{key.model || 'Node connected'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: key.status === 'active' ? '#10b981' : '#ef4444' }}>
                    {key.latency ? `${key.latency}ms` : key.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PING TIME</div>
                </div>
              </div>
            ))}
            {keys.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No nodes connected to runtime.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthPanel;
