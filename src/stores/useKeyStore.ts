import { create } from 'zustand';
import { useMemo } from 'react';
import { liveQuery } from 'dexie';
import { eventBus, EVENTS, keyService, groupManager, keyStateStore } from '../kernel/instances';
import { getDexieDb } from '../kernel/services/database-service';
import { tryGetServiceProp } from '../kernel/service-helper';
import type { ApiKey, KeyNote, ProviderAlert } from '../types/metrics';

export interface KeyMeta {
    backoff: boolean;
    backoffRemainingMs: number;
    lastRateLimitAt?: number;
    consecutiveErrors: number;
}

export interface KeyStoreState {
    keys: ApiKey[];
    activeKeys: ApiKey[];
    alerts: ProviderAlert[];
    checkingIds: Set<string>;
    totalKeys: number;
    activeCount: number;
    errorCount: number;
    keyMeta: Map<string, KeyMeta>;
    isLoaded: boolean;
}

export interface KeyStoreActions {
    addKey: (data: Omit<ApiKey, 'id' | 'stats'>) => Promise<void>;
    removeKey: (id: string) => Promise<void>;
    updateKey: (id: string, data: Partial<ApiKey>) => Promise<void>;
    checkHealth: (id: string) => void;
    checkAllHealth: () => void;
    toggleKeyStatus: (id: string) => Promise<void>;
    enableAllKeys: () => Promise<void>;
    disableAllKeys: () => Promise<void>;
    exportKeys: () => Promise<string>;
    importKeys: (jsonData: string) => Promise<number>;
    getKeyById: (id: string) => ApiKey | undefined;
    getKeysByProvider: (provider: string) => ApiKey[];
    getAlerts: () => ProviderAlert[];
    resolveAlert: (alertId: string) => void;
    refresh: () => void;
}

type Store = KeyStoreState & KeyStoreActions;

const VALID_KEY_STATUSES = new Set<ApiKey['status']>([
    'active',
    'inactive',
    'error',
    'checking',
    'pending',
    'quota_exhausted',
    'invalid',
    'duplicate',
    'quarantined',
    'probation',
    'compromised',
]);

type ImportedKeyInput = Omit<ApiKey, 'id' | 'stats'>;

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseNotes(value: unknown): KeyNote[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) {
        const valid: KeyNote[] = [];
        for (const item of value) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                const note = item as Record<string, unknown>;
                if (
                    typeof note.id === 'string' &&
                    typeof note.keyId === 'string' &&
                    typeof note.text === 'string' &&
                    typeof note.timestamp === 'number' &&
                    typeof note.type === 'string'
                ) {
                    valid.push(note as unknown as KeyNote);
                }
            }
        }
        return valid.length > 0 ? valid : undefined;
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parseNotes(parsed);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function parseImportedKey(item: unknown): ImportedKeyInput | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const source = item as Record<string, unknown>;
    if (
        typeof source.provider !== 'string' ||
        typeof source.label !== 'string' ||
        typeof source.key !== 'string'
    ) {
        return null;
    }

    const status =
        typeof source.status === 'string' &&
        VALID_KEY_STATUSES.has(source.status as ApiKey['status'])
            ? (source.status as ApiKey['status'])
            : 'active';

    const imported: ImportedKeyInput = {
        provider: source.provider,
        label: source.label,
        key: source.key,
        status,
    };

    if (typeof source.group === 'string') imported.group = source.group;
    if (typeof source.account === 'string') imported.account = source.account;
    if (typeof source.accountId === 'string') imported.accountId = source.accountId;
    if (typeof source.model === 'string') imported.model = source.model;
    const parsedNotes = parseNotes(source.notes);
    if (parsedNotes) imported.notes = parsedNotes;
    if (typeof source.isEncrypted === 'boolean') imported.isEncrypted = source.isEncrypted;
    if (typeof source.fingerprint === 'string') imported.fingerprint = source.fingerprint;
    if (typeof source.secretRef === 'string') imported.secretRef = source.secretRef;
    if (typeof source.priority === 'number' && Number.isFinite(source.priority))
        imported.priority = source.priority;
    if (typeof source.expiresAt === 'number' && Number.isFinite(source.expiresAt))
        imported.expiresAt = source.expiresAt;
    if (typeof source.createdAt === 'number' && Number.isFinite(source.createdAt))
        imported.createdAt = source.createdAt;
    if (
        (typeof source.lastUsed === 'number' && Number.isFinite(source.lastUsed)) ||
        source.lastUsed === null
    )
        imported.lastUsed = source.lastUsed as number | null;
    if (
        (typeof source.maxBudget === 'number' && Number.isFinite(source.maxBudget)) ||
        source.maxBudget === null
    )
        imported.maxBudget = source.maxBudget as number | null;
    if (typeof source.monthlySpend === 'number' && Number.isFinite(source.monthlySpend))
        imported.monthlySpend = source.monthlySpend;
    if (isStringArray(source.tags)) imported.tags = source.tags;
    if (isStringArray(source.availableModels)) imported.availableModels = source.availableModels;

    return imported;
}

