import React, { useState, useMemo, useEffect } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, Clock, Zap, BarChart3, GitCompare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { roleService, adapterRegistry, keyService } from '../../kernel/instances';
import { RoleTestService, type RoleTestCase } from '../../kernel/services/role-test-service';
import type { Role } from '../../kernel/types/role-types';
import { useTranslation } from '../../i18n/useTranslation';

interface RoleSandboxProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSandbox: React.FC<RoleSandboxProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState(() => roleService.getAllRoles());
  useEffect(() => {
    setRoles(roleService.getAllRoles());
  }, []);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<RoleTestCase[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<RoleTestCase[]>([]);

  const testService = new RoleTestService({
    sendMessage: async (messages, model, apiKey) => {
      const providers = ['groq', 'gemini', 'openrouter'];
      let adapter = null;
      for (const p of providers) {
        adapter = adapterRegistry.getAdapter(p);
        if (adapter) break;
      }
      if (!adapter) throw new Error('No adapter');
      const start = Date.now();
      const res = await adapter.sendMessage(messages as never, model, apiKey);
      return { content: res.content, tokens: res.tokens || 0, latency: Date.now() - start };
    },
    getApiKey: (provider) => {
      const keys = keyService.getKeys();
      const key = keys.find(k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active');
      return key?.key;
    },
  });

  const handleRunTest = async () => {
    if (!prompt.trim() || selectedRoleIds.length === 0) return;
    setIsRunning(true);
    setResults([]);

    const selectedRoles = roles.filter(r => selectedRoleIds.includes(r.id));
    const testResults = await testService.compareRoles(selectedRoles, prompt);

    setResults(testResults.map(r => r.testCase));
    setHistory(prev => [...prev, ...testResults.map(r => r.testCase)]);
    setIsRunning(false);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 720, maxHeight: '85vh', overflow: 'auto', background: 'linear-gradient(145deg, rgba(20,20,40,0.98), rgba(15,15,30,0.98))', borderRadius: 16, border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={18} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Role Testing Sandbox</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Test roles with prompts, compare side-by-side</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Role Selection */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Select Roles to Test</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {roles.map(role => {
                  const selected = selectedRoleIds.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'rgba(100,116,139,0.2)'}`,
                        background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,50,0.5)',
                        color: selected ? '#818cf8' : '#94a3b8',
                      }}
                    >
                      {selected && <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                      {role.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Test Prompt</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Enter a prompt to test with the selected roles..."
                  rows={2}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(100,116,139,0.25)', background: 'rgba(30,30,50,0.6)', color: '#e2e8f0', fontSize: '0.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleRunTest}
                  disabled={!prompt.trim() || selectedRoleIds.length === 0 || isRunning}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: isRunning ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: isRunning ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                  }}
                >
                  {isRunning ? <Loader2 size={16} className="provider-spin" /> : <Play size={16} />}
                  {isRunning ? 'Running...' : 'Run Test'}
                </button>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                  <GitCompare size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Results ({results.length} roles)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.map((tc, i) => (
                    <motion.div
                      key={tc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      style={{
                        padding: 14, borderRadius: 12,
                        background: tc.success ? 'rgba(30,30,50,0.5)' : 'rgba(239,68,68,0.05)',
                        border: `1px solid ${tc.success ? 'rgba(100,116,139,0.15)' : 'rgba(239,68,68,0.2)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>{tc.roleName}</span>
                          {tc.success ? (
                            <CheckCircle2 size={14} color="#10b981" />
                          ) : (
                            <XCircle size={14} color="#ef4444" />
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#64748b' }}>
                          <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {tc.latency}ms</span>
                          <span><Zap size={12} style={{ verticalAlign: 'middle' }} /> {tc.tokens} tokens</span>
                          <span>{tc.provider}/{tc.model}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                        {tc.response}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(100,116,139,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    <BarChart3 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Test History ({history.length})
                  </span>
                  <button onClick={() => { setHistory([]); testService.clearTestCases(); }} style={{ fontSize: '0.7rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
