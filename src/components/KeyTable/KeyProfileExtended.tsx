import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Activity, List, BarChart3,
  StickyNote, Zap, RefreshCw
} from 'lucide-react';
import OverviewTab from './OverviewTab';
import TracesTab from './TracesTab';
import QualityTab from './QualityTab';
import ToolsTab from './ToolsTab';
import SandboxTab from './SandboxTab';
import NotesTab from './NotesTab';
import type { ApiKey } from '../../types/metrics';

interface KeyProfileExtendedProps {
  apiKey: ApiKey;
  onClose: () => void;
  initialTab?: 'overview' | 'traces' | 'quality' | 'notes' | 'tools' | 'sandbox';
}

const KeyProfileExtended: React.FC<KeyProfileExtendedProps> = ({ apiKey: key, onClose, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'traces' | 'quality' | 'notes' | 'tools' | 'sandbox'>(initialTab);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'traces', label: 'Traces', icon: List },
    { id: 'quality', label: 'Quality', icon: BarChart3 },
    { id: 'tools', label: 'Tools', icon: Zap },
    { id: 'sandbox', label: 'Sandbox', icon: RefreshCw },
    { id: 'notes', label: 'Notes', icon: StickyNote },
  ] as const;

  const stats = key.stats?.extended;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
              color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && <OverviewTab key="overview" apiKey={apiKey} />}
        {activeTab === 'traces' && <TracesTab key="traces" stats={stats} />}
        {activeTab === 'quality' && <QualityTab key="quality" stats={stats} />}
        {activeTab === 'tools' && <ToolsTab key="tools" keyId={apiKey.id} />}
        {activeTab === 'sandbox' && <SandboxTab key="sandbox" apiKey={apiKey} onClose={onClose} />}
        {activeTab === 'notes' && <NotesTab key="notes" apiKey={apiKey} />}
      </AnimatePresence>
    </div>
  );
};

export default KeyProfileExtended;
