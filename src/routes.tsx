import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Home } from 'lucide-react';
import { t as translate } from './i18n/translations';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { PermissionGate } from './components/Common/PermissionGate';
import { NAV_SECTIONS } from './route-registry';
import { PANEL_COMPONENTS, PanelLoader } from './route-imports';
import DashboardPanel from './components/DashboardPanel/DashboardPanel';
import ProviderManager from './components/ProviderManager/ProviderManager';
import GroupsPanel from './components/GroupsPanel/GroupsPanel';
import ConnectorsPanel from './components/ConnectorsPanel/ConnectorsPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';
import ChatAdminPanel from './components/ChatAdminPanel/ChatAdminPanel';
import EventsTimeline from './components/EventsTimeline/EventsTimeline';

function Panel(key: string): React.ComponentType<Record<string, unknown>> {
    const component = PANEL_COMPONENTS[key];
    if (!component) {
        const Fallback: React.FC = () => (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Panel "{key}" not found
            </div>
        );
        return Fallback;
    }
    return component;
}

// Legacy routes NOT in sidebar (keep for deep-link compat):
// /events     → EventsPanel (replaced by /logs)
// /timeline   → EventsTimeline (merged into events surface)
// /chat-admin → ChatAdminPanel (admin-only, no nav entry)

const NotFound: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchVal, setSearchVal] = useState('');
    const suggestions = React.useMemo(() => {
        const allItems = NAV_SECTIONS.flatMap((s) => s.items);
        const pathPart = location.pathname.split('/').filter(Boolean).pop()?.toLowerCase() || '';
        if (pathPart) {
            return allItems
                .filter((item) => {
                    const label = translate(item.labelKey).toLowerCase();
                    return label.includes(pathPart) || item.id.includes(pathPart);
                })
                .slice(0, 6);
        }
        return allItems.slice(0, 8);
    }, [location.pathname]);
    const filtered = React.useMemo(() => {
        if (!searchVal) return suggestions;
        const q = searchVal.toLowerCase();
        return NAV_SECTIONS.flatMap((s) => s.items)
            .filter((item) => {
                return translate(item.labelKey).toLowerCase().includes(q) || item.id.includes(q);
            })
            .slice(0, 8);
    }, [searchVal, suggestions]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                gap: '1.5rem',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: '#64748b',
                    opacity: 0.15,
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                }}
            >
                404
            </div>
            <div style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 600 }}>
                {translate('not_found.title')}
            </div>
            <div
                style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    maxWidth: 400,
                    textAlign: 'center',
                }}
            >
                {translate('not_found.description', undefined, { path: location.pathname })}
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                <Search
                    size={16}
                    style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        pointerEvents: 'none',
                    }}
                />
                <input
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder={translate('not_found.search_placeholder')}
                    autoFocus
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#e2e8f0',
                        fontSize: '0.9rem',
                        outline: 'none',
                    }}
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    maxWidth: 500,
                }}
            >
                {filtered.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => navigate(`/${item.id}`)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'all 0.15s',
                        }}
                    >
                        {item.icon}
                        <span>{translate(item.labelKey)}</span>
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0.6rem 1.2rem',
                        borderRadius: 8,
                        background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        color: '#60a5fa',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    <Home size={16} /> Dashboard
                </button>
                <button
                    onClick={() => navigate('/chat')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0.6rem 1.2rem',
                        borderRadius: 8,
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        color: '#34d399',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    <MessageSquare size={16} /> Chat
                </button>
            </div>
        </div>
    );
};

