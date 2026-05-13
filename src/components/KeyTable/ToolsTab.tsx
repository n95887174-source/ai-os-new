import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Cpu, AlertCircle, Lightbulb } from 'lucide-react';
import { keyService } from '../../services/KeyService';

interface ToolsTabProps {
  keyId: string;
}

const ToolsTab: React.FC<ToolsTabProps> = ({ keyId }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <button 
        onClick={() => keyService.refreshModels(keyId)}
        className="glass-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <RefreshCw size={24} color="#3b82f6" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Refresh Models</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fetch available models via API</div>
        </div>
      </button>

      <button 
        onClick={() => keyService.runBenchmark(keyId)}
        className="glass-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Cpu size={24} color="#10b981" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Stress Test</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Run benchmark to evaluate performance</div>
        </div>
      </button>

      <button 
        onClick={() => keyService.runAdvisor(keyId)}
        className="glass-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Lightbulb size={24} color="#f59e0b" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Run Advisor</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Analyze provider and suggest optimizations</div>
        </div>
      </button>
    </div>

    <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: 12, padding: '1.25rem', border: '1px solid rgba(239,68,68,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <AlertCircle size={14} color="#ef4444" />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>DANGER ZONE</span>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Reset all metrics and history for this provider. This action is irreversible.</p>
      <button onClick={() => keyService.resetStats(keyId)} className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>Reset Statistics</button>
    </div>
  </motion.div>
);

export default ToolsTab;