function computeActiveKeys(keys: ApiKey[]): ApiKey[] {
    return keys.filter((k) => k.status === 'active');
}
function computeActiveCount(keys: ApiKey[]): number {
    return keys.reduce((acc, k) => acc + (k.status === 'active' ? 1 : 0), 0);
}
function computeErrorCount(keys: ApiKey[]): number {
    return keys.reduce((acc, k) => acc + (k.status === 'error' ? 1 : 0), 0);
}

let liveSub: { unsubscribe: () => void } | null = null;
let initialized = false;
const unsubs: (() => void)[] = [];

function ensureInitialized(
    set: (partial: Partial<Store> | ((prev: Store) => Partial<Store>)) => void,
) {
    if (initialized) return;
    initialized = true;

    const db = getDexieDb();
    const observable = liveQuery(() => db.apiKeys.toArray());
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    liveSub = observable.subscribe({
        next: (keys: ApiKey[]) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const activeCount = computeActiveCount(keys);
                const errorCount = computeErrorCount(keys);
                set(() => ({
                    keys,
                    activeKeys: computeActiveKeys(keys),
                    isLoaded: true,
                    totalKeys: keys.length,
                    activeCount,
                    errorCount,
                }));
                try {
                    eventBus.emit(EVENTS.KEY_STORE_GAUGES, {
                        activeCount,
                        errorCount,
                        alertCount: 0,
                        totalCount: keys.length,
                    });
                } catch {
                    /* best-effort */
                }
            }, 200);
        },
        error: (err: unknown) => {
            console.warn('[KeyStore] liveQuery error:', err);
            const fallback = groupManager?.getAllKeys?.() || [];
            if (fallback.length > 0) {
                set(() => ({
                    keys: fallback,
                    activeKeys: computeActiveKeys(fallback),
                    isLoaded: true,
                }));
            }
        },
    });

    const refreshAlerts = () => {
        if (keyService.getAlerts) {
            set(() => ({ alerts: keyService.getAlerts() }));
        }
    };
    unsubs.push(eventBus.on(EVENTS.KEY_LATENCY_BURST, refreshAlerts));
    unsubs.push(eventBus.on(EVENTS.KEY_HEALTH_CHECK_FAILED, refreshAlerts));
    unsubs.push(eventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, refreshAlerts));
    unsubs.push(eventBus.on(EVENTS.NOTIFICATION, refreshAlerts));

    unsubs.push(
        eventBus.onSafe<{ id: string }>(EVENTS.KEY_STATE_CHANGED, (data) => {
            if (!data?.id) return;
            const meta = keyService.isKeyInBackoff(data.id);
            const key = keyService.getKey(data.id);
            const errorCount = key?.stats?.errorCount ?? 0;
            set((state) => {
                const nextMeta = new Map(state.keyMeta);
                if (!meta.backoff || meta.remainingMs <= 0) {
                    nextMeta.delete(data.id);
                } else {
                    nextMeta.set(data.id, {
                        backoff: meta.backoff,
                        backoffRemainingMs: meta.remainingMs,
                        consecutiveErrors: errorCount,
                    });
                }
                return { keyMeta: nextMeta };
            });
        }),
    );

    const checkingTimers = new Map<string, ReturnType<typeof setTimeout>>();
    unsubs.push(
        eventBus.on(EVENTS.KEY_HEALTH_CHECK_STARTED, (data) => {
            if (typeof data === 'string') {
                set((state) => {
                    const next = new Set(state.checkingIds);
                    next.add(data);
                    return { checkingIds: next };
                });
                const existing = checkingTimers.get(data);
                if (existing) clearTimeout(existing);
                checkingTimers.set(
                    data,
                    setTimeout(() => {
                        checkingTimers.delete(data);
                        set((state) => {
                            const next = new Set(state.checkingIds);
                            next.delete(data);
                            return { checkingIds: next };
                        });
                    }, 30000),
                );
            }
        }),
    );

    unsubs.push(
        eventBus.onSafe<{ id: string }>(EVENTS.KEY_HEALTH_CHECK_COMPLETED, (data) => {
            if (data?.id) {
                const timer = checkingTimers.get(data.id);
                if (timer) {
                    clearTimeout(timer);
                    checkingTimers.delete(data.id);
                }
                set((state) => {
                    const next = new Set(state.checkingIds);
                    next.delete(data.id);
                    return { checkingIds: next };
                });
            }
        }),
    );

    if (typeof window !== 'undefined') {
        (window as unknown as { __cleanupKeyStore?: () => void }).__cleanupKeyStore = () => {
            liveSub?.unsubscribe();
            liveSub = null;
            for (const unSub of unsubs) unSub();
            unsubs.length = 0;
            initialized = false;
        };
    }

    if (import.meta.hot) {
        import.meta.hot.dispose(() => {
            liveSub?.unsubscribe();
            liveSub = null;
            for (const u of unsubs) u();
            unsubs.length = 0;
            initialized = false;
        });
    }

    const latestKeys = groupManager?.getAllKeys?.() || [];
    if (latestKeys.length > 0) {
        set(() => ({
            keys: latestKeys,
            activeKeys: computeActiveKeys(latestKeys),
        }));
    }
}

