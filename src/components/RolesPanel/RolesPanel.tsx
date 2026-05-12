import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Trash2, 
  CheckCircle2, Wrench, ShieldCheck, 
  Brain, Code, 
  X, Settings2, SlidersHorizontal, UserCog, AlertTriangle, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { roleService } from '../../services/RoleService';
import type { Role } from '../../types/role';
import type { RoleUsageStats } from '../../services/RoleService';
import { toolService } from '../../services/ToolService';
import { eventBus, EVENTS } from '../../core/events';

const RolesPanel: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [stats, setStats] = useState<Record<string, RoleUsageStats>>({});
  const [error, setError] = useState<string | null>(null);

  const availableTools = toolService.getTools();

  useEffect(() => {
    const load = () => {
      const allRoles = roleService.getRoles();
      setRoles(allRoles);
      setStats(roleService.getAllStats());
      setLoading(false);
    };
    load();
    const unsub = eventBus.on('roles:updated', (data: Role[]) => {
      setRoles([...data]);
      setStats(roleService.getAllStats());
    });
    return () => unsub();
  }, []);

  const getAssignmentCount = (roleId: string) => roleService.getAgentsByRole(roleId).length;

  const validate = (roleId: string) => roleService.validateRole(roleId);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this role blueprint permanently?')) return;
    try {
      roleService.deleteRole(id);
    } catch {
      setError('Failed to delete role');
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to delete role', type: 'error' });
    }
  };

  const handleSave = () => {
    if (!editingRole) return;
    try {
      const existing = roles.find(r => r.id === editingRole.id);
      if (existing) {
        roleService.updateRole(editingRole.id, editingRole);
      } else {
        roleService.addRole(editingRole);
      }
      setEditingRole(null);
      setError(null);
    } catch {
      setError('Failed to save role');
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to save role', type: 'error' });
    }
  };

  const handleDuplicate = useCallback((role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const clone: Omit<Role, 'id'> = {
      name: `${role.name} (copy)`,
      description: role.description,
      systemPrompt: role.systemPrompt,
      baseTemperature: role.baseTemperature,
      capabilities: [...role.capabilities],
      metadata: { ...role.metadata, created: now, updated: now }
    };
    roleService.addRole(clone);
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Role '${role.name}' duplicated`, type: 'success' });
  }, []);

  const PROMPT_TEMPLATES = [
    { label: 'Coding Agent', prompt: 'You are an expert software engineer. Your task is {{task}}. Write clean, well-documented, and efficient code. Follow best practices and consider edge cases.' },
    { label: 'Research Agent', prompt: 'You are a research analyst. Your task is {{task}}. Gather information, analyze data, and provide a comprehensive summary with citations where applicable.' },
    { label: 'Support Agent', prompt: 'You are a customer support specialist. Your task is {{task}}. Be helpful, empathetic, and clear. Escalate complex issues appropriately.' },
  ];

  const insertTemplate = (template: string) => {
    if (!editingRole) return;
    setEditingRole({ ...editingRole, systemPrompt: template });
  };

  const getSystemVariables = (prompt: string) => {
    const regex = /{{(.*?)}}/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(prompt)) !== null) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }
    return vars;
  };

  const createNewRole = () => {
    setEditingRole({
      id: '',
      name: 'New Agent Role',
      description: 'A new specialized agent...',
      systemPrompt: 'You are an autonomous AI agent. Your primary objective is {{task}}.',
      baseTemperature: 0.5,
      capabilities: [],
      metadata: { category: 'technical', created: Date.now(), updated: Date.now() }
    });
  };

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleCategoryColor = (cat: string) => {
    switch (cat) {
      case 'technical': return '#3b82f6';
      case 'creative': return '#a855f7';
      case 'analytical': return '#10b981';
      case 'management': return '#f59e0b';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          Loading role blueprints...
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <UserCog size={28} color="#3b82f6" /> Agent Role Blueprints
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Define behavior archetypes, system prompts, and tool access for your autonomous workforce.</p>
        </div>
        <button onClick={createNewRole} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', borderRadius: 12, fontWeight: 700 }}>
          <Plus size={18} /> Create Blueprint
        </button>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }}
          >
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>X</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 450 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input 
          type="text" 
          placeholder="Search blueprints by name or behavior..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
        />
      </div>

      {/* Roles Grid */}
      {filteredRoles.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100%', color: '#64748b' }}>
          <Search size={48} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{searchQuery ? 'No blueprints match your search' : 'No role blueprints yet'}</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{searchQuery ? 'Try a different search term' : 'Create your first blueprint to get started'}</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem', alignContent: 'start', paddingRight: '0.5rem' }}>
          <AnimatePresence>
            {filteredRoles.map((role) => {
              const vars = getSystemVariables(role.systemPrompt);
              const s = stats[role.id];
              const validation = validate(role.id);
              const assignmentCount = getAssignmentCount(role.id);
              const catColor = roleCategoryColor(role.metadata.category);
              return (
                <motion.div
                  key={role.id}
                  layoutId={role.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setEditingRole({ ...role })}
                  className="glass-panel"
                  style={{ padding: '1.5rem', cursor: 'pointer', position: 'relative', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255,255,255,0.02)' }}
                  whileHover={{ y: -4, boxShadow: '0 15px 35px rgba(0,0,0,0.3)', borderColor: 'rgba(59,130,246,0.4)', background: 'linear-gradient(145deg, rgba(59,130,246,0.05) 0%, rgba(0,0,0,0) 100%)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${catColor}30` }}>
                        <Brain size={24} color={catColor} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.2rem', color: '#f8fafc' }}>{role.name}</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          <span>ID: {role.id.split('-')[0]}</span>
                          <span style={{ color: catColor }}>●</span>
                          <span style={{ color: catColor }}>{role.metadata.category}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={(e) => handleDuplicate(role, e)} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: 10, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}><Copy size={16} /></button>
                      <button onClick={(e) => handleDelete(role.id, e)} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: 10, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0, flex: 1 }}>{role.description}</p>
                  
                  {assignmentCount > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '0.3rem 0.6rem', borderRadius: 8, width: 'fit-content' }}>
                      <UserCog size={14} /> {assignmentCount} node{assignmentCount !== 1 ? 's' : ''} assigned
                    </div>
                  )}

                  {/* Stats Row */}
                  {s && (
                    <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#64748b' }}>Calls: </span><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{s.invocations}</span></div>
                      <div><span style={{ color: '#64748b' }}>Errors: </span><span style={{ color: s.errors > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{s.errors}</span></div>
                      <div><span style={{ color: '#64748b' }}>Avg: </span><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{s.avgLatency.toFixed(0)}ms</span></div>
                    </div>
                  )}

                  {/* Validation Warning */}
                  {!validation.valid && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.7rem', color: '#fbbf24' }}>
                      <AlertTriangle size={12} /> Missing tools: {validation.missingTools.join(', ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {vars.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Dynamic Injections</span>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {vars.slice(0, 3).map((v, i) => (
                            <span key={i} style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.2rem 0.5rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Code size={10} /> {v}
                            </span>
                          ))}
                          {vars.length > 3 && <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: 8 }}>+{vars.length - 3}</span>}
                        </div>
                      </div>
                    )}

                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Assigned Tools</span>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {role.capabilities.length > 0 ? role.capabilities.map(cap => (
                          <span key={cap} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 8, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Wrench size={10} color="#3b82f6" /> {availableTools.find(t => t.id === cap)?.name || cap}
                          </span>
                        )) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>No tools assigned. Pure generation mode.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRole && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingRole(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-panel"
              style={{ position: 'relative', width: '100%', maxWidth: 850, maxHeight: '90vh', overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
              {/* Modal Header */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.15)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.3)' }}><Settings2 size={28} color="#3b82f6" /></div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{editingRole.id ? 'Edit Role Blueprint' : 'Configure New Blueprint'}</h3>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Define core logic, system prompts, and capability access.</div>
                  </div>
                </div>
                <button onClick={() => setEditingRole(null)} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10 }}><X size={20} /></button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blueprint Name</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '1rem' }}
                      value={editingRole.name}
                      onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span>Creativity Temperature</span>
                      <span style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.5rem', borderRadius: 6, fontFamily: 'monospace' }}>{editingRole.baseTemperature}</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '0.85rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <SlidersHorizontal size={18} color="#64748b" />
                      <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={editingRole.baseTemperature}
                        onChange={e => setEditingRole({ ...editingRole, baseTemperature: parseFloat(e.target.value) })}
                        style={{ flex: 1, cursor: 'pointer', accentColor: '#3b82f6', background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3, outline: 'none', appearance: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objective Description</label>
                  <input 
                    type="text" 
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '1rem' }}
                    value={editingRole.description}
                    onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Prompt & Identity</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Use <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{'{{variable}}'}</span> for dynamic injection</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {PROMPT_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.label}
                        onClick={() => insertTemplate(tpl.prompt)}
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa', cursor: 'pointer' }}
                      >{tpl.label}</button>
                    ))}
                  </div>
                  <textarea 
                    rows={10}
                    style={{ width: '100%', padding: '1.25rem', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6, resize: 'vertical', fontFamily: '"JetBrains Mono", monospace', outline: 'none', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', transition: 'border-color 0.2s' }}
                    value={editingRole.systemPrompt}
                    onChange={e => setEditingRole({ ...editingRole, systemPrompt: e.target.value })}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <ShieldCheck size={18} color="#10b981" /> Granted Capabilities (Tools)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {availableTools.map(tool => {
                      const isEquipped = editingRole.capabilities.includes(tool.id);
                      return (
                        <div 
                          key={tool.id}
                          onClick={() => {
                            const newCaps = isEquipped 
                              ? editingRole.capabilities.filter(id => id !== tool.id)
                              : [...editingRole.capabilities, tool.id];
                            setEditingRole({ ...editingRole, capabilities: newCaps });
                          }}
                          style={{ 
                            padding: '1rem', borderRadius: 12, transition: 'all 0.2s',
                            background: isEquipped ? 'linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)' : 'rgba(255,255,255,0.02)', 
                            border: `1px solid ${isEquipped ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'}`, 
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.9rem', fontWeight: 600,
                            color: isEquipped ? '#f8fafc' : '#94a3b8'
                          }}
                        >
                          <div style={{ padding: '0.4rem', background: isEquipped ? '#3b82f6' : 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                            {isEquipped ? <CheckCircle2 size={16} color="white" /> : <Wrench size={16} color="#64748b" />}
                          </div>
                          {tool.name}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={() => setEditingRole(null)} className="btn-secondary" style={{ padding: '0.8rem 1.5rem', borderRadius: 12, fontWeight: 700 }}>Cancel</button>
                <button onClick={handleSave} className="btn-primary" style={{ padding: '0.8rem 2rem', borderRadius: 12, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>Save Blueprint</button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RolesPanel;
