import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Square, Plus, Loader2, AlertTriangle,
  Activity, Circle, ArrowRight, Radio,
  Thermometer, Zap, Brain, AlertCircle, Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { debateEngine } from '../../kernel/instances';
import { cognitiveIntelligenceService } from '../../kernel/instances';
import { orchestrator } from '../../kernel/instances';
import { eventBus } from '../../core/events';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import type { DebateSessionSnapshot, DebatePhase, TopologyType, AgentPhase, PressureLevel, TopologyNode, DebateTopology } from '../../kernel/instances';
import type { CognitiveMetricsSnapshot, CognitivePressure, CognitiveIssue } from '../../kernel/instances';
import { useDebateLiveStore } from '../../stores/debateLiveStore';

import { flexBetween, flexColGap3, flexGap2, flexJustifyBetween, flexWrapGap2, grid2, h3Section, textMutedWeight600Xs, textSecondary, textSecondarySm } from '../../styles/common';
const PHASE_COLORS: Record<DebatePhase, string> = {
  created: '#64748b', queued: '#94a3b8', initializing: '#3b82f6',
  active: '#22c55e', deliberating: '#a855f7', consensus: '#f59e0b',
  summarizing: '#06b6d4', completed: '#22c55e', failed: '#ef4444', cancelled: '#64748b',
};

const AGENT_COLORS: Record<AgentPhase, string> = {
  idle: '#64748b', thinking: '#3b82f6', waiting: '#94a3b8',
  streaming: '#22c55e', errored: '#ef4444', 'rate-limited': '#f59e0b',
  fallback: '#f97316', 'timed-out': '#dc2626', completed: '#22c55e',
};

const PRESSURE_COLORS: Record<PressureLevel, string> = {
  low: '#22c55e', normal: '#3b82f6', high: '#f59e0b', critical: '#ef4444',
};

const TOPOLOGY_TYPES: TopologyType[] = ['linear', 'roundtable', 'judge', 'tree-of-thought', 'red-blue'];

const ROLE_COLORS: Record<string, string> = {
  pro: '#3b82f6', con: '#ef4444', neutral: '#94a3b8',
  judge: '#a855f7', attacker: '#f97316', defender: '#22c55e',
};

const TOPOLOGY_ROLES: Record<TopologyType, string[]> = {
  linear: ['pro', 'con'],
  roundtable: ['pro', 'con', 'neutral'],
  judge: ['pro', 'con', 'judge'],
  'tree-of-thought': ['pro', 'con', 'neutral'],
  'red-blue': ['attacker', 'defender', 'judge'],
};

