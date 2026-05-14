import React, { useState, useMemo } from 'react';
import { Search, Package, CheckCircle2, AlertTriangle, Loader2, Shield, RefreshCw, Terminal, ArrowUpDown, ArrowUp, ArrowDown, Layers, Power, PowerOff } from 'lucide-react';
import { motion } from 'framer-motion';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import type { ApiKey } from '../../types/metrics';

interface InstalledProvidersViewProps {
  keys: ApiKey[];
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
  onToggleStatus: (keyId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  checkingIds: Set<string>;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:          { label: 'Active',          color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle2 size={14} /> },
  error:           { label: 'Error',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <AlertTriangle size={14} /> },
  checking:        { label: 'Checking',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Loader2 size={14} className="provider-spin" /> },
  inactive:        { label: 'Inactive',        color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', icon: <Shield size={14} /> },
  pending:         { label: 'Pending',         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <Loader2 size={14} /> },
  quota_exhausted: { label: 'Quota Exhausted', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <AlertTriangle size={14} /> },
  invalid:         { label: 'Invalid',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <AlertTriangle size={14} /> },
  duplicate:       { label: 'Duplicate',       color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: <AlertTriangle size={14} /> },
  quarantined:     { label: 'Quarantined',     color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  icon: <Shield size={14} /> },
  probation:       { label: 'Probation',       color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: <AlertTriangle size={14} /> },
  unknown:         { label: 'Unchecked',       color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', icon: <Shield size={14} /> },
};

interface ProviderRowProps {
  apiKey: ApiKey;
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
  onToggleStatus: (keyId: string) => void;
  isChecking: boolean;
  searchQuery: string;
}

function repColor(reputation: number): string {
  if (reputation === 0) return '#52525b';
  return reputation > 80 ? '#10b981' : reputation > 50 ? '#f59e0b' : '#ef4444';
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="provider-highlight">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

type SortColumn = 'label' | 'status' | 'latency' | 'tps' | 'reliability' | 'reputation' | 'models';
type SortDir = 'asc' | 'desc';

const ProviderTableRow: React.FC<ProviderRowProps> = ({ apiKey, onSelect, onCheckHealth, onToggleStatus, isChecking, searchQuery }) => {
  const status = statusConfig[apiKey.status] || statusConfig.unknown;
  const reputation = apiKey.stats?.extended?.reputationScore || 0;
  const modelCount = apiKey.availableModels?.length || 0;

  return (
    <tr 
      onClick={() => onSelect(apiKey, 'overview')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(apiKey, 'overview'); } }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${apiKey.label}`}
    >
      <td>
        <div className="provider-inline-flex" style={{ gap: '0.75rem' }}>
          <ProviderIcon provider={apiKey.provider} size={18} />
          <div>
            <div className="provider-name-label">{highlightText(apiKey.label, searchQuery)}</div>
            <div className="provider-name-sub">{highlightText(apiKey.provider, searchQuery)}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="provider-status-badge" style={{ color: status.color, background: status.bg }}>
          {status.icon} {status.label}
        </span>
      </td>
      <td>
        {apiKey.tags && apiKey.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {apiKey.tags.map(tag => {
              const tagColor = tag.startsWith('env:') ? '#3b82f6' : tag.startsWith('tier:') ? '#10b981' : '#a855f7';
              return (
                <span key={tag} style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: `${tagColor}15`, color: tagColor, border: `1px solid ${tagColor}30`, fontWeight: 600 }}>
                  {tag.replace(/^(env|tier):/, '')}
                </span>
              );
            })}
          </div>
        )}
      </td>
      <td className="provider-table-cell-value">
        {apiKey.stats?.avgLatency ? `${Math.round(apiKey.stats.avgLatency)}ms` : '\u2014'}
      </td>
      <td className="provider-table-cell-value">
        {typeof apiKey.stats?.extended?.latencyBreakdown?.tokensPerSec === 'number' 
          ? apiKey.stats.extended.latencyBreakdown.tokensPerSec.toFixed(1) 
          : '\u2014'}
      </td>
      <td className="provider-table-cell-value">
        {apiKey.stats?.successCount || apiKey.stats?.errorCount 
          ? `${Math.round((apiKey.stats.successCount / (apiKey.stats.successCount + apiKey.stats.errorCount)) * 100)}%`
          : 'N/A'}
      </td>
      <td>
        <div className="provider-inline-flex">
          <div className="provider-rep-bar">
            <div className="provider-rep-fill" style={{ width: `${reputation}%`, background: repColor(reputation) }} />
          </div>
          <span className="provider-rep-text" style={{ color: repColor(reputation) }}>{reputation}</span>
        </div>
      </td>
      <td>
        {modelCount > 0 && (
          <span className="provider-model-badge" title={`${modelCount} model${modelCount > 1 ? 's' : ''}`}>
            <Layers size={12} /> {modelCount}
          </span>
        )}
      </td>
      <td>
        <div className="provider-action-group">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleStatus(apiKey.id); }}
            className={`provider-action-btn ${apiKey.status === 'active' ? 'provider-action-btn--active' : 'provider-action-btn--inactive'}`}
            title={apiKey.status === 'active' ? 'Disable provider' : 'Enable provider'}
          >
            {apiKey.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (!isChecking) onCheckHealth(apiKey.id); }}
            className={`provider-action-btn${isChecking ? ' provider-action-btn--checking' : ''}`}
            disabled={isChecking}
            title={isChecking ? 'Checking health...' : 'Check Health'}
          >
            <RefreshCw size={14} className={isChecking ? 'provider-spin' : ''} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(apiKey, 'sandbox'); }}
            className="provider-action-btn provider-action-btn--sandbox"
            title="Open Sandbox"
          >
            <Terminal size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const ProviderCard: React.FC<ProviderRowProps> = ({ apiKey, onSelect, onCheckHealth, onToggleStatus, isChecking, searchQuery }) => {
  const status = statusConfig[apiKey.status] || statusConfig.unknown;
  const reputation = apiKey.stats?.extended?.reputationScore || 0;
  const modelCount = apiKey.availableModels?.length || 0;

  return (
    <motion.div
      layoutId={apiKey.id}
      onClick={() => onSelect(apiKey, 'overview')}
      className="glass-panel provider-card-item"
      whileHover={{ scale: 1.01, borderColor: 'rgba(59,130,246,0.3)' }}
    >
      <div className="provider-inline-flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div className="provider-inline-flex" style={{ gap: '1rem' }}>
          <div className="provider-card-icon-box">
            <ProviderIcon provider={apiKey.provider} size={20} />
          </div>
          <div>
            <div className="provider-card-title">{highlightText(apiKey.label, searchQuery)}</div>
            <div className="provider-name-sub" style={{ fontSize: '0.75rem' }}>{highlightText(apiKey.provider, searchQuery)}</div>
          </div>
        </div>
        <div className="provider-card-end">
          <span className="provider-status-badge" style={{ color: status.color, background: status.bg }}>
            {status.icon} {status.label}
          </span>
          {apiKey.tags && apiKey.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {apiKey.tags.map(tag => {
                const tagColor = tag.startsWith('env:') ? '#3b82f6' : tag.startsWith('tier:') ? '#10b981' : '#a855f7';
                return (
                  <span key={tag} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', borderRadius: 4, background: `${tagColor}15`, color: tagColor, border: `1px solid ${tagColor}30`, fontWeight: 600 }}>
                    {tag.replace(/^(env|tier):/, '')}
                  </span>
                );
              })}
            </div>
          )}
          <div className="provider-inline-flex" style={{ gap: '0.4rem', marginTop: '0.25rem' }}>
            <div className="provider-rep-bar">
              <div className="provider-rep-fill" style={{ width: `${reputation}%`, background: repColor(reputation) }} />
            </div>
            <span className="provider-rep-text" style={{ fontSize: '0.65rem', color: repColor(reputation) }}>{reputation} REP</span>
          </div>
        </div>
      </div>

      <div className="provider-card-metric-grid">
        <div className="provider-card-metric-cell">
          <div className="provider-metric-label">Latency</div>
          <div className="provider-metric-value">{apiKey.stats?.avgLatency ? `${Math.round(apiKey.stats.avgLatency)}ms` : '\u2014'}</div>
        </div>
        <div className="provider-card-metric-cell provider-card-metric-cell--bordered">
          <div className="provider-metric-label">TPS</div>
          <div className="provider-metric-value">
            {typeof apiKey.stats?.extended?.latencyBreakdown?.tokensPerSec === 'number' 
              ? apiKey.stats.extended.latencyBreakdown.tokensPerSec.toFixed(1) 
              : '\u2014'}
          </div>
        </div>
        <div className="provider-card-metric-cell">
          <div className="provider-metric-label">Reliability</div>
          <div className="provider-metric-value">
            {apiKey.stats?.successCount || apiKey.stats?.errorCount 
              ? `${Math.round((apiKey.stats.successCount / (apiKey.stats.successCount + apiKey.stats.errorCount)) * 100)}%`
              : 'N/A'}
          </div>
        </div>
      </div>

      <div className="provider-inline-flex" style={{ justifyContent: 'space-between', marginTop: '0.75rem' }}>
        {modelCount > 0 && (
          <span className="provider-model-badge">
            <Layers size={12} /> {modelCount} model{modelCount > 1 ? 's' : ''}
          </span>
        )}
        <div className="provider-action-group" style={{ marginLeft: 'auto' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleStatus(apiKey.id); }}
            className={`provider-action-btn ${apiKey.status === 'active' ? 'provider-action-btn--active' : 'provider-action-btn--inactive'}`}
            title={apiKey.status === 'active' ? 'Disable provider' : 'Enable provider'}
          >
            {apiKey.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (!isChecking) onCheckHealth(apiKey.id); }}
            className={`provider-action-btn${isChecking ? ' provider-action-btn--checking' : ''}`}
            disabled={isChecking}
            title={isChecking ? 'Checking health...' : 'Check Health'}
          >
            <RefreshCw size={14} className={isChecking ? 'provider-spin' : ''} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(apiKey, 'sandbox'); }}
            className="provider-action-btn provider-action-btn--sandbox"
            title="Open Sandbox"
          >
            <Terminal size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

type SortFn = (a: ApiKey, b: ApiKey) => number;

const SORT_FNS: Record<SortColumn, (dir: SortDir) => SortFn> = {
  label:      dir => (a, b) => dir === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label),
  status:     dir => (a, b) => dir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status),
  latency:    dir => (a, b) => dir === 'asc' ? (a.stats?.avgLatency || 0) - (b.stats?.avgLatency || 0) : (b.stats?.avgLatency || 0) - (a.stats?.avgLatency || 0),
  tps:        dir => (a, b) => dir === 'asc' ? (a.stats?.extended?.latencyBreakdown?.tokensPerSec || 0) - (b.stats?.extended?.latencyBreakdown?.tokensPerSec || 0) : (b.stats?.extended?.latencyBreakdown?.tokensPerSec || 0) - (a.stats?.extended?.latencyBreakdown?.tokensPerSec || 0),
  reliability: dir => (a, b) => {
    const ra = a.stats?.successCount && a.stats?.errorCount ? a.stats.successCount / (a.stats.successCount + a.stats.errorCount) : 1;
    const rb = b.stats?.successCount && b.stats?.errorCount ? b.stats.successCount / (b.stats.successCount + b.stats.errorCount) : 1;
    return dir === 'asc' ? ra - rb : rb - ra;
  },
  reputation: dir => (a, b) => dir === 'asc' ? (a.stats?.extended?.reputationScore || 0) - (b.stats?.extended?.reputationScore || 0) : (b.stats?.extended?.reputationScore || 0) - (a.stats?.extended?.reputationScore || 0),
  models:     dir => (a, b) => dir === 'asc' ? (a.availableModels?.length || 0) - (b.availableModels?.length || 0) : (b.availableModels?.length || 0) - (a.availableModels?.length || 0),
};

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'label', label: 'Provider' },
  { key: 'status', label: 'Status' },
  { key: 'label', label: 'Tags' },
  { key: 'latency', label: 'Latency' },
  { key: 'tps', label: 'TPS' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'reputation', label: 'Reputation' },
  { key: 'models', label: 'Models' },
];

const InstalledProvidersView: React.FC<InstalledProvidersViewProps> = React.memo(({ keys, onSelect, onCheckHealth, onToggleStatus, onEnableAll, onDisableAll, checkingIds }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortColumn, setSortColumn] = useState<SortColumn>('label');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const filteredKeys = useMemo(() => keys.filter(k =>
    (statusFilter === 'all' || k.status === statusFilter) &&
    (k.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.provider.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [keys, searchQuery, statusFilter]);

  const sortedKeys = useMemo(() => {
    if (!sortColumn) return filteredKeys;
    return [...filteredKeys].sort(SORT_FNS[sortColumn](sortDir));
  }, [filteredKeys, sortColumn, sortDir]);

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        <div className="provider-inline-flex" style={{ gap: '1rem', justifyContent: 'space-between' }}>
          <div className="provider-inline-flex" style={{ gap: '1rem' }}>
            <div className="provider-search-wrapper">
              <Search className="provider-search-icon" size={18} />
              <input
                type="text"
                placeholder="Search installed providers..."
                aria-label="Search installed providers"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="provider-search-input"
              />
            </div>
            <div className="provider-view-toggle">
              <button 
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={viewMode === 'table' ? 'provider-view-toggle--active' : 'provider-view-toggle--inactive'}
              >
                Table
              </button>
              <button 
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={viewMode === 'cards' ? 'provider-view-toggle--active' : 'provider-view-toggle--inactive'}
              >
                Cards
              </button>
            </div>
          </div>
          <div className="provider-inline-flex" style={{ gap: '0.5rem' }}>
            <button onClick={onEnableAll} className="btn-secondary">
              <Power size={16} /> Enable All
            </button>
            <button onClick={onDisableAll} className="btn-secondary">
              <PowerOff size={16} /> Disable All
            </button>
          </div>
        </div>
        <div className="provider-inline-flex" style={{ gap: '0.5rem' }}>
          {['all', 'active', 'inactive', 'error', 'checking', 'quota_exhausted', 'pending', 'invalid'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                borderRadius: 8,
                border: statusFilter === status ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.1)',
                background: statusFilter === status ? 'rgba(96,165,250,0.2)' : 'transparent',
                color: statusFilter === status ? '#60a5fa' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {sortedKeys.length > 0 ? (
        viewMode === 'table' ? (
          <div className="provider-table-wrapper">
            <table className="provider-table">
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key + '-' + col.label} onClick={() => handleSort(col.key)} className="provider-sort-header" aria-sort={sortColumn === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <div className="provider-inline-flex" style={{ gap: '0.3rem' }}>
                        {col.label}
                        {sortColumn === col.key ? <SortIcon size={12} /> : <ArrowUpDown size={12} className="provider-sort-icon-inactive" />}
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map(k => (
                  <ProviderTableRow key={k.id} apiKey={k} onSelect={onSelect} onCheckHealth={onCheckHealth} onToggleStatus={onToggleStatus} isChecking={checkingIds.has(k.id)} searchQuery={searchQuery} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="provider-card-grid">
            {sortedKeys.map(k => (
              <ProviderCard key={k.id} apiKey={k} onSelect={onSelect} onCheckHealth={onCheckHealth} onToggleStatus={onToggleStatus} isChecking={checkingIds.has(k.id)} searchQuery={searchQuery} />
            ))}
          </div>
        )
      ) : (
        <div className="glass-panel provider-empty-state">
          <Package size={48} />
          <h3>No providers found</h3>
          <p>{searchQuery ? 'Try a different search term.' : 'Add a new provider to get started.'}</p>
        </div>
      )}
    </div>
  );
});

export default InstalledProvidersView;
