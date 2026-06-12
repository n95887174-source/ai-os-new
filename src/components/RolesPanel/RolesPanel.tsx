import { genId } from '../../utils/gen-id';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Search, Trash2, Play,
  CheckCircle2, Wrench, ShieldCheck, 
  Brain, Code, BookOpen,
  X, Settings2, SlidersHorizontal, UserCog, AlertTriangle, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from '../ModalShell';
import { roleService } from '../../kernel/instances';
import type { Role } from '../../types/role';
import type { RoleUsageStats } from '../../kernel/instances';
import { toolService } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { RoleAnalytics } from './RoleAnalytics';
import { PermissionMatrix } from './PermissionMatrix';
import RoleLibrary from './RoleLibrary';
import { RoleSandbox } from './RoleSandbox';
import {
  dismissBtnRed,
  errorBannerLg,
  pageSubtitleMuted,
  pageTitleLarge,
  searchIconAbsolute,
  searchInputLarge,
  sectionHeaderBottom,
} from '../../styles/common';

const generateId = (): string => genId();

const RolesPanel: React.FC = () => {
  const [view, setView] = useState<'my-roles' | 'library'>('my-roles');
  const [showSandbox, setShowSandbox] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [stats, setStats] = useState<Record<string, RoleUsageStats>>({});
  const [error, setError] = useState<string | null>(null);

  const availableTools = (() => { try { return toolService.getTools(); } catch { return []; } })();
  const { t } = useTranslation();
  const isMountedRef = useRef(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    isMountedRef.current = true;
    const load = () => {
      const allRoles = roleService.getAllRoles() ?? [];
      if (isMountedRef.current) setRoles(allRoles);
      if (isMountedRef.current) setStats(roleService.getAllStats() ?? {});
      if (isMountedRef.current) setLoading(false);
    };
    load();

const unsub = eventBus.on('roles:updated', () => {
      if (!isMountedRef.current) return;
      setRoles(roleService.getAllRoles() ?? []);
      setStats(roleService.getAllStats() ?? {});
    });

    return () => {
      isMountedRef.current = false;
      unsub();
    };
  }, []);

  const getAssignmentCount = (roleId: string) => roleService.getAgentsByRole(roleId).length;
  const validate = (roleId: string) => roleService.validateRole(roleId);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('roles.confirm_delete'))) return;
    try {
      roleService.deleteRole(id);
      if (isMountedRef.current) setError(null);
    } catch (err) {
      console.warn('[RolesPanel] Failed to delete role:', err);
      if (isMountedRef.current) {
        setError(t('roles.error_delete'));
        clearError();
      }
      eventBus.emit(EVENTS.NOTIFICATION, { message: t('roles.error_delete'), type: 'error' });
    }
  };

  const handleSave = () => {
    if (!editingRole) return;
    try {
      const existing = roles.find(r => r.id === editingRole.id);
      if (existing) {
        roleService.updateRole(editingRole.id, editingRole);
      } else {
        const newRole: Omit<Role, 'id'> = {
          name: editingRole.name,
          description: editingRole.description,
          systemPrompt: editingRole.systemPrompt,
          baseTemperature: editingRole.baseTemperature,
          capabilities: editingRole.capabilities,
          permissions: editingRole.permissions,
          metadata: { ...editingRole.metadata, created: Date.now(), updated: Date.now() }
        };
        roleService.addRole(newRole);
      }
      if (isMountedRef.current) {
        setEditingRole(null);
        setError(null);
      }
    } catch (err) {
      console.warn('[RolesPanel] Failed to save role:', err);
      if (isMountedRef.current) {
        setError(t('roles.error_save'));
        clearError();
      }
      eventBus.emit(EVENTS.NOTIFICATION, { message: t('roles.error_save'), type: 'error' });
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
      capabilities: [...(role.capabilities || [])],
      permissions: [...role.permissions],
      metadata: { ...role.metadata, created: now, updated: now }
    };
    try {
      roleService.addRole(clone);
      if (isMountedRef.current) setError(null);
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Role '${role.name}' duplicated`, type: 'success' });
    } catch (err) {
      console.warn('[RolesPanel] Failed to duplicate role:', err);
      if (isMountedRef.current) {
        setError(t('roles.error_duplicate'));
        clearError();
      }
    }
  }, [clearError]);

  const createNewRole = () => {
    if (isMountedRef.current) {
      setEditingRole({
        id: generateId(),
        name: 'New Agent Role',
        description: 'A new specialized agent...',
        systemPrompt: 'You are an autonomous AI agent. Your primary objective is {{task}}.',
        baseTemperature: 0.5,
        capabilities: [],
        permissions: [],
        metadata: { category: 'technical', created: Date.now(), updated: Date.now() }
      });
    }
  };

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

  useEffect(() => {
    if (editingRole && isMountedRef.current) {
      const timeout = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [editingRole]);

  const PROMPT_TEMPLATES = [
    { label: 'Coding Agent', prompt: 'You are an expert software engineer. Your task is {{task}}. Write clean, well-documented, and efficient code. Follow best practices and consider edge cases.' },
    { label: 'Research Agent', prompt: 'You are a research analyst. Your task is {{task}}. Gather information, analyze data, and provide a comprehensive summary with citations where applicable.' },
    { label: 'Support Agent', prompt: 'You are a customer support specialist. Your task is {{task}}. Be helpful, empathetic, and clear. Escalate complex issues appropriately.' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          {t('roles.loading')}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>

      <div style={sectionHeaderBottom}>
        <div>
          <h2 style={pageTitleLarge}>
            <UserCog size={28} color="#3b82f6" aria-hidden="true" /> {t('roles.title')}
          </h2>
          <p style={pageSubtitleMuted}>{t('roles.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* View toggle tabs */}
          <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '0.3rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setView('my-roles')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 1rem', borderRadius: 10, border: 'none',
                background: view === 'my-roles' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: view === 'my-roles' ? '#60a5fa' : '#94a3b8',
                fontWeight: view === 'my-roles' ? 800 : 600, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              <UserCog size={14} /> My Roles
            </button>
            <button
              onClick={() => setView('library')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 1rem', borderRadius: 10, border: 'none',
                background: view === 'library' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: view === 'library' ? '#60a5fa' : '#94a3b8',
                fontWeight: view === 'library' ? 800 : 600, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              <BookOpen size={14} /> Library
            </button>
          </div>
          <button
            onClick={() => setShowSandbox(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Play size={14} /> Sandbox
          </button>
          {view === 'my-roles' && (
            <button
              onClick={createNewRole}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', borderRadius: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}
              aria-label="Create new role blueprint"
            >
              <Plus size={18} aria-hidden="true" /> {t('roles.create')}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={errorBannerLg}
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle size={18} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={dismissBtnRed} aria-label={t('common.dismiss_error')}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'library' ? (
        <RoleLibrary />
      ) : (
        <>
          {roles.length > 0 && (
            <RoleAnalytics stats={stats} roles={roles} />
          )}

          {roles.length > 0 && (
            <PermissionMatrix
              roles={roles}
              onUpdate={(roleId, permissions) => {
                roleService.updateRole(roleId, { permissions });
              }}
            />
          )}

          <div style={{ position: 'relative', width: '100%', maxWidth: 450 }}>
            <Search size={16} style={searchIconAbsolute} aria-hidden="true" />
            <input
              type="text"
              placeholder={t('roles.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputLarge}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              aria-label="Search role blueprints"
            />
          </div>

          {filteredRoles.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100%', color: '#64748b' }}>
              <Search size={48} style={{ opacity: 0.3 }} aria-hidden="true" />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{searchQuery ? t('roles.empty_search') : t('roles.empty_none')}</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{searchQuery ? t('roles.empty_search_desc') : t('roles.empty_none_desc')}</p>
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
                  const shortId = role.id ? role.id.split('-')[0] : 'new';
                  return (
                    <motion.div
                      key={role.id}
                      layoutId={role.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setEditingRole({ ...role, capabilities: role.capabilities || [] })}
                      role="button"
                      tabIndex={0}
                      aria-label={`Role: ${role.name}, ${assignmentCount} agents assigned`}
                      style={{ padding: '1.5rem', cursor: 'pointer', position: 'relative', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                      whileHover={{ y: -4, boxShadow: '0 15px 35px rgba(0,0,0,0.3)', borderColor: 'rgba(59,130,246,0.4)', background: 'linear-gradient(145deg, rgba(59,130,246,0.05) 0%, rgba(0,0,0,0) 100%)' }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingRole({ ...role, capabilities: role.capabilities || [] }); } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${catColor}30` }}>
                            <Brain size={24} color={catColor} aria-hidden="true" />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.2rem', color: '#f8fafc' }}>{role.name}</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              <span>ID: {shortId}</span>
                              <span style={{ color: catColor }}>●</span>
                              <span style={{ color: catColor }}>{role.metadata.category}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={(e) => handleDuplicate(role, e)} style={{ padding: '0.5rem', borderRadius: 10, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }} aria-label={`Duplicate role ${role.name}`}>
                            <Copy size={16} aria-hidden="true" />
                          </button>
                          <button onClick={(e) => handleDelete(role.id, e)} style={{ padding: '0.5rem', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }} aria-label={`Delete role ${role.name}`}>
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0, flex: 1 }}>{role.description}</p>

                      {assignmentCount > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '0.3rem 0.6rem', borderRadius: 8, width: 'fit-content' }}>
                          <UserCog size={14} aria-hidden="true" /> {assignmentCount} node{assignmentCount !== 1 ? 's' : ''} assigned
                        </div>
                      )}

                      {s && (
                        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem' }}>
                          <div><span style={{ color: '#64748b' }}>Calls: </span><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{s.invocations}</span></div>
                          <div><span style={{ color: '#64748b' }}>Errors: </span><span style={{ color: s.errors > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{s.errors}</span></div>
                          <div><span style={{ color: '#64748b' }}>Avg: </span><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{s.avgLatency.toFixed(0)}ms</span></div>
                        </div>
                      )}

                      {!validation.valid && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.7rem', color: '#fbbf24' }}>
                          <AlertTriangle size={12} aria-hidden="true" /> Missing tools: {validation.missingTools.join(', ')}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {vars.length > 0 && (
                          <div>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Dynamic Injections</span>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {vars.slice(0, 3).map((v, i) => (
                                <span key={i} style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.2rem 0.5rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Code size={10} aria-hidden="true" /> {v}
                                </span>
                              ))}
                              {vars.length > 3 && <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: 8 }}>+{vars.length - 3}</span>}
                            </div>
                          </div>
                        )}

                        <div>
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Assigned Tools</span>
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {(role.capabilities || []).length > 0 ? (role.capabilities || []).map(cap => (
                              <span key={cap} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 8, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Wrench size={10} color="#3b82f6" aria-hidden="true" /> {availableTools.find(t => t.id === cap)?.name || cap}
                              </span>
                            )) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>{t('roles.no_tools')}</span>
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
        </>
      )}

      <ModalShell open={editingRole !== null} onClose={() => setEditingRole(null)} width={850}>
        {(() => {
          const r = editingRole;
          if (!r) return null;
          return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.15)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.3)' }}><Settings2 size={28} color="#3b82f6" aria-hidden="true" /></div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{r.id ? t('roles.edit_title') : t('roles.new_title')}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Define core logic, system prompts, and capability access.</div>
                </div>
              </div>
              <button onClick={() => setEditingRole(null)} style={{ padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }} aria-label="Close modal">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blueprint Name</label>
                  <input type="text"
                    ref={nameInputRef}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '1rem' }}
                    value={r.name} onChange={e => setEditingRole({ ...r, name: e.target.value })} aria-label="Role name" />
                </div>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>{t('roles.temperature')}</span>
                    <span style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.5rem', borderRadius: 6, fontFamily: 'monospace' }}>{r.baseTemperature}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '0.85rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <SlidersHorizontal size={18} color="#64748b" aria-hidden="true" />
                    <input type="range" min="0" max="2" step="0.1" value={r.baseTemperature}
                      onChange={e => setEditingRole({ ...r, baseTemperature: parseFloat(e.target.value) })}
                      style={{ flex: 1, cursor: 'pointer', accentColor: '#3b82f6', height: 6, borderRadius: 3, outline: 'none' }} aria-label="Temperature slider" />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objective Description</label>
                <input type="text"
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '1rem' }}
                  value={r.description} onChange={e => setEditingRole({ ...r, description: e.target.value })} aria-label="Role description" />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('roles.system_prompt_identity')}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Use <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{'{{variable}}'}</span> for dynamic injection</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {PROMPT_TEMPLATES.map(tpl => (
                    <button key={tpl.label} onClick={() => insertTemplate(tpl.prompt)}
                      style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa', cursor: 'pointer' }}
                      aria-label={`Insert ${tpl.label} template`}>{tpl.label}</button>
                  ))}
                </div>
                <textarea rows={10}
                  style={{ width: '100%', padding: '1.25rem', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6, resize: 'vertical', fontFamily: '"JetBrains Mono", monospace', outline: 'none', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', transition: 'border-color 0.2s' }}
                  value={r.systemPrompt} onChange={e => setEditingRole({ ...r, systemPrompt: e.target.value })}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} aria-label="System prompt" />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <ShieldCheck size={18} color="#10b981" aria-hidden="true" /> Granted Capabilities (Tools)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  {availableTools.map(tool => {
                    const isEquipped = r.capabilities.includes(tool.id);
                    return (
                      <div key={tool.id} onClick={() => {
                          const newCaps = isEquipped ? r.capabilities.filter(id => id !== tool.id) : [...r.capabilities, tool.id];
                          setEditingRole({ ...r, capabilities: newCaps });
                        }} role="button" tabIndex={0} aria-pressed={isEquipped}
                        aria-label={`${tool.name} ${isEquipped ? 'equipped' : 'not equipped'}`}
                        style={{ padding: '1rem', borderRadius: 12, transition: 'all 0.2s', background: isEquipped ? 'linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEquipped ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.9rem', fontWeight: 600, color: isEquipped ? '#f8fafc' : '#94a3b8' }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const newCaps = isEquipped ? r.capabilities.filter(id => id !== tool.id) : [...r.capabilities, tool.id]; setEditingRole({ ...r, capabilities: newCaps }); } }}>
                        <div style={{ padding: '0.4rem', background: isEquipped ? '#3b82f6' : 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                          {isEquipped ? <CheckCircle2 size={16} color="white" aria-hidden="true" /> : <Wrench size={16} color="#64748b" aria-hidden="true" />}
                        </div>
                        {tool.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setEditingRole(null)} style={{ padding: '0.8rem 1.5rem', borderRadius: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }} aria-label={t('common.cancel')}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} style={{ padding: '0.8rem 2rem', borderRadius: 12, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }} aria-label={t('common.save')}>
                {t('common.save')}
              </button>
            </div>
          </div>
        )})()}
      </ModalShell>
      <RoleSandbox isOpen={showSandbox} onClose={() => setShowSandbox(false)} />
      <ModuleInfo moduleKey="roles" />
    </div>
  );
};

export default RolesPanel;
