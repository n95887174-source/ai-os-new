import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Pause, Square, Plus, Loader2, AlertTriangle,
  Activity, Circle, ArrowRight,
  Thermometer, Zap, Brain, AlertCircle, Check, MessageSquare, Sliders,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { debateEngine, debateService, cognitiveIntelligenceService, orchestrator, sessionManager } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { DebateRuntimeEvents } from '../../kernel/events/debate-runtime-events';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import type { DebateSessionSnapshot, DebatePhase, TopologyType, AgentPhase, PressureLevel, TopologyNode, DebateTopology } from '../../kernel/instances';
import type { CognitiveMetricsSnapshot, CognitivePressure, CognitiveIssue } from '../../kernel/instances';
import type { DebateArgument } from '../../kernel/instances';
import { useDebateLiveStore } from '../../stores/debateLiveStore';
import { useChatStore } from '../../stores/chat/store';
import DebateChat from '../DebatePanel/DebateChat';
import { AgentControlPanel } from './AgentControlPanel';
import { useMediaQuery } from '../../hooks/useMediaQuery';

import {
  buttonSmAction,
  cognitiveCard,
  debateRuntimeArgumentsPanel,
  debateRuntimeEmptyState,
  debateRuntimeGrid,
  debateRuntimeIssuePanel,
  debateRuntimeOverlay,
  debateRuntimeOverlayDesc,
  debateRuntimeOverlayTitle,
  debateRuntimeRoot,
  debateRuntimeSectionTitle,
  debateRuntimeSubtitle,
  debateRuntimeTabBar,
  debateRuntimeTabButton,
  debateRuntimeTitle,
  errorContainer,
  flexBetween,
  flexColGap3,
  flexColGap3FontSize075,
  flexGap2,
  flexJustifyBetween,
  flexWrapCenter,
  flexWrapGap2,
  grid2,
  h3Section,
  iconMarginRight,
  purpleBorderSection,
  textMutedWeight600Xs,
  textSecondary,
  textSecondarySm,
} from '../../styles/common';
const PHASE_COLORS: Record<DebatePhase, string> = {
  created: '#64748b', queued: '#94a3b8', initializing: '#3b82f6',
  active: '#22c55e', paused: '#f59e0b', deliberating: '#a855f7', consensus: '#f59e0b',
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
        <div style={flexWrapCenter}>
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
  const phases: DebatePhase[] = ['created', 'queued', 'initializing', 'active', 'deliberating', 'consensus', 'summarizing', 'paused', 'completed'];
  const currentIdx = phases.indexOf(phase);
  const labelMap: Record<string, string> = {
    created: 'Created', queued: 'Queued', initializing: 'Init',
    active: 'Active', deliberating: 'Deliberate', consensus: 'Consensus',
    summarizing: 'Summary', paused: 'Paused', completed: 'Done',
  };
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {phases.map((p, i) => {
        const isCurrent = i === currentIdx;
        const isPast = i <= currentIdx;
        return (
          <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 32 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isPast ? PHASE_COLORS[p] : '#2a2a3a',
              opacity: isCurrent ? 1 : 0.5,
              transition: 'all 0.3s',
            }} title={p} />
            <span style={{
              fontSize: 9, color: isCurrent ? '#e2e8f0' : isPast ? '#94a3b8' : '#475569',
              fontWeight: isCurrent ? 700 : 400,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}>
              {labelMap[p] || p}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const DebateRuntimePanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [sessions, setSessions] = useState<DebateSessionSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [topologyType, setTopologyType] = useState<TopologyType>('roundtable');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; /* Note: destroy() intentionally omitted — useDebateLiveStore is a singleton shared between DebatePanel and DebateRuntimePanel */ };
  }, []);

  const currentThinking = useDebateLiveStore(s => s.currentThinking);
  const thinkingAgentId = selectedId ? currentThinking.get(selectedId) : undefined;
  const [cognitiveMetrics, setCognitiveMetrics] = useState<CognitiveMetricsSnapshot | null>(null);
  const [cognitivePressure, setCognitivePressure] = useState<CognitivePressure | null>(null);
  const [diagnosticIssues, setDiagnosticIssues] = useState<CognitiveIssue[]>([]);
  const [linkedChatIds, setLinkedChatIds] = useState<string[]>([]);

  const [availableNodes, setAvailableNodes] = useState<Array<{ id: string; label: string; provider?: string; model?: string; prompt?: string }>>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agentRoles, setAgentRoles] = useState<Record<string, string>>({});
  const [sessionArgs, setSessionArgs] = useState<Map<string, DebateArgument[]>>(new Map());
  const [sessionViewTab, setSessionViewTab] = useState<'overview' | 'arguments' | 'controls'>('overview');
  const argsRef = useRef(sessionArgs);

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
      queueMicrotask(() => {
        setAvailableNodes(nodes);
        if (nodes.length > 0) {
          setSelectedAgentIds(nodes.map(n => n.id));
        }
      });
    } catch { /* container not ready */ }
      
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    queueMicrotask(() => { refreshSessions(); refreshCognitive(); });
    const intTimer = setInterval(() => { if (isMountedRef.current) refreshCognitive(); }, 5000);
    const unsubs = [
      eventBus.on(EVENTS.DEBATE_SESSION_CREATED, refreshSessions),
      eventBus.on(EVENTS.DEBATE_SESSION_STARTED, refreshSessions),
      eventBus.on(EVENTS.DEBATE_SESSION_COMPLETED, () => { refreshSessions(); refreshCognitive(); }),
      eventBus.on(EVENTS.DEBATE_SESSION_FAILED, () => { refreshSessions(); refreshCognitive(); }),
      eventBus.on(EVENTS.DEBATE_SESSION_CANCELLED, refreshSessions),
      eventBus.on(EVENTS.DEBATE_PHASE_CHANGED, refreshSessions),
      eventBus.onSafe<{ sessionId: string; agentId: string; chunk: string }>(DebateRuntimeEvents.AGENT_CHUNK, (d) => {
        const streamKey = `streaming-${d.agentId}`;
        const existing = argsRef.current.get(d.sessionId) || [];
        const streamIdx = existing.findIndex(a => a.id === streamKey);
        if (streamIdx >= 0) {
          const updated = [...existing];
          updated[streamIdx] = { ...updated[streamIdx], content: updated[streamIdx].content + d.chunk };
          const next = new Map(argsRef.current);
          next.set(d.sessionId, updated);
          argsRef.current = next;
          setSessionArgs(next);
        } else {
          const partial: DebateArgument = {
            id: streamKey,
            agentId: d.agentId,
            agentName: d.agentId,
            content: d.chunk,
            confidence: 0.5,
            timestamp: Date.now(),
            round: 1,
            position: 'neutral',
            source: 'llm',
          };
          const next = new Map(argsRef.current);
          next.set(d.sessionId, [...existing, partial]);
          argsRef.current = next;
          setSessionArgs(next);
        }
      }),
      eventBus.onSafe<{ sessionId: string; agentId: string; content: string }>(DebateRuntimeEvents.AGENT_RESPONDED, (d) => {
        const existing = argsRef.current.get(d.sessionId) || [];
        const streamKey = `streaming-${d.agentId}`;
        const clean = existing.filter(a => a.id !== streamKey);
        const arg: DebateArgument = {
          id: `runtime-${Date.now()}-${clean.length}`,
          agentId: d.agentId,
          agentName: d.agentId,
          content: d.content,
          confidence: 0.7,
          timestamp: Date.now(),
          round: 1,
          position: 'neutral',
          source: 'llm',
        };
        const next = new Map(argsRef.current);
        next.set(d.sessionId, [...clean, arg]);
        argsRef.current = next;
        setSessionArgs(next);
      }),
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

      const debateParticipants = selected.map((n, i) => ({
        id: n.id,
        name: n.label,
        role: (agentRoles[n.id] || availableRoles[i % availableRoles.length]) as import('../../kernel/contracts/debate-types').DebateRole,
        provider: n.provider,
        modelId: n.model,
        systemPrompt: n.prompt,
      }));

      const activeChatId = useChatStore.getState().activeSessionId;
      const session = await debateService.startTopologyDebate(topology, topic.trim(), debateParticipants, undefined, activeChatId || undefined);
      setTopic('');
      setCreating(false);
      setSelectedId(session.id);
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Debate started: ${topic}`, type: 'success' });
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  };

  const selected = sessions.find(s => s.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId) { queueMicrotask(() => setLinkedChatIds([])); return; }
    let cancelled = false;
    sessionManager.getLinked(selectedId).then(links => {
      if (!cancelled) queueMicrotask(() => setLinkedChatIds(links.map(l => l.fromId === selectedId ? l.toId : l.fromId)));
    }).catch(() => { if (!cancelled) queueMicrotask(() => setLinkedChatIds([])); });
    return () => { cancelled = true; };
  }, [selectedId]);

  return (
    <div style={debateRuntimeRoot}>
      {creating && (
        <div style={debateRuntimeOverlay}>
          <Loader2 size={40} className="animate-spin" color="#a855f7" />
          <div style={debateRuntimeOverlayTitle}>{t('debate_runtime.creating')}</div>
          <div style={debateRuntimeOverlayDesc}>{t('debate_runtime.creating_desc')}</div>
        </div>
      )}
      <div style={flexBetween}>
        <div>
          <h2 style={debateRuntimeTitle}>
            <Zap size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: '#a855f7' }} />
            {t('debate_runtime.title')}
          </h2>
          <p style={debateRuntimeSubtitle}>
            {t('debate_runtime.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" style={errorContainer}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>x</button>
        </div>
      )}

      <div style={{ ...debateRuntimeGrid, gridTemplateColumns: isMobile ? '1fr' : debateRuntimeGrid.gridTemplateColumns }}>
        <div style={purpleBorderSection}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <div style={textMutedWeight600Xs}>
                    {t('debate_runtime.select_agents', { selected: selectedAgentIds.length })}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setSelectedAgentIds(availableNodes.map(n => n.id))}
                      style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                    >All</button>
                    <button
                      onClick={() => setSelectedAgentIds([])}
                      style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                    >None</button>
                  </div>
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
          <h3 style={debateRuntimeSectionTitle}>
            <Activity size={16} />             {t('debate_runtime.active_sessions', { count: sessions.length })}
          </h3>
          {sessions.length === 0 ? (
            <div style={debateRuntimeEmptyState}>
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
        <div style={purpleBorderSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              {selected.topic}
              <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
                background: `${PHASE_COLORS[selected.phase]}20`, color: PHASE_COLORS[selected.phase],
              }}>{selected.phase}</span>
              {linkedChatIds.map(linkedId => (
                <button key={linkedId} onClick={(e) => { e.stopPropagation(); navigate(`/chat?session=${linkedId}`); }}
                  style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                  title="Open linked chat">💬 Chat</button>
              ))}
            </h3>
            <div style={flexGap2}>
              {(selected.phase === 'active' || selected.phase === 'deliberating') && (
                <button onClick={() => { debateService.pauseDebateSession(selected.id); refreshSessions(); }} style={{
                  ...buttonSmAction, background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
                }}><Pause size={14} /> {t('debate_runtime.pause')}</button>
              )}
              {selected.phase === 'created' && (
                <button onClick={() => { debateService.startDebateSession(selected.id); refreshSessions(); }} disabled={actionLoading === selected.id} style={{
                  ...buttonSmAction, cursor: actionLoading === selected.id ? 'not-allowed' : 'pointer',
                  background: actionLoading === selected.id ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)',
                  color: '#22c55e',
                }}>{actionLoading === selected.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {t('debate_runtime.start')}</button>
              )}
              {['active', 'deliberating', 'paused'].includes(selected.phase) && (
                <button onClick={() => { debateService.cancelDebateSession(selected.id); refreshSessions(); }} style={{
                  ...buttonSmAction, background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                }}><Square size={14} /> {t('debate_runtime.cancel')}</button>
              )}
            </div>
          </div>

          <div style={debateRuntimeTabBar}>
            <button onClick={() => setSessionViewTab('overview')} style={{
              ...debateRuntimeTabButton,
              color: sessionViewTab === 'overview' ? '#a78bfa' : '#64748b',
              borderBottom: sessionViewTab === 'overview' ? '2px solid #a78bfa' : '2px solid transparent',
            }}>{t('debate_runtime.overview')}</button>
            <button onClick={() => setSessionViewTab('arguments')} style={{
              ...debateRuntimeTabButton,
              color: sessionViewTab === 'arguments' ? '#a78bfa' : '#64748b',
              borderBottom: sessionViewTab === 'arguments' ? '2px solid #a78bfa' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}><MessageSquare size={14} /> {t('debate_runtime.arguments')} {((sessionArgs.get(selected.id) || []).length > 0) && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({(sessionArgs.get(selected.id) || []).length})</span>}</button>
            <button onClick={() => setSessionViewTab('controls')} style={{
              ...debateRuntimeTabButton,
              color: sessionViewTab === 'controls' ? '#a78bfa' : '#64748b',
              borderBottom: sessionViewTab === 'controls' ? '2px solid #a78bfa' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}><Sliders size={14} /> {t('debate_runtime.controls')}</button>
          </div>

          {sessionViewTab === 'overview' ? (
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
                <Brain size={14} style={iconMarginRight} /> {t('debate_runtime.cognitive_intelligence')}
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
                      <AlertCircle size={12} style={iconMarginRight} />
                      {t('debate_runtime.reasoning_collapse')}
                    </div>
                  )}
                </div>
              )}
              {cognitivePressure && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(100,116,139,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a78bfa', marginBottom: '0.3rem' }}>
                    <Thermometer size={12} style={iconMarginRight} />
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
        ) : (
          <div style={debateRuntimeArgumentsPanel}>
            {(sessionArgs.get(selected.id) || []).length === 0 ? (
              <div style={debateRuntimeEmptyState}>
                {t('debate_runtime.no_arguments_yet')}
              </div>
            ) : (() => {
              const args = sessionArgs.get(selected.id) || [];
              const streamingIds = new Set(args.filter(a => a.id.startsWith('streaming-')).map(a => a.id));
              return (
                <DebateChat
                  arguments={args}
                  isActive={selected.phase === 'active' || selected.phase === 'deliberating'}
                  t={(key: string) => t(`debate.${key}`)}
                  streamingArgIds={streamingIds}
                />
              );
            })()}
          </div>
        )}
        {sessionViewTab === 'controls' && (
          <AgentControlPanel session={selected} />
        )}
        </div>
      )}

      {diagnosticIssues.length > 0 && (
        <div style={debateRuntimeIssuePanel}>
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
        <div style={cognitiveCard}>
          <h4 style={h3Section}>
            <Brain size={14} style={iconMarginRight} /> {t('debate_runtime.cognitive_metrics')}
          </h4>
          {cognitiveMetrics ? (
                <div style={flexColGap3FontSize075}>
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
        <div style={cognitiveCard}>
          <h4 style={h3Section}>
            <Thermometer size={14} style={iconMarginRight} /> {t('debate_runtime.cognitive_pressure_title')}
          </h4>
          {cognitivePressure ? (
            <div style={flexColGap3FontSize075}>
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
