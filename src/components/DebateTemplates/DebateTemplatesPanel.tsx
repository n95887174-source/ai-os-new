import React, { useState } from 'react';
import { FileText, Search, Users, MessageCircle, Thermometer, ArrowUpRight } from 'lucide-react';
import PanelLoader from '../PanelLoader';
import { DEBATE_TEMPLATES } from '../../kernel/services/debate-runtime/debate-templates';

const STRATEGY_COLORS: Record<string, string> = {
    constrained: '#f59e0b',
    argument_tree: '#a855f7',
    moderated: '#3b82f6',
    socratic: '#10b981',
    round_robin: '#ef4444',
    free_for_all: '#ec4899',
    jury_trial: '#8b5cf6',
};

const DebateTemplatesPanelContent: React.FC = () => {
    const [search, setSearch] = useState('');

    const filtered = DEBATE_TEMPLATES.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.topic.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
            <div style={{ marginBottom: 16 }}>
                <h2
                    style={{
                        margin: '0 0 4px',
                        fontSize: 18,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <FileText size={20} color="#06b6d4" /> Debate Templates Library
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8' }}>
                    Pre-built debate templates to quickly start structured discussions
                </p>
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        background: '#0f172a',
                        borderRadius: 8,
                        padding: '8px 12px',
                    }}
                >
                    <Search size={16} color="#64748b" />
                    <input
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            color: '#e2e8f0',
                            fontSize: 13,
                            outline: 'none',
                        }}
                    />
                    <span style={{ fontSize: 11, color: '#475569' }}>
                        {filtered.length} templates
                    </span>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: 12,
                }}
            >
                {filtered.map((tmpl) => (
                    <div
                        key={tmpl.id}
                        style={{
                            background: '#1e293b',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
                                    {tmpl.name}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    {tmpl.description}
                                </div>
                            </div>
                            <div
                                style={{
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: `${STRATEGY_COLORS[tmpl.strategy] || '#64748b'}20`,
                                    color: STRATEGY_COLORS[tmpl.strategy] || '#64748b',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {tmpl.strategy.replace('_', ' ')}
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '8px 10px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 8,
                                fontSize: 12,
                                color: '#94a3b8',
                                fontStyle: 'italic',
                                borderLeft: '2px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            {tmpl.topic.length > 120
                                ? tmpl.topic.slice(0, 120) + '...'
                                : tmpl.topic}
                        </div>

                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={12} /> {tmpl.minAgents}+ agents
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MessageCircle size={12} /> {tmpl.maxRounds} rounds
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Thermometer size={12} /> {tmpl.debateTemperature}
                            </span>
                        </div>

                        <button
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '8px 0',
                                borderRadius: 8,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'rgba(6,182,212,0.15)',
                                color: '#06b6d4',
                                fontSize: 12,
                                fontWeight: 600,
                                marginTop: 'auto',
                            }}
                            onClick={() => (window.location.href = `/debate?template=${tmpl.id}`)}
                        >
                            <ArrowUpRight size={14} /> Use Template
                        </button>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <FileText size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: 14 }}>No templates match your search</div>
                </div>
            )}
        </div>
    );
};

const DebateTemplatesPanel: React.FC = () => (
    <PanelLoader name="Debate Templates">
        <DebateTemplatesPanelContent />
    </PanelLoader>
);

export default DebateTemplatesPanel;
