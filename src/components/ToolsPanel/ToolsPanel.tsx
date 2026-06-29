import React, { useState, useEffect, useRef } from 'react';
import {
    Wrench,
    Play,
    Code,
    Database,
    Globe,
    Plus,
    Search,
    Shield,
    Cpu,
    Braces,
    Blocks,
    PlayCircle,
    Key,
    Download,
    Upload,
    AlertTriangle,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toolService } from '../../kernel/instances';
import type { ToolDefinition } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { EventMap } from '../../kernel/events/event-bus';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { safeJsonParse } from '../../kernel/utils/safe-json';
import {
    dismissBtnRed,
    errorBannerLg,
    exportImportBtn,
    flexGap3,
    glassPanelColRounded24,
    labelUppercaseBold,
    pageSubtitleMuted,
    pageTitleLarge,
    positionRelativeFlex1,
    searchIconAbsolute,
    searchInputLarge,
    sectionHeaderBottom,
} from '../../styles/common';

type ToolTypeFilter = 'all' | 'api' | 'script' | 'database';

const ToolsPanel: React.FC = () => {
    const [tools, setTools] = useState<ToolDefinition[]>(() => {
        try {
            return toolService.getTools();
        } catch (e) {
            console.warn('[ToolsPanel] Failed to load tools:', e);
            return [];
        }
    });
    const [error, setError] = useState<string | null>(null);
    const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
    const [testOutput, setTestOutput] = useState<string>('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<ToolTypeFilter>('all');
    const [activeTab, setActiveTab] = useState<'sandbox' | 'schema' | 'security'>('sandbox');
    const [testParams, setTestParams] = useState<string>('{\n  "query": "test"\n}');
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isMountedRef = useRef(true);

    const clearError = useAutoClearError(setError);

    useEffect(() => {
        isMountedRef.current = true;
        const sub = eventBus.onSafe<ToolDefinition[]>('tools:updated', (data) => {
            if (!isMountedRef.current) return;
            setTools(data);
            if (selectedTool) {
                setSelectedTool(data.find((t: ToolDefinition) => t.id === selectedTool.id) || null);
            }
        });
        return () => {
            isMountedRef.current = false;
            sub();
        };
    }, [selectedTool]);

    const handleExportTools = () => {
        try {
            const data = toolService.exportTools();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tools-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            eventBus.emit(EVENTS.NOTIFICATION as keyof EventMap, {
                message: 'Tools exported successfully',
                type: 'success',
            });
            if (isMountedRef.current) setError(null);
        } catch (err) {
            console.warn('[ToolsPanel] Export failed:', err);
            if (isMountedRef.current) {
                setError(t('common.unknown_error'));
                clearError();
            }
        }
    };

    const handleImportTools = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const count = toolService.importTools(event.target?.result as string);
                if (isMountedRef.current) {
                    setTools(toolService.getTools());
                    eventBus.emit(EVENTS.NOTIFICATION as keyof EventMap, {
                        message: `Successfully imported ${count} tool(s)`,
                        type: 'success',
                    });
                    setError(null);
                }
            } catch (err) {
                console.warn('[ToolsPanel] Failed to import tools:', err);
                if (isMountedRef.current) {
                    setError(t('common.unknown_error'));
                    clearError();
                }
                eventBus.emit(EVENTS.NOTIFICATION as keyof EventMap, {
                    message: t('common.unknown_error'),
                    type: 'error',
                });
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredTools = tools.filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (
            searchQuery &&
            !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !t.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
            return false;
        return true;
    });

    const handleRunTest = async () => {
        if (!selectedTool) return;
        setIsExecuting(true);
        setTestOutput('Initializing secure sandbox environment...\nMounting execution context...');
        setError(null);

        try {
            let parsedParams = {};
            try {
                parsedParams = safeJsonParse(testParams);
            } catch (parseErr) {
                setTestOutput(`Error: Invalid JSON parameters.\n${(parseErr as Error).message}`);
                setIsExecuting(false);
                return;
            }

            const startTime = Date.now();
            const result = await toolService.execute(selectedTool.id, parsedParams);
            if (!isMountedRef.current) return;
            const latency = Date.now() - startTime;

            const formattedOutput = `Execution completed in ${latency}ms\nStatus: ${result.status.toUpperCase()}\n\nResult:\n${JSON.stringify(result.data || result.error, null, 2)}`;
            setTestOutput(formattedOutput);
        } catch (execErr) {
            console.warn('[ToolsPanel] Tool execution failed:', execErr);
            if (isMountedRef.current) {
                setTestOutput(t('common.unknown_error'));
                setError(t('common.unknown_error'));
                clearError();
            }
        } finally {
            if (isMountedRef.current) setIsExecuting(false);
        }
    };

    const getToolIcon = (type: string) => {
        switch (type) {
            case 'script':
                return <Code size={20} color="#a855f7" />;
            case 'api':
                return <Globe size={20} color="#3b82f6" />;
            case 'database':
                return <Database size={20} color="#10b981" />;
            default:
                return <Blocks size={20} color="#f59e0b" />;
        }
    };

    const getToolColor = (type: string) => {
        switch (type) {
            case 'script':
                return '#a855f7';
            case 'api':
                return '#3b82f6';
            case 'database':
                return '#10b981';
            default:
                return '#f59e0b';
        }
    };

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                overflowY: 'auto',
            }}
        >
            {/* Header */}
            <div style={sectionHeaderBottom}>
                <div>
                    <h2 style={pageTitleLarge}>
                        <Wrench size={28} color="#f59e0b" aria-hidden="true" /> {t('tools.title')}
                    </h2>
                    <p style={pageSubtitleMuted}>{t('tools.subtitle')}</p>
                </div>
                <div style={flexGap3}>
                    <button
                        onClick={handleExportTools}
                        style={exportImportBtn}
                        aria-label={t('tools.export_aria')}
                    >
                        <Download size={16} aria-hidden="true" /> {t('common.export')}
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={exportImportBtn}
                        aria-label={t('tools.import_aria')}
                    >
                        <Upload size={16} aria-hidden="true" /> {t('common.import')}
                    </button>
                    <button
                        onClick={() =>
                            eventBus.emit(EVENTS.NOTIFICATION, {
                                message: 'Capability Registry Wizard opening...',
                                type: 'info',
                            })
                        }
                        style={{
                            padding: '0.75rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            borderRadius: 12,
                            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                            border: 'none',
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                        }}
                        aria-label={t('tools.register')}
                    >
                        <Plus size={18} aria-hidden="true" /> {t('tools.register')}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={errorBannerLg}
                        role="alert"
                        aria-live="polite"
                    >
                        <AlertTriangle size={18} aria-hidden="true" /> {error}
                        <button
                            onClick={() => setError(null)}
                            style={dismissBtnRed}
                            aria-label={t('common.dismiss_error')}
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 500px',
                    gap: '1.5rem',
                    minHeight: 0,
                }}
            >
                {/* Tools List */}
                <div style={glassPanelColRounded24}>
                    <div
                        style={{
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'center',
                            padding: '1.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={positionRelativeFlex1}>
                            <Search size={16} style={searchIconAbsolute} aria-hidden="true" />
                            <input
                                type="text"
                                placeholder={t('tools.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={searchInputLarge}
                                onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
                                onBlur={(e) =>
                                    (e.target.style.borderColor = 'rgba(255,255,255,0.05)')
                                }
                                aria-label={t('tools.search_placeholder')}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as ToolTypeFilter)}
                                style={{
                                    padding: '0.85rem 1rem',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 12,
                                    color: 'white',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                                aria-label={t('tools.filter_aria')}
                            >
                                <option value="all">{t('tools.filter.all')}</option>
                                <option value="api">{t('tools.filter.rest')}</option>
                                <option value="script">{t('tools.filter.scripts')}</option>
                                <option value="database">{t('tools.filter.db')}</option>
                            </select>
                        </div>
                    </div>

                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1rem',
                            padding: '1.5rem',
                            alignContent: 'start',
                            background: 'rgba(255,255,255,0.01)',
                        }}
                    >
                        {filteredTools.length === 0 ? (
                            <div
                                style={{
                                    gridColumn: '1 / -1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#64748b',
                                    gap: '1rem',
                                    padding: '4rem 0',
                                }}
                            >
                                <Blocks size={56} opacity={0.2} aria-hidden="true" />
                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                                    {searchQuery || typeFilter !== 'all'
                                        ? t('tools.empty_filter')
                                        : t('tools.empty_none')}
                                </span>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {filteredTools.map((tool) => (
                                    <motion.div
                                        key={tool.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => setSelectedTool(tool)}
                                        whileHover={{
                                            y: -4,
                                            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
                                            borderColor: getToolColor(tool.type),
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Select tool: ${tool.name}`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedTool(tool);
                                            }
                                        }}
                                        style={{
                                            padding: '1.5rem',
                                            borderRadius: 16,
                                            border: '1px solid',
                                            background:
                                                selectedTool?.id === tool.id
                                                    ? `linear-gradient(145deg, ${getToolColor(tool.type)}15 0%, rgba(255,255,255,0.02) 100%)`
                                                    : 'rgba(0,0,0,0.2)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            borderColor:
                                                selectedTool?.id === tool.id
                                                    ? getToolColor(tool.type)
                                                    : 'rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '1.25rem',
                                                alignItems: 'flex-start',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    padding: '0.75rem',
                                                    background: `${getToolColor(tool.type)}15`,
                                                    borderRadius: 12,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `1px solid ${getToolColor(tool.type)}30`,
                                                }}
                                            >
                                                {getToolIcon(tool.type)}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.75rem',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        color: tool.enabled ? '#10b981' : '#64748b',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                    }}
                                                >
                                                    {tool.enabled
                                                        ? t('tools.status.active')
                                                        : t('tools.status.disabled')}
                                                </span>
                                                <button
                                                    role="switch"
                                                    aria-checked={tool.enabled}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            toolService.toggleTool(tool.id);
                                                            if (isMountedRef.current)
                                                                setTools(toolService.getTools());
                                                            if (isMountedRef.current)
                                                                setError(null);
                                                        } catch (err) {
                                                            console.warn(
                                                                '[ToolsPanel] Failed to toggle tool:',
                                                                err,
                                                            );
                                                            if (isMountedRef.current) {
                                                                setError(t('common.unknown_error'));
                                                                clearError();
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        width: 44,
                                                        height: 24,
                                                        background: tool.enabled
                                                            ? '#10b981'
                                                            : 'rgba(255,255,255,0.1)',
                                                        borderRadius: 12,
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        boxShadow: tool.enabled
                                                            ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                                            : 'none',
                                                        transition: 'all 0.3s',
                                                        border: 'none',
                                                    }}
                                                    aria-label={`Toggle ${tool.name} tool`}
                                                >
                                                    <motion.div
                                                        animate={{ x: tool.enabled ? 22 : 2 }}
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            background: 'white',
                                                            borderRadius: '50%',
                                                            position: 'absolute',
                                                            top: 2,
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                                        }}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                fontWeight: 800,
                                                fontSize: '1.15rem',
                                                marginBottom: '0.5rem',
                                                color: '#f8fafc',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {tool.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                color: '#94a3b8',
                                                lineHeight: 1.6,
                                                flex: 1,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {tool.description}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: '1.5rem',
                                                display: 'flex',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap',
                                                paddingTop: '1rem',
                                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.7rem',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    color: getToolColor(tool.type),
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: 8,
                                                    textTransform: 'uppercase',
                                                    fontWeight: 800,
                                                    border: `1px solid ${getToolColor(tool.type)}30`,
                                                    letterSpacing: '0.05em',
                                                }}
                                            >
                                                {tool.type}
                                            </span>
                                            {tool.language && (
                                                <span
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        color: '#cbd5e1',
                                                        padding: '0.3rem 0.6rem',
                                                        borderRadius: 8,
                                                        textTransform: 'uppercase',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.05em',
                                                    }}
                                                >
                                                    {tool.language}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Inspector Panel */}
                <div style={glassPanelColRounded24}>
                    {selectedTool ? (
                        <>
                            {/* Inspector Header */}
                            <div
                                style={{
                                    padding: '2rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: 'rgba(0,0,0,0.3)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.25rem',
                                        marginBottom: '1.5rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: '0.75rem',
                                            background: `${getToolColor(selectedTool.type)}15`,
                                            borderRadius: 14,
                                            border: `1px solid ${getToolColor(selectedTool.type)}40`,
                                        }}
                                    >
                                        {getToolIcon(selectedTool.type)}
                                    </div>
                                    <div>
                                        <h3
                                            style={{
                                                margin: 0,
                                                fontSize: '1.5rem',
                                                fontWeight: 800,
                                                color: '#f8fafc',
                                            }}
                                        >
                                            {selectedTool.name}
                                        </h3>
                                        <div
                                            style={{
                                                fontSize: '0.8rem',
                                                color: '#64748b',
                                                fontFamily: 'monospace',
                                                marginTop: '0.3rem',
                                            }}
                                        >
                                            ID: {selectedTool.id}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '0.5rem',
                                        borderRadius: 12,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                    role="tablist"
                                    aria-label="Tool inspector tabs"
                                >
                                    <button
                                        onClick={() => setActiveTab('sandbox')}
                                        role="tab"
                                        aria-selected={activeTab === 'sandbox'}
                                        aria-controls="tools-sandbox-panel"
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: 10,
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background:
                                                activeTab === 'sandbox'
                                                    ? 'rgba(255,255,255,0.1)'
                                                    : 'transparent',
                                            color: activeTab === 'sandbox' ? 'white' : '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <PlayCircle size={16} aria-hidden="true" />{' '}
                                        {t('tools.tab_sandbox')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('schema')}
                                        role="tab"
                                        aria-selected={activeTab === 'schema'}
                                        aria-controls="tools-schema-panel"
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: 10,
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background:
                                                activeTab === 'schema'
                                                    ? 'rgba(255,255,255,0.1)'
                                                    : 'transparent',
                                            color: activeTab === 'schema' ? 'white' : '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <Braces size={16} aria-hidden="true" />{' '}
                                        {t('tools.tab_schema')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        role="tab"
                                        aria-selected={activeTab === 'security'}
                                        aria-controls="tools-security-panel"
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: 10,
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background:
                                                activeTab === 'security'
                                                    ? 'rgba(255,255,255,0.1)'
                                                    : 'transparent',
                                            color: activeTab === 'security' ? 'white' : '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <Shield size={16} aria-hidden="true" />{' '}
                                        {t('tools.tab_security')}
                                    </button>
                                </div>
                            </div>

                            {/* Inspector Content */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '2rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2rem',
                                        }}
                                        role="tabpanel"
                                        id={`tools-${activeTab}-panel`}
                                        aria-labelledby={`tools-${activeTab}-tab`}
                                    >
                                        {activeTab === 'sandbox' && (
                                            <>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.5rem',
                                                    }}
                                                >
                                                    <label
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 800,
                                                            color: '#64748b',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                        }}
                                                    >
                                                        <span>{t('tools.exec_params_label')}</span>
                                                        <span
                                                            style={{
                                                                cursor: 'pointer',
                                                                color: '#3b82f6',
                                                                textTransform: 'none',
                                                            }}
                                                            onClick={() =>
                                                                setTestParams('{\n  \n}')
                                                            }
                                                        >
                                                            {t('tools.exec_reset')}
                                                        </span>
                                                    </label>
                                                    <textarea
                                                        value={testParams}
                                                        onChange={(e) =>
                                                            setTestParams(e.target.value)
                                                        }
                                                        style={{
                                                            height: 140,
                                                            padding: '1.25rem',
                                                            background: '#020617',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            borderRadius: 12,
                                                            color: '#e2e8f0',
                                                            outline: 'none',
                                                            resize: 'none',
                                                            fontFamily:
                                                                '"JetBrains Mono", monospace',
                                                            fontSize: '0.9rem',
                                                            lineHeight: 1.6,
                                                            boxShadow:
                                                                'inset 0 0 20px rgba(0,0,0,0.5)',
                                                            transition: 'border-color 0.2s',
                                                        }}
                                                        onFocus={(e) =>
                                                            (e.target.style.borderColor = '#3b82f6')
                                                        }
                                                        onBlur={(e) =>
                                                            (e.target.style.borderColor =
                                                                'rgba(255,255,255,0.05)')
                                                        }
                                                        aria-label="JSON parameters for tool execution"
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleRunTest}
                                                    disabled={isExecuting || !selectedTool.enabled}
                                                    style={{
                                                        width: '100%',
                                                        padding: '1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 10,
                                                        borderRadius: 12,
                                                        fontWeight: 800,
                                                        background: selectedTool.enabled
                                                            ? 'linear-gradient(90deg, #10b981, #059669)'
                                                            : 'rgba(255,255,255,0.05)',
                                                        opacity: selectedTool.enabled ? 1 : 0.5,
                                                        boxShadow: selectedTool.enabled
                                                            ? '0 4px 15px rgba(16,185,129,0.3)'
                                                            : 'none',
                                                        cursor: selectedTool.enabled
                                                            ? 'pointer'
                                                            : 'not-allowed',
                                                        border: 'none',
                                                        color: 'white',
                                                    }}
                                                    aria-label={t('tools.exec_aria')}
                                                >
                                                    {isExecuting ? (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{
                                                                repeat: Infinity,
                                                                duration: 1,
                                                                ease: 'linear',
                                                            }}
                                                        >
                                                            <Cpu size={20} aria-hidden="true" />
                                                        </motion.div>
                                                    ) : (
                                                        <Play
                                                            size={20}
                                                            fill="currentColor"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    {isExecuting
                                                        ? t('tools.exec_running')
                                                        : t('tools.exec_button')}
                                                </button>

                                                <div
                                                    style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.5rem',
                                                    }}
                                                >
                                                    <label style={labelUppercaseBold}>
                                                        {t('tools.exec_output_label')}
                                                    </label>
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            background: '#020617',
                                                            borderRadius: 12,
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            padding: '1.25rem',
                                                            overflowY: 'auto',
                                                            minHeight: 180,
                                                            boxShadow:
                                                                'inset 0 0 20px rgba(0,0,0,0.5)',
                                                        }}
                                                    >
                                                        {testOutput ? (
                                                            <pre
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize: '0.85rem',
                                                                    color: testOutput.includes(
                                                                        'Error',
                                                                    )
                                                                        ? '#ef4444'
                                                                        : '#10b981',
                                                                    fontFamily:
                                                                        '"JetBrains Mono", monospace',
                                                                    whiteSpace: 'pre-wrap',
                                                                    wordBreak: 'break-word',
                                                                    lineHeight: 1.5,
                                                                }}
                                                            >
                                                                {testOutput}
                                                            </pre>
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    height: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#475569',
                                                                    fontSize: '0.9rem',
                                                                    textAlign: 'center',
                                                                    lineHeight: 1.6,
                                                                }}
                                                            >
                                                                {t('tools.exec_no_output')}
                                                                <br />
                                                                {t('tools.exec_no_output_hint')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {activeTab === 'schema' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '1rem',
                                                }}
                                            >
                                                <div>
                                                    <label
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 800,
                                                            color: '#64748b',
                                                            textTransform: 'uppercase',
                                                            marginBottom: '0.75rem',
                                                            display: 'block',
                                                            letterSpacing: '0.05em',
                                                        }}
                                                    >
                                                        {t('tools.schema_desc')}
                                                    </label>
                                                    <div
                                                        style={{
                                                            background: '#020617',
                                                            borderRadius: 12,
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            padding: '1.5rem',
                                                            overflowY: 'auto',
                                                            flex: 1,
                                                            maxHeight: '450px',
                                                            boxShadow:
                                                                'inset 0 0 20px rgba(0,0,0,0.5)',
                                                        }}
                                                    >
                                                        <pre
                                                            style={{
                                                                margin: 0,
                                                                fontSize: '0.85rem',
                                                                color: '#cbd5e1',
                                                                fontFamily:
                                                                    '"JetBrains Mono", monospace',
                                                                lineHeight: 1.6,
                                                            }}
                                                        >
                                                            {JSON.stringify(
                                                                {
                                                                    name: selectedTool.name,
                                                                    description:
                                                                        selectedTool.description,
                                                                    parameters:
                                                                        selectedTool.parameters || {
                                                                            type: 'object',
                                                                            properties: {
                                                                                query: {
                                                                                    type: 'string',
                                                                                    description:
                                                                                        'The primary input parameter for the tool',
                                                                                },
                                                                            },
                                                                            required: ['query'],
                                                                        },
                                                                },
                                                                null,
                                                                2,
                                                            )}
                                                        </pre>
                                                    </div>
                                                    <p
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: '#94a3b8',
                                                            marginTop: '1rem',
                                                            lineHeight: 1.6,
                                                            padding: '1rem',
                                                            background: 'rgba(59,130,246,0.05)',
                                                            borderRadius: 10,
                                                            border: '1px solid rgba(59,130,246,0.2)',
                                                        }}
                                                    >
                                                        This exact JSON schema is automatically
                                                        injected into the LLM context via the
                                                        `tools` array when the tool is equipped by
                                                        an Agent, enabling precise, autonomous
                                                        function calling.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'security' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '1.5rem',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '1.25rem',
                                                        background: 'rgba(239,68,68,0.05)',
                                                        border: '1px solid rgba(239,68,68,0.2)',
                                                        padding: '1.5rem',
                                                        borderRadius: 16,
                                                    }}
                                                >
                                                    <Shield
                                                        size={28}
                                                        color="#ef4444"
                                                        style={{ flexShrink: 0 }}
                                                        aria-hidden="true"
                                                    />
                                                    <div>
                                                        <h4
                                                            style={{
                                                                margin: '0 0 0.4rem 0',
                                                                fontSize: '1rem',
                                                                color: '#ef4444',
                                                                fontWeight: 800,
                                                            }}
                                                        >
                                                            {t('tools.security_heading')}
                                                        </h4>
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize: '0.85rem',
                                                                color: '#cbd5e1',
                                                                lineHeight: 1.6,
                                                            }}
                                                        >
                                                            This tool runs in a strict sandboxed OS
                                                            environment. File system access and
                                                            unapproved network calls are
                                                            automatically intercepted and blocked by
                                                            the event bus kernel.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 800,
                                                            color: '#64748b',
                                                            textTransform: 'uppercase',
                                                            marginBottom: '1rem',
                                                            display: 'block',
                                                            letterSpacing: '0.05em',
                                                        }}
                                                    >
                                                        {t('tools.secrets_label')}
                                                    </label>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '0.75rem',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                padding: '1rem 1.25rem',
                                                                borderRadius: 12,
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 12,
                                                                }}
                                                            >
                                                                <Key
                                                                    size={16}
                                                                    color="#f59e0b"
                                                                    aria-hidden="true"
                                                                />
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.9rem',
                                                                        fontWeight: 700,
                                                                        color: '#f8fafc',
                                                                    }}
                                                                >
                                                                    API_KEY_VAULT
                                                                </span>
                                                            </div>
                                                            <span
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    color: '#10b981',
                                                                    background:
                                                                        'rgba(16,185,129,0.15)',
                                                                    padding: '4px 8px',
                                                                    borderRadius: 6,
                                                                    fontWeight: 800,
                                                                    letterSpacing: '0.05em',
                                                                }}
                                                            >
                                                                {t('common.active')}
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                padding: '1rem 1.25rem',
                                                                borderRadius: 12,
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 12,
                                                                }}
                                                            >
                                                                <Globe
                                                                    size={16}
                                                                    color="#3b82f6"
                                                                    aria-hidden="true"
                                                                />
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.9rem',
                                                                        fontWeight: 700,
                                                                        color: '#f8fafc',
                                                                    }}
                                                                >
                                                                    {t('tools.network_label')}
                                                                </span>
                                                            </div>
                                                            <span
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    color: '#ef4444',
                                                                    background:
                                                                        'rgba(239,68,68,0.15)',
                                                                    padding: '4px 8px',
                                                                    borderRadius: 6,
                                                                    fontWeight: 800,
                                                                    letterSpacing: '0.05em',
                                                                }}
                                                            >
                                                                {t('common.not_available')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                gap: '1.5rem',
                                padding: '2rem',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    padding: '1.5rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <Wrench size={40} color="#64748b" aria-hidden="true" />
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: '#f8fafc',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    {t('tools.no_selection')}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.9rem',
                                        maxWidth: '300px',
                                        margin: '0 auto',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    Select a tool from the registry to inspect its LLM schema,
                                    security scopes, and test sandbox execution.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportTools}
                aria-hidden="true"
            />
            <ModuleInfo moduleKey="tools" />
        </div>
    );
};

export default ToolsPanel;
