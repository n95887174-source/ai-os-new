import React, { useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Panel,
  type Node,
  type Edge,
  type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Plus, Play, Save, Share2, 
  Bot, Zap, ShieldCheck, Database, 
  Globe, Code, Settings, Trash2,
  Wrench, Cpu, CheckCircle2
} from 'lucide-react';
import { orchestrator } from '../../services/OrchestrationService';
import { toolService } from '../../services/ToolService';
import { useKeyStore } from '../../stores/useKeyStore';
import { AuditorTopology } from '../../core/IntelligenceDSL';
import type { ISTopology, ISNode, ISEdge } from '../../core/IntelligenceDSL';

// Transform IS-DSL nodes to React Flow nodes
const mapDSLToNodes = (topology: ISTopology): Node[] => {
  return topology.nodes.map(n => ({
    id: n.id,
    type: 'default',
    data: { label: n.label, type: n.type, config: n.config },
    position: n.position || { x: Math.random() * 400, y: Math.random() * 400 },
    style: {
      background: 'var(--bg-panel)',
      color: 'white',
      border: n.type === 'agent' ? '1px solid #3b82f6' : '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 150,
      textAlign: 'center' as const
    }
  }));
};

const mapDSLToEdges = (topology: ISTopology): Edge[] => {
  return topology.edges.map(e => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.trigger,
    animated: true,
    style: { stroke: '#3b82f6' }
  }));
};

const CognitiveBuilder: React.FC = () => {
  const { keys } = useKeyStore();
  const availableTools = toolService.getTools();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(mapDSLToNodes(AuditorTopology));
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapDSLToEdges(AuditorTopology));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Synchronize selectedNode with nodes array to avoid stale data
  const activeNode = nodes.find(n => n.id === selectedNode?.id) || null;

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6' } }, eds)),
    [setEdges]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const updateNodeConfig = (nodeId: string, updates: any) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, config: { ...(n.data.config as ISNode['config']), ...updates } } };
      }
      return n;
    }));
  };

  const handleSave = () => {
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
    alert('Topology saved and mounted to Runtime!');
  };

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `n-${Date.now()}`,
      type: 'default',
      position: { x: 100, y: 100 },
      data: { label, type, config: { model: 'auto', tools: [] } },
      style: {
        background: 'var(--bg-panel)',
        color: 'white',
        border: type === 'agent' ? '1px solid #3b82f6' : '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
        fontWeight: 'bold',
        width: 150,
        textAlign: 'center'
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: '0.5rem', overflow: 'hidden' }}>
      
      {/* Left: Intelligence Palette */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '1rem' }}>NODES & AGENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { type: 'agent', icon: <Bot size={16} />, label: 'Standard Agent', desc: 'Reasoning core' },
              { type: 'router', icon: <Zap size={16} />, label: 'Semantic Router', desc: 'Directs data flow' },
              { type: 'guardrail', icon: <ShieldCheck size={16} />, label: 'Guardrail', desc: 'Security & Privacy' },
              { type: 'tool', icon: <Wrench size={16} />, label: 'External Tool', desc: 'Execute capabilities' },
            ].map((item, i) => (
              <div key={i} className="nav-item hover-bright" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => addNode(item.type, item.label)}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Canvas */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', background: '#050505' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#333" gap={20} />
          <Controls />
          <MiniMap nodeColor={(n) => n.data.type === 'agent' ? '#3b82f6' : '#333'} maskColor="rgba(0,0,0,0.5)" />
          
          <Panel position="top-right" style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> Save Topology
            </button>
            <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Play size={14} /> Deploy
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right: Inspector */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
          <Settings size={18} color="var(--text-muted)" />
          <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>NODE INSPECTOR</div>
        </div>

        {activeNode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>NODE LABEL</label>
              <input 
                type="text" 
                className="glass-panel" 
                style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                value={activeNode.data.label as string}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  setNodes((nds) => nds.map((n) => n.id === activeNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
                }}
              />
            </div>

            {activeNode.data.type === 'agent' && (
              <>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>MODEL SELECTION</label>
                  <select 
                    className="glass-panel"
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                    value={(activeNode.data.config as ISNode['config'])?.model || 'auto'}
                    onChange={(e) => updateNodeConfig(activeNode.id, { model: e.target.value })}
                  >
                    <option value="auto">Auto (Router Choice)</option>
                    {keys.filter(k => k.status === 'active').flatMap(k => (k.availableModels || []).map(m => (
                      <option key={`${k.provider}-${m}`} value={`${k.provider}:${m}`}>{k.provider}: {m}</option>
                    )))}
                  </select>
                  {keys.length === 0 && (
                    <div style={{ fontSize: '0.6rem', color: '#f59e0b', marginTop: '0.4rem' }}>
                      ⚠️ No active API keys found. Add keys in Providers section.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>EQUIPPED TOOLS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {availableTools.map(tool => {
                      const isEquipped = ((activeNode.data.config as ISNode['config'])?.tools || []).includes(tool.id);
                      return (
                        <div 
                          key={tool.id} 
                          onClick={() => {
                            const currentTools = (activeNode.data.config as ISNode['config'])?.tools || [];
                            const newTools = isEquipped 
                              ? currentTools.filter((id: string) => id !== tool.id)
                              : [...currentTools, tool.id];
                            updateNodeConfig(activeNode.id, { tools: newTools });
                          }}
                          style={{ 
                            padding: '0.5rem', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer',
                            background: isEquipped ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isEquipped ? '#3b82f6' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', gap: 8
                          }}
                        >
                          {isEquipped ? <CheckCircle2 size={14} color="#3b82f6" /> : <Plus size={14} color="var(--text-muted)" />}
                          {tool.name}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>SYSTEM PROMPT</label>
                  <textarea 
                    className="glass-panel" 
                    rows={4}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none', resize: 'none', fontSize: '0.85rem' }}
                    placeholder="Enter instructions for this agent..."
                    value={(activeNode.data.config as ISNode['config'])?.prompt || ''}
                    onChange={(e) => updateNodeConfig(activeNode.id, { prompt: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeNode.data.type === 'tool' && (
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>BIND TO TOOL</label>
                <select 
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                  value={(activeNode.data.config as ISNode['config'])?.toolId || ''}
                  onChange={(e) => updateNodeConfig(activeNode.id, { toolId: e.target.value })}
                >
                  <option value="">Select a capability...</option>
                  {availableTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <button 
              className="btn-secondary" 
              style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', marginTop: '1rem' }}
              onClick={() => {
                setNodes((nds) => nds.filter((n) => n.id !== activeNode.id));
                setEdges((eds) => eds.filter((e) => e.source !== activeNode.id && e.target !== activeNode.id));
                setSelectedNode(null);
              }}
            >
              <Trash2 size={14} /> Delete Node
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Select a node on the canvas to inspect its properties.
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitiveBuilder;
