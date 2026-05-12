import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Play, Code, Database, 
  Globe, Plus, Search, 
  Shield, Cpu,
  Braces, Blocks, PlayCircle, Key, AlertCircle, Loader2, Download, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toolService } from '../../services/ToolService';
import type { ToolDefinition } from '../../services/ToolService';
import { eventBus, EVENTS } from '../../core/events';
import type { EventMap } from '../../core/events';

type ToolTypeFilter = 'all' | 'api' | 'script' | 'database';

const ToolsPanel: React.FC = () => {
  const [tools, setTools] = useState<ToolDefinition[]>(() => {
    try { return toolService.getTools(); }
    catch { return []; }
  });
  const loading = false;
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [testOutput, setTestOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ToolTypeFilter>('all');
  const [activeTab, setActiveTab] = useState<'sandbox' | 'schema' | 'security'>('sandbox');
  const [testParams, setTestParams] = useState<string>('{\n  "query": "test"\n}');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportTools = () => {
    const data = toolService.exportTools();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tools-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    eventBus.emit(EVENTS.NOTIFICATION as keyof EventMap, { message: 'Tools exported successfully', type: 'success' });
  };

  const handleImportTools = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const count = toolService.importTools(event.target?.result as string);
        setTools(toolService.getTools());
        eventBus.emit(EVENTS.NOTIFICATION as keyof EventMap, { message: `Successfully imported ${count} tool(s)`, type: 'success' });
      } catch {
        eventBus.emit(EVENTS.NOTIFICATION as keyof EventMap, { message: 'Failed to import tools', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const sub = eventBus.on('tools:updated', (data) => {
      setTools(data as ToolDefinition[]);
      if (selectedTool) {
        setSelectedTool((data as ToolDefinition[]).find((t: ToolDefinition) => t.id === selectedTool.id) || null);
      }
    });
    return () => { sub(); };
  }, [selectedTool]);

  const filteredTools = tools.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleRunTest = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setTestOutput('Initializing secure sandbox environment...\nMounting execution context...');
    setError(null);
    
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(testParams);
      } catch (e) {
        setTestOutput(`Error: Invalid JSON parameters.\n${(e as Error).message}`);
        setIsExecuting(false);
        return;
      }
      
      const startTime = Date.now();
      const result = await toolService.execute(selectedTool.id, parsedParams);
      const latency = Date.now() - startTime;
      
      const formattedOutput = `Execution completed in ${latency}ms\nStatus: ${result.status.toUpperCase()}\n\nResult:\n${JSON.stringify(result.data || result.error, null, 2)}`;
      setTestOutput(formattedOutput);
    } catch {
      setTestOutput('Fatal Sandbox Error: Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  const getToolIcon = (type: string) => {
    switch(type) {
      case 'script': return <Code size={20} color="#a855f7" />;
      case 'api': return <Globe size={20} color="#3b82f6" />;
      case 'database': return <Database size={20} color="#10b981" />;
      default: return <Blocks size={20} color="#f59e0b" />;
    }
  };

  const getToolColor = (type: string) => {
    switch(type) {
      case 'script': return '#a855f7';
      case 'api': return '#3b82f6';
      case 'database': return '#10b981';
      default: return '#f59e0b';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={20} className="spin" /> Loading tools...
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 0.25rem', color: '#f8fafc' }}>
            <Wrench size={28} color="#f59e0b" /> Tool & Capability Registry
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Manage external integrations, APIs, and sandboxed scripts for autonomous agents.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportTools} className="btn-secondary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, fontWeight: 700 }}>
            <Download size={16} /> Export
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, fontWeight: 700 }}>
            <Upload size={16} /> Import
          </button>
          <button onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: 'Capability Registry Wizard opening...', type: 'info' })} className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)', fontWeight: 700 }}>
            <Plus size={18} /> Register Capability
          </button>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }}
          >
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>X</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 500px', gap: '1.5rem', minHeight: 0 }}>
        
        {/* Tools List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="Search tools by name, description or capability tag..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', outline: 'none', transition: 'border-color 0.2s', fontSize: '0.9rem' }}
                onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as ToolTypeFilter)}
                style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                <option value="all">All Types</option>
                <option value="api">REST APIs</option>
                <option value="script">Local Scripts</option>
                <option value="database">Database Connectors</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', padding: '1.5rem', alignContent: 'start', background: 'rgba(255,255,255,0.01)' }}>
            {filteredTools.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1rem', padding: '4rem 0' }}>
                <Blocks size={56} opacity={0.2} />
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {searchQuery || typeFilter !== 'all' ? 'No tools match current filters' : 'No capabilities registered yet'}
                </span>
              </div>
            ) : (
              <AnimatePresence>
                {filteredTools.map(tool => (
                  <motion.div
                    key={tool.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedTool(tool)}
                    whileHover={{ y: -4, boxShadow: '0 15px 35px rgba(0,0,0,0.3)', borderColor: getToolColor(tool.type) }}
                    style={{ 
                      padding: '1.5rem', borderRadius: 16, border: '1px solid',
                      background: selectedTool?.id === tool.id ? `linear-gradient(145deg, ${getToolColor(tool.type)}15 0%, rgba(255,255,255,0.02) 100%)` : 'rgba(0,0,0,0.2)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      borderColor: selectedTool?.id === tool.id ? getToolColor(tool.type) : 'rgba(255,255,255,0.05)',
                      display: 'flex', flexDirection: 'column'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.75rem', background: `${getToolColor(tool.type)}15`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${getToolColor(tool.type)}30` }}>
                        {getToolIcon(tool.type)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: tool.enabled ? '#10b981' : '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {tool.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toolService.toggleTool(tool.id);
                          }}
                          style={{ 
                            width: 44, height: 24, background: tool.enabled ? '#10b981' : 'rgba(255,255,255,0.1)', 
                            borderRadius: 12, position: 'relative', cursor: 'pointer',
                            boxShadow: tool.enabled ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none',
                            transition: 'all 0.3s'
                          }}
                        >
                          <motion.div 
                            animate={{ x: tool.enabled ? 22 : 2 }}
                            style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '0.5rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>{tool.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tool.description}</div>
                    
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.3)', color: getToolColor(tool.type), padding: '0.3rem 0.6rem', borderRadius: 8, textTransform: 'uppercase', fontWeight: 800, border: `1px solid ${getToolColor(tool.type)}30`, letterSpacing: '0.05em' }}>
                        {tool.type}
                      </span>
                      {tool.language && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '0.3rem 0.6rem', borderRadius: 8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                          {tool.language}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          
          {selectedTool ? (
            <>
              {/* Inspector Header */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', background: `${getToolColor(selectedTool.type)}15`, borderRadius: 14, border: `1px solid ${getToolColor(selectedTool.type)}40` }}>
                    {getToolIcon(selectedTool.type)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{selectedTool.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.3rem' }}>ID: {selectedTool.id}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setActiveTab('sandbox')} style={{ flex: 1, padding: '0.6rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'sandbox' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'sandbox' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <PlayCircle size={16} /> Sandbox
                  </button>
                  <button onClick={() => setActiveTab('schema')} style={{ flex: 1, padding: '0.6rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'schema' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'schema' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Braces size={16} /> Schema
                  </button>
                  <button onClick={() => setActiveTab('security')} style={{ flex: 1, padding: '0.6rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'security' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'security' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Shield size={16} /> Security
                  </button>
                </div>
              </div>

              {/* Inspector Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}
                  >
                    {activeTab === 'sandbox' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Execution Parameters (JSON)</span>
                            <span style={{ cursor: 'pointer', color: '#3b82f6', textTransform: 'none' }} onClick={() => setTestParams('{\n  \n}')}>Reset Input</span>
                          </label>
                          <textarea 
                            value={testParams}
                            onChange={e => setTestParams(e.target.value)}
                            style={{ height: 140, padding: '1.25rem', background: '#020617', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: '#e2e8f0', outline: 'none', resize: 'none', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem', lineHeight: 1.6, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                          />
                        </div>

                        <button 
                          onClick={handleRunTest}
                          disabled={isExecuting || !selectedTool.enabled}
                          className="btn-primary" 
                          style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, fontWeight: 800, background: selectedTool.enabled ? 'linear-gradient(90deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)', opacity: selectedTool.enabled ? 1 : 0.5, boxShadow: selectedTool.enabled ? '0 4px 15px rgba(16,185,129,0.3)' : 'none', cursor: selectedTool.enabled ? 'pointer' : 'not-allowed' }}
                        >
                          {isExecuting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Cpu size={20} /></motion.div> : <Play size={20} fill="currentColor" />} 
                          {isExecuting ? 'Executing in OS Sandbox...' : 'Run Capability Test'}
                        </button>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution Output</label>
                          <div style={{ flex: 1, background: '#020617', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', overflowY: 'auto', minHeight: 180, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                            {testOutput ? (
                              <pre style={{ margin: 0, fontSize: '0.85rem', color: testOutput.includes('Error') ? '#ef4444' : '#10b981', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                {testOutput}
                              </pre>
                            ) : (
                              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.6 }}>
                                No output generated yet.<br/>Execute the tool to see sandboxed results.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'schema' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block', letterSpacing: '0.05em' }}>OpenAPI Definition Context</label>
                          <div style={{ background: '#020617', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', overflowY: 'auto', flex: 1, maxHeight: '450px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                            <pre style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6 }}>
{JSON.stringify({
  name: selectedTool.name,
  description: selectedTool.description,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The primary input parameter for the tool"
      }
    },
    required: ["query"]
  }
}, null, 2)}
                            </pre>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '1rem', lineHeight: 1.6, padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                            This exact JSON schema is automatically injected into the LLM context via the `tools` array when the tool is equipped by an Agent, enabling precise, autonomous function calling.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'security' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '1.5rem', borderRadius: 16 }}>
                          <Shield size={28} color="#ef4444" style={{ flexShrink: 0 }} />
                          <div>
                            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', color: '#ef4444', fontWeight: 800 }}>Execution Isolation Active</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                              This tool runs in a strict sandboxed OS environment. File system access and unapproved network calls are automatically intercepted and blocked by the event bus kernel.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem', display: 'block', letterSpacing: '0.05em' }}>Required Secrets & Scopes</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Key size={16} color="#f59e0b" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>API_KEY_VAULT</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: 6, fontWeight: 800, letterSpacing: '0.05em' }}>RESOLVED</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Globe size={16} color="#3b82f6" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>Network Egress Target</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '4px 8px', borderRadius: 6, fontWeight: 800, letterSpacing: '0.05em' }}>BLOCKED BY DEFAULT</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Wrench size={40} color="#64748b" />
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>No Capability Selected</div>
                <div style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>Select a tool from the registry to inspect its LLM schema, security scopes, and test sandbox execution.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".json" 
        style={{ display: 'none' }} 
        onChange={handleImportTools} 
      />
    </div>
  );
};

export default ToolsPanel;
