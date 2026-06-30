import { genId } from '../../utils/gen-id';
import { storageAdapter } from '../../kernel/instances';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Plus, Globe } from 'lucide-react';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { db as databaseService } from '../../kernel/services/database-service';
import { useTranslation } from '../../i18n/useTranslation';
import { safeJsonParse } from '../../kernel/utils/safe-json';
import { DEFAULT_CONNECTORS, STORAGE_KEY } from './connector-constants';
import ConnectorHeader from './ConnectorHeader';
import ConnectorControls from './ConnectorControls';
import ConnectorCard from './ConnectorCard';
import ConnectorAddForm from './ConnectorAddForm';
import ConnectorWebhooksView from './ConnectorWebhooksView';
import DisconnectModal from './DisconnectModal';
import type { Connector } from '../../types/domain';

const ConnectorsPanel: React.FC = () => {
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [activeView, setActiveView] = useState<'grid' | 'webhooks'>('grid');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
    const { t } = useTranslation();
    const isMountedRef = useRef(true);
    const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearErrorAfterDelay = useCallback(() => {
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) setErrorMsg(null);
        }, 5000);
    }, []);

    useEffect(() => {
        const id = genId().slice(0, 6);
        isMountedRef.current = true;
        const load = async () => {
            try {
                const count = await databaseService.connectors.count();
                if (count > 0) {
                    const saved = await databaseService.connectors.toArray();
                    if (isMountedRef.current) setConnectors(saved);
                } else {
                    const stored = storageAdapter.getItem(STORAGE_KEY);
                    if (stored) {
                        try {
                            const parsed = safeJsonParse(stored);
                            if (Array.isArray(parsed)) {
                                await databaseService.connectors.bulkPut(parsed);
                                if (isMountedRef.current) setConnectors(parsed);
                                storageAdapter.removeItem(STORAGE_KEY);
                            } else throw new Error('Invalid connector data');
                        } catch (e) {
                            console.warn(`[${id}] Failed to migrate connectors:`, e);
                            await databaseService.connectors.bulkPut(DEFAULT_CONNECTORS);
                            if (isMountedRef.current) setConnectors(DEFAULT_CONNECTORS);
                            if (isMountedRef.current) {
                                setErrorMsg('Corrupted storage – using defaults');
                                clearErrorAfterDelay();
                            }
                        }
                    } else {
                        await databaseService.connectors.bulkPut(DEFAULT_CONNECTORS);
                        if (isMountedRef.current) setConnectors(DEFAULT_CONNECTORS);
                    }
                }
            } catch (e) {
                console.warn(`[${id}] Failed to load connectors:`, e);
                if (isMountedRef.current) {
                    setErrorMsg('Could not load connectors. Using default configuration.');
                    clearErrorAfterDelay();
                    setConnectors(DEFAULT_CONNECTORS);
                }
            } finally {
                if (isMountedRef.current) setLoaded(true);
            }
        };
        load();
        return () => {
            isMountedRef.current = false;
            if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        };
    }, [clearErrorAfterDelay]);

    const persist = useCallback(
        async (updated: Connector[]) => {
            if (!isMountedRef.current) return;
            try {
                await databaseService.connectors.bulkPut(updated);
            } catch (e) {
                console.warn('[ConnectorsPanel] Failed to save:', e);
                if (isMountedRef.current) {
                    setErrorMsg('Could not save connector changes.');
                    clearErrorAfterDelay();
                }
            }
        },
        [clearErrorAfterDelay],
    );

    const filteredConnectors = useMemo(
        () =>
            connectors.filter((c) => {
                if (
                    searchQuery &&
                    !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    !c.type.toLowerCase().includes(searchQuery.toLowerCase())
                )
                    return false;
                if (statusFilter !== 'all' && c.status !== statusFilter) return false;
                return true;
            }),
        [connectors, searchQuery, statusFilter],
    );

    const connectedCount = connectors.filter((c) => c.status === 'connected').length;

    const handleConnect = useCallback(
        (id: string) => {
            if (!isMountedRef.current) return;
            setConnectors((prev) => {
                const u = prev.map((c) =>
                    c.id === id ? { ...c, status: 'connected' as const, lastSync: 'Just now' } : c,
                );
                persist(u);
                return u;
            });
        },
        [persist],
    );

    const handleDisconnect = useCallback(
        (id: string) => {
            if (!isMountedRef.current) return;
            setConnectors((prev) => {
                const u = prev.map((c) =>
                    c.id === id
                        ? { ...c, status: 'disconnected' as const, lastSync: undefined }
                        : c,
                );
                persist(u);
                return u;
            });
            setConfirmDisconnect(null);
            eventBus.emit(EVENTS.NOTIFICATION, {
                message: `OAuth token for ${id} revoked.`,
                type: 'info',
            });
        },
        [persist],
    );

    const handleAddCustom = useCallback(() => {
        if (!isMountedRef.current) return;
        if (!newName.trim()) {
            setErrorMsg(t('connectors.error_name'));
            clearErrorAfterDelay();
            return;
        }
        const id = `custom-${genId().slice(0, 8)}`;
        const nc: Connector = {
            id,
            name: newName.trim(),
            type: newType.trim() || 'Custom REST',
            description: `Custom integrated API endpoint for ${newName.trim()}.`,
            color: '#3b82f6',
            status: 'disconnected',
        };
        setConnectors((prev) => {
            const u = [...prev, nc];
            persist(u);
            return u;
        });
        setNewName('');
        setNewType('');
        setShowAddForm(false);
        eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Connector ${nc.name} added.`,
            type: 'success',
        });
    }, [newName, newType, persist, clearErrorAfterDelay, t]);

    if (!loaded) {
        return (
            <div className="connector-loader">
                <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {t('connectors.loading')}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="connector-wrapper">
            <ConnectorHeader
                activeView={activeView}
                totalCount={connectors.length}
                connectedCount={connectedCount}
                onViewChange={setActiveView}
            />

            {errorMsg && (
                <div className="connector-error" role="alert">
                    <AlertTriangle size={14} aria-hidden="true" /> {errorMsg}
                    <X
                        size={14}
                        onClick={() => setErrorMsg(null)}
                        className="connector-error-close"
                        aria-label={t('common.dismiss_error')}
                    />
                </div>
            )}

            <ConnectorControls
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                totalCount={connectors.length}
                connectedCount={connectedCount}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
            />

            <div className="connector-scroll">
                <AnimatePresence mode="wait">
                    {activeView === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="connector-grid"
                            id="connector-grid-panel"
                            role="tabpanel"
                        >
                            {filteredConnectors.length === 0 ? (
                                <div className="connector-empty-state" role="status">
                                    <Globe size={40} opacity={0.3} aria-hidden="true" />
                                    <p>
                                        {searchQuery || statusFilter !== 'all'
                                            ? t('connectors.empty_filter')
                                            : t('connectors.empty_none')}
                                    </p>
                                </div>
                            ) : (
                                filteredConnectors.map((c) => (
                                    <ConnectorCard
                                        key={c.id}
                                        connector={c}
                                        onConnect={handleConnect}
                                        onDisconnectRequest={setConfirmDisconnect}
                                    />
                                ))
                            )}
                            {showAddForm ? (
                                <ConnectorAddForm
                                    newName={newName}
                                    newType={newType}
                                    onNameChange={setNewName}
                                    onTypeChange={setNewType}
                                    onAdd={handleAddCustom}
                                    onClose={() => setShowAddForm(false)}
                                />
                            ) : (
                                <div
                                    onClick={() => setShowAddForm(true)}
                                    className="connector-add-card"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t('connectors.register_aria')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setShowAddForm(true);
                                        }
                                    }}
                                >
                                    <div className="connector-add-icon-box">
                                        <Plus size={28} color="#94a3b8" aria-hidden="true" />
                                    </div>
                                    <span className="connector-add-label">
                                        {t('connectors.register_button')}
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="webhooks"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <ConnectorWebhooksView
                                onGenerateUrl={() =>
                                    eventBus.emit(EVENTS.NOTIFICATION, {
                                        message: 'Webhook URL generation coming soon',
                                        type: 'info',
                                    })
                                }
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <DisconnectModal
                connectorName={confirmDisconnect}
                onConfirm={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
                onClose={() => setConfirmDisconnect(null)}
            />
        </div>
    );
};

export default ConnectorsPanel;
