import React, { useState, useEffect } from 'react';
import { 
  Wrench, Play, Code, Database, 
  Globe, Plus, Search, Terminal,
  Settings2, Shield, Trash2, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toolService } from '../../services/ToolService';
import type { ToolDefinition } from '../../services/ToolService';
import { eventBus, EVENTS } from '../../core/events';

const ToolsPanel: React.FC = () => {
  const [tools, setTools] = useState<ToolDefinition[]>(toolService.getTools());
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [testOutput, setTestOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const sub = eventBus.on('tools:updated', (data: any) => {
      setTools(data);
    });
    return () => { sub(); };
  }, []);

  const handleRunTest = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setTestOutput('Initializing sandbox...');
    try {
      const result = await toolService.execute(selectedTool.id, {});
      setTestOutput(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setTestOutput(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', overflow: 'hidden' }}>
      
      {/* Tools List */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wrench size={24} color="#f59e0b" /> Skill Registry
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Equip agents with specialized cognitive capabilities.</p>
          </div>
          <button onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: 'Skill registration wizard opened', type: 'info' })} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
            <Plus size={16} /> Register Skill
          </button>
        </div>

        <div className="search-bar">
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Search skills by name, tag or capability..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {tools.filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase())).map(tool => (
            <motion.div
              key={tool.id}
              onClick={() => setSelectedTool(tool)}
              whileHover={{ scale: 1.02, borderColor: '#f59e0b' }}
              style={{ 
                padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)',
                background: selectedTool?.id === tool.id ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.2s',
                borderColor: selectedTool?.id === tool.id ? '#f59e0b' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  {tool.type === 'script' ? <Code size={18} color="#a855f7" /> : tool.type === 'api' ? <Globe size={18} color="#3b82f6" /> : <Database size={18} color="#10b981" />}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      toolService.toggleTool(tool.id);
                    }}
                    style={{ 
                      width: 32, height: 16, background: tool.enabled ? '#10b981' : 'var(--border)', 
                      borderRadius: 10, position: 'relative', cursor: 'pointer' 
                    }}
                  >
                    <motion.div 
                      animate={{ x: tool.enabled ? 16 : 0 }}
                      style={{ width: 14, height: 14, background: 'white', borderRadius: '50%', position: 'absolute', top: 1, left: 1 }}
                    />
                  </div>
                  <button className="action-btn" style={{ padding: '0.2rem' }}><Settings2 size={14} /></button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{tool.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{tool.description}</div>
              
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                {tool.language && <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: 6, textTransform: 'uppercase' }}>{tool.language}</span>}
                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: 6, textTransform: 'uppercase' }}>{tool.type}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testing & Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="#3b82f6" /> Skill Sandbox
          </h3>

          {selectedTool ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ flex: 1, background: '#09090b', borderRadius: 10, border: '1px solid var(--border)', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', position: 'absolute', top: 10, right: 10 }}>SANDBOX_V1</div>
                {selectedTool.code ? (
                  <pre style={{ margin: 0, fontSize: '0.8rem', color: '#10b981', fontFamily: 'JetBrains Mono' }}>{selectedTool.code}</pre>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Visual configuration active for this tool type.
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TEST OUTPUT</span>
                  {isExecuting && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Cpu size={14} color="#3b82f6" /></motion.div>}
                </div>
                <div style={{ fontSize: '0.75rem', color: testOutput ? '#10b981' : 'var(--text-muted)', fontFamily: 'JetBrains Mono', minHeight: 40 }}>
                  {testOutput || 'No output yet. Run a test case.'}
                </div>
              </div>

              <button 
                onClick={handleRunTest}
                disabled={isExecuting}
                className="btn-primary" 
                style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Play size={16} fill="currentColor" /> {isExecuting ? 'Executing...' : 'Run Test Case'}
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              Select a skill from the registry<br/>to test its cognitive execution
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#10b981" /> Security Context
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            All skills are executed in a **restricted multi-modal sandbox**. 
            Memory access is governed by global **IS-Policies**.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPanel;
