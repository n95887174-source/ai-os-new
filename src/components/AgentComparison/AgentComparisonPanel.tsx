import React, { useState } from 'react';
import { BarChart3, Search, Bot, Users, Activity, Zap, Clock, AlertCircle } from 'lucide-react';
import PanelLoader from '../PanelLoader';
import { AgentComparison } from '../AgentsPanel/AgentComparison';

interface AgentEntry {
    id: string;
    name: string;
    role: string;
    status: string;
    model: string;
    providerId: string;
    temperature: number;
    tools: string[];
    systemPrompt: string;
    stats: {
        calls: number;
        tokens: number;
        latency: number;
        errors?: number;
        avgTokensPerCall?: number;
        lastActive?: number;
    };
}

const MOCK_AGENTS: AgentEntry[] = [
    {
        id: 'a1',
        name: 'Analyst',
        role: 'Critical Analysis',
        status: 'ready',
        model: 'llama-3.1-8b-instant',
        providerId: 'Groq',
        temperature: 0.3,
        tools: ['web_search', 'code_exec'],
        systemPrompt:
            'You are a meticulous analyst who evaluates arguments for logical consistency and evidentiary support.',
        stats: {
            calls: 1542,
            tokens: 892000,
            latency: 423,
            errors: 12,
            avgTokensPerCall: 578,
            lastActive: Date.now() - 300000,
        },
    },
    {
        id: 'a2',
        name: 'Debater',
        role: 'Persuasive Argumentation',
        status: 'ready',
        model: 'llama-3.3-70b-versatile',
        providerId: 'Groq',
        temperature: 0.7,
        tools: ['web_search'],
        systemPrompt:
            'You are a skilled debater who constructs compelling arguments and anticipates counterpoints.',
        stats: {
            calls: 2103,
            tokens: 1450000,
            latency: 891,
            errors: 34,
            avgTokensPerCall: 689,
            lastActive: Date.now() - 60000,
        },
    },
    {
        id: 'a3',
        name: 'Strategist',
        role: 'Strategic Planning',
        status: 'ready',
        model: 'gemini-3.1-flash-lite',
        providerId: 'Gemini',
        temperature: 0.5,
        tools: ['web_search', 'code_exec', 'data_analysis'],
        systemPrompt:
            'You are a strategic planner who thinks multiple steps ahead and considers long-term implications.',
        stats: {
            calls: 876,
            tokens: 612000,
            latency: 1240,
            errors: 8,
            avgTokensPerCall: 698,
            lastActive: Date.now() - 7200000,
        },
    },
    {
        id: 'a4',
        name: 'Critic',
        role: 'Constructive Criticism',
        status: 'ready',
        model: 'mixtral-8x7b-32768',
        providerId: 'Groq',
        temperature: 0.4,
        tools: ['code_exec'],
        systemPrompt:
            'You are a constructive critic who identifies flaws and proposes concrete improvements.',
        stats: {
            calls: 654,
            tokens: 445000,
            latency: 567,
            errors: 5,
            avgTokensPerCall: 680,
            lastActive: Date.now() - 3600000,
        },
    },
    {
        id: 'a5',
        name: 'Researcher',
        role: 'Deep Research',
        status: 'ready',
        model: 'llama-3.3-70b-versatile',
        providerId: 'Groq',
        temperature: 0.2,
        tools: ['web_search', 'data_analysis'],
        systemPrompt:
            'You are a thorough researcher who gathers and synthesizes information from multiple sources.',
        stats: {
            calls: 3210,
            tokens: 2800000,
            latency: 756,
            errors: 45,
            avgTokensPerCall: 872,
            lastActive: Date.now() - 900000,
        },
    },
];

const AgentComparisonPanelContent: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string[]>([]);

    const filtered = MOCK_AGENTS.filter(
        (a) =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.role.toLowerCase().includes(search.toLowerCase()),
    );

    const toggle = (id: string) => {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : prev.length >= 2
                  ? [prev[1], id]
                  : [...prev, id],
        );
    };

    const selectedAgents = selected
        .map((id) => MOCK_AGENTS.find((a) => a.id === id))
        .filter(Boolean) as AgentEntry[];

    return (
        <div
            style={{
                padding: 16,
                height: '100%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}
        >
            <div>
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
                    <BarChart3 size={20} color="#a855f7" /> Agent Comparison Tool
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                    Select up to 2 agents to compare side by side
                </p>
            </div>

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
                    placeholder="Search agents..."
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
            </div>

            {selected.length === 2 && selectedAgents.length === 2 && (
                <AgentComparison agents={selectedAgents} onClose={() => setSelected([])} />
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 12,
                }}
            >
                {filtered.map((agent) => {
                    const isSelected = selected.includes(agent.id);
                    return (
                        <div
                            key={agent.id}
                            onClick={() => toggle(agent.id)}
                            style={{
                                background: '#1e293b',
                                borderRadius: 12,
                                border: isSelected
                                    ? '2px solid #a855f7'
                                    : '1px solid rgba(255,255,255,0.06)',
                                padding: 14,
                                cursor: 'pointer',
                                transition: 'border-color 0.15s',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 10,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Bot size={18} color="#a855f7" />
                                    <span
                                        style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}
                                    >
                                        {agent.name}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        background:
                                            agent.status === 'ready'
                                                ? 'rgba(16,185,129,0.15)'
                                                : 'rgba(245,158,11,0.15)',
                                        color: agent.status === 'ready' ? '#10b981' : '#f59e0b',
                                    }}
                                >
                                    {agent.status}
                                </div>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                                {agent.role}
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 6,
                                    fontSize: 12,
                                    color: '#94a3b8',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Zap size={12} /> {agent.model}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Users size={12} /> {agent.providerId}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Activity size={12} /> {agent.stats.calls.toLocaleString()}{' '}
                                    calls
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={12} /> {agent.stats.latency}ms
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <BarChart3 size={12} /> {(agent.stats.tokens / 1000).toFixed(0)}
                                    K tokens
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <AlertCircle
                                        size={12}
                                        color={
                                            agent.stats.errors && agent.stats.errors > 20
                                                ? '#ef4444'
                                                : '#10b981'
                                        }
                                    />{' '}
                                    {agent.stats.errors || 0} errors
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AgentComparisonPanel: React.FC = () => (
    <PanelLoader name="Agent Comparison">
        <AgentComparisonPanelContent />
    </PanelLoader>
);

export default AgentComparisonPanel;
