import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Trash2, Edit2, 
  CheckCircle2, Wrench, ShieldCheck, 
  Brain, Zap, Code, Globe, 
  MoreVertical, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { roleService } from '../../services/RoleService';
import { toolService } from '../../services/ToolService';
import type { Role } from '../../types/role';
import { eventBus } from '../../core/events';

const RolesPanel: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>(roleService.getRoles());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const availableTools = toolService.getTools();

  useEffect(() => {
    const unsub = eventBus.on('roles:updated', (data: any) => {
      setRoles([...data]);
    });
    return () => unsub();
  }, []);

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this role?')) {
      roleService.deleteRole(id);
    }
  };

  const handleSave = () => {
    if (editingRole) {
      if (roles.find(r => r.id === editingRole.id)) {
        roleService.updateRole(editingRole.id, editingRole);
      } else {
        roleService.addRole(editingRole);
      }
      setEditingRole(null);
    }
  };

  return (
    <div style={{ color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Users size={28} color="#3b82f6" /> Agent Role Manager
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Define behavior blueprints and capabilities for your autonomous workforce.</p>
        </div>
        <button 
          onClick={() => setEditingRole({
            id: '',
            name: 'New Role',
            description: '',
            systemPrompt: '',
            baseTemperature: 0.5,
            capabilities: [],
            metadata: { category: 'technical', created: Date.now(), updated: Date.now() }
          })}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> Create New Role
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ maxWidth: 400 }}>
        <Search size={18} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Search blueprints..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Roles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredRoles.map((role) => (
          <motion.div
            key={role.id}
            layoutId={role.id}
            onClick={() => setEditingRole({ ...role })}
            className="glass-panel"
            style={{ padding: '1.5rem', cursor: 'pointer', position: 'relative' }}
            whileHover={{ y: -5, borderColor: '#3b82f6' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={20} color="#3b82f6" />
              </div>
              <button onClick={(e) => handleDelete(role.id, e)} className="action-btn delete"><Trash2 size={16} /></button>
            </div>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{role.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>{role.description}</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {role.capabilities.map(cap => (
                <span key={cap} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: 4, color: 'var(--text-muted)' }}>
                  {availableTools.find(t => t.id === cap)?.name || cap}
                </span>
              ))}
              {role.capabilities.length === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.5 }}>No tools assigned</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRole && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingRole(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{ position: 'relative', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingRole.id ? 'Edit Role Blueprint' : 'New Role Blueprint'}</h3>
                <button onClick={() => setEditingRole(null)} className="action-btn"><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Role Name</label>
                  <input 
                    type="text" 
                    className="glass-panel" 
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white' }}
                    value={editingRole.name}
                    onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Description</label>
                  <input 
                    type="text" 
                    className="glass-panel" 
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white' }}
                    value={editingRole.description}
                    onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>System Prompt (Core Behavior)</label>
                  <textarea 
                    className="glass-panel" 
                    rows={6}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 12, color: 'white', fontSize: '0.9rem', lineHeight: 1.6, resize: 'none' }}
                    value={editingRole.systemPrompt}
                    onChange={e => setEditingRole({ ...editingRole, systemPrompt: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Default Capabilities</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                            padding: '0.75rem', borderRadius: 10, background: isEquipped ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)', 
                            border: `1px solid ${isEquipped ? '#3b82f6' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' 
                          }}
                        >
                          {isEquipped ? <CheckCircle2 size={14} color="#3b82f6" /> : <Wrench size={14} color="var(--text-muted)" />}
                          {tool.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={handleSave} className="btn-primary" style={{ flex: 1, padding: '1rem' }}>Save Blueprint</button>
                <button onClick={() => setEditingRole(null)} className="btn-secondary" style={{ padding: '1rem' }}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RolesPanel;
