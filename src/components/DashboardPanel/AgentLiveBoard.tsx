import React, { useState, useEffect } from 'react';
import { 
  Bot, Zap, Wrench, 
  Brain, Terminal, Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { eventBus } from '../../core/events';
import { estimateTokens } from '../../utils/tokenEstimate';

import { orchestrator } from '../../services/OrchestrationService';

interface AgentLiveState {
  id: string;
  name: string;
  status: 'idle' | 'thinking' | 'acting' | 'debating' | 'routing';
  currentTask?: string;
  model: string;
  latency: number;
  tokens: number;
  lastStep?: string;
  toolsInUse: string[];
}

const getAgentsFromTopology = (): AgentLiveState[] => {
  const top = orchestrator.getActiveTopology();
  if (!top) return [];
  return top.nodes.map(n => ({
    id: n.id,
    name: n.label,
    status: 'idle',
    model: n.config.model || 'auto',
    latency: 0,
    tokens: 0,
    toolsInUse: n.config.tools || []
  }));
};

const AgentLiveBoard: React.FC = () => {
  const [agents, setAgents] = useState<AgentLiveState[]>(getAgentsFromTopology());

  useEffect(() => {
    const unsubMount = eventBus.on('system:topology:mounted', () => {
      setAgents(getAgentsFromTopology());
    });

    const unsubActive = eventBus.on('cognitive:step:active', (data) => {
      setAgents(prev => prev.map(a => 
        a.id === (data as Record<string, unknown>).nodeId ? { ...a, status: 'acting', currentTask: 'Processing request...', lastStep: 'Executing step' } : a
      ));
    });

    const unsubCompleted = eventBus.on('cognitive:step:completed', (data) => {
      setAgents(prev => prev.map(a => 
        a.id === (data as Record<string, unknown>).nodeId ? { ...a, status: 'idle', currentTask: undefined, lastStep: (data as Record<string, unknown>).output as string | undefined, latency: (data as Record<string, unknown>).duration as number, tokens: a.tokens + estimateTokens(((data as Record<string, unknown>).output as string) || '') } : a
      ));
    });

    return () => {
      unsubMount();
      unsubActive();
      unsubCompleted();
    };
  }, []);

  const getStatusColor = (status: AgentLiveState['status']) => {
    switch (status) {
      case 'thinking': return '#3b82f6';
      case 'acting': return '#10b981';
      case 'debating': return '#a855f7';
      case 'routing': return '#f59e0b';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
      {agents.map(agent => (
        <motion.div
          key={agent.id}
          layout
          className="glass-panel"
          style={{ 
            padding: '1.5rem', 
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${agent.status !== 'idle' ? getStatusColor(agent.status) + '33' : 'var(--border)'}`
          }}
          whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
        >
          {/* Active Pulse Glow */}
          {agent.status !== 'idle' && (
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at top right, ${getStatusColor(agent.status)}11, transparent)` }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ 
                width: 52, height: 52, borderRadius: 14, 
                background: 'rgba(255,255,255,0.03)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                border: '1px solid var(--border)',
                position: 'relative'
              }}>
                <Bot size={28} color={agent.status === 'idle' ? 'var(--text-muted)' : getStatusColor(agent.status)} />
                {agent.status !== 'idle' && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: getStatusColor(agent.status), border: '2px solid var(--bg-main)' }}
                  />
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{agent.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: getStatusColor(agent.status), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {agent.status === 'thinking' && <Brain size={12} className="pulsing" />}
                  {agent.status === 'acting' && <Zap size={12} />}
                  {agent.status === 'debating' && <Share2 size={12} />}
                  {agent.status}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>MODEL</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{agent.model}</div>
            </div>
          </div>

          {/* Activity Content */}
          <div style={{ minHeight: 80, marginBottom: '1.5rem', position: 'relative' }}>
            {agent.status !== 'idle' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Current Objective</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', lineHeight: 1.4 }}>{agent.currentTask}</div>
                <div style={{ 
                  padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, 
                  border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)',
                  display: 'flex', gap: 8, alignItems: 'center'
                }}>
                  <Terminal size={12} />
                  <span style={{ fontFamily: 'monospace' }}>{agent.lastStep}</span>
                </div>
              </motion.div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.9rem', fontStyle: 'italic' }}>
                Standing by for next task...
              </div>
            )}
          </div>

          {/* Footer Metrics */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Memory</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{(agent.tokens / 1024).toFixed(1)}k ctx</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Latency</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: agent.latency < 500 ? '#10b981' : '#f59e0b' }}>{agent.latency}ms</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {agent.toolsInUse.map(tool => (
                <div key={tool} title={tool} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Wrench size={14} color="#3b82f6" />
                </div>
              ))}
            </div>
          </div>

          {/* Visual Step Indicator (Progress Bar Style) */}
          {agent.status !== 'idle' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.05)' }}>
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ width: '30%', height: '100%', background: getStatusColor(agent.status), filter: 'blur(2px)' }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default AgentLiveBoard;
