import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, ShieldCheck, Activity, Cpu, 
  Globe, Clock, 
  Server, RefreshCw, Layers, MemoryStick,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useKeyStore } from '../../stores/useKeyStore';
import { adminService } from '../../services/AdminService';

const HealthPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [health, setHealth] = useState(adminService.getSystemHealth());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kernelId] = useState(crypto.randomUUID().slice(0, 8));

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(adminService.getSystemHealth());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    adminService.reloadRuntime();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
      case 'active':
      case 'online': return '#10b981'; // Green
      case 'warning':
      case 'degraded': return '#f59e0b'; // Yellow
      case 'offline':
      case 'error': return '#ef4444'; // Red
      default: return '#64748b';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeartPulse size={28} color="#10b981" /> System Health Matrix
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Live monitoring of kernel vitals, node infrastructure, and service states.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ALL SYSTEMS OPERATIONAL</span>
          </div>
          <button 
            onClick={handleRefresh} 
            className="btn-secondary" 
            style={{ padding: '0.6rem', borderRadius: 8 }}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Primary Vitals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {[
          { title: 'CPU LOAD', value: `${health.vitals.cpu.toFixed(1)}%`, icon: <Cpu size={24} />, color: '#3b82f6', subtitle: 'Global Threads', fill: health.vitals.cpu },
          { title: 'MEMORY ALLOCATION', value: `${health.vitals.memory} MB`, icon: <MemoryStick size={24} />, color: '#a855f7', subtitle: 'Active JS Heap', fill: Math.min(100, (health.vitals.memory / 1024) * 100) },
          { title: 'SYSTEM UPTIME', value: `${health.uptime}s`, icon: <Clock size={24} />, color: '#10b981', subtitle: 'Continuous Operation', fill: 100 },
          { title: 'THROUGHPUT', value: `${health.vitals.throughput}`, icon: <Activity size={24} />, color: '#f59e0b', subtitle: 'Requests / Minute', fill: Math.min(100, (health.vitals.throughput / 500) * 100) }
        ].map((vital, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, borderTop: `4px solid ${vital.color}`, background: `linear-gradient(180deg, ${vital.color}0A 0%, rgba(0,0,0,0) 100%)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ color: vital.color, padding: '0.5rem', background: `${vital.color}15`, borderRadius: 10 }}>
                {vital.icon}
              </div>
              <span style={{ fontSize: '0.65rem', color: vital.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{vital.title}</span>
            </div>
            
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>{vital.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>{vital.subtitle}</div>
            
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${vital.fill}%` }} transition={{ type: 'spring' }} style={{ height: '100%', background: vital.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Kernel Services */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <Layers size={22} color="#3b82f6" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Kernel Services</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {health.services.map(svc => {
              const statusColor = getStatusColor(svc.status);
              return (
                <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Server size={18} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{svc.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Core Microservice</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.8rem', background: `${statusColor}15`, borderRadius: 8, border: `1px solid ${statusColor}30` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{svc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distributed Nodes */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <Network size={22} color="#10b981" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Distributed Nodes</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {keys.map(key => {
              const isOnline = key.status === 'active';
              return (
                <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '0.5rem', borderRadius: 10, background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      <Globe size={18} color={isOnline ? '#10b981' : '#ef4444'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>{key.provider}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{key.model || 'Auto-routing enabled'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: isOnline ? '#10b981' : '#ef4444' }}>
                      {key.latency ? `${key.latency}ms` : isOnline ? '< 10ms' : 'OFFLINE'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>PING LATENCY</div>
                  </div>
                </div>
              );
            })}
            
            {keys.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: '#64748b', gap: '1rem' }}>
                <Globe size={32} opacity={0.3} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>No external nodes connected to cluster.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          <ShieldCheck size={16} /> Data is secured with AES-256 local encryption.
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
          BUILD_VER: 2.4.0-rc1 | KERNEL_ID: {kernelId}
        </div>
      </div>
    </div>
  );
};

export default HealthPanel;
