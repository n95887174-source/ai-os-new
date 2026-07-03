import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Check, ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import type {
    RoleTeam,
    TeamStrategy,
    TeamDomain,
    TeamTemplate,
} from '../../kernel/contracts/role-team';
import type { UnifiedRoleEntry } from '../../kernel/contracts/unified-role';
import {
    TEAM_STRATEGY_LABELS,
    TEAM_DOMAIN_ICONS,
    STRATEGY_COLORS,
} from '../../kernel/contracts/role-team';

interface TeamWizardProps {
    templates: TeamTemplate[];
    roles: UnifiedRoleEntry[];
    onSave: (team: Partial<RoleTeam>) => void;
    onCancel: () => void;
}

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    transition: 'all 0.15s',
};

const chip = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: '0.7rem',
    fontWeight: 600,
    background: `${color}20`,
    color,
    border: `1px solid ${color}40`,
});

const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
};

const TEAM_DOMAINS: TeamDomain[] = [
    'medical',
    'scientific',
    'technical',
    'legal',
    'business',
    'creative',
    'educational',
    'crisis',
    'ethical',
    'financial',
    'investigation',
    'editorial',
    'research',
    'custom',
];

const DOMAIN_DESCRIPTIONS: Record<TeamDomain, string> = {
    medical: 'Diagnosis, treatment plans, medical ethics',
    scientific: 'Research, experiments, peer review',
    technical: 'Engineering, development, architecture',
    legal: 'Litigation, contracts, compliance',
    business: 'Strategy, product, marketing, operations',
    creative: 'Design, writing, content, art direction',
    educational: 'Curriculum, tutoring, assessment',
    crisis: 'Emergency response, containment, recovery',
    ethical: 'AI ethics, bioethics, policy',
    financial: 'Analysis, investment, budgeting',
    investigation: 'Forensics, audit, due diligence',
    editorial: 'Writing, editing, publishing',
    research: 'Literature review, data analysis',
    custom: 'Build your own from scratch',
};

const STEPS = ['Domain', 'Template', 'Roles', 'Strategy', 'Leader', 'Config', 'Review'];

