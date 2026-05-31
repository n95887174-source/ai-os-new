import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { groupManager, keyService } from '../../kernel/instances';
import { useKeyStore, refreshKeyStore } from '../../stores/useKeyStore';
import { useTranslation } from '../../i18n/useTranslation';
import {
  Users, Plus, Trash2, Edit3, Check, X, ChevronRight,
  Key, Shield, AlertTriangle, FolderTree, RefreshCw,
} from 'lucide-react';
import type { KeyGroup } from '../../kernel/contracts/group-manager';
import type { ApiKey } from '../../kernel/types/metrics-types';

const CARD: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)',
  borderRadius: 12, padding: '1rem', backdropFilter: 'blur(12px)',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', error: '#ef4444', limited: '#f59e0b', broken: '#ef4444', unknown: '#94a3b8',
};

const GroupsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { keys } = useKeyStore();
  const [groups, setGroups] = useState<KeyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [moveKeyId, setMoveKeyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setGroups(groupManager.getGroups());
    refreshKeyStore();
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedGroup = useMemo(
    () => groups.find(g => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const groupKeys = useMemo(() => {
    if (!selectedGroup) return [];
    return keys.filter(k => selectedGroup.keyIds.includes(k.id));
  }, [selectedGroup, keys]);

  const poolStatsByProvider = useMemo(() => {
    const providers = [...new Set(groupKeys.map(k => k.provider))];
    return providers.map(p => ({
      provider: p,
      burst: keyService.getBurstCapacity(p),
      quota: keyService.getQuotaShare(p),
    }));
  }, [groupKeys]);

  const unassignedKeys = useMemo(() => {
    if (!selectedGroup) return [];
    const defaultGroup = groups.find(g => g.id === '__default__');
    if (!defaultGroup) return [];
    return keys.filter(k => defaultGroup.keyIds.includes(k.id));
  }, [groups, keys]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    await groupManager.createGroup(createName.trim());
    setCreateName('');
    setCreateOpen(false);
    await refresh();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await groupManager.renameGroup(id, editName.trim());
    setEditingId(null);
    setEditName('');
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (id === '__default__') return;
    await groupManager.deleteGroup(id);
    setDeleteConfirm(null);
    if (selectedGroupId === id) setSelectedGroupId(null);
    await refresh();
  };

  const handleMoveKey = async (keyId: string, targetGroup: string) => {
    await groupManager.assignKeyToGroup(keyId, targetGroup);
    setMoveKeyId(null);
    await refresh();
  };

  if (groups.length === 0) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <FolderTree size={24} color="#3b82f6" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{t('groups.title')}</h1>
        </div>
        <div style={{ ...CARD, textAlign: 'center', padding: 40 }}>
          <Users size={40} color="#64748b" style={{ marginBottom: 12 }} />
          <div style={{ color: '#94a3b8', marginBottom: 16 }}>{t('groups.empty')}</div>
          <button onClick={() => setCreateOpen(true)} style={{
            background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
            padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
          }}>
            <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('groups.create')}
          </button>
        </div>
        {createOpen && (
          <div style={{ ...CARD, marginTop: 16, padding: '1rem' }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder={t('groups.name_placeholder')}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: 8, padding: '0.5rem 0.75rem', color: '#e2e8f0', fontSize: '0.85rem',
                outline: 'none', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreate} style={{
                background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
                padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem',
              }}>{t('common.save')}</button>
              <button onClick={() => { setCreateOpen(false); setCreateName(''); }} style={{
                background: 'transparent', color: '#94a3b8', border: 'none',
                padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem',
              }}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#e2e8f0', display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Left sidebar — group list */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderTree size={18} color="#3b82f6" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('groups.title')}</span>
          </div>
          <button onClick={() => setCreateOpen(true)}
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
              border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer' }}
            title={t('groups.create')}>
            <Plus size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groups.map(g => {
            const isDefault = g.id === '__default__';
            return (
              <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: selectedGroupId === g.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                  border: selectedGroupId === g.id ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                  borderRadius: 8, padding: '0.55rem 0.75rem', cursor: 'pointer',
                  color: selectedGroupId === g.id ? '#e2e8f0' : '#94a3b8',
                  fontSize: '0.82rem', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isDefault ? <Shield size={14} color="#64748b" /> : <FolderTree size={14} color="#60a5fa" />}
                  <span style={{ fontWeight: selectedGroupId === g.id ? 600 : 400 }}>{g.name}</span>
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', background: 'rgba(148,163,184,0.1)',
                  borderRadius: 10, padding: '0.1rem 0.45rem' }}>
                  {g.keyIds.length}
                </span>
              </button>
            );
          })}
        </div>

        {createOpen && (
          <div style={{ ...CARD, padding: '0.75rem' }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder={t('groups.name_placeholder')}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: 6, padding: '0.4rem 0.6rem', color: '#e2e8f0', fontSize: '0.8rem',
                outline: 'none', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreate} style={{
                background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                border: 'none', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem',
              }}><Check size={12} style={{ marginRight: 4 }} />{t('common.save')}</button>
              <button onClick={() => { setCreateOpen(false); setCreateName(''); }} style={{
                background: 'transparent', color: '#94a3b8', border: 'none',
                padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem',
              }}><X size={12} style={{ marginRight: 4 }} />{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — group detail */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selectedGroup ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Group header */}
            <div style={{ ...CARD }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  {editingId === selectedGroup.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRename(selectedGroup.id)}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(148,163,184,0.2)',
                          borderRadius: 6, padding: '0.3rem 0.6rem', color: '#e2e8f0', fontSize: '1rem',
                          outline: 'none', width: 250 }}
                      />
                      <button onClick={() => handleRename(selectedGroup.id)}
                        style={{ background: 'rgba(34,197,94,0.15)', border: 'none', borderRadius: 6,
                          padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#22c55e' }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ background: 'transparent', border: 'none', borderRadius: 6,
                          padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{selectedGroup.name}</h2>
                      {selectedGroup.id !== '__default__' && (
                        <button onClick={() => { setEditingId(selectedGroup.id); setEditName(selectedGroup.name); }}
                          style={{ background: 'transparent', border: 'none', borderRadius: 6,
                            padding: '0.25rem', cursor: 'pointer', color: '#64748b' }}>
                          <Edit3 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                    {selectedGroup.keyIds.length} {t('groups.keys_count')}
                    {selectedGroup.id === '__default__' && (
                      <span style={{ marginLeft: 12, color: '#f59e0b', fontSize: '0.7rem' }}>
                        <AlertTriangle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {t('groups.default_warning')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={refresh}
                    style={{ background: 'transparent', border: 'none', borderRadius: 6,
                      padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#64748b' }}
                    title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                  {deleteConfirm === selectedGroup.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{t('groups.delete_confirm')}</span>
                      <button onClick={() => handleDelete(selectedGroup.id)}
                        style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 6,
                          padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem' }}>
                        {t('common.yes')}
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        style={{ background: 'transparent', border: 'none', borderRadius: 6,
                          padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem' }}>
                        {t('common.no')}
                      </button>
                    </div>
                  ) : selectedGroup.id !== '__default__' ? (
                    <button onClick={() => setDeleteConfirm(selectedGroup.id)}
                      style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6,
                        padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#ef4444' }}
                      title={t('groups.delete')}>
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {poolStatsByProvider.length > 0 && (
              <div style={{ ...CARD }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>Shared pool capacity</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {poolStatsByProvider.map(({ provider, burst, quota }) => (
                    <div key={provider} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                      fontSize: '0.75rem', padding: '0.5rem 0.65rem',
                      background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                    }}>
                      <span style={{ fontWeight: 600, color: '#93c5fd' }}>{provider}</span>
                      <span style={{ color: '#94a3b8' }}>
                        Burst: <span style={{ color: '#e2e8f0' }}>{burst.availableBurst}</span>
                        <span style={{ color: '#64748b' }}> / {burst.totalQuota}</span>
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        Shared: <span style={{ color: '#e2e8f0' }}>{quota.available}</span>
                        <span style={{ color: '#64748b' }}> (pool {Math.round(quota.sharedPool)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key membership table */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={14} color="#60a5fa" />
                {t('groups.keys_in_group')} ({groupKeys.length})
              </div>
              {groupKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: '0.8rem' }}>
                  {t('groups.no_keys')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 100px 90px 140px 90px', gap: 8,
                    padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                    <span>{t('provider.column.label')}</span>
                    <span>Key</span>
                    <span>{t('provider.column.provider')}</span>
                    <span>{t('provider.column.status')}</span>
                    <span>{t('groups.move_to')}</span>
                  </div>
                  {groupKeys.map(k => {
                    const m = k.key && k.key.length > 18 ? k.key.slice(0, 12) + '…' + k.key.slice(-6) : k.key || '—';
                    return <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 100px 90px 140px 90px', gap: 8, padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(0,0,0,0.15)', fontSize: '0.8rem', alignItems: 'center' }}>
                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.label}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }} title={k.key}>{m}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{k.provider}</span>
                      <span style={{ color: STATUS_COLORS[k.status] || '#94a3b8', fontSize: '0.75rem' }}>{k.status}</span>
                      <select value={moveKeyId === k.id ? '__moving__' : ''} onChange={e => { if (e.target.value) handleMoveKey(k.id, e.target.value); }} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 6, padding: '0.25rem 0.4rem', color: '#e2e8f0', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="">—</option>
                        {groups.filter(g => g.id !== selectedGroup.id).map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                      </select>
                    </div>;
                  })}
                </div>
              )}
            </div>

            {/* Unassigned keys (in Default but could be moved here) */}
            {selectedGroup.id !== '__default__' && unassignedKeys.length > 0 && (
              <div style={{ ...CARD, borderColor: 'rgba(245,158,11,0.2)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color="#f59e0b" />
                  {t('groups.unassigned')} ({unassignedKeys.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {unassignedKeys.slice(0, 20).map(k => (
                    <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(0,0,0,0.15)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflow: 'hidden' }}>
                        <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {k.label}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{k.provider}</span>
                      </div>
                      <button onClick={() => handleMoveKey(k.id, selectedGroup.name)}
                        style={{ background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: 6,
                          padding: '0.25rem 0.6rem', cursor: 'pointer', color: '#60a5fa', fontSize: '0.75rem',
                          whiteSpace: 'nowrap' }}>
                        <ChevronRight size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {t('groups.move_here')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...CARD, textAlign: 'center', padding: 60 }}>
            <FolderTree size={48} color="#64748b" style={{ marginBottom: 12 }} />
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('groups.select_hint')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPanel;
