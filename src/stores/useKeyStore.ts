import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { keyService, groupManager } from '../kernel/instances';
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
}

export interface KeyStoreActions {
    addKey: (data: Omit<ApiKey, 'id' | 'stats'>) => void;
    removeKey: (id: string) => Promise<void>;
    updateKey: (id: string, data: Partial<ApiKey>) => void;
    checkHealth: (id: string) => void;
    checkAllHealth: () => void;
    toggleKeyStatus: (id: string) => void;
    enableAllKeys: () => void;
    disableAllKeys: () => void;
    exportKeys: () => Promise<string>;
    importKeys: (jsonData: string) => Promise<number>;
    getKeyById: (id: string) => ApiKey | undefined;
    getKeysByProvider: (provider: string) => ApiKey[];
    getAlerts: () => ProviderAlert[];
    resolveAlert: (alertId: string) => void;
}

type Store = {
    keys: ApiKey[];
    alerts: ProviderAlert[];
    checkingIds: Set<string>;
    keyMeta: Map<string, KeyMeta>;
};

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
        // Validate each item has required KeyNote fields
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

function getInitialKeys(): ApiKey[] {
    // Guard: service proxy returns safe stub until runtime.start() completes.
    // groupManager.ready is false at module-load time; keys populate via refreshKeyStore() after bootstrap.
    try {
        if (!groupManager?.ready) {
            return [];
        }
        const fromService = groupManager?.getAllKeys?.();
        if (fromService && fromService.length > 0) return fromService;
    } catch {
        /* runtime not ready yet — return empty, populate later */
    }
    return [];
}

// Module-level store for selector-based subscriptions
let store: Readonly<Store> = {
    keys: getInitialKeys(),
    alerts: keyService.getAlerts ? keyService.getAlerts() : [],
    checkingIds: new Set(),
    keyMeta: new Map(),
};
const storeListeners = new Set<() => void>();

function setStore(partial: Partial<Store>) {
    store = { ...store, ...partial };
    storeListeners.forEach((l) => l());
    // OBS-75: emit gauge metrics on store change
    try {
        let activeCount = 0;
        let errorCount = 0;
        for (const k of store.keys) {
            if (k.status === 'active') activeCount++;
            else if (k.status === 'error') errorCount++;
        }
        eventBus.emit(EVENTS.KEY_STORE_GAUGES, {
            activeCount,
            errorCount,
            alertCount: store.alerts.length,
            totalCount: store.keys.length,
        });
    } catch {
        /* best-effort */
    }
}

// Exported for external sync (e.g., #reset in main.tsx)
export function refreshKeyStore() {
    try {
        if (groupManager?.ready) {
            setStore({ keys: [...(groupManager?.getAllKeys?.() || [])] });
        }
    } catch {
        /* not ready yet */
    }
}

function subscribeToStore(cb: () => void) {
    storeListeners.add(cb);
    return () => {
        storeListeners.delete(cb);
    };
}

// Selector hook — subscribers only re-render when their selector output changes
export function useKeySelector<T>(selector: (s: Store) => T): T {
    return useSyncExternalStore(subscribeToStore, () => selector(store));
}

// Convenience: hook for just keys + activeKeys (most common use case)
export function useKeyList(): { keys: ApiKey[]; activeKeys: ApiKey[] } {
    const keys = useKeySelector((s) => s.keys);
    const activeKeys = useMemo(() => keys.filter((k) => k.status === 'active'), [keys]);
    return useMemo(() => ({ keys, activeKeys }), [keys, activeKeys]);
}

// Convenience: hook for just checkingIds
export function useCheckingIds(): Set<string> {
    return useKeySelector((s) => s.checkingIds);
}

// Initialize event subscriptions (called once)
let initialized = false;
const unsubs: (() => void)[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
function cleanupKeyStore() {
    for (const unsub of unsubs) unsub();
    unsubs.length = 0;
    if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', cleanupKeyStore);
    }
    initialized = false;
}