function TopologyDiagram({ topology }: { topology: DebateTopology }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
      {topology.edges.length === 0 ? (
        <div style={flexWrapGap2}>
          {topology.nodes.map(node => (
            <div key={node.id} style={{
              padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
              background: `${ROLE_COLORS[node.role] || '#64748b'}20`,
              border: `1px solid ${ROLE_COLORS[node.role] || '#64748b'}40`,
              color: ROLE_COLORS[node.role] || '#94a3b8',
            }}>
              {node.label}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {topology.edges.map((edge, i) => {
            const from = topology.nodes.find(n => n.id === edge.from);
            const to = topology.nodes.find(n => n.id === edge.to);
            return (
              <React.Fragment key={i}>
                <span style={{ padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                  background: `${ROLE_COLORS[from?.role || '']}20`,
                  border: `1px solid ${ROLE_COLORS[from?.role || '']}40`,
                  color: ROLE_COLORS[from?.role || ''] || '#94a3b8',
                }}>{from?.label || edge.from}</span>
                <ArrowRight size={14} style={textSecondary} />
                <span style={{ padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                  background: `${ROLE_COLORS[to?.role || '']}20`,
                  border: `1px solid ${ROLE_COLORS[to?.role || '']}40`,
                  color: ROLE_COLORS[to?.role || ''] || '#94a3b8',
                }}>{to?.label || edge.to}</span>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhaseTimeline({ phase }: { phase: DebatePhase }) {
  const phases: DebatePhase[] = ['created', 'initializing', 'active', 'deliberating', 'consensus', 'summarizing', 'completed'];
  const currentIdx = phases.indexOf(phase);
  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      {phases.map((p, i) => (
        <div key={p} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i <= currentIdx ? PHASE_COLORS[p] : '#2a2a3a',
          opacity: i === currentIdx ? 1 : 0.5,
          transition: 'all 0.3s',
        }} title={p} />
      ))}
    </div>
  );
}

const DebateRuntimePanel: React.FC = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<DebateSessionSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [topologyType, setTopologyType] = useState<TopologyType>('roundtable');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const currentThinking = useDebateLiveStore(s => s.currentThinking);
  const thinkingAgentId = selectedId ? currentThinking.get(selectedId) : undefined;
  const [cognitiveMetrics, setCognitiveMetrics] = useState<CognitiveMetricsSnapshot | null>(null);
  const [cognitivePressure, setCognitivePressure] = useState<CognitivePressure | null>(null);
  const [diagnosticIssues, setDiagnosticIssues] = useState<CognitiveIssue[]>([]);

  const [availableNodes, setAvailableNodes] = useState<Array<{ id: string; label: string; provider?: string; model?: string; prompt?: string }>>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agentRoles, setAgentRoles] = useState<Record<string, string>>({});

  const refreshCognitive = useCallback(() => {
    try {
      setCognitiveMetrics(cognitiveIntelligenceService.getMetrics());
      setCognitivePressure(cognitiveIntelligenceService.getPressure());
      setDiagnosticIssues(cognitiveIntelligenceService.getActiveIssues());
    } catch { /* container not ready */ }
  }, []);

  const refreshSessions = useCallback(() => {
    try {
      const active = debateEngine.getActiveSessions() || [];
      setSessions([...active]);
    } catch { /* container not ready */ }
  }, []);

  useEffect(() => {
    try {
      const top = orchestrator.getActiveTopology();
      const nodes = (top?.nodes || []).filter((n: { type: string }) => n.type === 'agent').map((n: { id: string; label: string; config: Record<string, unknown> }) => ({
        id: n.id,
        label: n.label,
        provider: n.config?.provider as string | undefined,
        model: n.config?.model as string | undefined,
        prompt: n.config?.prompt as string | undefined,
      }));
      setAvailableNodes(nodes);
      if (nodes.length > 0) {
        setSelectedAgentIds(nodes.slice(0, Math.min(3, nodes.length)).map(n => n.id));
      }
    } catch { /* container not ready */ }
  }, []);

  useEffect(() => {
    refreshSessions();
    refreshCognitive();
    const intTimer = setInterval(refreshCognitive, 5000);
    const unsubs = [
      eventBus.on('debate-runtime:session:created', refreshSessions),
      eventBus.on('debate-runtime:session:started', refreshSessions),
      eventBus.on('debate-runtime:session:completed', () => { refreshSessions(); refreshCognitive(); }),
      eventBus.on('debate-runtime:session:failed', () => { refreshSessions(); refreshCognitive(); }),
      eventBus.on('debate-runtime:session:cancelled', refreshSessions),
      eventBus.on('debate-runtime:phase:changed', refreshSessions),
    ];
    return () => { clearInterval(intTimer); unsubs.forEach(u => u()); };
  }, [refreshSessions, refreshCognitive]);

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const availableRoles = TOPOLOGY_ROLES[topologyType];

  const buildPreviewTopology = (): DebateTopology => {
    const selected = availableNodes.filter(n => selectedAgentIds.includes(n.id));
    const participants = selected.length > 0 ? selected : [{ id: 'a', label: 'Agent A' }, { id: 'b', label: 'Agent B' }];
    return {
      id: 'preview',
      type: topologyType,
      nodes: participants.map((n, i) => ({
        id: n.id,
        label: n.label,
        role: (agentRoles[n.id] || availableRoles[i % availableRoles.length] || 'pro') as TopologyNode['role'],
      })),
      edges: topologyType === 'linear'
        ? participants.slice(0, -1).map((n, i) => ({ from: n.id, to: participants[i + 1].id, type: 'sequential' as const }))
        : topologyType === 'judge' && participants.length >= 2
          ? participants.filter(p => (agentRoles[p.id] || 'pro') !== 'judge').map(p => ({
              from: p.id, to: participants.find(q => (agentRoles[q.id] || '') === 'judge' || q.id === participants[participants.length - 1].id)?.id || participants[participants.length - 1].id,
              type: 'sequential' as const,
            }))
          : topologyType === 'red-blue'
            ? [{ from: participants[0]?.id || '', to: participants[1]?.id || participants[0]?.id || '', type: 'sequential' as const }]
            : [],
    };
  };

  const handleCreate = async () => {
    if (!topic.trim()) { setError(t('debate_runtime.error_topic_required')); return; }
    if (selectedAgentIds.length < 2) { setError(t('debate_runtime.error_agents_required')); return; }
    setCreating(true);
    setError(null);
    try {
      const selected = availableNodes.filter(n => selectedAgentIds.includes(n.id));
      const topology: DebateTopology = {
        id: `top-${Date.now()}`,
        type: topologyType,
        nodes: selected.map((n, i) => ({
          id: n.id,
          label: n.label,
          role: (agentRoles[n.id] || availableRoles[i % availableRoles.length]) as TopologyNode['role'],
          modelId: n.model,
          provider: n.provider,
        })),
        edges: topologyType === 'linear'
          ? selected.slice(0, -1).map((n, i) => ({ from: n.id, to: selected[i + 1].id, type: 'sequential' as const }))
          : topologyType === 'judge'
            ? selected.filter(n => (agentRoles[n.id] || 'pro') !== 'judge').map(p => ({
                from: p.id,
                to: selected.find(q => (agentRoles[q.id] || '') === 'judge')?.id || selected[selected.length - 1].id,
                type: 'sequential' as const,
              }))
            : topologyType === 'red-blue'
              ? [{ from: selected[0].id, to: selected[selected.length - 1].id, type: 'sequential' as const }]
              : [],
      };

      const participants = selected.map(n => ({
        agentId: n.id,
        nodeId: n.id,
        provider: n.provider,
        modelId: n.model,
        systemPrompt: n.prompt,
      }));

      const id = debateEngine.createSession(topology, topic.trim(), participants);
      setTopic('');
      setCreating(false);
      setSelectedId(id);
      eventBus.emit('system:notification', { message: `Debate session created: ${topic}`, type: 'success' });
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  };

  const handleStart = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      await debateEngine.startSession(id);
    } catch (e) {
      setError(String(e));
    }
    setActionLoading(null);
  };

  const selected = sessions.find(s => s.id === selectedId) || null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', padding: '1rem 0', position: 'relative' }}>
      {creating && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, borderRadius: 'inherit' }}>
          <Loader2 size={40} className="animate-spin" color="#a855f7" />
          <div style={{ marginTop: '1rem', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>{t('debate_runtime.creating')}</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>{t('debate_runtime.creating_desc')}</div>
        </div>
      )}
      <div style={flexBetween}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0' }}>
            <Zap size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: '#a855f7' }} />
            {t('debate_runtime.title')}
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {t('debate_runtime.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>x</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{
          padding: '1.25rem', borderRadius: 12, background: 'rgba(30,30,50,0.4)',
          border: '1px solid rgba(139,92,246,0.15)',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> {t('debate_runtime.new_session')}
          </h3>
          <div style={flexColGap3}>
            <input
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={t('debate_runtime.topic_placeholder')}
              aria-label={t('debate_runtime.topic_aria')}
              style={{
                padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)',
                background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <select
              value={topologyType} onChange={e => setTopologyType(e.target.value as TopologyType)}
              aria-label={t('debate_runtime.topology_aria')}
              style={{
                padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)',
                background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none',
              }}
            >
              {TOPOLOGY_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('-', ' ')}</option>
              ))}
            </select>

            {availableNodes.length > 0 && (
              <div>
                <div style={textMutedWeight600Xs}>
                  {t('debate_runtime.select_agents', { selected: selectedAgentIds.length })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 160, overflowY: 'auto' }}>
                  {availableNodes.map(node => {
                    const selected = selectedAgentIds.includes(node.id);
                    return (
                      <div key={node.id} onClick={() => toggleAgent(node.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem',
                        borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem',
                        background: selected ? 'rgba(139,92,246,0.12)' : 'transparent',
                        border: `1px solid ${selected ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.15)'}`,
                      }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${selected ? '#a78bfa' : '#475569'}`,
                          background: selected ? '#a78bfa' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{selected && <Check size={12} color="#fff" />}</div>
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{node.label}</span>
                        {node.provider && <span style={{ color: '#64748b', marginLeft: 'auto' }}>{node.provider}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedAgentIds.length > 0 && (
              <div>
                <div style={textMutedWeight600Xs}>
                  {t('debate_runtime.role_assignment')}
                </div>
                {selectedAgentIds.map(id => {
                  const node = availableNodes.find(n => n.id === id);
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                      <span style={{ color: '#e2e8f0', minWidth: 80 }}>{node?.label || id}</span>
                      <select
                        value={agentRoles[id] || availableRoles[0] || 'pro'}
                        onChange={e => setAgentRoles(prev => ({ ...prev, [id]: e.target.value }))}
                        style={{
                          padding: '0.25rem 0.4rem', borderRadius: 4, border: '1px solid rgba(100,116,139,0.3)',
                          background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.7rem', outline: 'none',
                        }}
                      >
                        {availableRoles.map(r => (
                          <option key={r} value={r} style={{ color: ROLE_COLORS[r] || '#e2e8f0' }}>{r}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={handleCreate} disabled={creating || !topic.trim() || selectedAgentIds.length < 2} style={{
              padding: '0.6rem', borderRadius: 8, border: 'none', cursor: creating || selectedAgentIds.length < 2 ? 'not-allowed' : 'pointer',
              background: (creating || selectedAgentIds.length < 2) ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.6)',
              color: '#fff', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {t('debate_runtime.create_session')}
            </button>
          </div>
          <TopologyDiagram topology={buildPreviewTopology()} />
        </div>

        <div style={flexColGap3}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={16} />             {t('debate_runtime.active_sessions', { count: sessions.length })}
          </h3>
          {sessions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              {t('debate_runtime.no_sessions')}
            </div>
          ) : (
            sessions.map(s => (
              <div key={s.id} onClick={() => setSelectedId(s.id)} style={{
                padding: '0.75rem 1rem', borderRadius: 10, cursor: 'pointer',
                background: selectedId === s.id ? 'rgba(139,92,246,0.1)' : 'rgba(30,30,50,0.3)',
                border: `1px solid ${selectedId === s.id ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.15)'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{s.topic}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 4,
                    background: `${PHASE_COLORS[s.phase]}20`, color: PHASE_COLORS[s.phase],
                  }}>{s.phase}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>{t('debate_runtime.round', { value: s.round })}</span>
                  <span>{t('debate_runtime.topology', { value: s.topology.type })}</span>
                  <span>{t('debate_runtime.agents_count', { count: s.agentStates.length })}</span>
                </div>
                <PhaseTimeline phase={s.phase} />
              </div>
            ))
          )}
        </div>
      </div>

      {selected && (
        <div style={{
          padding: '1.25rem', borderRadius: 12, background: 'rgba(30,30,50,0.4)',
          border: '1px solid rgba(139,92,246,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
              {selected.topic}
              <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
                background: `${PHASE_COLORS[selected.phase]}20`, color: PHASE_COLORS[selected.phase],
              }}>{selected.phase}</span>
            </h3>
            <div style={flexGap2}>
              {(selected.phase === 'active' || selected.phase === 'deliberating') && (
                <button onClick={() => debateEngine.pauseSession(selected.id)} style={{
                  padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 600, fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}><Pause size={14} /> {t('debate_runtime.pause')}</button>
              )}
              {selected.phase === 'active' && (
                <button onClick={() => handleStart(selected.id)} disabled={actionLoading === selected.id} style={{
                  padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', cursor: actionLoading === selected.id ? 'not-allowed' : 'pointer',
                  background: actionLoading === selected.id ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)',
                  color: '#22c55e', fontWeight: 600, fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>{actionLoading === selected.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {t('debate_runtime.start')}</button>
              )}
              {['active', 'deliberating'].includes(selected.phase) && (
                <button onClick={() => debateEngine.cancelSession(selected.id)} style={{
                  padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600, fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}><Square size={14} /> {t('debate_runtime.cancel')}</button>
              )}
            </div>
          </div>

          <div style={grid2}>
            <div>
              <h4 style={h3Section}>Topology</h4>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                {t('debate_runtime.type')} <strong style={{ color: '#e2e8f0' }}>{selected.topology.type}</strong>
              </div>
              <TopologyDiagram topology={selected.topology} />

              <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {t('debate_runtime.agent_states')}
                {thinkingAgentId && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 700 }}
                  >
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    {t('debate_runtime.thinking', { agent: thinkingAgentId })}
                  </motion.span>
                )}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selected.agentStates.map(a => (
                  <div key={a.agentId} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.6rem', borderRadius: 6,
                    background: `${AGENT_COLORS[a.phase]}10`,
                  }}>
                    <Circle size={8} fill={AGENT_COLORS[a.phase]} color={AGENT_COLORS[a.phase]} />
                    <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{a.agentId}</span>
                    <span style={{ fontSize: '0.7rem', color: AGENT_COLORS[a.phase], marginLeft: 'auto' }}>{a.phase}</span>
                    {a.tokensUsed > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t('debate_runtime.tokens_short', { value: a.tokensUsed })}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={h3Section}>{t('debate_runtime.phase')}</h4>
              <PhaseTimeline phase={selected.phase} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                {t('debate_runtime.round', { value: selected.round })}
              </div>

              <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                <Brain size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {t('debate_runtime.cognitive_intelligence')}
              </h4>
              {cognitiveMetrics && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <div style={flexJustifyBetween}>
                    <span style={textSecondary}>{t('debate_runtime.debate_quality')}</span>
                    <span style={{ color: cognitiveMetrics.debateQuality > 0.6 ? '#22c55e' : cognitiveMetrics.debateQuality > 0.3 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                      {(cognitiveMetrics.debateQuality * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={flexJustifyBetween}>
                    <span style={textSecondary}>{t('debate_runtime.contradiction_density')}</span>
                    <span style={{ color: cognitiveMetrics.avgContradictionDensity > 0.5 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                      {(cognitiveMetrics.avgContradictionDensity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={flexJustifyBetween}>
                    <span style={textSecondary}>{t('debate_runtime.consensus_confidence')}</span>
                    <span style={{ color: cognitiveMetrics.avgConsensusConfidence > 0.6 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                      {(cognitiveMetrics.avgConsensusConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={flexJustifyBetween}>
                    <span style={textSecondary}>{t('debate_runtime.reasoning_coherence')}</span>
                    <span style={{ color: cognitiveMetrics.avgReasoningCoherence > 0.6 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                      {(cognitiveMetrics.avgReasoningCoherence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {cognitiveMetrics.reasoningCollapseDetected && (
                    <div style={{ padding: '0.3rem 0.5rem', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 600, fontSize: '0.7rem', marginTop: '0.25rem' }}>
                      <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {t('debate_runtime.reasoning_collapse')}
                    </div>
                  )}
                </div>
              )}
              {cognitivePressure && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(100,116,139,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a78bfa', marginBottom: '0.3rem' }}>
                    <Thermometer size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {t('debate_runtime.cognitive_pressure_label', { level: cognitivePressure.level })}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>{t('debate_runtime.score', { value: ((cognitivePressure.score * 100).toFixed(0)) })}</span>
                    <span>{t('debate_runtime.chains', { count: cognitivePressure.activeReasoningChains })}</span>
                    <span>{t('debate_runtime.contention', { value: ((cognitivePressure.contentionScore * 100).toFixed(0)) })}</span>
                    <span>{t('debate_runtime.complexity', { value: ((cognitivePressure.complexityScore * 100).toFixed(0)) })}</span>
                  </div>
                </div>
              )}

              <h4 style={{ margin: '1rem 0 0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                {t('debate_runtime.budget')}
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                <span>{t('debate_runtime.tokens_used', { value: selected.totalTokens })}</span>
                <span>{t('debate_runtime.cost_used', { value: selected.totalCost.toFixed(4) })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {diagnosticIssues.length > 0 && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {t('debate_runtime.active_issues', { count: diagnosticIssues.length })}
          </h4>
          {diagnosticIssues.map((issue, i) => (
            <div key={i} style={{
              padding: '0.4rem 0.6rem', marginBottom: '0.25rem', borderRadius: 6, fontSize: '0.75rem',
              background: issue.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              color: issue.severity === 'critical' ? '#fca5a5' : '#fbbf24',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>{issue.severity}</span>
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <div style={grid2}>
        <div style={{
          padding: '1rem', borderRadius: 12, background: 'rgba(30,30,50,0.3)',
          border: '1px solid rgba(100,116,139,0.15)',
        }}>
          <h4 style={h3Section}>
            <Brain size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {t('debate_runtime.cognitive_metrics')}
          </h4>
          {cognitiveMetrics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem' }}>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.debate_quality')}</span>
                <span style={{ color: cognitiveMetrics.debateQuality > 0.6 ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                  {(cognitiveMetrics.debateQuality * 100).toFixed(0)}%
                </span>
              </div>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.avg_contradiction')}</span>
                <span style={{ color: cognitiveMetrics.avgContradictionDensity > 0.4 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                  {(cognitiveMetrics.avgContradictionDensity * 100).toFixed(0)}%
                </span>
              </div>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.avg_coherence')}</span>
                <span style={{ color: cognitiveMetrics.avgReasoningCoherence > 0.6 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                  {(cognitiveMetrics.avgReasoningCoherence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.avg_confidence')}</span>
                <span style={{ color: cognitiveMetrics.avgConsensusConfidence > 0.6 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                  {(cognitiveMetrics.avgConsensusConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ) : (
            <div style={textSecondarySm}>{t('debate_runtime.waiting_session')}</div>
          )}
        </div>
        <div style={{
          padding: '1rem', borderRadius: 12, background: 'rgba(30,30,50,0.3)',
          border: '1px solid rgba(100,116,139,0.15)',
        }}>
          <h4 style={h3Section}>
            <Thermometer size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {t('debate_runtime.cognitive_pressure_title')}
          </h4>
          {cognitivePressure ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem' }}>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.level')}</span>
                <span style={{ fontWeight: 700, color: PRESSURE_COLORS[cognitivePressure.level as PressureLevel] || '#94a3b8', textTransform: 'uppercase' }}>
                  {cognitivePressure.level}
                </span>
              </div>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.active_chains')}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{cognitivePressure.activeReasoningChains}</span>
              </div>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.contention_label')}</span>
                <span style={{ color: cognitivePressure.contentionScore > 0.5 ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>
                  {(cognitivePressure.contentionScore * 100).toFixed(0)}%
                </span>
              </div>
              <div style={flexJustifyBetween}>
                <span style={textSecondary}>{t('debate_runtime.complexity_label')}</span>
                <span style={{ color: cognitivePressure.complexityScore > 0.6 ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>
                  {(cognitivePressure.complexityScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ) : (
            <div style={textSecondarySm}>{t('debate_runtime.waiting_session')}</div>
          )}
        </div>
      </div>

      <ModuleInfo moduleKey="debate_runtime" relatedModules={['debate', 'agents']} />
    </div>
  );
};

export default DebateRuntimePanel;
