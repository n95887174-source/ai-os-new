import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import type { PalaceState, PalaceRoom } from '../../kernel/services/memory/memory-palace';

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
};

const MemoryPalacePanel: React.FC = () => {
    const { t } = useTranslation();
    const [state, setState] = useState<PalaceState | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const m = await import('../../kernel/instances');
                const orch: { getPalaceState: () => Promise<PalaceState> } | undefined = (m as any)
                    .memoryOrchestrator;
                if (orch) setState(await orch.getPalaceState());
            } catch {}
        })();
    }, []);

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <h2
                style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}
            >
                {t('memory_palace.title')}
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b' }}>
                {t('memory_palace.subtitle')}
            </p>

            {state && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <div style={{ ...card, flex: 1, borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {t('memory_palace.total_entries')}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>
                            {state.totalEntries.toLocaleString()}
                        </div>
                    </div>
                    <div style={{ ...card, flex: 1, borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {t('memory_palace.memory_usage')}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>
                            {(state.totalMemoryUsage / 1024).toFixed(1)} KB
                        </div>
                    </div>
                    <div style={{ ...card, flex: 1, borderLeft: '3px solid #a855f7' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {t('memory_palace.rooms')}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>
                            {state.rooms.length}/7
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 12,
                }}
            >
                {(state?.rooms || getDefaultRooms(t)).map((room) => (
                    <div key={room.id} style={{ ...card, borderTop: `3px solid ${room.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2rem' }}>{room.icon}</span>
                            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem' }}>
                                {room.name}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                            {room.description}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: room.color, fontWeight: 600 }}>
                            {room.entryCount} {t('memory_palace.entries')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

function getDefaultRooms(t: (key: string) => string): PalaceRoom[] {
    return [
        {
            id: 'working',
            name: t('memory_palace.room_study'),
            store: 'working' as any,
            entryCount: 0,
            description: t('memory_palace.room_study_desc'),
            color: '#f59e0b',
            icon: '⚡',
        },
        {
            id: 'episodic',
            name: t('memory_palace.room_library'),
            store: 'episodic' as any,
            entryCount: 0,
            description: t('memory_palace.room_library_desc'),
            color: '#3b82f6',
            icon: '📚',
        },
        {
            id: 'semantic',
            name: t('memory_palace.room_archive'),
            store: 'semantic' as any,
            entryCount: 0,
            description: t('memory_palace.room_archive_desc'),
            color: '#10b981',
            icon: '🏛️',
        },
        {
            id: 'procedural',
            name: t('memory_palace.room_workshop'),
            store: 'procedural' as any,
            entryCount: 0,
            description: t('memory_palace.room_workshop_desc'),
            color: '#8b5cf6',
            icon: '🔧',
        },
        {
            id: 'emotional',
            name: t('memory_palace.room_garden'),
            store: 'emotional' as any,
            entryCount: 0,
            description: t('memory_palace.room_garden_desc'),
            color: '#ef4444',
            icon: '🌺',
        },
        {
            id: 'social',
            name: t('memory_palace.room_courtyard'),
            store: 'social' as any,
            entryCount: 0,
            description: t('memory_palace.room_courtyard_desc'),
            color: '#06b6d4',
            icon: '👥',
        },
        {
            id: 'spatial',
            name: t('memory_palace.room_observatory'),
            store: 'spatial' as any,
            entryCount: 0,
            description: t('memory_palace.room_observatory_desc'),
            color: '#a855f7',
            icon: '🔭',
        },
    ];
}

export default MemoryPalacePanel;
