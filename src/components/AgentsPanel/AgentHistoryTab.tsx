import React from 'react';
import { agentVersionService } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { PanelSkeleton } from '../Common/Skeleton';

export const AgentHistoryTab: React.FC<{ agentId: string }> = ({ agentId }) => {
    const [versions, setVersions] = React.useState<
        Awaited<ReturnType<typeof agentVersionService.getVersions>>
    >([]);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        agentVersionService
            .getVersions(agentId)
            .then((v) => {
                setVersions(v);
                setLoading(false);
            })
            .catch((err) => {
                console.warn('[AgentHistoryTab] Failed to load versions', err);
                setLoading(false);
            });
    }, [agentId]);
    if (loading) return <PanelSkeleton title={false} />;
    if (versions.length === 0)
        return (
            <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>
                No version history for this agent.
            </div>
        );
    return versions
        .slice()
        .reverse()
        .map((v, i) => {
            const isLatest = i === 0;
            return (
                <div
                    key={v.id}
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.4rem',
                        }}
                    >
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            v{versions.length - i}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {new Date(v.timestamp).toLocaleString()}
                        </span>
                    </div>
                    {v.message && (
                        <div
                            style={{
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                                marginBottom: '0.3rem',
                            }}
                        >
                            {v.message}
                        </div>
                    )}
                    {!isLatest && (
                        <button
                            onClick={async () => {
                                const cfg = await agentVersionService.rollback(agentId, v.id);
                                if (cfg) {
                                    eventBus.emit(EVENTS.NOTIFICATION, {
                                        message: `Rollback to v${versions.length - i} — config keys: ${Object.keys(cfg).join(', ')}`,
                                        type: 'info',
                                    });
                                }
                            }}
                            style={{
                                fontSize: '0.7rem',
                                color: '#3b82f6',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            Rollback to this version
                        </button>
                    )}
                </div>
            );
        });
};
