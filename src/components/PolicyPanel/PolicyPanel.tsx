import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Trash2, Search, AlertTriangle, CheckCircle2,
  X, Edit3, Clock, Activity, BarChart3, Eye, EyeOff
} from 'lucide-react';
import { policyService, type PolicyType, type PolicyAction, type PolicyViolation } from '../../services/PolicyService';
import type { ISPolicy } from '../../core/IntelligenceDSL';
import { eventBus, EVENTS } from '../../core/events';

const POLICY_TYPE_META: Record<PolicyType, { label: string; color: string; icon: string }> = {
  latency: { label: 'Latency', color: '#f59e0b', icon: '⏱' },
  privacy: { label: 'Privacy', color: '#10b981', icon: '🔒' },
  cost: { label: 'Cost', color: '#ef4444', icon: '💰' },
  safety: { label: 'Safety', color: '#a855f7', icon: '🛡' },
  rate_limit: { label: 'Rate Limit', color: '#3b82f6', icon: '🚦' },
  content: { label: 'Content', color: '#06b6d4', icon: '📝' },
  custom: { label: 'Custom', color: '#64748b', icon: '⚙' },
};

const ACTION_META: Record<PolicyAction, { label: string; color: string }> = {
  block: { label: 'Block', color: '#ef4444' },
  warn: { label: 'Warn', color: '#f59e0b' },
  log: { label: 'Log', color: '#3b82f6' },
  throttle: { label: 'Throttle', color: '#a855f7' },
  mask: { label: 'Mask', color: '#06b6d4' },
};

