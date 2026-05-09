import React, { useState } from 'react';
import { Search, Package, CheckCircle2, AlertTriangle, Loader2, Shield, RefreshCw, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import type { ApiKey } from '../../types/metrics';

interface InstalledProvidersViewProps {
  keys: ApiKey[];
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
  onCheckAllHealth: () => void;
}

const statusConfig = {
  active:   { label: 'Active',   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle2 size={14} /> },
  error:    { label: 'Error',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <AlertTriangle size={14} /> },
  checking: { label: 'Checking', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> },
  unknown:  { label: 'Unchecked', color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', icon: <Shield size={14} /> },
};

interface ProviderRowProps {
  key: ApiKey;
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
}

const ProviderTableRow: React.FC<ProviderRowProps> = ({ key: apiKey, onSelect, onCheckHealth }) => {
  const status = statusConfig[apiKey.status] || statusConfig.unknown;
  const reputation = apiKey.stats?.extended?.reputationScore || 0;
  const repColor = reputation > 80 ? '#10b981' : reputation > 50 ? '#f59e0b' : '#ef4444';

  return (
    <tr 
      onClick={() => onSelect(apiKey, 'overview')}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
      className="table-row-hover"
    >
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ProviderIcon provider={apiKey.provider} size={18} />
          <div>
            <div style={{ fontWeight: 700 }}>{apiKey.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{apiKey.provider}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '1rem' }}>
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', 
          borderRadius: 100, fontSize: '0.7rem', fontWeight: 700,
          color: status.color, background: status.bg 
        }}>
          {status.icon} {status.label}
        </span>
      </td>
      <td style={{ padding: '1rem', fontWeight: 600 }}>
        {apiKey.stats?.avgLatency ? `${Math.round(apiKey.stats.avgLatency)}ms` : '\u2014'}
      </td>
      <td style={{ padding: '1rem', fontWeight: 600 }}>
        {typeof apiKey.stats?.extended?.latencyBreakdown?.tokensPerSec === 'number' 
          ? apiKey.stats.extended.latencyBreakdown.tokensPerSec.toFixed(1) 
          : '0.0'}
      </td>
      <td style={{ padding: '1rem', fontWeight: 600 }}>
        {apiKey.stats?.successCount || apiKey.stats?.errorCount 
          ? `${Math.round((apiKey.stats.successCount / (apiKey.stats.successCount + apiKey.stats.errorCount)) * 100)}%`
          : '100%'}
      </td>
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${reputation}%`, height: '100%', background: repColor }} />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: repColor }}>{reputation}</span>
        </div>
      </td>
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onCheckHealth(apiKey.id); }}
            style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
            title="Check Health"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(apiKey, 'sandbox'); }}
            style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }}
            title="Open Sandbox"
          >
            <Terminal size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const ProviderCard: React.FC<ProviderRowProps> = ({ key: apiKey, onSelect, onCheckHealth }) => {
  const status = statusConfig[apiKey.status] || statusConfig.unknown;
  const reputation = apiKey.stats?.extended?.reputationScore || 0;
  const repColor = reputation > 80 ? '#10b981' : reputation > 50 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      layoutId={apiKey.id}
      onClick={() => onSelect(apiKey, 'overview')}
      className="glass-panel"
      style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border)' }}
      whileHover={{ scale: 1.01, borderColor: 'rgba(59,130,246,0.3)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <ProviderIcon provider={apiKey.provider} size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{apiKey.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{apiKey.provider}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span style={{ 
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', 
            borderRadius: 100, fontSize: '0.7rem', fontWeight: 700,
            color: status.color, background: status.bg 
          }}>
            {status.icon} {status.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${reputation}%`, height: '100%', background: repColor }} />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: repColor }}>{reputation} REP</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Latency</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{apiKey.stats?.avgLatency ? `${Math.round(apiKey.stats.avgLatency)}ms` : '\u2014'}</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>TPS</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {typeof apiKey.stats?.extended?.latencyBreakdown?.tokensPerSec === 'number' 
              ? apiKey.stats.extended.latencyBreakdown.tokensPerSec.toFixed(1) 
              : '0.0'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Reliability</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {apiKey.stats?.successCount || apiKey.stats?.errorCount 
              ? `${Math.round((apiKey.stats.successCount / (apiKey.stats.successCount + apiKey.stats.errorCount)) * 100)}%`
              : '100%'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const InstalledProvidersView: React.FC<InstalledProvidersViewProps> = ({ keys, onSelect, onCheckHealth, onCheckAllHealth }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const filteredKeys = keys.filter(k =>
    k.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search installed providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, color: 'white', fontSize: '0.95rem' }}
          />
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 }}>
          <button 
            onClick={() => setViewMode('table')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: viewMode === 'table' ? '#3b82f6' : 'transparent', color: viewMode === 'table' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Table
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: viewMode === 'cards' ? '#3b82f6' : 'transparent', color: viewMode === 'cards' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Cards
          </button>
        </div>
      </div>

      {filteredKeys.length > 0 ? (
        viewMode === 'table' ? (
          <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem' }}>Provider</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Latency</th>
                  <th style={{ padding: '1rem' }}>TPS</th>
                  <th style={{ padding: '1rem' }}>Reliability</th>
                  <th style={{ padding: '1rem' }}>Reputation</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map(k => (
                  <ProviderTableRow key={k.id} key={k} onSelect={onSelect} onCheckHealth={onCheckHealth} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
            {filteredKeys.map(k => (
              <ProviderCard key={k.id} key={k} onSelect={onSelect} onCheckHealth={onCheckHealth} />
            ))}
          </div>
        )
      ) : (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
          <h3>No providers found</h3>
          <p>Try a different search term or add a new provider.</p>
        </div>
      )}
    </div>
  );
};

export default InstalledProvidersView;
