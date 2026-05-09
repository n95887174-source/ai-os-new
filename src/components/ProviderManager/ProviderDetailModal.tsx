import React from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Trash2 } from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import KeyProfileExtended from '../KeyTable/KeyProfileExtended';
import type { ApiKey } from '../../types/metrics';

interface ProviderDetailModalProps {
  profile: ApiKey;
  initialTab: 'overview' | 'sandbox';
  onClose: () => void;
  onCheckHealth: (id: string) => void;
  onRemove: (id: string) => void;
}

const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({ profile, initialTab, onClose, onCheckHealth, onRemove }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      style={{ width: '100%', maxWidth: 620, background: 'var(--bg-panel)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
    >
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <ProviderIcon provider={profile.provider} size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{profile.label}</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile.provider}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}><X size={20} /></button>
      </div>

      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <KeyProfileExtended apiKey={profile} onClose={onClose} initialTab={initialTab} />
      </div>

      <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)' }}>
        <button className="btn-secondary" onClick={() => onCheckHealth(profile.id)}>
          <RefreshCw size={15} /> Run Health Check
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" style={{ background: '#ef4444' }} onClick={() => { onRemove(profile.id); onClose(); }}>
            <Trash2 size={15} /> Remove Provider
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);

export default ProviderDetailModal;