const PolicyPanel: React.FC = () => {
  const [policies, setPolicies] = useState<ISPolicy[]>([]);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [stats, setStats] = useState(policyService.getStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [showViolations, setShowViolations] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Partial<ISPolicy> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const load = () => {
      setPolicies(policyService.getPolicies());
      setViolations(policyService.getViolations(false, 100));
      setStats(policyService.getStats());
    };
    load();
    return () => { isMountedRef.current = false; if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); };
  }, []);

  const refresh = () => {
    setPolicies(policyService.getPolicies());
    setViolations(policyService.getViolations(false, 100));
    setStats(policyService.getStats());
  };

  const handleSave = () => {
    if (!editingPolicy) return;
    try {
      if (editingPolicy.id) {
        policyService.updatePolicy(editingPolicy.id, editingPolicy);
      } else {
        policyService.addPolicy(editingPolicy as Omit<ISPolicy, 'id'>);
      }
      setEditingPolicy(null);
      refresh();
    } catch (err) {
      setError('Failed to save policy');
      clearErrorAfterDelay();
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this policy?')) return;
    policyService.removePolicy(id);
    refresh();
  };

  const handleResolveViolation = (id: string) => {
    policyService.resolveViolation(id);
    refresh();
  };

  const filteredPolicies = policies.filter(p =>
    p.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createNew = () => {
    setEditingPolicy({
      id: '',
      type: 'latency',
      target_nodes: ['all'],
      value: 1000,
      action: 'warn',
    });
  };

  return (
    <div style={{ color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Shield size={28} color="#10b981" /> Policy Engine
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Enforce latency, privacy, cost, and safety guardrails across the runtime.</p>
        </div>
        <button onClick={createNew} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', background: 'linear-gradient(90deg, #10b981, #059669)', border: 'none', color: 'white', borderRadius: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
          <Plus size={18} /> Add Policy
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }} role="alert">
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Violations', value: stats.totalViolations, color: '#ef4444', icon: <AlertTriangle size={20} /> },
          { label: 'Active', value: stats.activeViolations, color: '#f59e0b', icon: <Activity size={20} /> },
          { label: 'Last Violation', value: stats.lastViolation ? new Date(stats.lastViolation).toLocaleTimeString() : 'None', color: '#3b82f6', icon: <Clock size={20} /> },
          { label: 'Active Policies', value: policies.length, color: '#10b981', icon: <Shield size={20} /> },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.5rem', color: stat.color }}>{stat.icon}<span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>{stat.label}</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" placeholder="Search policies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', fontSize: '0.9rem', outline: 'none' }} />
        </div>
        <button onClick={() => setShowViolations(!showViolations)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.85rem 1.25rem', borderRadius: 12, fontWeight: 700, background: showViolations ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showViolations ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, color: showViolations ? '#ef4444' : '#e2e8f0', cursor: 'pointer' }}>
          {showViolations ? <EyeOff size={16} /> : <Eye size={16} />} {showViolations ? 'Hide Violations' : `Show Violations (${stats.activeViolations})`}
        </button>
        {violations.length > 0 && (
          <button onClick={() => { policyService.clearViolations(); refresh(); }}
            style={{ padding: '0.85rem 1.25rem', borderRadius: 12, fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={16} /> Clear All
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {showViolations && violations.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#ef4444" /> Recent Violations
            </h4>
            {violations.slice(0, 20).map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(239,68,68,0.03)', marginBottom: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.severity === 'critical' ? '#ef4444' : v.severity === 'error' ? '#f59e0b' : '#3b82f6' }} />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', minWidth: 60 }}>{v.type}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', color: '#cbd5e1' }}>{v.detail}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(v.timestamp).toLocaleTimeString()}</span>
                <button onClick={() => handleResolveViolation(v.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer' }}>Resolve</button>
              </div>
            ))}
          </div>
        )}

        {filteredPolicies.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100%', color: '#64748b' }}>
            <Shield size={48} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{searchQuery ? 'No policies match your search' : 'No policies configured'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
            <AnimatePresence>
              {filteredPolicies.map(policy => {
                const meta = POLICY_TYPE_META[policy.type] || POLICY_TYPE_META.custom;
                const actionMeta = ACTION_META[policy.action as PolicyAction] || ACTION_META.warn;
                return (
                  <motion.div key={policy.id} layoutId={policy.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}15`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{meta.icon}</div>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{meta.label}</h4>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{policy.id}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setEditingPolicy({ ...policy })} style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }}><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(policy.id)} style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                      <div style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: `${actionMeta.color}15`, border: `1px solid ${actionMeta.color}30`, color: actionMeta.color, fontWeight: 700, fontSize: '0.7rem' }}>{actionMeta.label}</div>
                      <div style={{ color: '#94a3b8' }}>Target: <span style={{ color: '#e2e8f0' }}>{policy.target_nodes?.join(', ') || 'all'}</span></div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8, fontFamily: 'monospace' }}>
                      Value: <span style={{ color: '#f59e0b' }}>{typeof policy.value === 'object' ? JSON.stringify(policy.value) : String(policy.value)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingPolicy && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} role="dialog" aria-modal="true">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingPolicy(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ position: 'relative', width: '100%', maxWidth: 600, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{editingPolicy.id ? 'Edit Policy' : 'New Policy'}</h3>
                <button onClick={() => setEditingPolicy(null)} style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Policy Type</label>
                  <select value={editingPolicy.type} onChange={e => setEditingPolicy({ ...editingPolicy, type: e.target.value as PolicyType })}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '0.9rem' }}>
                    {Object.entries(POLICY_TYPE_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Action</label>
                  <select value={editingPolicy.action} onChange={e => setEditingPolicy({ ...editingPolicy, action: e.target.value as PolicyAction })}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '0.9rem' }}>
                    {Object.entries(ACTION_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Target Nodes (comma-separated, or 'all')</label>
                  <input type="text" value={(editingPolicy.target_nodes || []).join(', ')} onChange={e => setEditingPolicy({ ...editingPolicy, target_nodes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) || ['all'] })}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Threshold Value</label>
                  <input type="text" value={String(editingPolicy.value ?? '')} onChange={e => {
                    const val = e.target.value;
                    const num = parseFloat(val);
                    setEditingPolicy({ ...editingPolicy, value: isNaN(num) ? val : num });
                  }}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={() => setEditingPolicy(null)} style={{ padding: '0.8rem 1.5rem', borderRadius: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} style={{ padding: '0.8rem 2rem', borderRadius: 12, fontWeight: 800, background: 'linear-gradient(90deg, #10b981, #059669)', border: 'none', color: 'white', cursor: 'pointer' }}>Save Policy</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PolicyPanel;
