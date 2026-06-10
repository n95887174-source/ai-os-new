import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { keyService, groupManager } from '../kernel/instances';
import type { ApiKey, ProviderAlert } from '../types/metrics';

// Dev-only console helpers
if (import.meta.env.DEV) {
(window as unknown as Record<string, unknown>).__fixOpenRouterModels = async () => {
  const allKeys = groupManager.getAllKeys();
  const orKeys = allKeys.filter(k => k.provider.toLowerCase() === 'openrouter');
  for (const k of orKeys) {
    await groupManager.updateKey(k.id, { model: 'google/gemini-3.1-flash-lite' });
  }
  refreshKeyStore();
  return `Fixed ${orKeys.length} OpenRouter keys`;
};

// Console helper: recover key material from old Dexie apiKeys table
(window as unknown as Record<string, unknown>).__recoverKeys = async () => {
  const dexieDb = (await import('../kernel/services/database-service')).dexieDb;
  const oldKeys = await dexieDb.apiKeys.toArray();
  if (!oldKeys || !oldKeys.length) {
    // Try localStorage fallback
    const { StorageAdapter } = await import('../kernel/services/storage-adapter');
    const raw = await StorageAdapter.PROVIDERS.get<string>('super_agents_api_keys');
    if (!raw) return 'Nothing to recover — re-add keys manually';
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      oldKeys.push(...parsed);
    } else {
      return 'localStorage data is not an array — re-add keys manually';
    }
  }
  const current = groupManager.getAllKeys();
  const currentKeys = new Set(current.map(k => k.key));
  const missing = (oldKeys || []).filter((k: { key: string }) => !currentKeys.has(k.key));
  if (!missing.length) return 'All keys already present';
  let added = 0;
  for (const k of missing) {
    try {
      await keyService.addKey({
        key: k.key, provider: k.provider,
        label: k.label || `${k.provider}-recovered`,
        status: k.status || 'active',
        model: k.model || 'auto', tags: k.tags || [],
        settings: k.settings || {},
      });
      added++;
    } catch { /* skip dupes */ }
  }
  refreshKeyStore();
  return `Recovered ${added} keys from old storage`;
};
}

export interface KeyStoreState {
  keys: ApiKey[];
  activeKeys: ApiKey[];
  alerts: ProviderAlert[];
  checkingIds: Set<string>;
  totalKeys: number;
  activeCount: number;
  errorCount: number;
}

export interface KeyStoreActions {
  addKey: (data: Omit<ApiKey, 'id' | 'stats'>) => void;
  removeKey: (id: string) => void;
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
};

function getInitialKeys(): ApiKey[] {
  // Guard: service proxy returns safe stub until runtime.start() completes.
  // groupManager.ready is false at module-load time; keys populate via refreshKeyStore() after bootstrap.
  try {
    if (!groupManager?.ready) {
      console.log('[KEY_FLOW] UI getInitialKeys: groupManager not ready, returning []');
      return [];
    }
    const fromService = groupManager?.getAllKeys?.();
    console.log('[KEY_FLOW] UI getInitialKeys:', { count: fromService?.length ?? 0, ready: groupManager?.ready });
    if (fromService && fromService.length > 0) return fromService;
  } catch { /* runtime not ready yet — return empty, populate later */ }
  return [];
}

// Module-level store for selector-based subscriptions
let store: Store = { keys: getInitialKeys(), alerts: keyService.getAlerts ? keyService.getAlerts() : [], checkingIds: new Set() };
const storeListeners = new Set<() => void>();

function setStore(partial: Partial<Store>) {
  store = { ...store, ...partial };
  storeListeners.forEach(l => l());
}

// Exported for external sync (e.g., #reset in main.tsx)
export function refreshKeyStore() {
  try {
    if (groupManager?.ready) {
      setStore({ keys: [...(groupManager?.getAllKeys?.() || [])] });
    }
  } catch { /* not ready yet */ }
}

function subscribeToStore(cb: () => void) {
  storeListeners.add(cb);
  return () => { storeListeners.delete(cb); };
}

function getSnapshot(): Store {
  return store;
}

// Selector hook — subscribers only re-render when their selector output changes
export function useKeySelector<T>(selector: (s: Store) => T): T {
  return useSyncExternalStore(subscribeToStore, () => selector(store));
}

// Convenience: hook for just keys + activeKeys (most common use case)
export function useKeyList(): { keys: ApiKey[]; activeKeys: ApiKey[] } {
  const keys = useKeySelector(s => s.keys);
  const activeKeys = useMemo(() => keys.filter(k => k.status === 'active'), [keys]);
  return useMemo(() => ({ keys, activeKeys }), [keys, activeKeys]);
}

