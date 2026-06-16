import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail } from 'lucide-react';
import type { ApiKey } from '../../types/metrics';
import ProviderManagerView from './ProviderManagerView';
import type { TabId } from './ProviderManagerView';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { groupManager } from '../../kernel/instances'

const TABS: TabId[] = ['installed', 'browse', 'routing', 'pools', 'intel'];

const ProviderManagerContainer: React.FC = () => {
  const { keys, checkingIds, removeKey, checkHealth, checkAllHealth, toggleKeyStatus, enableAllKeys, disableAllKeys, exportKeys, importKeys, updateKey } = useKeyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addAccountGroup, setAddAccountGroup] = useState('');
  const [addAccountEmail, setAddAccountEmail] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addModalProvider, setAddModalProvider] = useState<string | undefined>(undefined);
  const [selectedProfile, setSelectedProfile] = useState<ApiKey | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'overview' | 'sandbox'>('overview');
  const [activeTab, setActiveTab] = useState<TabId>('installed');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalTokens = keys.reduce((s, k) => s + (k.stats?.totalTokens || 0), 0);
  const totalCost = keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0);
  const activeCount = keys.filter(k => k.status === 'active').length;
  const errorCount = keys.filter(k => k.status === 'error').length;
  const anyChecking = checkingIds.size > 0;

  const handleCheckHealth = useCallback((id: string) => { checkHealth(id); }, [checkHealth]);
  const handleCheckAllHealth = useCallback(() => { checkAllHealth(); }, [checkAllHealth]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const data = await exportKeys();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `providers-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Providers exported successfully', type: 'success' });
    } finally {
      setExporting(false);
    }
  }, [exportKeys]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        if (!raw?.trim()) throw new Error('File is empty');
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch {
          throw new Error('Invalid JSON format. Expected a valid JSON array of provider objects.');
        }
        if (!Array.isArray(parsed)) throw new Error('Invalid structure: expected a JSON array.');
        if (parsed.length === 0) throw new Error('File contains no providers.');
        const missingFields = parsed.filter((item: unknown) => {
          const p = item as Record<string, unknown>;
          return !p.provider || !p.label;
        });
        if (missingFields.length > 0) {
          throw new Error(`${missingFields.length} entr${missingFields.length === 1 ? 'y' : 'ies'} missing required fields (provider, label)`);
        }
        const count = await importKeys(raw);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Successfully imported ${count} provider(s)`, type: 'success' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[ProviderManager] Failed to import providers:', e);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Import failed: ${msg}`, type: 'error' });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }, [importKeys]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = TABS.indexOf(activeTab);
    let nextIdx: number;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = TABS.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(TABS[nextIdx]);
  }, [activeTab]);

  const handleSelectProfile = useCallback((key: ApiKey, tab: 'overview' | 'sandbox') => {
    setSelectedProfile(key);
    setInitialProfileTab(tab);
  }, []);

  const handleClearProfile = useCallback(() => {
    setSelectedProfile(null);
  }, []);

  const handleSetShowAddModal = useCallback((show: boolean, provider?: string) => {
    setShowAddModal(show);
    setAddModalProvider(provider);
  }, []);

  const handleAddAccount = useCallback(async () => {
    const email = addAccountEmail.trim();
    if (!email) return;
    setAddingAccount(true);
    try {
      const providers = ['gemini', 'groq', 'nvidia', 'openrouter'];
      const labels = providers.map(p => `${p}-${email.split('@')[0]}`);
      let added = 0;
      for (let i = 0; i < providers.length; i++) {
        const result = await groupManager.createKey({
          provider: providers[i],
          label: labels[i],
          key: '',
          status: 'pending',
          group: addAccountGroup.trim() || undefined,
          account: email,
        }, { source: 'ui' });
        if (result.ok) added++;
      }
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Account ${email} added with ${added}/${providers.length} provider slots`, type: added > 0 ? 'success' : 'error' });
      setShowAddAccount(false);
      setAddAccountEmail('');
    } finally {
      setAddingAccount(false);
    }
  }, [addAccountEmail, addAccountGroup]);

  const handleReorderKey = useCallback((keyId: string, targetIndex: number) => {
    const currentKeys = keys;
    const fromIdx = currentKeys.findIndex(k => k.id === keyId);
    if (fromIdx === -1) return;
    const reordered = [...currentKeys];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIndex, 0, moved);
    reordered.forEach((k, i) => {
      if (k.priority !== i) updateKey(k.id, { priority: i });
    });
  }, [keys, updateKey]);

  return (
    <>
    <AnimatePresence>
      {showAddAccount && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAddAccount(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', width: 400, maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={18} color="#3b82f6" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Add Account</span>
              </div>
              <button onClick={() => setShowAddAccount(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} aria-label="Close"><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Creates 4 provider slots (Gemini, Groq, NVIDIA, OpenRouter) for this account. Fill in API keys later.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }} htmlFor="acc-email">Account email</label>
                <input
                  id="acc-email"
                  type="email"
                  value={addAccountEmail}
                  onChange={e => setAddAccountEmail(e.target.value)}
                  placeholder="alice@gmail.com"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: '0.85rem' }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }} htmlFor="acc-group">Group (optional)</label>
                <input
                  id="acc-group"
                  type="text"
                  value={addAccountGroup}
                  onChange={e => setAddAccountGroup(e.target.value)}
                  placeholder="e.g. FirmA, Work, Personal"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowAddAccount(false)} className="btn-secondary" style={{ flex: 1 }} disabled={addingAccount}>Cancel</button>
                <button onClick={handleAddAccount} className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={addingAccount || !addAccountEmail.trim()}>
                  {addingAccount ? <Loader2 size={16} className="spinning" /> : <Mail size={16} />}
                  {addingAccount ? 'Creating…' : 'Add Account'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <ProviderManagerView
      keys={keys}
      checkingIds={checkingIds}
      activeTab={activeTab}
      showAddModal={showAddModal}
      addModalProvider={addModalProvider}
      selectedProfile={selectedProfile}
      initialProfileTab={initialProfileTab}
      fileInputRef={fileInputRef}
      totalTokens={totalTokens}
      totalCost={totalCost}
      activeCount={activeCount}
      errorCount={errorCount}
      anyChecking={anyChecking}
      importing={importing}
      exporting={exporting}
      onSetActiveTab={setActiveTab}
      onSetShowAddModal={handleSetShowAddModal}
      onSelectProfile={handleSelectProfile}
      onClearProfile={handleClearProfile}
      onCheckHealth={handleCheckHealth}
      onCheckAllHealth={handleCheckAllHealth}
      onAddAccount={() => setShowAddAccount(true)}
      onExport={handleExport}
      onImport={handleImport}
      onTabKeyDown={handleTabKeyDown}
      onToggleStatus={toggleKeyStatus}
      onEnableAll={enableAllKeys}
      onDisableAll={disableAllKeys}
      onRemoveKey={removeKey}
      onReorderKey={handleReorderKey}
    />
    </>
  );
};

export default ProviderManagerContainer;