export const useKeyStore = create<Store>((set, get) => {
    ensureInitialized(set);

    return {
        keys: [],
        activeKeys: [],
        alerts: (() => {
            try {
                const gmReady = tryGetServiceProp(groupManager, 'ready');
                const getAlertsFn = tryGetServiceProp(keyService, 'getAlerts');
                return gmReady && typeof getAlertsFn === 'function'
                    ? (getAlertsFn as () => ProviderAlert[])()
                    : [];
            } catch {
                return [];
            }
        })(),
        checkingIds: new Set(),
        keyMeta: new Map(),
        isLoaded: false,
        totalKeys: 0,
        activeCount: 0,
        errorCount: 0,

        addKey: async (data) => {
            await groupManager.createKey(data, { source: 'ui' });
        },

        removeKey: async (id) => {
            await groupManager.deleteKey(id);
        },

        updateKey: async (id, data) => {
            await groupManager.updateKey(id, data);
        },

        checkHealth: (id) => {
            eventBus.emit(EVENTS.CHECK_HEALTH, id);
        },

        checkAllHealth: () => {
            eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
        },

        toggleKeyStatus: async (id) => {
            const key = get().keys.find((k) => k.id === id);
            if (!key) return;
            await groupManager.syncKeyStatus(id, key.status === 'active' ? 'inactive' : 'active');
        },

        enableAllKeys: async () => {
            const errors: string[] = [];
            for (const k of get().keys) {
                try {
                    // Reset key status to active
                    await groupManager.syncKeyStatus(k.id, 'active');

                    // Clear flags in keyStateStore
                    const currentState = keyStateStore.get(k.id);
                    if (currentState) {
                        keyStateStore.update(k.id, {
                            flags: {
                                circuitOpen: false,
                                rateLimited: false,
                                authFailed: false,
                            },
                            status: 'ready',
                            healthScore: 100,
                            health: {
                                ...currentState.health,
                                errorRate: 0,
                                consecutiveErrors: 0,
                                successRate: 1,
                            },
                        });
                    }

                    // Clear error stats in keyService
                    await keyService.updateKey(k.id, {
                        status: 'active',
                        stats: {
                            ...k.stats,
                            errorCount: 0,
                            lastError: undefined,
                        },
                    });
                } catch {
                    errors.push(k.id);
                }
            }
            if (errors.length > 0) {
                console.warn('[KeyStore] enableAllKeys: errors on', errors.length, 'keys');
                eventBus.emit(EVENTS.METRICS_ALERT, {
                    id: 'enable-all-keys',
                    metric: 'partial_failure',
                    value: errors.length,
                    severity: 'warning',
                    timestamp: Date.now(),
                });
            }
        },

        disableAllKeys: async () => {
            const errors: string[] = [];
            for (const k of get().keys) {
                try {
                    await groupManager.syncKeyStatus(k.id, 'inactive');
                } catch {
                    errors.push(k.id);
                }
            }
            if (errors.length > 0) {
                console.warn('[KeyStore] disableAllKeys: errors on', errors.length, 'keys');
                eventBus.emit(EVENTS.METRICS_ALERT, {
                    id: 'disable-all-keys',
                    metric: 'partial_failure',
                    value: errors.length,
                    severity: 'warning',
                    timestamp: Date.now(),
                });
            }
        },

        exportKeys: () => keyService.exportKeys(),

        importKeys: async (jsonData) => {
            const imported = JSON.parse(jsonData);
            if (!Array.isArray(imported)) throw new Error('Invalid data format');
            let count = 0;
            const makeFingerprint = (provider: string, label: string, key: string) => {
                let h = 0x811c9dc5;
                for (let i = 0; i < key.length; i++) {
                    h ^= key.charCodeAt(i);
                    h = (h * 0x01000193) >>> 0;
                }
                return `${provider.toLowerCase()}::${label.toLowerCase()}::${h.toString(36)}`;
            };
            const existingFingerprints = new Set(
                get().keys.map((k) => makeFingerprint(k.provider, k.label, k.key)),
            );
            for (const item of imported) {
                const parsed = parseImportedKey(item);
                if (!parsed) continue;
                const fingerprint = makeFingerprint(parsed.provider, parsed.label, parsed.key);
                if (existingFingerprints.has(fingerprint)) continue;
                const result = await groupManager.createKey(parsed, { source: 'import' });
                if (result.ok) {
                    count++;
                    existingFingerprints.add(fingerprint);
                }
            }
            return count;
        },

        getKeyById: (id) => get().keys.find((k) => k.id === id),

        getKeysByProvider: (provider) =>
            get().keys.filter((k) => k.provider.toLowerCase() === provider.toLowerCase()),

        getAlerts: () => (keyService.getAlerts ? keyService.getAlerts() : []),

        resolveAlert: (alertId) => {
            keyService.resolveAlert?.(alertId);
            if (keyService.getAlerts) set(() => ({ alerts: keyService.getAlerts() }));
        },

        refresh: () => {
            const db = getDexieDb();
            db.apiKeys.toArray().then((keys) => {
                const activeCount = computeActiveCount(keys);
                const errorCount = computeErrorCount(keys);
                set(() => ({
                    keys,
                    activeKeys: computeActiveKeys(keys),
                    isLoaded: true,
                    totalKeys: keys.length,
                    activeCount,
                    errorCount,
                }));
            });
        },
    };
});

export function useKeyList(): { keys: ApiKey[]; activeKeys: ApiKey[] } {
    const keys = useKeyStore((s) => s.keys);
    const activeKeys = useMemo(() => keys.filter((k) => k.status === 'active'), [keys]);
    return useMemo(() => ({ keys, activeKeys }), [keys, activeKeys]);
}

export function useCheckingIds(): Set<string> {
    return useKeyStore((s) => s.checkingIds);
}

export function useKeySelector<T>(selector: (s: Store) => T): T {
    return useKeyStore(selector);
}

export function refreshKeyStore() {
    const db = getDexieDb();
    db.apiKeys.toArray().then((keys) => {
        useKeyStore.setState({
            keys,
            activeKeys: computeActiveKeys(keys),
            isLoaded: true,
        });
    });
}