// Convenience: hook for just checkingIds
export function useCheckingIds(): Set<string> {
  return useKeySelector(s => s.checkingIds);
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

  unsubs.push(eventBus.on(EVENTS.KEYS_LOADED, (updatedKeys) => {
    console.log('[KEY_FLOW] UI received KEYS_LOADED:', { count: updatedKeys?.length ?? 0 });
    queueMicrotask(() => setStore({ keys: [...updatedKeys] }));
  }));

  unsubs.push(eventBus.on(EVENTS.KEY_UPDATED, (updatedKeys) => {
    console.log('[KEY_FLOW] UI received KEY_UPDATED:', { count: updatedKeys?.length ?? 0 });
    queueMicrotask(() => setStore({ keys: [...updatedKeys] }));
  }));

  unsubs.push(eventBus.on(EVENTS.KEY_LATENCY_BURST, () => {
    if (keyService.getAlerts) queueMicrotask(() => setStore({ alerts: keyService.getAlerts() }));
  }));

  unsubs.push(eventBus.on(EVENTS.KEY_STATE_CHANGED, () => {
    queueMicrotask(() => setStore({ keys: [...groupManager.getAllKeys()] }));
  }));

  unsubs.push(eventBus.on(EVENTS.KEY_ADDED, () => {
    queueMicrotask(() => setStore({ keys: [...groupManager.getAllKeys()] }));
  }));

  unsubs.push(eventBus.on(EVENTS.KEY_REMOVED, () => {
    queueMicrotask(() => setStore({ keys: [...groupManager.getAllKeys()] }));
  }));

  // Refresh after passport sync (bootstrap completes)
  unsubs.push(eventBus.on(EVENTS.GROUP_SYNC, () => {
    // Defer to avoid setState-during-render in React strict mode
    queueMicrotask(() => setStore({ keys: [...groupManager.getAllKeys()] }));
  }));

  unsubs.push(eventBus.on(EVENTS.KEY_HEALTH_STARTED, (data) => {
    if (typeof data === 'string') {
      // Defer — may fire during render
      queueMicrotask(() => setStore({ checkingIds: new Set(store.checkingIds).add(data) }));
    }
  }));

  unsubs.push(eventBus.onSafe<{id: string}>(EVENTS.KEY_HEALTH_COMPLETED, (data) => {
    const id = data.id;
    if (id) {
      // Defer — may fire during render
      queueMicrotask(() => {
        const next = new Set(store.checkingIds);
        next.delete(id);
        setStore({ checkingIds: next });
      });
    }
  }));

  // Defer sync setStore to avoid "Cannot update while rendering" warning
  const latestKeys = groupManager?.getAllKeys?.() || [];
  if (latestKeys && latestKeys.length > 0) {
    queueMicrotask(() => setStore({ keys: [...latestKeys] }));
  }

  let pollAttempts = 0;
  pollTimer = setInterval(() => {
    pollAttempts++;
    const nextKeys = groupManager?.getAllKeys?.() || [];
    if (nextKeys && nextKeys.length > 0 || pollAttempts >= 10) {
      if (nextKeys && nextKeys.length > 0) {
        setStore({ keys: [...nextKeys] });
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

  const keys = useKeySelector(s => s.keys);
  const alerts = useKeySelector(s => s.alerts);
  const checkingIds = useKeySelector(s => s.checkingIds);
  const activeKeys = useMemo(() => keys.filter(k => k.status === 'active'), [keys]);

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
    const key = groupManager.getAllKeys().find(k => k.id === id);
    if (!key) return;
    await groupManager.syncKeyStatus(id, key.status === 'active' ? 'inactive' : 'active');
    setStore({ keys: [...groupManager.getAllKeys()] });
  }, []);

  const enableAllKeys = useCallback(async () => {
    const allKeys = groupManager.getAllKeys();
    for (const k of allKeys) await groupManager.syncKeyStatus(k.id, 'active');
    setStore({ keys: [...groupManager.getAllKeys()] });
  }, []);

  const disableAllKeys = useCallback(async () => {
    const allKeys = groupManager.getAllKeys();
    for (const k of allKeys) await groupManager.syncKeyStatus(k.id, 'inactive');
    setStore({ keys: [...groupManager.getAllKeys()] });
  }, []);

  const exportKeys = useCallback(() => keyService.exportKeys(), []);

  const importKeys = useCallback(async (jsonData: string) => {
    const imported = JSON.parse(jsonData, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return value;
    });
    if (!Array.isArray(imported)) throw new Error('Invalid data format');
    let count = 0;
    const existing = new Set(groupManager.getAllKeys().map(k => k.id));
    for (const item of imported) {
      if (!item.id || !item.provider || !item.label) continue;
      if (existing.has(item.id)) continue;
      const result = await groupManager.createKey(item, { source: 'import' });
      if (result.ok) { count++; existing.add(result.value); }
    }
    setStore({ keys: [...groupManager.getAllKeys()] });
    return count;
  }, []);

  const getKeyById = useCallback((id: string) => keys.find(k => k.id === id), [keys]);

  const getKeysByProvider = useCallback((provider: string) => keys.filter(k => k.provider.toLowerCase() === provider.toLowerCase()), [keys]);

  const getAlerts = useCallback(() => keyService.getAlerts ? keyService.getAlerts() : [], []);

  const resolveAlert = useCallback((alertId: string) => {
    keyService.resolveAlert?.(alertId);
    if (keyService.getAlerts) setStore({ alerts: keyService.getAlerts() });
  }, []);

  return useMemo(() => ({
    keys,
    activeKeys,
    alerts,
    checkingIds,
    totalKeys: keys.length,
    activeCount: activeKeys.length,
    errorCount: keys.filter(k => k.status === 'error').length,
    addKey, removeKey, updateKey, checkHealth, checkAllHealth,
    toggleKeyStatus, enableAllKeys, disableAllKeys,
    exportKeys, importKeys, getKeyById, getKeysByProvider,
    getAlerts, resolveAlert,
  }), [keys, activeKeys, alerts, checkingIds, addKey, removeKey, updateKey, checkHealth, checkAllHealth,
      toggleKeyStatus, enableAllKeys, disableAllKeys, exportKeys, importKeys, getKeyById, getKeysByProvider,
      getAlerts, resolveAlert]);
};
