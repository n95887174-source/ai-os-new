import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { runtime } from '../../kernel/runtime';
import { useTranslation } from '../../i18n/useTranslation';
import {
    Search,
    Circle,
    RefreshCw,
    FileCode,
    Layers,
    ExternalLink,
    Hash,
    ArrowRight,
    ArrowLeft,
    Database,
    FolderOpen,
    ChevronDown,
    ChevronUp,
    CircleAlert,
} from 'lucide-react';
import { eventBus, EVENTS } from '../../kernel/instances';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { SERVICE_PHASE, SERVICE_ROUTE_MAP, ROUTE_PATH, VALID_ROUTE_IDS } from './service-phases';

const serviceSourceFiles: string[] = (() => {
    try {
        const glob = import.meta.glob('/src/kernel/services/**/*.ts', { eager: false });
        return Object.keys(glob)
            .filter(
                (p) =>
                    !p.endsWith('.test.ts') &&
                    !p.endsWith('.spec.ts') &&
                    !p.endsWith('.d.ts') &&
                    !p.includes('node_modules'),
            )
            .map((p) => {
                const name = p.split('/').pop()!.replace('.ts', '');
                return name;
            })
            .filter((n) => n.length > 0);
    } catch {
        return [];
    }
})();

const serviceSourcePaths: Record<string, string> = (() => {
    try {
        const glob = import.meta.glob('/src/kernel/services/**/*.ts', { eager: false });
        const map: Record<string, string> = {};
        for (const p of Object.keys(glob)) {
            if (
                p.endsWith('.test.ts') ||
                p.endsWith('.spec.ts') ||
                p.endsWith('.d.ts') ||
                p.includes('node_modules')
            )
                continue;
            const name = p.split('/').pop()!.replace('.ts', '');
            map[name] = p.startsWith('/') ? p.slice(1) : p;
        }
        return map;
    } catch {
        return {};
    }
})();

const CORE_SERVICES = new Set([
    'eventBus',
    'container',
    'database',
    'storageLayer',
    'runtime',
    'lifecycleManager',
    'securityService',
]);

const PHASE_COLORS: Record<string, string> = {
    core: '#60a5fa',
    phase0: '#a78bfa',
    phase1: '#34d399',
    phase2: '#fbbf24',
    phase3: '#f472b6',
    phase4: '#fb923c',
    phase5: '#22d3ee',
    phase6: '#a78bfa',
    phase7: '#34d399',
    phase8: '#fbbf24',
    phase9: '#f472b6',
    phase10: '#fb923c',
    phase11: '#22d3ee',
};

const PHASE_LABELS: Record<string, string> = {
    core: 'CORE',
    phase0: 'EVENT BRIDGE',
    phase1: 'FOUNDATION',
    phase2: 'INFRASTRUCTURE',
    phase3: 'DEBATE',
    phase4: 'AGENTS',
    phase5: 'ROUTING',
    phase6: 'HIGH-LEVEL',
    phase7: 'MEMORY',
    phase8: 'CONSORTIA',
    phase9: 'RESEARCH',
    phase10: 'ECOSYSTEM',
    phase11: 'CAUSAL',
};

type ViewTab = 'all' | 'di' | 'source' | 'ui' | 'unmapped';
type Decision = 'no-panel' | string;

const STORAGE_KEY = 'service_registry_decisions';

const loadDecisions = (): Record<string, Decision> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

const PHASE_ORDER = [
    'core',
    'phase0',
    'phase1',
    'phase2',
    'phase3',
    'phase4',
    'phase5',
    'phase6',
    'phase7',
    'phase8',
    'phase9',
    'phase10',
    'phase11',
];

interface ServiceInfo {
    name: string;
    registered: boolean;
    phase: string | null;
    deps: string[];
    dependents: string[];
    uiRouteId: string | null;
    uiPath: string | null;
    uiValid: boolean;
    sourcePath: string | null;
    userRoute: string | null;
    userNoPanel: boolean;
}

type SortKey = 'name' | 'phase' | 'type' | 'route' | 'deps' | 'used';

const SortIcon: React.FC<{ col: SortKey; sortKey: SortKey; sortAsc: boolean }> = ({
    col,
    sortKey,
    sortAsc,
}) => {
    if (sortKey !== col) return null;
    return sortAsc ? (
        <ChevronUp size={12} style={{ marginLeft: 2 }} />
    ) : (
        <ChevronDown size={12} style={{ marginLeft: 2 }} />
    );
};