export const AppRoutes: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Routes location={location}>
            {/* ── Landing & dashboard (manual — special onNavigate prop) ── */}
            <Route
                path="/"
                element={
                    <PanelLoader name="Dashboard">
                        <DashboardPanel onNavigate={(p) => navigate(`/${p}`)} />
                    </PanelLoader>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <PanelLoader name="Dashboard">
                        <DashboardPanel onNavigate={(p) => navigate(`/${p}`)} />
                    </PanelLoader>
                }
            />

            {/* ── Primary routes from registry ── */}
            {NAV_SECTIONS.flatMap((s) => s.items)
                .filter((i) => i.id !== 'dashboard')
                .map((item) => {
                    const Component = PANEL_COMPONENTS[item.id];
                    if (!Component) return null;
                    const routePath = item.path ?? `/${item.id}`;
                    return (
                        <Route
                            key={item.id}
                            path={routePath}
                            element={
                                <PermissionGate requiredLevel={item.level}>
                                    {item.lazy ? (
                                        <PanelLoader name={item.id}>
                                            <Component />
                                        </PanelLoader>
                                    ) : (
                                        <ErrorBoundary name={item.id} variant="panel">
                                            <Component />
                                        </ErrorBoundary>
                                    )}
                                </PermissionGate>
                            }
                        />
                    );
                })}

            {/* ── Redirects ── */}
            <Route path="/events" element={<Navigate to="/timeline" replace />} />
            <Route path="/message-search" element={<Navigate to="/chat" replace />} />
            <Route path="/chat-export" element={<Navigate to="/chat" replace />} />
            <Route
                path="/debate-runtime"
                element={<Navigate to="/debate?mode=runtime" replace />}
            />
            <Route path="/topic-suggester" element={<Navigate to="/topics" replace />} />

            {/* ── Nested URL aliases (debates/*) ── */}
            <Route
                path="/debates/arena"
                element={
                    <PanelLoader name="DebateArena">
                        {React.createElement(Panel('debate'))}
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/live"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="DebateLive">
                            {React.createElement(Panel('debate-live'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/debates/replay"
                element={
                    <PermissionGate requiredLevel="L2">
                        <PanelLoader name="DebateReplay">
                            {React.createElement(Panel('debate-replay'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/debates/tournament"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Tournament">
                            {React.createElement(Panel('debate-tournament'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/audience"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Audience">
                            {React.createElement(Panel('audience'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/editors"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Editors">
                            {React.createElement(Panel('editors'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/debates/history"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="DebateHistory">
                            {React.createElement(Panel('debate-history'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/debates/analysis"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="DebateAnalysis">
                            {React.createElement(Panel('debate-analysis'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/debates/graph"
                element={
                    <PermissionGate requiredLevel="L2">
                        <PanelLoader name="ArgumentGraph">
                            {React.createElement(Panel('argument-graph'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/debates/topics"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Topics">
                            {React.createElement(Panel('topics'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />

            {/* ── Nested URL aliases (diagnostics/*) ── */}
            <Route
                path="/diagnostics/logs"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Logs">{React.createElement(Panel('logs'))}</PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/diagnostics/health"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Health">
                            {React.createElement(Panel('health'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/diagnostics/system"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="SystemHealth">
                            {React.createElement(Panel('system-health'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/diagnostics/traces"
                element={
                    <PanelLoader name="Traces">
                        {React.createElement(Panel('debugger'))}
                    </PanelLoader>
                }
            />
            <Route
                path="/diagnostics/memory"
                element={
                    <PermissionGate requiredLevel="L1">
                        <PanelLoader name="Memory">
                            {React.createElement(Panel('memory'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />
            <Route
                path="/diagnostics/aquarium"
                element={
                    <PermissionGate requiredLevel="L2">
                        <PanelLoader name="Aquarium">
                            {React.createElement(Panel('aquarium'))}
                        </PanelLoader>
                    </PermissionGate>
                }
            />

            {/* ── Nested URL aliases (services/*) ── */}
            <Route
                path="/services/keys"
                element={
                    <ErrorBoundary name="Providers" variant="panel">
                        <ProviderManager />
                    </ErrorBoundary>
                }
            />
            <Route
                path="/services/groups"
                element={
                    <PanelLoader name="Groups">
                        <GroupsPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/services/connectors"
                element={
                    <ErrorBoundary name="Connectors" variant="panel">
                        <ConnectorsPanel />
                    </ErrorBoundary>
                }
            />
            <Route
                path="/services/mcp"
                element={
                    <ErrorBoundary name="MCP" variant="panel">
                        <MCPPanel />
                    </ErrorBoundary>
                }
            />

            {/* ── Legacy admin route (no nav entry) ── */}
            <Route
                path="/chat-admin"
                element={
                    <PermissionGate requiredLevel="L2">
                        <ErrorBoundary name="ChatAdmin" variant="panel">
                            <ChatAdminPanel />
                        </ErrorBoundary>
                    </PermissionGate>
                }
            />

            {/* ── Legacy route for timeline/events ── */}
            <Route
                path="/timeline"
                element={
                    <PanelLoader name="Timeline">
                        <EventsTimeline />
                    </PanelLoader>
                }
            />

            {/* ── 404 catch-all ── */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};
