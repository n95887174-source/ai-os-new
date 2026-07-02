import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { Users, BookOpen, LayoutTemplate, Search, Users2, Plus, Trash2, Play } from 'lucide-react';
import type {
    UnifiedRoleEntry,
    Consilium,
    GroupTemplate,
} from '../../kernel/contracts/unified-role';
import type {
    RoleTeam,
    TeamTemplate,
    TeamStrategy,
    TeamDomain,
} from '../../kernel/contracts/role-team';
import { RoleTeamService } from '../../kernel/services/role-team-service';

type Tab = 'roles' | 'consilia' | 'templates' | 'teams';

const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
    color: active ? '#a78bfa' : '#94a3b8',
    border: `1px solid ${active ? 'rgba(139,92,246,0.3)' : 'transparent'}`,
    transition: 'all 0.15s',
});

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 14,
    border: '1px solid rgba(255,255,255,0.08)',
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

const CATEGORY_COLORS: Record<string, string> = {
    philosopher: '#a855f7',
    scientist: '#3b82f6',
    politician: '#ef4444',
    artist: '#f59e0b',
    technologist: '#10b981',
    writer: '#06b6d4',
    strategist: '#f97316',
    religious: '#8b5cf6',
    mythical: '#a855f7',
    economist: '#10b981',
    psychologist: '#3b82f6',
    activist: '#ef4444',
    explorer: '#f59e0b',
    modern_thinker: '#8b5cf6',
    fiction_literature: '#06b6d4',
    fiction_film: '#a855f7',
    archetype: '#f59e0b',
    profession: '#64748b',
    cultural: '#3b82f6',
    psychotype: '#a855f7',
    academic: '#8b5cf6',
    media: '#f97316',
    anthropomorphic: '#10b981',
    neural: '#3b82f6',
    stereotype: '#ef4444',
    technical: '#3b82f6',
    analytical: '#8b5cf6',
    creative: '#f59e0b',
    management: '#10b981',
};

const CONSULIA_COLORS: Record<string, string> = {
    board: '#a855f7',
    council: '#3b82f6',
    studio: '#f59e0b',
    clinic: '#10b981',
    court: '#ef4444',
    parliament: '#8b5cf6',
    lab: '#06b6d4',
    committee: '#f97316',
    squad: '#3b82f6',
    guild: '#10b981',
};

const STRATEGY_COLORS: Record<string, string> = {
    parallel: '#10b981',
    sequential: '#3b82f6',
    pipeline: '#8b5cf6',
    debate: '#ef4444',
    consensus: '#f59e0b',
    hierarchical: '#f97316',
    swarm: '#ec4899',
    tournament: '#a855f7',
    'round-robin': '#06b6d4',
    review: '#6366f1',
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
    'research',
    'custom',
];