const ServiceRegistryPanel: React.FC = () => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('all');
    const [services, setServices] = useState<string[]>([]);
    const [deps, setDeps] = useState<Record<string, string[]>>({});
    const [status, setStatus] = useState<{
        phase: string;
        uptime: number;
        servicesReady: number;
        servicesTotal: number;
    } | null>(null);
    const [lastUpdated, setLastUpdated] = useState(Date.now);
    const [now, setNow] = useState(Date.now);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [decisions, setDecisions] = useState<Record<string, Decision>>(loadDecisions);
    const [exportOpen, setExportOpen] = useState(false);

    const saveDecisions = (d: Record<string, Decision>) => {
        setDecisions(d);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
        } catch {
            /* quota exceeded */
        }
    };

    const setDecision = (service: string, decision: Decision) => {
        const next = { ...decisions };
        if (decision === 'no-panel' || decision === '') {
            if (decision === '') delete next[service];
            else next[service] = 'no-panel';
        } else {
            next[service] = decision;
        }
        saveDecisions(next);
    };

    const clearDecisions = () => saveDecisions({});

    const listByName = VALID_ROUTE_IDS.slice().sort();

    const refresh = useCallback(() => {
        setServices(runtime.getServices().sort());
        setDeps(runtime.getDependencies());
        setStatus(runtime.getStatus());
        setLastUpdated(Date.now());
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh();
        const unsub = eventBus.on(EVENTS.KERNEL_UPDATED, refresh);
        const interval = setInterval(refresh, 30000);
        const timeTick = setInterval(() => setNow(Date.now()), 10000);
        return () => {
            unsub();
            clearInterval(interval);
            clearInterval(timeTick);
        };
    }, [refresh]);

    const diSet = useMemo(() => new Set(services), [services]);

    const allServiceNames = useMemo(() => {
        const extras = serviceSourceFiles.filter((n) => !diSet.has(n));
        return [...services, ...extras].sort();
    }, [services, diSet]);

    const reverseDeps = useMemo(() => {
        const rev: Record<string, string[]> = {};
        for (const [svc, svcDeps] of Object.entries(deps)) {
            for (const d of svcDeps) {
                if (!rev[d]) rev[d] = [];
                if (!rev[d].includes(svc)) rev[d].push(svc);
            }
        }
        return rev;
    }, [deps]);

    const serviceMap = useMemo(() => {
        const map = new Map<string, ServiceInfo>();
        for (const name of allServiceNames) {
            const registered = diSet.has(name);
            const declaredRoute = SERVICE_ROUTE_MAP[name] ?? null;
            const userRoute =
                typeof decisions[name] === 'string' && decisions[name] !== 'no-panel'
                    ? (decisions[name] as string)
                    : null;
            const effectiveRoute = userRoute || declaredRoute;
            const uiPath = effectiveRoute ? (ROUTE_PATH[effectiveRoute] ?? null) : null;
            const uiValid = effectiveRoute ? VALID_ROUTE_IDS.includes(effectiveRoute) : false;
            map.set(name, {
                name,
                registered,
                phase: registered ? (SERVICE_PHASE[name] ?? '?') : null,
                deps: deps[name] || [],
                dependents: reverseDeps[name] || [],
                uiRouteId: effectiveRoute,
                uiPath,
                uiValid,
                sourcePath: serviceSourcePaths[name] || null,
                userRoute: userRoute || null,
                userNoPanel: decisions[name] === 'no-panel',
            });
        }
        return map;
    }, [allServiceNames, diSet, deps, reverseDeps, decisions]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const filteredServices = useMemo(() => {
        let list: { name: string; info: ServiceInfo }[];
        const all = allServiceNames.map((n) => ({ name: n, info: serviceMap.get(n)! }));

        switch (activeTab) {
            case 'di':
                list = all.filter((x) => x.info.registered);
                break;
            case 'source':
                list = all.filter((x) => !x.info.registered);
                break;
            case 'ui':
                list = all.filter(
                    (x) => x.info.uiRouteId !== null && x.info.uiValid && !x.info.userNoPanel,
                );
                break;
            case 'unmapped':
                list = all.filter(
                    (x) =>
                        x.info.registered &&
                        !CORE_SERVICES.has(x.name) &&
                        !x.info.userNoPanel &&
                        x.info.uiRouteId === null,
                );
                break;
            default:
                list = all;
        }

        if (search) {
            const q = search.toLowerCase();
            list = list.filter((x) => x.name.toLowerCase().includes(q));
        }

        list.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'name':
                    cmp = a.name.localeCompare(b.name);
                    break;
                case 'phase': {
                    const pa = a.info.phase || 'zzz';
                    const pb = b.info.phase || 'zzz';
                    cmp = pa.localeCompare(pb);
                    break;
                }
                case 'type': {
                    cmp = (a.info.registered ? 0 : 1) - (b.info.registered ? 0 : 1);
                    break;
                }
                case 'route': {
                    const ra = a.info.uiPath || 'zzz';
                    const rb = b.info.uiPath || 'zzz';
                    cmp = ra.localeCompare(rb);
                    break;
                }
                case 'deps':
                    cmp = a.info.deps.length - b.info.deps.length;
                    break;
                case 'used':
                    cmp = a.info.dependents.length - b.info.dependents.length;
                    break;
            }
            return sortAsc ? cmp : -cmp;
        });

        return list;
    }, [activeTab, allServiceNames, serviceMap, search, sortKey, sortAsc]);

    const selectedInfo = selectedService ? serviceMap.get(selectedService) : null;

    const stats = useMemo(() => {
        const di = services.length;
        const source =
            serviceSourceFiles.length -
            services.filter((s) => serviceSourceFiles.includes(s)).length;
        const hasUi = allServiceNames.filter((n) => {
            const info = serviceMap.get(n);
            return info && info.uiRouteId !== null && info.uiValid && !info.userNoPanel;
        }).length;
        const unmapped = allServiceNames.filter((n) => {
            const info = serviceMap.get(n);
            return (
                info &&
                info.registered &&
                !CORE_SERVICES.has(n) &&
                !info.userNoPanel &&
                info.uiRouteId === null
            );
        }).length;
        const dismissed = Object.entries(decisions).filter(([, v]) => v === 'no-panel').length;
        return { di, source, total: allServiceNames.length, hasUi, unmapped, dismissed };
    }, [services, allServiceNames, serviceMap, decisions]);

    const unmappedByPhase = useMemo(() => {
        const groups: Record<string, { name: string; info: ServiceInfo }[]> = {};
        const all = allServiceNames.map((n) => ({ name: n, info: serviceMap.get(n)! }));
        for (const x of all) {
            if (
                !x.info.registered ||
                CORE_SERVICES.has(x.name) ||
                x.info.userNoPanel ||
                x.info.uiRouteId !== null
            )
                continue;
            const phase = x.info.phase || '?';
            if (!groups[phase]) groups[phase] = [];
            groups[phase].push(x);
        }
        const ordered: Array<{ phase: string; items: typeof all }> = [];
        for (const p of PHASE_ORDER) {
            if (groups[p]) ordered.push({ phase: p, items: groups[p] });
        }
        if (groups['?']) ordered.push({ phase: '?', items: groups['?'] });
        return ordered;
    }, [allServiceNames, serviceMap]);

    const exportCode = useMemo(() => {
        const userMapped = Object.entries(decisions).filter(
            ([, v]) => v !== 'no-panel' && v !== '',
        ) as [string, string][];
        const allDecided = [...Object.entries(SERVICE_ROUTE_MAP), ...userMapped];
        const unique = new Map<string, string>();
        for (const [k, v] of allDecided) unique.set(k, v);
        const sorted = [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        return sorted.map(([svc, route]) => `    ${svc}: '${route}',`).join('\n');
    }, [decisions]);

    const progress =
        stats.unmapped === 0 && stats.dismissed > 0
            ? '100'
            : stats.di <= CORE_SERVICES.size
              ? '0'
              : String(
                    Math.round(
                        ((stats.hasUi + stats.dismissed) / (stats.di - CORE_SERVICES.size)) * 100,
                    ),
                );

    return (
        <div style={styles.root}>
            <ModuleInfo moduleKey="service_registry" />

            {status && (
                <StatusBar
                    status={status}
                    now={now}
                    lastUpdated={lastUpdated}
                    refresh={refresh}
                    stats={stats}
                    progress={progress}
                />
            )}

            <div style={styles.searchRow}>
                <div style={styles.searchInputWrap}>
                    <Search size={16} color="#64748b" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('common.search') || 'Search services...'}
                        style={styles.searchInput}
                    />
                </div>
                <div style={styles.tabs}>
                    {[
                        { id: 'all' as ViewTab, label: `ALL (${stats.total})` },
                        { id: 'di' as ViewTab, label: `DI (${stats.di})` },
                        { id: 'source' as ViewTab, label: `SOURCE (${stats.source})` },
                        { id: 'ui' as ViewTab, label: `UI (${stats.hasUi})` },
                        { id: 'unmapped' as ViewTab, label: `UNMAPPED (${stats.unmapped})` },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => {
                                setActiveTab(id);
                                setSelectedService(null);
                            }}
                            style={{
                                ...styles.tab,
                                background:
                                    activeTab === id ? 'rgba(99,102,241,0.2)' : 'transparent',
                                color: activeTab === id ? '#a5b4fc' : '#64748b',
                                borderColor:
                                    activeTab === id ? 'rgba(99,102,241,0.4)' : 'transparent',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={() => setExportOpen(!exportOpen)}
                        style={{
                            ...styles.tab,
                            background: exportOpen ? 'rgba(52,211,153,0.2)' : 'transparent',
                            color: exportOpen ? '#34d399' : '#64748b',
                            borderColor: exportOpen ? 'rgba(52,211,153,0.4)' : 'transparent',
                        }}
                    >
                        ⚡ EXPORT
                    </button>
                </div>
            </div>

            {exportOpen && (
                <div style={styles.exportSection}>
                    <div style={styles.exportHeader}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>
                            Updated SERVICE_ROUTE_MAP — paste into service-phases.ts
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={() => navigator.clipboard.writeText(exportCode)}
                                style={styles.exportBtn}
                            >
                                Copy
                            </button>
                            <button onClick={clearDecisions} style={styles.exportBtn}>
                                Reset
                            </button>
                            <button onClick={() => setExportOpen(false)} style={styles.exportBtn}>
                                Close
                            </button>
                        </div>
                    </div>
                    <pre style={styles.exportPre}>{exportCode}</pre>
                </div>
            )}

            <div style={styles.body}>
                <div style={styles.tableWrap}>
                    {activeTab === 'unmapped' && unmappedByPhase.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                }}
                            >
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                    Services without a UI panel — assign a route or mark "no panel
                                    needed"
                                </span>
                                <button
                                    onClick={() => {
                                        const names = unmappedByPhase.flatMap((g) =>
                                            g.items.map((x) => x.name),
                                        );
                                        const next = { ...decisions };
                                        for (const n of names) next[n] = 'no-panel';
                                        saveDecisions(next);
                                    }}
                                    style={{
                                        fontSize: 10,
                                        padding: '3px 10px',
                                        borderRadius: 4,
                                        border: '1px solid rgba(148,163,184,0.2)',
                                        background: 'rgba(148,163,184,0.1)',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Dismiss all{' '}
                                    {unmappedByPhase.reduce((s, g) => s + g.items.length, 0)}
                                </button>
                            </div>
                            {unmappedByPhase.map(({ phase, items }) => (
                                <div key={phase} style={styles.phaseBlock}>
                                    <div style={styles.phaseBlockHeader}>
                                        <Layers
                                            size={12}
                                            color={PHASE_COLORS[phase] || '#64748b'}
                                        />
                                        <span style={styles.phaseBlockLabel}>
                                            {PHASE_LABELS[phase] || phase.toUpperCase()}
                                        </span>
                                        <span style={styles.phaseBlockCount}>{items.length}</span>
                                    </div>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <Th width="28%">Name</Th>
                                                <Th width="90px">Phase</Th>
                                                <Th width="120px">Deps</Th>
                                                <Th width="80px">Used</Th>
                                                <Th width="170px">Assign Route</Th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map(({ name, info }) => (
                                                <tr key={name} style={styles.tableRow}>
                                                    <td style={styles.cellName}>
                                                        <span style={styles.nameText}>{name}</span>
                                                    </td>
                                                    <td>
                                                        {info.phase && (
                                                            <span
                                                                style={{
                                                                    ...styles.badgePhase,
                                                                    background: `${PHASE_COLORS[info.phase] || '#64748b'}18`,
                                                                    color:
                                                                        PHASE_COLORS[info.phase] ||
                                                                        '#64748b',
                                                                }}
                                                            >
                                                                {info.phase}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={styles.cellNum}>
                                                        {info.deps.length}
                                                    </td>
                                                    <td style={styles.cellNum}>
                                                        {info.dependents.length}
                                                    </td>
                                                    <td>
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '__no-panel__') {
                                                                    setDecision(name, 'no-panel');
                                                                } else if (val) {
                                                                    setDecision(name, val);
                                                                }
                                                            }}
                                                            style={styles.routeSelect}
                                                        >
                                                            <option value="">— assign —</option>
                                                            <option value="__no-panel__">
                                                                ✗ No panel needed
                                                            </option>
                                                            <option disabled>── routes ──</option>
                                                            {listByName.map((r) => (
                                                                <option key={r} value={r}>
                                                                    {r} ({ROUTE_PATH[r]})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                            {Object.keys(decisions).filter((k) => decisions[k] === 'no-panel')
                                .length > 0 && (
                                <div style={styles.phaseBlock}>
                                    <div style={styles.phaseBlockHeader}>
                                        <span
                                            style={{
                                                color: '#64748b',
                                                fontSize: 11,
                                                fontWeight: 600,
                                            }}
                                        >
                                            DISMISSED (
                                            {
                                                Object.keys(decisions).filter(
                                                    (k) => decisions[k] === 'no-panel',
                                                ).length
                                            }
                                            )
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'unmapped' ? (
                        <div style={styles.emptyCell}>
                            All DI services are mapped or dismissed! 🎉
                        </div>
                    ) : (
                        <>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <Th onClick={() => toggleSort('name')} width="28%">
                                            Name{' '}
                                            <SortIcon
                                                col="name"
                                                sortKey={sortKey}
                                                sortAsc={sortAsc}
                                            />
                                        </Th>
                                        <Th onClick={() => toggleSort('type')} width="60px">
                                            Type{' '}
                                            <SortIcon
                                                col="type"
                                                sortKey={sortKey}
                                                sortAsc={sortAsc}
                                            />
                                        </Th>
                                        <Th onClick={() => toggleSort('phase')} width="80px">
                                            Phase{' '}
                                            <SortIcon
                                                col="phase"
                                                sortKey={sortKey}
                                                sortAsc={sortAsc}
                                            />
                                        </Th>
                                        <Th onClick={() => toggleSort('route')} width="120px">
                                            Route{' '}
                                            <SortIcon
                                                col="route"
                                                sortKey={sortKey}
                                                sortAsc={sortAsc}
                                            />
                                        </Th>
                                        <Th onClick={() => toggleSort('deps')} width="55px">
                                            Deps{' '}
                                            <SortIcon
                                                col="deps"
                                                sortKey={sortKey}
                                                sortAsc={sortAsc}
                                            />
                                        </Th>
                                        <Th onClick={() => toggleSort('used')} width="50px">
                                            Used{' '}
                                            <SortIcon
                                                col="used"
                                                sortKey={sortKey}
                                                sortAsc={sortAsc}
                                            />
                                        </Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredServices.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={styles.emptyCell}>
                                                No services match "{search}"
                                            </td>
                                        </tr>
                                    )}
                                    {filteredServices.map(({ name, info }) => (
                                        <tr
                                            key={name}
                                            onClick={() =>
                                                setSelectedService(
                                                    selectedService === name ? null : name,
                                                )
                                            }
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedService(
                                                        selectedService === name ? null : name,
                                                    );
                                                }
                                            }}
                                            style={{
                                                ...styles.tableRow,
                                                background:
                                                    selectedService === name
                                                        ? 'rgba(99,102,241,0.08)'
                                                        : info.userNoPanel
                                                          ? 'rgba(100,116,139,0.05)'
                                                          : info.userRoute
                                                            ? 'rgba(52,211,153,0.05)'
                                                            : 'transparent',
                                            }}
                                        >
                                            <td style={styles.cellName}>
                                                <Circle
                                                    size={7}
                                                    color={
                                                        !info.registered
                                                            ? '#64748b'
                                                            : info.userNoPanel
                                                              ? '#64748b'
                                                              : info.uiValid
                                                                ? '#22c55e'
                                                                : info.uiRouteId
                                                                  ? '#f59e0b'
                                                                  : '#f59e0b'
                                                    }
                                                    fill={
                                                        !info.registered
                                                            ? '#64748b'
                                                            : info.userNoPanel
                                                              ? '#64748b'
                                                              : info.uiValid
                                                                ? '#22c55e'
                                                                : info.uiRouteId
                                                                  ? '#f59e0b'
                                                                  : '#f59e0b'
                                                    }
                                                    style={{ flexShrink: 0 }}
                                                />
                                                <span
                                                    style={{
                                                        ...styles.nameText,
                                                        opacity: info.userNoPanel ? 0.5 : 1,
                                                    }}
                                                >
                                                    {name}
                                                </span>
                                                {info.userNoPanel && (
                                                    <span style={styles.badgeDismissed}>
                                                        dismissed
                                                    </span>
                                                )}
                                                {info.userRoute && (
                                                    <span style={styles.badgeUserRoute}>user</span>
                                                )}
                                            </td>
                                            <td>
                                                {info.registered ? (
                                                    <span style={styles.badgeDi}>DI</span>
                                                ) : (
                                                    <span style={styles.badgeSource}>source</span>
                                                )}
                                            </td>
                                            <td>
                                                {info.phase && (
                                                    <span
                                                        style={{
                                                            ...styles.badgePhase,
                                                            background: `${PHASE_COLORS[info.phase] || '#64748b'}18`,
                                                            color:
                                                                PHASE_COLORS[info.phase] ||
                                                                '#64748b',
                                                        }}
                                                    >
                                                        {info.phase}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {info.uiPath ? (
                                                    <a
                                                        href={`#${info.uiPath}`}
                                                        style={styles.uiLink}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={10} />
                                                        <span>{info.uiPath}</span>
                                                    </a>
                                                ) : info.uiRouteId ? (
                                                    <span style={styles.badRoute}>
                                                        <CircleAlert size={10} />
                                                        <span>{info.uiRouteId} ?</span>
                                                    </span>
                                                ) : (
                                                    <span style={styles.noRoute}>—</span>
                                                )}
                                            </td>
                                            <td style={styles.cellNum}>{info.deps.length}</td>
                                            <td style={styles.cellNum}>{info.dependents.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>

                {selectedInfo && (
                    <DetailPanel
                        info={selectedInfo}
                        onClose={() => setSelectedService(null)}
                        allRoutes={listByName}
                        onAssign={(routeId: string) => setDecision(selectedInfo.name, routeId)}
                        onDismiss={() => setDecision(selectedInfo.name, 'no-panel')}
                    />
                )}
            </div>
        </div>
    );
};

const Th: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    width?: string;
}> = ({ children, onClick, width }) => (
    <th
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
            onClick
                ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onClick();
                      }
                  }
                : undefined
        }
        style={{ ...styles.th, width, cursor: onClick ? 'pointer' : 'default' }}
    >
        {children}
    </th>
);

const StatusBar: React.FC<{
    status: { phase: string; uptime: number; servicesReady: number; servicesTotal: number };
    now: number;
    lastUpdated: number;
    refresh: () => void;
    stats: {
        di: number;
        source: number;
        total: number;
        hasUi: number;
        unmapped: number;
        dismissed: number;
    };
    progress: string;
}> = ({ status, now, lastUpdated, refresh, stats, progress }) => {
    const phaseColor = status.phase === 'ready' ? '#22c55e' : '#eab308';
    return (
        <div style={styles.statusBar}>
            {[
                { label: 'Phase', value: status.phase, color: phaseColor },
                {
                    label: 'Services',
                    value: `${status.servicesReady}/${status.servicesTotal}`,
                    color: '#60a5fa',
                },
                {
                    label: 'Uptime',
                    value: `${Math.floor(status.uptime / 60000)}m`,
                    color: '#a78bfa',
                },
                { label: 'DI', value: String(stats.di), color: '#34d399' },
                { label: 'Source', value: String(stats.source), color: '#f59e0b' },
                { label: 'UI Panels', value: String(stats.hasUi), color: '#22d3ee' },
                { label: 'Unmapped', value: String(stats.unmapped), color: '#fbbf24' },
                { label: 'Dismissed', value: String(stats.dismissed), color: '#64748b' },
                {
                    label: 'Progress',
                    value: `${progress}%`,
                    color: progress === '100' ? '#22c55e' : '#a78bfa',
                },
            ].map((s) => (
                <div key={s.label} style={{ ...styles.statBox, borderColor: `${s.color}40` }}>
                    <span style={styles.statLabel}>{s.label}</span>
                    <span style={{ ...styles.statValue, color: s.color }}>{s.value}</span>
                </div>
            ))}
            <div style={styles.statusActions}>
                <button onClick={refresh} style={styles.refreshBtn} title="Refresh">
                    <RefreshCw size={14} />
                </button>
                <span
                    style={{
                        ...styles.timeAgo,
                        color: now - lastUpdated > 60000 ? '#ef4444' : '#64748b',
                    }}
                >
                    {Math.floor((now - lastUpdated) / 1000)}s
                </span>
            </div>
        </div>
    );
};

const DetailPanel: React.FC<{
    info: ServiceInfo;
    onClose: () => void;
    allRoutes: string[];
    onAssign: (routeId: string) => void;
    onDismiss: () => void;
}> = ({ info, onClose, allRoutes, onAssign, onDismiss }) => (
    <div style={styles.detailPanel}>
        <div style={styles.detailHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen size={16} color="#94a3b8" />
                <span style={styles.detailTitle}>{info.name}</span>
            </div>
            <button onClick={onClose} style={styles.detailClose}>
                ✕
            </button>
        </div>

        <div style={styles.detailBadgeRow}>
            {info.registered ? (
                <span
                    style={{
                        ...styles.detailBadge,
                        background: 'rgba(52,211,153,0.15)',
                        color: '#34d399',
                    }}
                >
                    <Database size={12} /> DI REGISTERED
                </span>
            ) : (
                <span
                    style={{
                        ...styles.detailBadge,
                        background: 'rgba(100,116,139,0.15)',
                        color: '#94a3b8',
                    }}
                >
                    <FileCode size={12} /> SOURCE ONLY
                </span>
            )}
            {info.phase && (
                <span
                    style={{
                        ...styles.detailBadge,
                        background: `${PHASE_COLORS[info.phase] || '#64748b'}20`,
                        color: PHASE_COLORS[info.phase] || '#64748b',
                    }}
                >
                    <Layers size={12} /> {PHASE_LABELS[info.phase] || info.phase}
                </span>
            )}
            {info.uiPath ? (
                <a
                    href={`#${info.uiPath}`}
                    style={{
                        ...styles.detailBadge,
                        background: 'rgba(34,211,238,0.15)',
                        color: '#22d3ee',
                        textDecoration: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <ExternalLink size={12} /> {info.uiPath}
                </a>
            ) : info.uiRouteId ? (
                <span
                    style={{
                        ...styles.detailBadge,
                        background: 'rgba(251,191,36,0.15)',
                        color: '#fbbf24',
                    }}
                >
                    <Hash size={12} /> user: {info.uiRouteId}
                </span>
            ) : null}
            {info.userNoPanel && (
                <span
                    style={{
                        ...styles.detailBadge,
                        background: 'rgba(100,116,139,0.15)',
                        color: '#94a3b8',
                    }}
                >
                    ✗ No panel needed
                </span>
            )}
        </div>

        {info.sourcePath && (
            <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>File Source</div>
                <div style={styles.detailCode}>{info.sourcePath}</div>
            </div>
        )}

        {info.deps.length > 0 && (
            <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>
                    <ArrowRight size={12} /> Deps ({info.deps.length})
                </div>
                <div style={styles.detailChipList}>
                    {info.deps.map((d) => (
                        <span key={d} style={styles.detailChip}>
                            {d}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {info.dependents.length > 0 && (
            <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>
                    <ArrowLeft size={12} /> Used by ({info.dependents.length})
                </div>
                <div style={styles.detailChipList}>
                    {info.dependents.map((d) => (
                        <span key={d} style={styles.detailChip}>
                            {d}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {info.uiRouteId === null && info.registered && !info.userNoPanel && (
            <div style={styles.detailSection}>
                <div style={{ ...styles.detailSectionTitle, color: '#fbbf24' }}>
                    <Hash size={12} /> Assign a route
                </div>
                <select
                    value=""
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '__no-panel__') onDismiss();
                        else if (v) onAssign(v);
                    }}
                    style={styles.detailSelect}
                >
                    <option value="">— choose route —</option>
                    <option value="__no-panel__">✗ No panel needed</option>
                    <option disabled>── routes ──</option>
                    {allRoutes.map((r) => (
                        <option key={r} value={r}>
                            {r} ({ROUTE_PATH[r]})
                        </option>
                    ))}
                </select>
            </div>
        )}
    </div>
);

const styles: Record<string, React.CSSProperties> = {
    root: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 16,
        overflow: 'hidden',
    },
    statusBar: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
    statBox: {
        background: 'rgba(15,23,42,0.6)',
        borderRadius: 8,
        padding: '4px 12px',
        border: '1px solid transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    statLabel: { fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
    statValue: { fontSize: 16, fontWeight: 700 },
    statusActions: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
    refreshBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#64748b',
        padding: 4,
        display: 'flex',
    },
    timeAgo: { fontSize: 10 },
    searchRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    searchInputWrap: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(15,23,42,0.6)',
        borderRadius: 8,
        padding: '2px 10px',
        border: '1px solid rgba(148,163,184,0.15)',
        minWidth: 160,
    },
    searchInput: {
        flex: 1,
        background: 'none',
        border: 'none',
        outline: 'none',
        color: '#f8fafc',
        fontSize: 13,
        padding: '6px 0',
    },
    tabs: { display: 'flex', gap: 3, flexWrap: 'wrap' },
    tab: {
        padding: '4px 8px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        border: '1px solid transparent',
        cursor: 'pointer',
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
    },
    body: { flex: 1, display: 'flex', gap: 12, overflow: 'hidden', minHeight: 0 },
    tableWrap: { flex: 1, overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' },
    th: {
        textAlign: 'left',
        padding: '6px 6px',
        color: '#64748b',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        borderBottom: '1px solid rgba(148,163,184,0.12)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
    },
    tableRow: {
        cursor: 'pointer',
        borderBottom: '1px solid rgba(148,163,184,0.04)',
        transition: 'background 0.1s',
    },
    cellName: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px' },
    nameText: {
        color: '#e2e8f0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    cellNum: { padding: '5px 6px', color: '#64748b', textAlign: 'center' },
    badgeDi: {
        fontSize: 9,
        padding: '1px 4px',
        borderRadius: 4,
        background: 'rgba(52,211,153,0.15)',
        color: '#34d399',
        fontWeight: 600,
    },
    badgeSource: {
        fontSize: 9,
        padding: '1px 4px',
        borderRadius: 4,
        background: 'rgba(100,116,139,0.15)',
        color: '#94a3b8',
        fontWeight: 600,
    },
    badgePhase: { fontSize: 9, padding: '1px 4px', borderRadius: 4, fontWeight: 600 },
    badgeDismissed: {
        fontSize: 8,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(100,116,139,0.15)',
        color: '#64748b',
        fontWeight: 600,
        marginLeft: 4,
    },
    badgeUserRoute: {
        fontSize: 8,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(52,211,153,0.15)',
        color: '#34d399',
        fontWeight: 600,
        marginLeft: 4,
    },
    uiLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        color: '#22d3ee',
        textDecoration: 'none',
        padding: '2px 6px',
        borderRadius: 4,
        background: 'rgba(34,211,238,0.1)',
    },
    badRoute: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        color: '#f59e0b',
        padding: '2px 6px',
        borderRadius: 4,
        background: 'rgba(251,191,36,0.1)',
    },
    noRoute: { fontSize: 10, color: '#475569' },
    emptyCell: { padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 },
    phaseBlock: {
        background: 'rgba(15,23,42,0.3)',
        borderRadius: 8,
        border: '1px solid rgba(148,163,184,0.06)',
        overflow: 'hidden',
    },
    phaseBlockHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'rgba(148,163,184,0.04)',
        borderBottom: '1px solid rgba(148,163,184,0.06)',
    },
    phaseBlockLabel: {
        fontSize: 10,
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    phaseBlockCount: { fontSize: 10, color: '#475569', marginLeft: 'auto' },
    routeSelect: {
        fontSize: 10,
        fontFamily: 'monospace',
        background: 'rgba(15,23,42,0.8)',
        color: '#e2e8f0',
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 4,
        padding: '3px 4px',
        maxWidth: 170,
        cursor: 'pointer',
    },
    exportSection: {
        background: 'rgba(15,23,42,0.5)',
        borderRadius: 8,
        border: '1px solid rgba(52,211,153,0.2)',
        padding: 12,
        maxHeight: 200,
        overflow: 'auto',
    },
    exportHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    exportBtn: {
        fontSize: 10,
        padding: '3px 8px',
        borderRadius: 4,
        border: '1px solid rgba(148,163,184,0.2)',
        background: 'rgba(15,23,42,0.6)',
        color: '#94a3b8',
        cursor: 'pointer',
    },
    exportPre: {
        fontSize: 10,
        fontFamily: 'monospace',
        color: '#34d399',
        background: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 4,
        overflow: 'auto',
        whiteSpace: 'pre',
    },
    detailPanel: {
        width: 320,
        flexShrink: 0,
        background: 'rgba(15,23,42,0.8)',
        borderRadius: 8,
        border: '1px solid rgba(148,163,184,0.12)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 14,
    },
    detailHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    detailTitle: { fontSize: 13, fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' },
    detailClose: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: 16,
        padding: 4,
    },
    detailBadgeRow: { display: 'flex', gap: 5, flexWrap: 'wrap' },
    detailBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 6,
    },
    detailSection: { display: 'flex', flexDirection: 'column', gap: 5 },
    detailSectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailCode: {
        fontSize: 10,
        fontFamily: 'monospace',
        color: '#64748b',
        padding: '5px 6px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 4,
    },
    detailChipList: { display: 'flex', gap: 3, flexWrap: 'wrap' },
    detailChip: {
        fontSize: 10,
        fontFamily: 'monospace',
        padding: '2px 6px',
        background: 'rgba(99,102,241,0.1)',
        color: '#a5b4fc',
        borderRadius: 4,
    },
    detailSelect: {
        fontSize: 11,
        fontFamily: 'monospace',
        background: 'rgba(15,23,42,0.8)',
        color: '#e2e8f0',
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 4,
        padding: '4px 6px',
        cursor: 'pointer',
        width: '100%',
    },
};

export default ServiceRegistryPanel;
