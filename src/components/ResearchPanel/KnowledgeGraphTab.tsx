import React, { useState } from 'react';
import { Network } from 'lucide-react';
import type {
    IResearchEngine,
    ResearchSession,
    KnowledgeGraph,
} from '../../kernel/contracts/research-engine';
import { EmptyState, SectionHeader, ActionButton } from './ResearchSharedComponents';

interface Props {
    engine: IResearchEngine;
    session: ResearchSession;
}

export const KnowledgeGraphTab: React.FC<Props> = ({ engine, session }) => {
    const [data, setData] = useState<KnowledgeGraph | undefined>();
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        setLoading(true);
        try {
            const g = await engine.buildKnowledgeGraph(session.id);
            setData(g);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <SectionHeader
                title="Knowledge Graph"
                action={
                    <ActionButton
                        onClick={handleRun}
                        label="Extract Entities"
                        loading={loading}
                        color="#8b5cf6"
                    />
                }
            />
            {data ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: 8,
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.2)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.6rem',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Entities
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>
                                {data.entities.length}
                            </div>
                        </div>
                        <div
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: 8,
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.2)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.6rem',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Relations
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa' }}>
                                {data.relations.length}
                            </div>
                        </div>
                        <div
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: 8,
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.2)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.6rem',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Density
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>
                                {(data.density * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#cbd5e1',
                            marginTop: 8,
                        }}
                    >
                        Entities
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {data.entities.slice(0, 15).map((e) => (
                            <span
                                key={e.id}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    background: 'rgba(139,92,246,0.1)',
                                    color: '#c4b5fd',
                                    border: '1px solid rgba(139,92,246,0.2)',
                                }}
                            >
                                {e.name}
                                <span style={{ color: '#64748b', marginLeft: 4 }}>
                                    ({e.mentions})
                                </span>
                            </span>
                        ))}
                    </div>
                    {data.clusters.length > 0 && (
                        <>
                            <div
                                style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#cbd5e1',
                                    marginTop: 8,
                                }}
                            >
                                Clusters
                            </div>
                            {data.clusters.map((c) => (
                                <div
                                    key={c.id}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        background: 'rgba(16,185,129,0.05)',
                                        border: '1px solid rgba(16,185,129,0.1)',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            color: '#34d399',
                                        }}
                                    >
                                        {c.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#64748b',
                                            marginTop: 2,
                                        }}
                                    >
                                        Central: {c.centralConcept} · Cohesion:{' '}
                                        {(c.cohesion * 100).toFixed(0)}% · {c.entityIds.length}{' '}
                                        entities
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            ) : (
                <EmptyState
                    icon={<Network size={32} />}
                    title="No Knowledge Graph"
                    desc="Extract entities and relations from research data"
                />
            )}
        </div>
    );
};
