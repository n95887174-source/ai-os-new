import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, Eye, EyeOff, Send, Loader2, Package, X, Shield, Activity, Terminal, Copy, CheckCircle2, AlertTriangle, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';
import { type ApiKey } from '../../types/metrics';
import AddKeyModal from '../AddKeyModal/AddKeyModal';
import ModelBrowser from '../ModelBrowser/ModelBrowser';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { useKeyStore } from '../../stores/useKeyStore';

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  OpenRouter: 'Access 200+ models from OpenAI, Anthropic, Meta and more through a single API.',
  Gemini: 'Google\'s latest multimodal AI models with strong reasoning and coding abilities.',
  Groq: 'Ultra-fast inference on open-source models with industry-leading speed.',
  NVIDIA: 'Enterprise-grade AI models optimized for performance on NVIDIA hardware.',
};

const ProviderManager: React.FC = () => {
  const { keys, removeKey, checkHealth, checkAllHealth } = useKeyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showModelBrowser, setShowModelBrowser] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ApiKey | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxResponse, setSandboxResponse] = useState<{ text: string; status: 'idle' | 'loading' | 'done' | 'error' }>({ text: '', status: 'idle' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');

  useEffect(() => {
    const subResponse = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      if (res.requestId?.startsWith('sandbox-')) {
        const mappedStatus = res.status === 'cancelled' ? 'idle' : res.status;
        setSandboxResponse({
          text: res.status === 'error' ? res.error || 'Unknown error' : res.content,
          status: mappedStatus as 'idle' | 'loading' | 'done' | 'error'
        });
      }
    });
    return () => subResponse();
  }, []);

  const handleSandboxSend = () => {
    if (!selectedProfile || !sandboxInput.trim() || sandboxResponse.status === 'loading') return;
    const text = sandboxInput.trim();
    const requestId = `sandbox-${Math.random().toString(36).slice(2, 9)}`;
    setSandboxInput('');
    setSandboxResponse({ text: 'Sending request...', status: 'loading' });
    const model = selectedProfile.stats?.lastModel || selectedProfile.availableModels?.[0] || 'default';
    eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: selectedProfile.provider,
      model,
      messages: [{ role: 'user', content: text }],
      requestId
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.substring(0, 8)}${'•'.repeat(16)}${key.substring(key.length - 4)}`;
  };

  const filteredKeys = keys.filter(k =>
    k.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig = {
    active:   { label: 'Active',   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle2 size={14} /> },
    error:    { label: 'Error',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <AlertTriangle size={14} /> },
    checking: { label: 'Checking', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> },
    unknown:  { label: 'Unchecked', color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', icon: <Shield size={14} /> },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        {/* Page Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>AI Providers</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Connect and manage your AI providers. {keys.length > 0 ? `${keys.filter(k => k.status === 'active').length} of ${keys.length} active.` : 'Add your first provider to get started.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Custom Provider
            </button>
          </div>
        </motion.div>

        {/* WP Style Tabs */}
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', padding: '0 0.5rem' }}>
          <button 
            onClick={() => setActiveTab('installed')}
            style={{ 
              background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
              color: activeTab === 'installed' ? '#3b82f6' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'installed' ? '#3b82f6' : 'transparent'}`,
              fontSize: '0.95rem', fontWeight: activeTab === 'installed' ? 600 : 500,
              transition: 'all 0.2s', marginBottom: -1
            }}
          >
            Installed <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', opacity: 0.6 }}>({keys.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('browse')}
            style={{ 
              background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
              color: activeTab === 'browse' ? '#3b82f6' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'browse' ? '#3b82f6' : 'transparent'}`,
              fontSize: '0.95rem', fontWeight: activeTab === 'browse' ? 600 : 500,
              transition: 'all 0.2s', marginBottom: -1
            }}
          >
            Browse Models
          </button>
        </motion.div>

        {activeTab === 'installed' ? (
          <>
            {/* Search & Filter Bar */}
            {keys.length > 0 && (
              <motion.div variants={itemVariants} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 320 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search installed providers..."
                    style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" onClick={checkAllHealth} style={{ fontSize: '0.85rem' }}>
                    <RefreshCw size={15} /> Check All
                  </button>
                </div>
              </motion.div>
            )}

        {/* Empty State */}
        {keys.length === 0 && (
          <motion.div variants={itemVariants} style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-panel)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ background: 'rgba(59,130,246,0.08)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Plus size={32} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>No providers connected</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Connect your first AI provider to start chatting. You'll need an API key from OpenRouter, Google Gemini, Groq, or NVIDIA.
            </p>
            <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              <Plus size={18} /> Add Your First Provider
            </button>
          </motion.div>
        )}

        {/* Provider Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          <AnimatePresence mode="popLayout">
            {filteredKeys.map((item) => {
              const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.unknown;
              return (
                <motion.div
                  key={item.id}
                  layout
                  variants={itemVariants}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel"
                  style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                  {/* Card Header */}
                  <div style={{ padding: '1.5rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', flexShrink: 0 }}>
                        <ProviderIcon provider={item.provider} size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{item.label}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{item.provider}</p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: 20, background: status.bg, color: status.color }}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{ padding: '0 1.5rem', flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 1rem' }}>
                      {PROVIDER_DESCRIPTIONS[item.provider] || `API provider: ${item.provider}`}
                    </p>

                    {/* Quick Stats */}
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {item.latency && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Activity size={13} color={item.latency < 500 ? '#10b981' : item.latency < 2000 ? '#f59e0b' : '#ef4444'} />
                          {item.latency}ms
                        </span>
                      )}
                      {item.availableModels && item.availableModels.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Package size={13} color="#a855f7" />
                          {item.availableModels.length} models
                        </span>
                      )}
                      {item.stats && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Send size={13} color="#3b82f6" />
                          {(item.stats.successCount || 0) + (item.stats.errorCount || 0)} requests
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { setSelectedProfile(item); setShowFullKey(false); setSandboxResponse({ text: '', status: 'idle' }); }}>
                        <Eye size={14} /> Details
                      </button>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => checkHealth(item.id)} disabled={item.status === 'checking'}>
                        <RefreshCw size={14} className={item.status === 'checking' ? 'spinning' : ''} /> Check
                      </button>
                    </div>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => removeKey(item.id)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

          </>
        ) : (
          /* Browse / Store tab */
          <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {['OpenRouter', 'Gemini', 'Groq', 'NVIDIA', 'Anthropic', 'OpenAI'].map((p) => {
              const isInstalled = keys.some(k => k.provider === p);
              return (
                <div key={p} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: isInstalled ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      <ProviderIcon provider={p} size={22} />
                    </div>
                    {isInstalled && (
                      <span style={{ fontSize: '0.7rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 700 }}>
                        INSTALLED
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{p}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {PROVIDER_DESCRIPTIONS[p] || 'Professional AI infrastructure for developers and teams.'}
                    </p>
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className={isInstalled ? "btn-secondary" : "btn-primary"} 
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                      onClick={() => setShowAddModal(true)}
                    >
                      {isInstalled ? 'Add Another' : 'Connect Now'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Learn More">
                      <Info size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddKeyModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showModelBrowser && <ModelBrowser keys={keys} onClose={() => setShowModelBrowser(false)} />}
      </AnimatePresence>

      {/* Provider Profile / Details Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedProfile(null)}>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 620, background: 'var(--bg-panel)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
            >
              {/* Modal Header */}
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                    <ProviderIcon provider={selectedProfile.provider} size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{selectedProfile.label}</h2>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedProfile.provider}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}><X size={20} /></button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '2rem', maxHeight: '60vh', overflowY: 'auto' }}>
                {/* API Key */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>API Key</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <code style={{ flex: 1, padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace', border: '1px solid var(--border)' }}>
                      {showFullKey ? selectedProfile.key : maskKey(selectedProfile.key)}
                    </code>
                    <button onClick={() => setShowFullKey(!showFullKey)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '0.6rem', display: 'flex' }}>
                      {showFullKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(selectedProfile.key)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '0.6rem', display: 'flex' }}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Reliability</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                      {(selectedProfile.stats?.successCount || 0) + (selectedProfile.stats?.errorCount || 0) > 0
                        ? Math.round(((selectedProfile.stats?.successCount || 0) / ((selectedProfile.stats?.successCount || 0) + (selectedProfile.stats?.errorCount || 0))) * 100)
                        : 100}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Avg Speed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{selectedProfile.stats?.avgLatency || selectedProfile.latency || 0}ms</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(168,85,247,0.05)', borderRadius: 12, border: '1px solid rgba(168,85,247,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Tokens Used</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7' }}>
                      {(selectedProfile.stats?.totalTokens || 0) > 1000 ? ((selectedProfile.stats?.totalTokens || 0) / 1000).toFixed(1) + 'k' : (selectedProfile.stats?.totalTokens || 0)}
                    </div>
                  </div>
                </div>

                {/* Quick Test / Sandbox */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    <Terminal size={14} color="#3b82f6" /> Quick Test
                  </label>
                  {sandboxResponse.text && (
                    <div style={{
                      padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', lineHeight: 1.6,
                      background: sandboxResponse.status === 'error' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${sandboxResponse.status === 'error' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                      color: sandboxResponse.status === 'error' ? '#fca5a5' : 'var(--text-main)',
                      maxHeight: 150, overflowY: 'auto'
                    }}>
                      {sandboxResponse.status === 'loading' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6, display: 'inline' }} />}
                      {sandboxResponse.text}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      value={sandboxInput}
                      onChange={e => setSandboxInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSandboxSend(); }}
                      placeholder="Send a test message..."
                      style={{ flex: 1, padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button className="btn-primary" onClick={handleSandboxSend} disabled={sandboxResponse.status === 'loading' || !sandboxInput.trim()} style={{ padding: '0.6rem 0.8rem' }}>
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                {/* Last Error */}
                {selectedProfile.stats?.lastError && (
                  <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>Last Error</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(239,68,68,0.5)' }}>{selectedProfile.stats.lastError.timestamp ? new Date(selectedProfile.stats.lastError.timestamp).toLocaleString() : ''}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>{selectedProfile.stats.lastError.message}</div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)' }}>
                <button className="btn-secondary" onClick={() => checkHealth(selectedProfile.id)}>
                  <RefreshCw size={15} /> Run Health Check
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => setSelectedProfile(null)}>Close</button>
                  <button className="btn-primary" style={{ background: '#ef4444' }} onClick={() => { removeKey(selectedProfile.id); setSelectedProfile(null); }}>
                    <Trash2 size={15} /> Remove Provider
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProviderManager;
