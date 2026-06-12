import { genId } from '../../utils/gen-id';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Panel,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Play, Save,
  Bot, ShieldCheck, 
  Settings, Trash2,
  Wrench, Cpu, CheckCircle2,
  GitBranch, Link, Activity, MousePointerClick, AlertTriangle, Blocks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { orchestrator } from '../../kernel/instances';
import { toolService } from '../../kernel/instances';
import { useKeyStore } from '../../stores/useKeyStore';
import { AuditorTopology } from '../../kernel/state/topology-defaults';
import type { ISTopology, ISNode, ISEdge } from '../../kernel/contracts/topology';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { db } from '../../kernel/services/database-service';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import { nodeDetailRow, panelColDark, labelSection800, labelBlockUppercase, selectDarkWide, flexButtonRow } from '../../styles/common';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { t as tt } from '../../i18n/translations';

// Генерация уникального ID (совместимая)
const generateId = () => genId();

// --- CUSTOM NODE COMPONENTS ---
interface NodeComponentProps {
  id?: string;
  data: { label: string; type: string; config?: Record<string, unknown> };
  selected: boolean;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  typeLabel: string;
  children?: React.ReactNode;
}

const BaseNode = ({ data, selected, icon: Icon, color, typeLabel, children }: NodeComponentProps) => (
  <div style={{ 
    background: 'rgba(15, 23, 42, 0.95)', 
    border: `1px solid ${selected ? color : `rgba(255,255,255,0.1)`}`,
    boxShadow: selected ? `0 0 0 2px rgba(${color === '#3b82f6' ? '59,130,246' : color === '#f59e0b' ? '245,158,11' : color === '#10b981' ? '16,185,129' : '100,116,139'},0.3), 0 10px 25px -5px rgba(0,0,0,0.5)` : '0 4px 15px -3px rgba(0,0,0,0.4)',
    borderRadius: '16px',
    padding: '0',
    minWidth: '240px',
    color: 'white',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: selected ? 'scale(1.02)' : 'scale(1)'
  }}>
    {data.type !== 'entry' && <Handle type="target" position={Position.Top} style={{ background: color, width: 12, height: 12, border: '2px solid #0f172a' }} />}
    
    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', background: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)`, borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
      <div style={{ background: color, borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px rgba(0,0,0,0.2)` }}>
         <Icon size={18} color="white" strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '2px' }}>{data.label}</div>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{typeLabel}</div>
      </div>
    </div>
    
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
       {children}
    </div>
    
    {data.type !== 'exit' && <Handle type="source" position={Position.Bottom} style={{ background: color, width: 12, height: 12, border: '2px solid #0f172a' }} />}
  </div>
);

const AgentNode = ({ id, data, selected }: { id?: string; data: { label: string; type: string; config?: Record<string, unknown> }; selected: boolean }) => (
  <BaseNode id={id} data={data} selected={selected} icon={Bot} color="#3b82f6" typeLabel={tt('builder.node.agent')}>
    <div style={nodeDetailRow}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Cpu size={12}/> {tt('builder.model_engine')}</span>
      <span style={{ fontWeight: 600, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>{(data.config?.model as string) || 'Auto'}</span>
    </div>
    <div style={nodeDetailRow}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wrench size={12}/> Capabilities</span>
      <span style={{ fontWeight: 600 }}>{(data.config?.tools as unknown[])?.length || 0} active</span>
    </div>
  </BaseNode>
);

const RouterNode = ({ id, data, selected }: { id?: string; data: { label: string; type: string; config?: Record<string, unknown> }; selected: boolean }) => (
  <BaseNode id={id} data={data} selected={selected} icon={GitBranch} color="#f59e0b" typeLabel={tt('builder.node.router')}>
    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>
      Analyzes input and dynamically routes execution to the optimal branch.
    </div>
  </BaseNode>
);

const GuardrailNode = ({ id, data, selected }: { id?: string; data: { label: string; type: string; config?: Record<string, unknown> }; selected: boolean }) => (
  <BaseNode id={id} data={data} selected={selected} icon={ShieldCheck} color="#10b981" typeLabel={tt('builder.node.guardrail')}>
    <div style={nodeDetailRow}>
      <span>{tt('builder.blocked_words')}</span>
      <span style={{ fontWeight: 600, color: '#fca5a5' }}>{(data.config?.blockedKeywords as unknown[])?.length || 3} rules</span>
    </div>
  </BaseNode>
);

const ToolNode = ({ id, data, selected }: { id?: string; data: { label: string; type: string; config?: Record<string, unknown> }; selected: boolean }) => (
  <BaseNode id={id} data={data} selected={selected} icon={Blocks} color="#8b5cf6" typeLabel={tt('builder.node.tool')}>
    <div style={nodeDetailRow}>
      <span>{tt('builder.bound_capability')}</span>
      <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{(data.config?.toolId as string) || 'None'}</span>
    </div>
  </BaseNode>
);


const mapDSLToNodes = (topology: ISTopology): Node[] => {
  return topology.nodes.map(n => ({
    id: n.id,
    type: n.type, // Map directly to custom node types
    data: { label: n.label, type: n.type, config: n.config },
    position: n.position || { x: 200 + (Math.random() * 400), y: 200 + (Math.random() * 400) },
  }));
};

const mapDSLToEdges = (topology: ISTopology): Edge[] => {
  return topology.edges.map(e => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.trigger === 'data_flow' ? undefined : e.trigger,
    animated: true,
    style: { stroke: '#64748b', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 700 },
    labelBgStyle: { fill: '#0f172a', stroke: '#1e293b' },
    labelBgPadding: [4, 4],
    labelBgBorderRadius: 4,
  }));
};

const CognitiveBuilder: React.FC = () => {
  const { keys } = useKeyStore();
  const availableTools = (() => { try { return toolService.getTools(); } catch { return []; } })();
  
  // Custom Node Types mapping
  const nodeTypes = useMemo(() => ({
    agent: AgentNode,
    router: RouterNode,
    guardrail: GuardrailNode,
    tool: ToolNode,
    aggregator: AgentNode,
    // fallback for others
    default: AgentNode 
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(mapDSLToNodes(AuditorTopology));
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapDSLToEdges(AuditorTopology));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearError = useAutoClearError(setError);

  // Если удалённый узел был выбран – сбрасываем selection
  useEffect(() => {
    if (selectedNode && !nodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  // Synchronize selectedNode with nodes array
  const activeNode = nodes.find(n => n.id === selectedNode?.id) || null;

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      type: 'smoothstep'
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, updates: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, config: { ...(n.data.config as ISNode['config']), ...updates } } };
      }
      return n;
    }));
  }, [setNodes]);

  const handleSaveWorkflow = useCallback(() => {
    const topology: ISTopology = {
      ...AuditorTopology,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.data.type as ISNode['type'],
        label: n.data.label as string,
        config: n.data.config as ISNode['config'],
        position: n.position
      })),
      edges: edges.map(e => ({
        id: e.id,
        from: e.source,
        to: e.target,
        trigger: (e.data?.trigger as ISEdge['trigger']) || 'on_success',
        label: e.data?.label as string | undefined
      }))
    };
    db.setKv('saved_workflow', topology).then(() => {
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Workflow saved locally', type: 'success' });
    }).catch(e => {
      console.warn('[CognitiveBuilder] Failed to save workflow:', e);
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to save workflow', type: 'error' });
    });
  }, [nodes, edges]);

  const handleDeploy = useCallback(() => {
    try {
      const newTopology: ISTopology = {
        ...AuditorTopology,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.type as ISNode['type'],
          label: n.data.label as string,
          config: n.data.config as ISNode['config'],
          position: n.position
        })),
        edges: edges.map(e => ({
          id: e.id,
          from: e.source,
          to: e.target,
          trigger: (e.label as ISEdge['trigger']) || 'data_flow'
        })),
      };
      orchestrator.mount(newTopology);
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Successfully deployed topology to Super-Agents Runtime!', type: 'success' });
      setError(null);
    } catch (err) {
      console.error('[CognitiveBuilder] Deploy failed:', err);
      if (isMountedRef.current) {
        setError(t('builder.error_deploy'));
        clearError();
      }
    }
  }, [nodes, edges, clearError]);

  const addNode = useCallback((type: string, label: string) => {
    const newNode: Node = {
      id: generateId(),
      type: type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label, type, config: { model: 'auto', tools: [] } }
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
  }, [setNodes]);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      {/* Top Action Bar */}
      <div style={{ padding: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link size={20} color="#3b82f6" aria-hidden="true" /> {t('builder.title')}
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('builder.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleSaveWorkflow} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 10 }} aria-label={t('builder.save')}>
            <Save size={16} aria-hidden="true" /> {t('builder.save')}
          </button>
          <button className="btn-primary" onClick={handleDeploy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', borderRadius: 10, boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }} aria-label={t('builder.deploy')}>
            <Play size={16} aria-hidden="true" /> {t('builder.deploy')}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="polite" style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} aria-label={t('common.dismiss_error')}>
            ✕
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: window.innerWidth < 1100 ? '1fr' : '280px 1fr 340px', gap: '1rem', minHeight: 0 }}>
        
        {/* Left: Component Palette */}
        <div className="glass-panel" style={panelColDark}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={labelSection800}>{t('builder.blocks')}</div>
          </div>
          <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { type: 'agent', icon: Bot, label: t('builder.node.agent'), desc: t('builder.node.agent_desc'), color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
              { type: 'router', icon: GitBranch, label: t('builder.node.router'), desc: t('builder.node.router_desc'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { type: 'guardrail', icon: ShieldCheck, label: t('builder.node.guardrail'), desc: t('builder.node.guardrail_desc'), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
              { type: 'tool', icon: Blocks, label: t('builder.node.tool'), desc: t('builder.node.tool_desc'), color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
            ].map((item, i) => (
              <motion.div 
                key={i} 
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                style={{ 
                  padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: 12, cursor: 'grab', display: 'flex', gap: '1rem', alignItems: 'center' 
                }} 
                onClick={() => addNode(item.type, item.label)}
                role="button"
                tabIndex={0}
                aria-label={t('builder.add_node_aria').replace('{0}', item.label)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') addNode(item.type, item.label); }}
              >
                <div style={{ padding: '0.6rem', background: item.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={20} color={item.color} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Middle: Canvas */}
        <div style={{ position: 'relative', height: '100%', minHeight: 500, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: '#020617', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}
          role="region"
          aria-label="Cognitive topology canvas"
        >
          {/* Absolute fill ensures ReactFlow ResizeObserver always measures non-zero */}
          <div style={{ position: 'absolute', inset: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="rgba(255,255,255,0.05)" gap={24} size={2} />
            <Controls style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }} />
            
            <Panel position="top-left" style={{ background: 'rgba(15,23,42,0.8)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                <Activity size={14} color="#10b981" aria-hidden="true" /> {t('builder.runtime_idle')}
              </div>
            </Panel>
          </ReactFlow>
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="glass-panel" style={panelColDark}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={18} color="#94a3b8" aria-hidden="true" />
            <div style={labelSection800}>{t('builder.inspector')}</div>
          </div>

          <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
            <AnimatePresence mode="wait">
              {activeNode ? (
                <motion.div 
                  key={activeNode.id}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                  
                  {/* Common Properties */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Node Identity</label>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#64748b' }}>{activeNode.id}</span>
                    </div>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontSize: '0.95rem', fontWeight: 600, transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = '#3b82f6'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      value={activeNode.data.label as string}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        setNodes((nds) => nds.map((n) => n.id === activeNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
                      }}
                      aria-label="Node name"
                    />
                  </div>

                  {/* Agent Specific Properties */}
                  {activeNode.data.type === 'agent' && (
                    <>
                      <div>
                        <label style={labelBlockUppercase}>Model Engine</label>
                        <select 
                          style={selectDarkWide}
                          value={(activeNode.data.config as ISNode['config'])?.model || 'auto'}
                          onChange={(e) => updateNodeConfig(activeNode.id, { model: e.target.value })}
                          aria-label="Select model"
                        >
                          <option value="auto">{t('builder.auto_select')}</option>
                          {keys.filter(k => k.status === 'active').flatMap(k => (k.availableModels || []).map(m => (
                            <option key={`${k.provider}-${m}`} value={`${k.provider}:${m}`}>{k.provider.toUpperCase()} / {m}</option>
                          )))}
                        </select>
                        {keys.length === 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={14} aria-hidden="true" /> {t('builder.no_providers_warn')}
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={labelBlockUppercase}>{t('builder.system_prompt')}</label>
                        <textarea 
                          rows={6}
                          style={{ width: '100%', padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', outline: 'none', resize: 'vertical', fontSize: '0.85rem', lineHeight: 1.5, fontFamily: 'monospace' }}
                          placeholder={t('builder.system_prompt_placeholder')}
                          value={(activeNode.data.config as ISNode['config'])?.prompt || ''}
                          onChange={(e) => updateNodeConfig(activeNode.id, { prompt: e.target.value })}
                          aria-label="System prompt"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                          {t('builder.equipped_tools')}
                          <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem' }}>
                            {((activeNode.data.config as ISNode['config'])?.tools || []).length} {t('builder.active_badge')}
                          </span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', maxHeight: '200px', overflowY: 'auto' }}>
                          {availableTools.map(tool => {
                            const isEquipped = ((activeNode.data.config as ISNode['config'])?.tools || []).includes(tool.id);
                            return (
                              <div 
                                key={tool.id} 
                                onClick={() => {
                                  const currentTools = (activeNode.data.config as ISNode['config'])?.tools || [];
                                  const newTools = isEquipped ? currentTools.filter((id: string) => id !== tool.id) : [...currentTools, tool.id];
                                  updateNodeConfig(activeNode.id, { tools: newTools });
                                }}
                                style={{ 
                                  padding: '0.6rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
                                  background: isEquipped ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${isEquipped ? 'rgba(59,130,246,0.5)' : 'transparent'}`,
                                  display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s'
                                }}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isEquipped}
                                aria-label={`${tool.name} ${isEquipped ? 'equipped' : 'not equipped'}`}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const currentTools = (activeNode.data.config as ISNode['config'])?.tools || []; const newTools = isEquipped ? currentTools.filter((id: string) => id !== tool.id) : [...currentTools, tool.id]; updateNodeConfig(activeNode.id, { tools: newTools }); } }}
                              >
                                {isEquipped ? <CheckCircle2 size={16} color="#3b82f6" aria-hidden="true" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} aria-hidden="true" />}
                                <span style={{ fontWeight: isEquipped ? 600 : 400, color: isEquipped ? 'white' : '#94a3b8' }}>{tool.name}</span>
                              </div>
                            );
                          })}
                          {availableTools.length === 0 && <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>{t('builder.no_tools_warn')}</div>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Tool Specific Properties */}
                  {activeNode.data.type === 'tool' && (
                    <div>
                      <label style={labelBlockUppercase}>{t('builder.bind_capability')}</label>
                      <select 
                        style={selectDarkWide}
                        value={((activeNode.data.config as ISNode['config'])?.toolId as string) || ''}
                        onChange={(e) => updateNodeConfig(activeNode.id, { toolId: e.target.value })}
                        aria-label="Bind external tool"
                      >
                        <option value="">{t('builder.select_tool')}</option>
                        {availableTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}

                  <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />

                  <button 
                    style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                    onClick={() => removeNode(activeNode.id)}
                    aria-label={t('builder.remove_node_aria')}
                  >
                    <Trash2 size={16} aria-hidden="true" /> {t('builder.remove_node')}
                  </button>

                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b', gap: '1rem' }}
                >
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '50%' }}>
                    <MousePointerClick size={32} color="rgba(255,255,255,0.1)" aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>{t('builder.no_node_selected')}</div>
                    <div style={{ fontSize: '0.8rem', maxWidth: '200px', margin: '0 auto', lineHeight: 1.5 }}>{t('builder.no_node_hint')}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <ModuleInfo moduleKey="builder" />
    </div>
  );
};

export default CognitiveBuilder;
