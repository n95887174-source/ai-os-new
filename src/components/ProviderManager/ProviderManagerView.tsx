import React from 'react';
import { Plus, RefreshCw, Activity, DollarSign, Zap, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ApiKey } from '../../types/metrics';
import AddKeyModal from '../AddKeyModal/AddKeyModal';
import InstalledProvidersView from './InstalledProvidersView';
import BrowseModelsView from './BrowseModelsView';
import RoutingSLAView from './RoutingSLAView';
import ProviderDetailModal from './ProviderDetailModal';

export type TabId = 'installed' | 'browse' | 'routing';
export const TABS: TabId[] = ['installed', 'browse', 'routing'];

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.001) return `$${cost.toFixed(4)}`;
  return '<$0.001';
}

export interface ProviderManagerViewProps {
  keys: ApiKey[];
  checkingIds: Set<string>;
  activeTab: TabId;
  showAddModal: boolean;
  selectedProfile: ApiKey | null;
  initialProfileTab: 'overview' | 'sandbox';
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  totalTokens: number;
  totalCost: number;
  activeCount: number;
  errorCount: number;
  anyChecking: boolean;
  onSetActiveTab: (tab: TabId) => void;
  onSetShowAddModal: (show: boolean) => void;
  onSelectProfile: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onClearProfile: () => void;
  onCheckHealth: (id: string) => void;
  onCheckAllHealth: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTabKeyDown: (e: React.KeyboardEvent) => void;
  onToggleStatus: (id: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onRemoveKey: (id: string) => void;
}

const ProviderManagerView: React.FC<ProviderManagerViewProps> = ({
  keys, checkingIds, activeTab, showAddModal, selectedProfile, initialProfileTab,
  fileInputRef, totalTokens, totalCost, activeCount, errorCount, anyChecking,
  onSetActiveTab, onSetShowAddModal, onSelectProfile, onClearProfile,
  onCheckHealth, onCheckAllHealth, onExport, onImport, onTabKeyDown,
  onToggleStatus, onEnableAll, onDisableAll, onRemoveKey,
}) => (
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
          <button className="btn-secondary" onClick={onExport} aria-label="Export providers">
            <Download size={16} /> Export
          </button>
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import providers"
          >
            <Upload size={16} /> Import
          </button>
          <button className="btn-secondary provider-check-all-btn" onClick={onCheckAllHealth} disabled={anyChecking}>
            <RefreshCw size={16} className={anyChecking ? 'provider-spin' : ''} /> Check All Health
          </button>
          <button className="btn-primary" onClick={() => onSetShowAddModal(true)}>
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

      <motion.div variants={itemVariants} className="provider-tab-bar" role="tablist" aria-label="Provider sections" onKeyDown={onTabKeyDown}>
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`provider-panel-${tab}`}
            onClick={() => onSetActiveTab(tab)}
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
            onSelect={onSelectProfile}
            onCheckHealth={onCheckHealth}
            onToggleStatus={onToggleStatus}
            onEnableAll={onEnableAll}
            onDisableAll={onDisableAll}
            checkingIds={checkingIds}
          />
        </motion.div>
      ) : activeTab === 'browse' ? (
        <motion.div variants={itemVariants} role="tabpanel" id="provider-panel-browse" aria-label="Browse models">
          <BrowseModelsView onAddProvider={() => onSetShowAddModal(true)} installedKeys={keys} />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} role="tabpanel" id="provider-panel-routing" aria-label="Routing and SLA">
          <RoutingSLAView keys={keys} />
        </motion.div>
      )}
    </motion.div>

    <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={onImport} />

    <AnimatePresence>
      {showAddModal && <AddKeyModal onClose={() => onSetShowAddModal(false)} />}
    </AnimatePresence>

    <AnimatePresence>
      {selectedProfile && (
        <ProviderDetailModal
          profile={selectedProfile}
          initialTab={initialProfileTab}
          onClose={onClearProfile}
          onCheckHealth={onCheckHealth}
          onRemove={onRemoveKey}
          checkingIds={checkingIds}
        />
      )}
    </AnimatePresence>
  </>
);

export default ProviderManagerView;
