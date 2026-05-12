import React, { useState, useEffect } from 'react';
import { 
  Activity, Terminal, Network, Brain
} from 'lucide-react';
import AgentLiveBoard from '../DashboardPanel/AgentLiveBoard';
import IntelligenceGraph from '../DashboardPanel/IntelligenceGraph';
import { adminService } from '../../services/AdminService';
import { eventBus, EVENTS } from '../../core/events';
import { kernel } from '../../core/Kernel';

const LiveWorkspace: React.FC = () => {
  const [health, setHealth] = useState(adminService.getSystemHealth());
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(adminService.getSystemHealth());
    }, 2000);

    const unsubEvents = eventBus.subscribeAll(({ event, data }) => {
      setLogs(prev => [{
        time: new Date().toLocaleTimeString(),
        event: `${event}: ${data?.output?.substring(0, 50) || data?.message || 'Activity detected'}`,
        type: event.includes('error') ? 'warning' : event.includes('success') ? 'success' : 'info'
      }, ...prev].slice(0, 15));
    });

    return () => {
      clearInterval(interval);
      unsubEvents();
    };
  }, []);

  const avgLatency = (() => {
    const state = kernel.getState();
    const latencies = Object.values(state.providers).map(p => p.avgTTFT).filter(Boolean);
    return latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  })();

  const stats = [
    { label: 'Throughput', value: health.vitals.throughput, unit: 'req/m', color: '#f59e0b' },
    { label: 'Collective Latency', value: avgLatency.toString(), unit: 'ms', color: '#3b82f6' },
    { label: 'Total Requests', value: health.vitals.totalRequests, unit: 'req', color: '#10b981' },
    { label: 'Total Tokens', value: (health.vitals.totalTokens / 1000).toFixed(1), unit: 'k', color: '#a855f7' }
  ];

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: '1.5rem', overflow: 'hidden' }}>
      {/* Vitals Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{stat.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stat.value}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stat.unit}</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: `${stat.color}11`, borderRadius: 8 }}>
              <Activity size={16} color={stat.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '1.5rem', minHeight: 0 }}>
        {/* Left: Spatial Intelligence View (Graph + Board) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
          <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={18} color="#3b82f6" /> System Architecture Pulse
              </h3>
              <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} className="pulsing" /> 
                LIVE TOPOLOGY
              </div>
            </div>
            <div style={{ height: 'calc(100% - 3rem)' }}>
              <IntelligenceGraph />
            </div>
          </div>

          <div className="glass-panel" style={{ height: '320px', padding: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={18} color="#a855f7" /> Distributed Agent Radar
              </h3>
            </div>
            <AgentLiveBoard />
          </div>
        </div>

        {/* Right: Operational Stream & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
          <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={18} color="#3b82f6" /> Cognitive Event Stream
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Waiting for system events...</div>
              ) : logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>[{log.time}]</span>
                  <span style={{ 
                    color: log.type === 'warning' ? '#f59e0b' : log.type === 'success' ? '#10b981' : 'white',
                    flex: 1
                  }}>
                    {log.event}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#3b82f6" /> Control Plane Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button onClick={() => adminService.initializeRequest()} className="btn-primary" style={{ padding: '0.75rem', fontSize: '0.8rem' }}>Initialize Request</button>
              <button onClick={() => adminService.reloadRuntime()} className="btn-secondary" style={{ padding: '0.75rem', fontSize: '0.8rem' }}>Reload Runtime</button>
              <button onClick={() => adminService.manualRoute()} className="btn-secondary" style={{ padding: '0.75rem', fontSize: '0.8rem' }}>Manual Routing</button>
              <button onClick={() => setLogs([])} className="btn-secondary" style={{ padding: '0.75rem', fontSize: '0.8rem' }}>Clear Logs</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button onClick={() => eventBus.emit(EVENTS.CHECK_ALL_HEALTH)} className="btn-secondary" style={{ padding: '0.75rem', fontSize: '0.8rem' }}>Check All Providers</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWorkspace;
