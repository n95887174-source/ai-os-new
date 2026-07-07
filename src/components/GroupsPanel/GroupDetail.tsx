import React, { useState } from 'react';
import { Trash2, Edit3, Check, X, Key, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import type { KeyGroup } from '../../kernel/contracts/group-manager';
import type { ApiKey } from '../../types/metrics';
import { useConfirm } from '../../hooks/useConfirm';
import { useTranslation } from '../../i18n/useTranslation';

const CARD: React.CSSProperties = {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 12,
    padding: '1rem',
    backdropFilter: 'blur(12px)',
};

const STATUS_COLORS: Record<string, string> = {
    active: '#22c55e',
    error: '#ef4444',
    limited: '#f59e0b',
    broken: '#ef4444',
    unknown: '#94a3b8',
};

interface GroupDetailProps {
    group: KeyGroup;
    groups: KeyGroup[];
    groupKeys: ApiKey[];
    unassignedKeys: ApiKey[];
    poolStatsByProvider: {
        provider: string;
        burst: { availableBurst: number; totalQuota: number };
        quota: { available: number; sharedPool: number };
    }[];
    onRename: (id: string, name: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onMoveKey: (keyId: string, targetGroup: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const GroupDetail: React.FC<GroupDetailProps> = ({
    group,
    groups,
    groupKeys,
    unassignedKeys,
    poolStatsByProvider,
    onRename,
    onDelete,
    onMoveKey,
    refresh,
}) => {
    const { t } = useTranslation();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const { confirm, ConfirmDialog } = useConfirm();
    const isDefault = group.id === '__default__';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ConfirmDialog />
            <div style={{ ...CARD }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}
                >
                    <div style={{ flex: 1 }}>
                        {editingId === group.id ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && onRename(group.id, editName)
                                    }
                                    style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(148,163,184,0.2)',
                                        borderRadius: 6,
                                        padding: '0.3rem 0.6rem',
                                        color: '#e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        width: 250,
                                    }}
                                />
                                <button
                                    onClick={() => onRename(group.id, editName)}
                                    style={{
                                        background: 'rgba(34,197,94,0.15)',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '0.3rem 0.5rem',
                                        cursor: 'pointer',
                                        color: '#22c55e',
                                    }}
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '0.3rem 0.5rem',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                                    {group.name}
                                </h2>
                                {!isDefault && (
                                    <button
                                        onClick={() => {
                                            setEditingId(group.id);
                                            setEditName(group.name);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: 6,
                                            padding: '0.25rem',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                        }}
                                        aria-label="Edit group name"
                                    >
                                        <Edit3 size={13} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                            {group.keyIds.length} {t('groups.keys_count')}
                            {isDefault && (
                                <span
                                    style={{ marginLeft: 12, color: '#f59e0b', fontSize: '0.7rem' }}
                                >
                                    <AlertTriangle
                                        size={11}
                                        style={{ marginRight: 4, verticalAlign: 'middle' }}
                                    />
                                    {t('groups.default_warning')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={refresh}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 6,
                                padding: '0.3rem 0.5rem',
                                cursor: 'pointer',
                                color: '#64748b',
                            }}
                            title="Refresh"
                        >
                            <RefreshCw size={14} />
                        </button>
                        {!isDefault && (
                            <button
                                onClick={async () => {
                                    if (
                                        await confirm({
                                            title: t('groups.delete'),
                                            message:
                                                'Are you sure you want to delete this group? Associated keys will be ungrouped.',
                                            variant: 'danger',
                                        })
                                    ) {
                                        await onDelete(group.id);
                                    }
                                }}
                                style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '0.3rem 0.5rem',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                }}
                                title={t('groups.delete')}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {poolStatsByProvider.length > 0 && (
                <div style={{ ...CARD }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>
                        Shared pool capacity
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {poolStatsByProvider.map(({ provider, burst, quota }) => (
                            <div
                                key={provider}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 8,
                                    fontSize: '0.75rem',
                                    padding: '0.5rem 0.65rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                }}
                            >
                                <span style={{ fontWeight: 600, color: '#93c5fd' }}>
                                    {provider}
                                </span>
                                <span style={{ color: '#94a3b8' }}>
                                    Burst:{' '}
                                    <span style={{ color: '#e2e8f0' }}>{burst.availableBurst}</span>
                                    <span style={{ color: '#64748b' }}> / {burst.totalQuota}</span>
                                </span>
                                <span style={{ color: '#94a3b8' }}>
                                    Shared:{' '}
                                    <span style={{ color: '#e2e8f0' }}>{quota.available}</span>
                                    <span style={{ color: '#64748b' }}>
                                        {' '}
                                        (pool {Math.round(quota.sharedPool)})
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ ...CARD }}>
                <div
                    style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Key size={14} color="#60a5fa" /> {t('groups.keys_in_group')} (
                    {groupKeys.length})
                </div>
                {groupKeys.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 20,
                            color: '#64748b',
                            fontSize: '0.8rem',
                        }}
                    >
                        {t('groups.no_keys')}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 100px 90px 140px 90px',
                                gap: 8,
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.7rem',
                                color: '#64748b',
                                fontWeight: 600,
                            }}
                        >
                            <span>{t('provider.column.label')}</span>
                            <span>Key</span>
                            <span>{t('provider.column.provider')}</span>
                            <span>{t('provider.column.status')}</span>
                            <span>{t('groups.move_to')}</span>
                        </div>
                        {groupKeys.map((k) => {
                            const m =
                                k.key && k.key.length > 18
                                    ? k.key.slice(0, 12) + '…' + k.key.slice(-6)
                                    : k.key || '—';
                            return (
                                <div
                                    key={k.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.2fr 100px 90px 140px 90px',
                                        gap: 8,
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: 6,
                                        background: 'rgba(0,0,0,0.15)',
                                        fontSize: '0.8rem',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: '#e2e8f0',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {k.label}
                                    </span>
                                    <span
                                        style={{
                                            color: '#94a3b8',
                                            fontSize: '0.7rem',
                                            fontFamily: 'monospace',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                        title={k.key ? `••••${k.key.slice(-6)}` : undefined}
                                    >
                                        {m}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                        {k.provider}
                                    </span>
                                    <span
                                        style={{
                                            color: STATUS_COLORS[k.status] || '#94a3b8',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {k.status}
                                    </span>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) onMoveKey(k.id, e.target.value);
                                        }}
                                        style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(148,163,184,0.15)',
                                            borderRadius: 6,
                                            padding: '0.25rem 0.4rem',
                                            color: '#e2e8f0',
                                            fontSize: '0.75rem',
                                            outline: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="">—</option>
                                        {groups
                                            .filter((g) => g.id !== group.id)
                                            .map((g) => (
                                                <option key={g.id} value={g.name}>
                                                    {g.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {!isDefault && unassignedKeys.length > 0 && (
                <div style={{ ...CARD, borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <AlertTriangle size={14} color="#f59e0b" /> {t('groups.unassigned')} (
                        {unassignedKeys.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {unassignedKeys.slice(0, 20).map((k) => (
                            <div
                                key={k.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: 6,
                                    background: 'rgba(0,0,0,0.15)',
                                    fontSize: '0.8rem',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        alignItems: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: '#e2e8f0',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {k.label}
                                    </span>
                                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                        {k.provider}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onMoveKey(k.id, group.name)}
                                    style={{
                                        background: 'rgba(59,130,246,0.1)',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '0.25rem 0.6rem',
                                        cursor: 'pointer',
                                        color: '#60a5fa',
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <ChevronRight
                                        size={12}
                                        style={{ marginRight: 4, verticalAlign: 'middle' }}
                                    />
                                    {t('groups.move_here')}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupDetail;
