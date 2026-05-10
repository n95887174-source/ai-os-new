import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ApiKey } from '../../types/metrics';
import AddKeyModal from '../AddKeyModal/AddKeyModal';
import ModelBrowser from '../ModelBrowser/ModelBrowser';
import InstalledProvidersView from './InstalledProvidersView';
import BrowseModelsView from './BrowseModelsView';
import RoutingSLAView from './RoutingSLAView';
import ProviderDetailModal from './ProviderDetailModal';
import { useKeyStore } from '../../stores/useKeyStore';

const ProviderManager: React.FC = () => {
  const { keys, removeKey, checkHealth, checkAllHealth } = useKeyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showModelBrowser, setShowModelBrowser] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ApiKey | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'overview' | 'sandbox'>('overview');
  const [activeTab, setActiveTab] = useState<'installed' | 'browse' | 'routing'>('installed');

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
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>AI Providers</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Connect and manage your AI providers. {keys.length > 0 ? `${keys.filter(k => k.status === 'active').length} of ${keys.length} active.` : 'Add your first provider to get started.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => checkAllHealth()}>
              <RefreshCw size={16} /> Check All Health
            </button>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Custom Provider
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', padding: '0 0.5rem' }}>
          {[
            { id: 'installed', label: 'Installed', count: keys.length },
            { id: 'browse', label: 'Browse Models' as string },
            { id: 'routing', label: 'Routing & SLA' as string },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{ 
                background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
                color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
                fontSize: '0.95rem', fontWeight: activeTab === tab.id ? 600 : 500,
                transition: 'all 0.2s', marginBottom: -1
              }}
            >
              {tab.label}{'count' in tab ? <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', opacity: 0.6 }}>({tab.count})</span> : null}
            </button>
          ))}
        </motion.div>

        {activeTab === 'installed' ? (
          <motion.div variants={itemVariants}>
            <InstalledProvidersView 
              keys={keys}
              onSelect={(key, tab) => { setSelectedProfile(key); setInitialProfileTab(tab); }}
              onCheckHealth={checkHealth}
              onCheckAllHealth={checkAllHealth}
            />
          </motion.div>
        ) : activeTab === 'browse' ? (
          <motion.div variants={itemVariants}>
            <BrowseModelsView onAddProvider={() => setShowAddModal(true)} />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <RoutingSLAView keys={keys} />
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAddModal && <AddKeyModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showModelBrowser && <ModelBrowser keys={keys} onClose={() => setShowModelBrowser(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProfile && (
          <ProviderDetailModal 
            profile={selectedProfile}
            initialTab={initialProfileTab}
            onClose={() => setSelectedProfile(null)}
            onCheckHealth={checkHealth}
            onRemove={removeKey}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProviderManager;