// Wire cleanup to lifecycle events so subscriptions and the polling
// timer don't leak across HMR reloads, page navigations, or test
// teardowns.  Without this, `unsubs` and `pollTimer` accumulate and
// produce "phantom" UI updates from stale handlers.
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupKeyStore);
    // Expose for Vite HMR dispose hook in main.tsx.
    (window as unknown as { __cleanupKeyStore?: () => void }).__cleanupKeyStore = cleanupKeyStore;
}
function ensureInitialized() {
    if (initialized) return;
    initialized = true;

    unsubs.push(
        eventBus.on(EVENTS.KEYS_LOADED, () => {
            queueMicrotask(() => {
                const next = [...groupManager.getAllKeys()];
                if (
                    next.length !== store.keys.length ||
                    next.some((k, i) => k.id !== store.keys[i]?.id)
                ) {
                    setStore({ keys: next });
                }
            });
        }),
    );

    unsubs.push(
        eventBus.on(EVENTS.KEY_UPDATED, () => {
            queueMicrotask(() => {
                const next = [...groupManager.getAllKeys()];
                if (
                    next.length !== store.keys.length ||
                    next.some((k, i) => k.id !== store.keys[i]?.id)
                ) {
                    setStore({ keys: next });
                }
            });
        }),
    );

    const refreshAlerts = () => {
        if (keyService.getAlerts)
            queueMicrotask(() => setStore({ alerts: keyService.getAlerts() }));
    };
    unsubs.push(eventBus.on(EVENTS.KEY_LATENCY_BURST, refreshAlerts));
    unsubs.push(eventBus.on(EVENTS.KEY_HEALTH_CHECK_FAILED, refreshAlerts));
    unsubs.push(eventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, refreshAlerts));
    unsubs.push(eventBus.on(EVENTS.NOTIFICATION, refreshAlerts));

    unsubs.push(
        eventBus.onSafe<{ id: string }>(EVENTS.KEY_STATE_CHANGED, (data) => {
            queueMicrotask(() => {
                // RC-04: Batch keys + keyMeta into a single setStore to avoid race
                const next = [...groupManager.getAllKeys()];
                const keysChanged =
                    next.length !== store.keys.length ||
                    next.some((k, i) => k.id !== store.keys[i]?.id);
                const patch: Partial<KeyStoreState> = { keys: keysChanged ? next : store.keys };
                if (data?.id) {
                    const meta = keyService.isKeyInBackoff(data.id);
                    const key = keyService.getKey(data.id);
                    const errorCount = key?.stats?.errorCount ?? 0;
                    // STATE-M3: Clear expired backoff entries
                    if (!meta.backoff || meta.remainingMs <= 0) {
                        const nextMeta = new Map(store.keyMeta);
                        nextMeta.delete(data.id);
                        patch.keyMeta = nextMeta;
                    } else {
                        const nextMeta = new Map(store.keyMeta);
                        nextMeta.set(data.id, {
                            backoff: meta.backoff,
                            backoffRemainingMs: meta.remainingMs,
                            consecutiveErrors: errorCount,
                        });
                        patch.keyMeta = nextMeta;
                    }
                }
                setStore(patch as KeyStoreState);
            });
        }),
    );

    unsubs.push(
        eventBus.on(EVENTS.KEY_ADDED, () => {
            queueMicrotask(() => {
                const next = [...groupManager.getAllKeys()];
                if (
                    next.length !== store.keys.length ||
                    next.some((k, i) => k.id !== store.keys[i]?.id)
                ) {
                    setStore({ keys: next });
                }
            });
        }),
    );

    unsubs.push(
        eventBus.on(EVENTS.KEY_REMOVED, () => {
            queueMicrotask(() => {
                const next = [...groupManager.getAllKeys()];
                if (
                    next.length !== store.keys.length ||
                    next.some((k, i) => k.id !== store.keys[i]?.id)
                ) {
                    setStore({ keys: next });
                }
            });
        }),
    );

    // Refresh after passport sync (bootstrap completes)
    unsubs.push(
        eventBus.on(EVENTS.GROUP_SYNC, () => {
            // Defer to avoid setState-during-render in React strict mode
            queueMicrotask(() => setStore({ keys: [...groupManager.getAllKeys()] }));
        }),
    );

    unsubs.push(
        eventBus.on(EVENTS.KEY_HEALTH_CHECK_STARTED, (data) => {
            if (typeof data === 'string') {
                // Defer — may fire during render
                queueMicrotask(() =>
                    setStore({ checkingIds: new Set(store.checkingIds).add(data) }),
                );
            }
        }),
    );

    unsubs.push(
        eventBus.onSafe<{ id: string }>(EVENTS.KEY_HEALTH_CHECK_COMPLETED, (data) => {
            const id = data.id;
            if (id) {
                // Defer — may fire during render
                queueMicrotask(() => {
                    const next = new Set(store.checkingIds);
                    next.delete(id);
                    setStore({ checkingIds: next });
                });
            }
        }),
    );

    // Defer sync setStore to avoid "Cannot update while rendering" warning
    const latestKeys = groupManager?.getAllKeys?.() || [];
    if (latestKeys && latestKeys.length > 0) {
        queueMicrotask(() => setStore({ keys: [...latestKeys] }));
    }

    if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    let pollAttempts = 0;
    pollTimer = setInterval(() => {
        pollAttempts++;
        const nextKeys = groupManager?.getAllKeys?.() || [];
        if ((nextKeys && nextKeys.length > 0) || pollAttempts >= 10) {
            // STATE-M1: Only overwrite if data actually changed to avoid stale event-driven updates
            if (nextKeys && nextKeys.length > 0) {
                const nextIds = nextKeys.map((k) => k.id).join(',');
                const currentIds = store.keys.map((k) => k.id).join(',');
                if (nextIds !== currentIds) {
                    setStore({ keys: [...nextKeys] });
                }
            }
            if (pollTimer !== null) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }
    }, 300);
}