const TeamWizard: React.FC<TeamWizardProps> = ({ templates, roles, onSave, onCancel }) => {
    const [step, setStep] = useState(0);
    const [team, setTeam] = useState<Partial<RoleTeam>>({
        name: '',
        description: '',
        icon: '👥',
        color: '#3b82f6',
        coordinationStrategy: 'parallel',
        roleIds: [],
        metadata: { domain: 'custom', tags: [], created: 0, updated: 0 },
        executionConfig: { maxRounds: 3, consensusThreshold: 0.7, parallelTimeout: 30000 },
    });
    const [selectedDomain, setSelectedDomain] = useState<TeamDomain | null>(null);
    const [roleSearch, setRoleSearch] = useState('');
    const [roleCategory, setRoleCategory] = useState('');

    const categories = useMemo(() => {
        const cats = new Set(roles.map((r) => r.category));
        return Array.from(cats);
    }, [roles]);

    const filteredRoles = useMemo(() => {
        let result = roles;
        if (roleCategory) result = result.filter((r) => r.category === roleCategory);
        if (roleSearch) {
            const q = roleSearch.toLowerCase();
            result = result.filter(
                (r) =>
                    r.name.toLowerCase().includes(q) ||
                    r.description.toLowerCase().includes(q) ||
                    r.category.toLowerCase().includes(q),
            );
        }
        return result;
    }, [roles, roleCategory, roleSearch]);

    const filteredTemplates = useMemo(() => {
        if (!selectedDomain || selectedDomain === 'custom') return templates;
        return templates.filter((t) => t.domain === selectedDomain);
    }, [templates, selectedDomain]);

    const toggleRole = (roleId: string) => {
        setTeam((prev) => ({
            ...prev,
            roleIds: prev.roleIds?.includes(roleId)
                ? prev.roleIds.filter((id) => id !== roleId)
                : [...(prev.roleIds || []), roleId],
        }));
    };

    const canNext = (): boolean => {
        switch (step) {
            case 0:
                return true; // domain is optional
            case 1:
                return true;
            case 2:
                return (team.roleIds?.length || 0) >= 1;
            case 3:
                return true;
            case 4:
                if (team.coordinationStrategy === 'hierarchical') return !!team.leaderRoleId;
                return true;
            case 5:
                return true;
            case 6:
                return !!team.name?.trim();
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (!canNext()) return;
        if (step < 6) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const selectTemplate = (tpl: TeamTemplate) => {
        setTeam({
            name: tpl.name,
            description: tpl.description,
            icon: tpl.icon,
            color: tpl.color,
            coordinationStrategy: tpl.defaultStrategy,
            roleIds: [...tpl.recommendedRoles],
            metadata: { domain: tpl.domain, tags: [], created: 0, updated: 0 },
            executionConfig: { maxRounds: 3, consensusThreshold: 0.7, parallelTimeout: 30000 },
        });
        setStep(6);
    };

    const renderStepIndicator = () => (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {STEPS.map((label, i) => (
                <div
                    key={label}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background:
                            i === step
                                ? 'rgba(59,130,246,0.2)'
                                : i < step
                                  ? 'rgba(16,185,129,0.15)'
                                  : 'rgba(255,255,255,0.04)',
                        color: i === step ? '#60a5fa' : i < step ? '#34d399' : '#64748b',
                        border: `1px solid ${
                            i === step
                                ? 'rgba(59,130,246,0.3)'
                                : i < step
                                  ? 'rgba(16,185,129,0.2)'
                                  : 'rgba(255,255,255,0.06)'
                        }`,
                        cursor: i < step ? 'pointer' : 'default',
                    }}
                    onClick={() => i < step && setStep(i)}
                >
                    {i < step ? <Check size={12} /> : `${i + 1}`}
                    {label}
                </div>
            ))}
        </div>
    );

    const renderDomainPicker = () => (
        <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                Choose your team's domain to filter relevant templates. You can also start from
                scratch.
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 8,
                }}
            >
                {TEAM_DOMAINS.map((domain) => (
                    <div
                        key={domain}
                        onClick={() => {
                            setSelectedDomain(domain);
                            setTeam((prev) => ({
                                ...prev,
                                metadata: { ...prev.metadata!, domain },
                            }));
                        }}
                        style={{
                            ...card,
                            border:
                                selectedDomain === domain
                                    ? '2px solid #3b82f6'
                                    : '1px solid rgba(255,255,255,0.08)',
                            transform: selectedDomain === domain ? 'scale(1.02)' : 'scale(1)',
                            textAlign: 'center',
                            padding: 16,
                        }}
                        onMouseEnter={(e) => {
                            if (selectedDomain !== domain)
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                            if (selectedDomain !== domain)
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: 6 }}>
                            {TEAM_DOMAIN_ICONS[domain]}
                        </div>
                        <div
                            style={{
                                fontWeight: 600,
                                color: '#e2e8f0',
                                fontSize: '0.85rem',
                                textTransform: 'capitalize',
                            }}
                        >
                            {domain}
                        </div>
                        <div
                            style={{
                                fontSize: '0.65rem',
                                color: '#64748b',
                                marginTop: 4,
                                lineHeight: 1.3,
                            }}
                        >
                            {DOMAIN_DESCRIPTIONS[domain]}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTemplatePicker = () => (
        <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                {selectedDomain && selectedDomain !== 'custom'
                    ? `Templates in ${selectedDomain} domain (${filteredTemplates.length}):`
                    : 'All templates — pick one to start:'}
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 8,
                }}
            >
                {filteredTemplates.slice(0, 20).map((tpl) => (
                    <div
                        key={tpl.id}
                        onClick={() => selectTemplate(tpl)}
                        style={{
                            ...card,
                            borderLeft: `3px solid ${tpl.color}`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                    >
                        <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{tpl.icon}</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>
                            {tpl.name}
                        </div>
                        <div
                            style={{
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                marginTop: 2,
                                lineHeight: 1.3,
                            }}
                        >
                            {tpl.description.slice(0, 70)}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    ...chip(tpl.color),
                                    fontSize: '0.6rem',
                                }}
                            >
                                {tpl.domain}
                            </span>
                            <span style={{ ...chip('#64748b'), fontSize: '0.6rem' }}>
                                {tpl.defaultStrategy}
                            </span>
                        </div>
                    </div>
                ))}
                <div
                    onClick={() => setStep(2)}
                    style={{
                        ...card,
                        border: '2px dashed rgba(255,255,255,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        minHeight: 120,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                >
                    <Plus size={24} color="#64748b" />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Custom Team (no template)
                    </span>
                </div>
            </div>
        </div>
    );

    const renderRoleSelector = () => (
        <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10 }}>
                Select at least one role for your team. Roles define the expertise of each team
                member.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <Search
                        size={14}
                        style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#64748b',
                        }}
                    />
                    <input
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        placeholder="Search roles..."
                        style={{ ...inputBase, padding: '6px 10px 6px 30px', fontSize: '0.8rem' }}
                    />
                </div>
                <select
                    value={roleCategory}
                    onChange={(e) => setRoleCategory(e.target.value)}
                    style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#e2e8f0',
                        fontSize: '0.8rem',
                        outline: 'none',
                    }}
                >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c} ({(roles as any).filter((r: any) => r.category === c).length})
                        </option>
                    ))}
                </select>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 6,
                    maxHeight: 300,
                    overflowY: 'auto',
                    padding: '4px 0',
                }}
            >
                {filteredRoles.slice(0, 100).map((r) => {
                    const selected = team.roleIds?.includes(r.id);
                    return (
                        <div
                            key={r.id}
                            onClick={() => toggleRole(r.id)}
                            style={{
                                ...card,
                                padding: '8px 10px',
                                border: selected
                                    ? '1px solid rgba(59,130,246,0.4)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                background: selected
                                    ? 'rgba(59,130,246,0.1)'
                                    : 'rgba(255,255,255,0.03)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 4,
                                    border: `2px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                                    background: selected ? '#3b82f6' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                {selected && <Check size={10} color="white" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        color: selected ? '#e2e8f0' : '#94a3b8',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {r.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.65rem',
                                        color: '#64748b',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {r.description}
                                </div>
                            </div>
                            <span
                                style={{ ...chip('#64748b'), fontSize: '0.55rem', flexShrink: 0 }}
                            >
                                {r.category}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div
                style={{
                    fontSize: '0.75rem',
                    color: '#60a5fa',
                    marginTop: 8,
                    fontWeight: 600,
                }}
            >
                {team.roleIds?.length || 0} role(s) selected
            </div>
        </div>
    );

    const strategies: TeamStrategy[] = [
        'parallel',
        'sequential',
        'pipeline',
        'debate',
        'consensus',
        'hierarchical',
        'swarm',
        'tournament',
        'round-robin',
        'review',
    ];

    const renderStrategyPicker = () => (
        <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                Choose how the team coordinates to solve the task. Each strategy has different
                strengths.
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 8,
                }}
            >
                {strategies.map((s) => {
                    const active = team.coordinationStrategy === s;
                    return (
                        <div
                            key={s}
                            onClick={() => setTeam({ ...team, coordinationStrategy: s })}
                            style={{
                                ...card,
                                border: active
                                    ? `2px solid ${STRATEGY_COLORS[s]}`
                                    : '1px solid rgba(255,255,255,0.08)',
                                background: active
                                    ? `${STRATEGY_COLORS[s]}10`
                                    : 'rgba(255,255,255,0.04)',
                                padding: 12,
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (!active)
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                if (!active)
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: STRATEGY_COLORS[s],
                                    fontSize: '0.85rem',
                                    textTransform: 'capitalize',
                                    marginBottom: 4,
                                }}
                            >
                                {s}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.7rem',
                                    color: '#94a3b8',
                                    lineHeight: 1.3,
                                }}
                            >
                                {TEAM_STRATEGY_LABELS[s]}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderLeaderAssignment = () => {
        const show = team.coordinationStrategy === 'hierarchical';
        return (
            <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                    {show
                        ? 'Hierarchical strategy requires a team leader who delegates tasks and synthesizes results.'
                        : 'Leader assignment is only needed for the "hierarchical" strategy. Select "hierarchical" in the previous step to configure a leader.'}
                </div>
                {show ? (
                    <div>
                        <label
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#64748b',
                                display: 'block',
                                marginBottom: 4,
                            }}
                        >
                            Select Team Leader
                        </label>
                        <select
                            value={team.leaderRoleId || ''}
                            onChange={(e) => setTeam({ ...team, leaderRoleId: e.target.value })}
                            style={{
                                width: '100%',
                                maxWidth: 400,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#e2e8f0',
                                fontSize: '0.85rem',
                                outline: 'none',
                            }}
                        >
                            <option value="">-- Select leader --</option>
                            {(team.roleIds || []).map((roleId) => (
                                <option key={roleId} value={roleId}>
                                    {roleId}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div
                        style={{
                            padding: 16,
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 8,
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.8rem',
                        }}
                    >
                        <Layers size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <div>
                            Leader assignment skipped for "{team.coordinationStrategy}" strategy
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderExecutionConfig = () => (
        <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                Fine-tune how the team executes. These settings affect the behavior of the
                coordination strategy.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
                <div>
                    <label
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                        }}
                    >
                        <span>Max Rounds</span>
                        <span style={{ color: '#60a5fa' }}>
                            {team.executionConfig?.maxRounds || 3}
                        </span>
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={team.executionConfig?.maxRounds || 3}
                        onChange={(e) =>
                            setTeam({
                                ...team,
                                executionConfig: {
                                    ...team.executionConfig!,
                                    maxRounds: parseInt(e.target.value),
                                },
                            })
                        }
                        style={{ width: '100%' }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.65rem',
                            color: '#64748b',
                        }}
                    >
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>
                <div>
                    <label
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                        }}
                    >
                        <span>Consensus Threshold</span>
                        <span style={{ color: '#f59e0b' }}>
                            {(team.executionConfig?.consensusThreshold || 0.7).toFixed(1)}
                        </span>
                    </label>
                    <input
                        type="range"
                        min={0.5}
                        max={1}
                        step={0.1}
                        value={team.executionConfig?.consensusThreshold || 0.7}
                        onChange={(e) =>
                            setTeam({
                                ...team,
                                executionConfig: {
                                    ...team.executionConfig!,
                                    consensusThreshold: parseFloat(e.target.value),
                                },
                            })
                        }
                        style={{ width: '100%' }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.65rem',
                            color: '#64748b',
                        }}
                    >
                        <span>0.5 (easy)</span>
                        <span>1.0 (strict)</span>
                    </div>
                </div>
                <div>
                    <label
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                        }}
                    >
                        <span>Parallel Timeout (ms)</span>
                        <span style={{ color: '#10b981' }}>
                            {team.executionConfig?.parallelTimeout || 30000}ms
                        </span>
                    </label>
                    <input
                        type="range"
                        min={5000}
                        max={120000}
                        step={5000}
                        value={team.executionConfig?.parallelTimeout || 30000}
                        onChange={(e) =>
                            setTeam({
                                ...team,
                                executionConfig: {
                                    ...team.executionConfig!,
                                    parallelTimeout: parseInt(e.target.value),
                                },
                            })
                        }
                        style={{ width: '100%' }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.65rem',
                            color: '#64748b',
                        }}
                    >
                        <span>5s</span>
                        <span>120s</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReview = () => (
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 16,
                    padding: 16,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                }}
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `${team.color || '#3b82f6'}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                    }}
                >
                    {team.icon || '👥'}
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontWeight: 700,
                            color: '#e2e8f0',
                            fontSize: '1.1rem',
                        }}
                    >
                        {team.name || 'Unnamed Team'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                        {team.description || 'No description'}
                    </div>
                </div>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 16,
                }}
            >
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                        Domain
                    </div>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            color: '#e2e8f0',
                            marginTop: 2,
                            textTransform: 'capitalize',
                        }}
                    >
                        {TEAM_DOMAIN_ICONS[team.metadata?.domain || 'custom']}{' '}
                        {team.metadata?.domain || 'custom'}
                    </div>
                </div>
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                        Strategy
                    </div>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            color: STRATEGY_COLORS[team.coordinationStrategy || 'parallel'],
                            marginTop: 2,
                            fontWeight: 600,
                        }}
                    >
                        {team.coordinationStrategy}
                    </div>
                </div>
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                        Roles
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: 2 }}>
                        {team.roleIds?.length || 0} selected
                    </div>
                </div>
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                        Max Rounds
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: 2 }}>
                        {team.executionConfig?.maxRounds || 3}
                    </div>
                </div>
            </div>
            <div style={{ marginBottom: 16 }}>
                <div
                    style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#64748b',
                        marginBottom: 6,
                    }}
                >
                    Selected Roles
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(team.roleIds || []).map((roleId) => (
                        <span key={roleId} style={{ ...chip('#3b82f6'), fontSize: '0.65rem' }}>
                            {roleId}
                        </span>
                    ))}
                    {(team.roleIds?.length || 0) === 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            No roles selected
                        </span>
                    )}
                </div>
            </div>
            <div>
                <label
                    style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: 4,
                    }}
                >
                    Team Name
                </label>
                <input
                    value={team.name || ''}
                    onChange={(e) => setTeam({ ...team, name: e.target.value })}
                    placeholder="Enter a name for your team"
                    style={{ ...inputBase, maxWidth: 400 }}
                />
                {!team.name?.trim() && (
                    <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>
                        Name is required to create the team
                    </div>
                )}
            </div>
        </div>
    );

    const stepContent = [
        renderDomainPicker,
        renderTemplatePicker,
        renderRoleSelector,
        renderStrategyPicker,
        renderLeaderAssignment,
        renderExecutionConfig,
        renderReview,
    ];

    return (
        <div
            style={{
                marginBottom: 20,
                padding: 20,
                background: 'rgba(59,130,246,0.05)',
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.2)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}
            >
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Users size={16} />
                        Create Team — Step {step + 1} of 7: {STEPS[step]}
                    </h3>
                </div>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                    }}
                >
                    Cancel
                </button>
            </div>

            {renderStepIndicator()}

            {stepContent[step]()}

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 20,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <div>
                    {step > 0 && (
                        <button
                            onClick={prevStep}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                    )}
                </div>
                <div>
                    {step < 6 ? (
                        <button
                            onClick={nextStep}
                            disabled={!canNext()}
                            style={{
                                padding: '8px 20px',
                                borderRadius: 8,
                                border: 'none',
                                background: canNext()
                                    ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                                    : 'rgba(59,130,246,0.15)',
                                color: canNext() ? 'white' : '#64748b',
                                cursor: canNext() ? 'pointer' : 'default',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            Next <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (team.name?.trim()) {
                                    onSave(team);
                                }
                            }}
                            disabled={!team.name?.trim()}
                            style={{
                                padding: '8px 24px',
                                borderRadius: 8,
                                border: 'none',
                                background: team.name?.trim()
                                    ? 'linear-gradient(90deg, #10b981, #059669)'
                                    : 'rgba(16,185,129,0.15)',
                                color: team.name?.trim() ? 'white' : '#64748b',
                                cursor: team.name?.trim() ? 'pointer' : 'default',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <Check size={14} /> Create Team
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamWizard;