const RolesConsortiaPanel: React.FC = () => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('roles');
    const [search, setSearch] = useState('');
    const [svc, setSvc] = useState<any>(null);
    const [filterCat, setFilterCat] = useState<string>('');
    const [teamSvc] = useState(() => new RoleTeamService());
    const [teams, setTeams] = useState<RoleTeam[]>([]);
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [newTeam, setNewTeam] = useState<Partial<RoleTeam>>({
        name: '',
        description: '',
        icon: '👥',
        color: '#3b82f6',
        coordinationStrategy: 'parallel',
        roleIds: [],
        metadata: { domain: 'custom', tags: [], created: 0, updated: 0 },
    });

    useEffect(() => {
        (async () => {
            try {
                const m = await import('../../kernel/instances');
                setSvc((m as any).unifiedRoleRegistry);
            } catch {}
        })();
    }, []);

    useEffect(() => {
        setTeams(teamSvc.listTeams());
    }, [teamSvc]);

    const roles = useMemo(() => {
        if (!svc) return [];
        const all: UnifiedRoleEntry[] = svc.listRoles();
        let filtered = all;
        if (filterCat) filtered = filtered.filter((r) => r.category === filterCat);
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(
                (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
            );
        }
        return filtered;
    }, [svc, filterCat, search]);

    const consilia = useMemo(() => {
        if (!svc) return [];
        const all: Consilium[] = svc.listConsilia();
        if (search) {
            const q = search.toLowerCase();
            return all.filter(
                (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
            );
        }
        return all;
    }, [svc, search]);

    const templates = useMemo(() => {
        if (!svc) return [];
        const all: GroupTemplate[] = svc.listTemplates();
        if (search) {
            const q = search.toLowerCase();
            return all.filter(
                (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
            );
        }
        return all;
    }, [svc, search]);

    const teamTemplates = useMemo(() => teamSvc.getTemplates(), [teamSvc]);

    const categories = svc ? svc.getCategories() : [];
    const consTypes = svc ? svc.getConsiliumTypes() : [];
    const tmplCats = svc ? svc.getTemplateCategories() : [];

    const handleCreateTeam = () => {
        if (!newTeam.name) return;
        const created = teamSvc.createTeam(newTeam as any);
        setTeams(teamSvc.listTeams());
        setShowWizard(false);
        setWizardStep(0);
        setNewTeam({
            name: '',
            description: '',
            icon: '👥',
            color: '#3b82f6',
            coordinationStrategy: 'parallel',
            roleIds: [],
            metadata: { domain: 'custom', tags: [], created: 0, updated: 0 },
        });
    };

    const handleDeleteTeam = (id: string) => {
        teamSvc.deleteTeam(id);
        setTeams(teamSvc.listTeams());
    };

    const startFromTemplate = (tpl: TeamTemplate) => {
        const created = teamSvc.createFromTemplate(tpl.id);
        setTeams(teamSvc.listTeams());
        setShowWizard(false);
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                }}
            >
                <div>
                    <h2
                        style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}
                    >
                        {t('roles_consortia.title') || 'Roles & Consortia'}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                        {t('roles_consortia.subtitle') ||
                            'Unified role registry — 500+ roles, 50+ consilia, 100+ group templates'}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['roles', 'consilia', 'templates', 'teams'] as Tab[]).map((t) => (
                    <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
                        {t === 'roles' ? (
                            <Users size={16} />
                        ) : t === 'consilia' ? (
                            <BookOpen size={16} />
                        ) : t === 'templates' ? (
                            <LayoutTemplate size={16} />
                        ) : (
                            <Users2 size={16} />
                        )}
                        {t === 'roles'
                            ? `Roles (${roles.length})`
                            : t === 'consilia'
                              ? `Consilia (${consilia.length})`
                              : t === 'templates'
                                ? `Templates (${templates.length})`
                                : `Teams (${teams.length})`}
                    </button>
                ))}
            </div>

            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 16,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
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
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('roles_consortia.search') || 'Search...'}
                        style={{
                            width: '100%',
                            padding: '8px 12px 8px 32px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#e2e8f0',
                            fontSize: '0.85rem',
                            outline: 'none',
                        }}
                    />
                </div>
                {tab === 'roles' && (
                    <select
                        value={filterCat}
                        onChange={(e) => setFilterCat(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            outline: 'none',
                        }}
                    >
                        <option value="">All Categories</option>
                        {categories.map((c: string) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                )}
                {tab === 'consilia' && (
                    <select
                        value={filterCat}
                        onChange={(e) => setFilterCat(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            outline: 'none',
                        }}
                    >
                        <option value="">All Types</option>
                        {consTypes.map((t: string) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                )}
                {tab === 'templates' && (
                    <select
                        value={filterCat}
                        onChange={(e) => setFilterCat(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            outline: 'none',
                        }}
                    >
                        <option value="">All Categories</option>
                        {tmplCats.map((c: string) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                )}
                {tab === 'teams' && (
                    <button
                        onClick={() => setShowWizard(!showWizard)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'rgba(59,130,246,0.2)',
                            color: '#60a5fa',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Plus size={14} /> Create Team
                    </button>
                )}
            </div>

            {tab === 'roles' && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 10,
                    }}
                >
                    {roles.map((r: UnifiedRoleEntry) => (
                        <div
                            key={r.id}
                            style={{
                                ...card,
                                borderTop: `3px solid ${CATEGORY_COLORS[r.category] || '#64748b'}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'start',
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        color: '#e2e8f0',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    {r.name}
                                </div>
                                <span style={chip(CATEGORY_COLORS[r.category] || '#64748b')}>
                                    {r.category}
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: '0.78rem',
                                    color: '#94a3b8',
                                    marginTop: 6,
                                    lineHeight: 1.4,
                                }}
                            >
                                {r.description}
                            </div>
                            {r.metadata.tags.length > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 4,
                                        flexWrap: 'wrap',
                                        marginTop: 8,
                                    }}
                                >
                                    {r.metadata.tags.slice(0, 4).map((tag: string) => (
                                        <span
                                            key={tag}
                                            style={{ ...chip('#64748b'), fontSize: '0.65rem' }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tab === 'consilia' && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 10,
                    }}
                >
                    {consilia.map((c: Consilium) => (
                        <div
                            key={c.id}
                            style={{
                                ...card,
                                borderLeft: `3px solid ${CONSULIA_COLORS[c.type] || '#64748b'}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'start',
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        color: '#e2e8f0',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    {c.name}
                                </div>
                                <span style={chip(CONSULIA_COLORS[c.type] || '#64748b')}>
                                    {c.type}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6 }}>
                                {c.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                                {c.roles.length} roles · {c.minParticipants}–{c.maxParticipants}{' '}
                                participants
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'templates' && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 10,
                    }}
                >
                    {templates.map((tpl: GroupTemplate) => (
                        <div
                            key={tpl.id}
                            style={{
                                ...card,
                                borderTop: `3px solid ${CATEGORY_COLORS[tpl.category] || '#64748b'}`,
                            }}
                        >
                            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
                                {tpl.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6 }}>
                                {tpl.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                                {tpl.roles.length} roles · {tpl.minSize}–{tpl.maxSize} people
                            </div>
                            {tpl.tags.length > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 4,
                                        flexWrap: 'wrap',
                                        marginTop: 6,
                                    }}
                                >
                                    {tpl.tags.map((tag: string) => (
                                        <span
                                            key={tag}
                                            style={{ ...chip('#64748b'), fontSize: '0.65rem' }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tab === 'teams' && (
                <div>
                    {showWizard && (
                        <div
                            style={{
                                marginBottom: 20,
                                padding: 16,
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
                                    marginBottom: 12,
                                }}
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        color: '#e2e8f0',
                                    }}
                                >
                                    {wizardStep === 0
                                        ? '1. Choose a Template'
                                        : wizardStep === 1
                                          ? '2. Configure Team'
                                          : '3. Review'}
                                </h3>
                                <button
                                    onClick={() => setShowWizard(false)}
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
                            {wizardStep === 0 && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8',
                                            marginBottom: 10,
                                        }}
                                    >
                                        Start from a template or create a custom team:
                                    </div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: 8,
                                        }}
                                    >
                                        {teamTemplates.map((tpl) => (
                                            <div
                                                key={tpl.id}
                                                onClick={() => startFromTemplate(tpl)}
                                                style={{
                                                    ...card,
                                                    cursor: 'pointer',
                                                    borderLeft: `3px solid ${tpl.color}`,
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background =
                                                        'rgba(255,255,255,0.08)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background =
                                                        'rgba(255,255,255,0.04)';
                                                }}
                                            >
                                                <div
                                                    style={{ fontSize: '1.3rem', marginBottom: 4 }}
                                                >
                                                    {tpl.icon}
                                                </div>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: '#e2e8f0',
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    {tpl.name}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        color: '#94a3b8',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {tpl.description.slice(0, 60)}
                                                </div>
                                                <span
                                                    style={{
                                                        ...chip(tpl.color),
                                                        fontSize: '0.6rem',
                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {tpl.domain}
                                                </span>
                                            </div>
                                        ))}
                                        <div
                                            onClick={() => setWizardStep(1)}
                                            style={{
                                                ...card,
                                                cursor: 'pointer',
                                                border: '2px dashed rgba(255,255,255,0.15)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                minHeight: 100,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor =
                                                    'rgba(59,130,246,0.4)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor =
                                                    'rgba(255,255,255,0.15)';
                                            }}
                                        >
                                            <Plus size={24} color="#64748b" />
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                Custom Team
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {wizardStep === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 10,
                                        }}
                                    >
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
                                                value={newTeam.name || ''}
                                                onChange={(e) =>
                                                    setNewTeam({ ...newTeam, name: e.target.value })
                                                }
                                                placeholder="My Team"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    color: '#e2e8f0',
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                }}
                                            />
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
                                                Domain
                                            </label>
                                            <select
                                                value={newTeam.metadata?.domain || 'custom'}
                                                onChange={(e) =>
                                                    setNewTeam({
                                                        ...newTeam,
                                                        metadata: {
                                                            ...newTeam.metadata!,
                                                            domain: e.target.value as TeamDomain,
                                                            tags: [],
                                                        },
                                                    })
                                                }
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    color: '#e2e8f0',
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                }}
                                            >
                                                {TEAM_DOMAINS.map((d) => (
                                                    <option key={d} value={d}>
                                                        {d}
                                                    </option>
                                                ))}
                                            </select>
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
                                            Description
                                        </label>
                                        <input
                                            value={newTeam.description || ''}
                                            onChange={(e) =>
                                                setNewTeam({
                                                    ...newTeam,
                                                    description: e.target.value,
                                                })
                                            }
                                            placeholder="What does this team do?"
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(0,0,0,0.3)',
                                                color: '#e2e8f0',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 10,
                                        }}
                                    >
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
                                                Strategy
                                            </label>
                                            <select
                                                value={newTeam.coordinationStrategy || 'parallel'}
                                                onChange={(e) =>
                                                    setNewTeam({
                                                        ...newTeam,
                                                        coordinationStrategy: e.target
                                                            .value as TeamStrategy,
                                                    })
                                                }
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    color: '#e2e8f0',
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                }}
                                            >
                                                {Object.keys(STRATEGY_COLORS).map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
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
                                                Icon
                                            </label>
                                            <input
                                                value={newTeam.icon || '👥'}
                                                onChange={(e) =>
                                                    setNewTeam({ ...newTeam, icon: e.target.value })
                                                }
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    color: '#e2e8f0',
                                                    fontSize: '1.2rem',
                                                    outline: 'none',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            gap: 8,
                                            marginTop: 8,
                                        }}
                                    >
                                        <button
                                            onClick={() => setWizardStep(0)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'transparent',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={() => setWizardStep(2)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                border: 'none',
                                                background: 'rgba(59,130,246,0.2)',
                                                color: '#60a5fa',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                            }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                            {wizardStep === 2 && (
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <span style={{ fontSize: '2rem' }}>{newTeam.icon}</span>
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    color: '#e2e8f0',
                                                    fontSize: '1rem',
                                                }}
                                            >
                                                {newTeam.name || 'Unnamed Team'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {newTeam.description || 'No description'}
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                ...chip(
                                                    STRATEGY_COLORS[
                                                        newTeam.coordinationStrategy || 'parallel'
                                                    ] || '#64748b',
                                                ),
                                            }}
                                        >
                                            {newTeam.coordinationStrategy}
                                        </span>
                                        <span style={{ ...chip('#64748b') }}>
                                            {newTeam.metadata?.domain || 'custom'}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            gap: 8,
                                            marginTop: 12,
                                        }}
                                    >
                                        <button
                                            onClick={() => setWizardStep(1)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'transparent',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleCreateTeam}
                                            style={{
                                                padding: '8px 20px',
                                                borderRadius: 8,
                                                border: 'none',
                                                background:
                                                    'linear-gradient(90deg, #3b82f6, #2563eb)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                            }}
                                        >
                                            Create Team
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: 12,
                        }}
                    >
                        {teamTemplates.map((tpl) => {
                            const isUsed = teams.some((t) => t.name === tpl.name);
                            return (
                                <div
                                    key={tpl.id}
                                    style={{
                                        ...card,
                                        borderLeft: `3px solid ${tpl.color}`,
                                        opacity: isUsed ? 0.5 : 1,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 10,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem' }}>{tpl.icon}</span>
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: '#e2e8f0',
                                                        fontSize: '0.9rem',
                                                    }}
                                                >
                                                    {tpl.name}
                                                </div>
                                                <div
                                                    style={{ fontSize: '0.7rem', color: '#64748b' }}
                                                >
                                                    {tpl.recommendedRoles.length} roles ·{' '}
                                                    {tpl.domain}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => startFromTemplate(tpl)}
                                            disabled={isUsed}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                border: 'none',
                                                background: isUsed
                                                    ? 'rgba(255,255,255,0.05)'
                                                    : 'rgba(16,185,129,0.2)',
                                                color: isUsed ? '#64748b' : '#34d399',
                                                cursor: isUsed ? 'default' : 'pointer',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <Play size={12} /> {isUsed ? 'Added' : 'Use'}
                                        </button>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8',
                                            marginTop: 6,
                                        }}
                                    >
                                        {tpl.description}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 4,
                                            flexWrap: 'wrap',
                                            marginTop: 8,
                                        }}
                                    >
                                        {tpl.recommendedRoles.slice(0, 4).map((r) => (
                                            <span
                                                key={r}
                                                style={{ ...chip(tpl.color), fontSize: '0.6rem' }}
                                            >
                                                {r}
                                            </span>
                                        ))}
                                        {tpl.recommendedRoles.length > 4 && (
                                            <span
                                                style={{ ...chip('#64748b'), fontSize: '0.6rem' }}
                                            >
                                                +{tpl.recommendedRoles.length - 4}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#64748b',
                                            marginTop: 6,
                                        }}
                                    >
                                        {tpl.useCases.join(' · ')}
                                    </div>
                                    <span
                                        style={{
                                            ...chip(
                                                STRATEGY_COLORS[tpl.defaultStrategy] || '#64748b',
                                            ),
                                            fontSize: '0.6rem',
                                            marginTop: 6,
                                        }}
                                    >
                                        {tpl.defaultStrategy}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {teams.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h3
                                style={{
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    color: '#e2e8f0',
                                    marginBottom: 12,
                                }}
                            >
                                Your Teams ({teams.length})
                            </h3>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: 10,
                                }}
                            >
                                {teams.map((tm) => (
                                    <div
                                        key={tm.id}
                                        style={{
                                            ...card,
                                            borderLeft: `3px solid ${tm.color || '#64748b'}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'start',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: 10,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.3rem' }}>
                                                    {tm.icon || '👥'}
                                                </span>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#e2e8f0',
                                                            fontSize: '0.9rem',
                                                        }}
                                                    >
                                                        {tm.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: '#94a3b8',
                                                        }}
                                                    >
                                                        {tm.roleIds.length} members
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTeam(tm.id)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    background: 'rgba(239,68,68,0.1)',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8',
                                                marginTop: 6,
                                            }}
                                        >
                                            {tm.description}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 4,
                                                flexWrap: 'wrap',
                                                marginTop: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    ...chip(
                                                        STRATEGY_COLORS[tm.coordinationStrategy] ||
                                                            '#64748b',
                                                    ),
                                                    fontSize: '0.6rem',
                                                }}
                                            >
                                                {tm.coordinationStrategy}
                                            </span>
                                            <span
                                                style={{ ...chip('#64748b'), fontSize: '0.6rem' }}
                                            >
                                                {tm.metadata?.domain || 'custom'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RolesConsortiaPanel;