export const useKeyStore = (): KeyStoreState & KeyStoreActions => {
    ensureInitialized();

    const keys = useKeySelector((s) => s.keys);
    const alerts = useKeySelector((s) => s.alerts);
    const checkingIds = useKeySelector((s) => s.checkingIds);
    const activeKeys = useMemo(() => keys.filter((k) => k.status === 'active'), [keys]);

    const addKey = useCallback(async (data: Omit<ApiKey, 'id' | 'stats'>) => {
        await groupManager.createKey(data, { source: 'ui' });
    }, []);

    const removeKey = useCallback(async (id: string) => {
        await groupManager.deleteKey(id);
        setStore({ keys: [...groupManager.getAllKeys()] });
    }, []);

    const updateKey = useCallback(async (id: string, data: Partial<ApiKey>) => {
        await groupManager.updateKey(id, data);
        setStore({ keys: [...groupManager.getAllKeys()] });
    }, []);

    const checkHealth = useCallback((id: string) => {
        eventBus.emit(EVENTS.CHECK_HEALTH, id);
    }, []);

    const checkAllHealth = useCallback(() => {
        eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
    }, []);

    const toggleKeyStatus = useCallback(async (id: string) => {
        const key = groupManager.getAllKeys().find((k) => k.id === id);
        if (!key) return;
        await groupManager.syncKeyStatus(id, key.status === 'active' ? 'inactive' : 'active');
        setStore({ keys: [...groupManager.getAllKeys()] });
    }, []);

    const enableAllKeys = useCallback(async () => {
        const allKeys = groupManager.getAllKeys();
        const errors: string[] = [];
        for (const k of allKeys) {
            try {
                await groupManager.syncKeyStatus(k.id, 'active');
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
        setStore({ keys: [...groupManager.getAllKeys()] });
    }, []);

    const disableAllKeys = useCallback(async () => {
        const allKeys = groupManager.getAllKeys();
        const errors: string[] = [];
        for (const k of allKeys) {
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
        setStore({ keys: [...groupManager.getAllKeys()] });
    }, []);

    const exportKeys = useCallback(() => keyService.exportKeys(), []);

    const importKeys = useCallback(async (jsonData: string) => {
        const imported = JSON.parse(jsonData, (key, value) => {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype')
                return undefined;
            return value;
        });
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
            groupManager.getAllKeys().map((k) => makeFingerprint(k.provider, k.label, k.key)),
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
        setStore({ keys: [...groupManager.getAllKeys()] });
        return count;
    }, []);

    const getKeyById = useCallback((id: string) => keys.find((k) => k.id === id), [keys]);

    const getKeysByProvider = useCallback(
        (provider: string) =>
            keys.filter((k) => k.provider.toLowerCase() === provider.toLowerCase()),
        [keys],
    );

    const getAlerts = useCallback(() => (keyService.getAlerts ? keyService.getAlerts() : []), []);

    const resolveAlert = useCallback((alertId: string) => {
        keyService.resolveAlert?.(alertId);
        if (keyService.getAlerts) setStore({ alerts: keyService.getAlerts() });
    }, []);

    const keyMeta = useKeySelector((s) => s.keyMeta);

    return useMemo(
        () => ({
            keys,
            activeKeys,
            alerts,
            checkingIds,
            keyMeta,
            totalKeys: keys.length,
            activeCount: activeKeys.length,
            errorCount: keys.filter((k) => k.status === 'error').length,
            addKey,
            removeKey,
            updateKey,
            checkHealth,
            checkAllHealth,
            toggleKeyStatus,
            enableAllKeys,
            disableAllKeys,
            exportKeys,
            importKeys,
            getKeyById,
            getKeysByProvider,
            getAlerts,
            resolveAlert,
        }),
        [
            keys,
            activeKeys,
            alerts,
            checkingIds,
            keyMeta,
            addKey,
            removeKey,
            updateKey,
            checkHealth,
            checkAllHealth,
            toggleKeyStatus,
            enableAllKeys,
            disableAllKeys,
            exportKeys,
            importKeys,
            getKeyById,
            getKeysByProvider,
            getAlerts,
            resolveAlert,
        ],
    );
};
