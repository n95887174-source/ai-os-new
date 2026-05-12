import React, { useState, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Activity, DollarSign, Zap, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ApiKey } from '../../types/metrics';
import AddKeyModal from '../AddKeyModal/AddKeyModal';
import InstalledProvidersView from './InstalledProvidersView';
import BrowseModelsView from './BrowseModelsView';
import RoutingSLAView from './RoutingSLAView';
import ProviderDetailModal from './ProviderDetailModal';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';

const TABS = ['installed', 'browse', 'routing'] as const;
type TabId = typeof TABS[number];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.001) return `$${cost.toFixed(4)}`;
  return '<$0.001';
}

const ProviderManager: React.FC = () => {
  const { keys, removeKey, checkHealth, checkAllHealth, toggleKeyStatus, enableAllKeys, disableAllKeys, exportKeys, importKeys } = useKeyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ApiKey | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'overview' | 'sandbox'>('overview');
  const [activeTab, setActiveTab] = useState<TabId>('installed');
  const [checkingKeys, setCheckingKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalTokens = keys.reduce((s, k) => s + (k.stats?.totalTokens || 0), 0);
  const totalCost = keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0);
  const activeCount = keys.filter(k => k.status === 'active').length;
  const errorCount = keys.filter(k => k.status === 'error').length;
  if (checkingKeys.size > 0) {
    setCheckingKeys(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const id of next) {
        if (keys.find(k => k.id === id && k.status !== 'checking')) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  const anyChecking = checkingKeys.size > 0;

  const handleCheckHealth = useCallback((id: string) => {
    setCheckingKeys(prev => new Set(prev).add(id));
    checkHealth(id);
  }, [checkHealth]);

  const handleCheckAllHealth = useCallback(() => {
    const allIds = new Set(keys.map(k => k.id));
    setCheckingKeys(allIds);
    checkAllHealth();
  }, [keys, checkAllHealth]);

  const handleExport = useCallback(() => {
    const data = exportKeys();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `providers-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Providers exported successfully', type: 'success' });
  }, [exportKeys]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const count = await importKeys(event.target?.result as string);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Successfully imported ${count} provider(s)`, type: 'success' });
      } catch {
        eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to import providers', type: 'error' });
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

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="provider-header">
          <div>
            <h2 className="provider-heading">AI Providers</h2>
            <p className="provider-subtitle">
              {keys.length > 0
                ? `${activeCount} active${errorCount > 0 ? `, ${errorCount} errors` : ''} · ${totalTokens.toLocaleString()} tokens · ${formatCost(totalCost)}`
                : 'Add your first provider to get started.'}
            </p>
          </div>
          <div className="provider-inline-flex" style={{ gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={handleExport} aria-label="Export providers">
              <Download size={16} /> Export
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => fileInputRef.current?.click()} 
              aria-label="Import providers"
            >
              <Upload size={16} /> Import
            </button>
            <button className="btn-secondary provider-check-all-btn" onClick={handleCheckAllHealth} disabled={anyChecking}>
              <RefreshCw size={16} className={anyChecking ? 'provider-spin' : ''} /> Check All Health
            </button>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Custom Provider
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="provider-summary-row">
          <div className="provider-summary-item">
            <Activity size={14} color="var(--text-muted)" />
            <span>{activeCount}/{keys.length} Active</span>
          </div>
          <div className="provider-summary-item">
            <Zap size={14} color="var(--text-muted)" />
            <span>{totalTokens.toLocaleString()} Tokens</span>
          </div>
          <div className="provider-summary-item">
            <DollarSign size={14} color="var(--text-muted)" />
            <span>{formatCost(totalCost)} Cost</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="provider-tab-bar" role="tablist" aria-label="Provider sections" onKeyDown={handleTabKeyDown}>
          {TABS.map(tab => (
            <button 
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`provider-panel-${tab}`}
              onClick={() => setActiveTab(tab)}
              tabIndex={activeTab === tab ? 0 : -1}
              className={`provider-tab-btn ${activeTab === tab ? 'provider-tab-btn--active' : 'provider-tab-btn--inactive'}`}
            >
              {tab === 'installed' ? `Installed (${keys.length})` : tab === 'browse' ? 'Browse Models' : 'Routing & SLA'}
            </button>
          ))}
        </motion.div>

        {activeTab === 'installed' ? (
          <motion.div variants={itemVariants} role="tabpanel" id="provider-panel-installed" aria-label="Installed providers">
            <InstalledProvidersView 
              keys={keys}
              onSelect={(key, tab) => { setSelectedProfile(key); setInitialProfileTab(tab); }}
              onCheckHealth={handleCheckHealth}
              onToggleStatus={toggleKeyStatus}
              onEnableAll={enableAllKeys}
              onDisableAll={disableAllKeys}
              checkingKeys={checkingKeys}
            />
          </motion.div>
        ) : activeTab === 'browse' ? (
          <motion.div variants={itemVariants} role="tabpanel" id="provider-panel-browse" aria-label="Browse models">
            <BrowseModelsView onAddProvider={() => setShowAddModal(true)} />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} role="tabpanel" id="provider-panel-routing" aria-label="Routing and SLA">
            <RoutingSLAView keys={keys} />
          </motion.div>
        )}
      </motion.div>

      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".json" 
        style={{ display: 'none' }} 
        onChange={handleImport} 
      />

      <AnimatePresence>
        {showAddModal && <AddKeyModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProfile && (
          <ProviderDetailModal 
            profile={selectedProfile}
            initialTab={initialProfileTab}
            onClose={() => setSelectedProfile(null)}
            onCheckHealth={handleCheckHealth}
            onRemove={removeKey}
            checkingKeys={checkingKeys}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProviderManager;
