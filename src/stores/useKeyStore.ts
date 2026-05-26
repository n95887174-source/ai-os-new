import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { keyService, groupManager } from '../kernel/instances';
import type { ApiKey, ProviderAlert } from '../types/metrics';

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
  if (!groupManager.ready) return [];
  const fromService = groupManager.getAllKeys();
  if (fromService && fromService.length > 0) return fromService;
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
  setStore({ keys: [...groupManager.getAllKeys()] });
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
function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  eventBus.on(EVENTS.KEYS_LOADED, (updatedKeys) => {
    setStore({ keys: [...updatedKeys] });
  });

  eventBus.on(EVENTS.KEY_UPDATED, (updatedKeys) => {
    setStore({ keys: [...updatedKeys] });
  });

  eventBus.on(EVENTS.KEY_LATENCY_BURST, () => {
    if (keyService.getAlerts) setStore({ alerts: keyService.getAlerts() });
  });

  eventBus.on(EVENTS.KEY_STATE_CHANGED, () => {
    setStore({ keys: [...groupManager.getAllKeys()] });
  });

  eventBus.on(EVENTS.KEY_ADDED, () => {
    setStore({ keys: [...groupManager.getAllKeys()] });
  });

  eventBus.on(EVENTS.KEY_REMOVED, () => {
    setStore({ keys: [...groupManager.getAllKeys()] });
  });

  // Refresh after passport sync (bootstrap completes)
  eventBus.on('key:group:sync', () => {
    setStore({ keys: [...groupManager.getAllKeys()] });
  });

  eventBus.on(EVENTS.KEY_HEALTH_STARTED, (data) => {
    if (typeof data === 'string') {
      setStore({ checkingIds: new Set(store.checkingIds).add(data) });
    }
  });

  eventBus.onSafe<{id: string}>(EVENTS.KEY_HEALTH_COMPLETED, (data) => {
    const id = data.id;
    if (id) {
      const next = new Set(store.checkingIds);
      next.delete(id);
      setStore({ checkingIds: next });
    }
  });

  const latestKeys = groupManager.getAllKeys();
  if (latestKeys.length > 0) {
    setStore({ keys: [...latestKeys] });
  }

  let pollAttempts = 0;
  const pollTimer = setInterval(() => {
    pollAttempts++;
    const nextKeys = groupManager.getAllKeys();
    if (nextKeys.length > 0 || pollAttempts >= 10) {
      if (nextKeys.length > 0) {
        setStore({ keys: [...nextKeys] });
      }
      clearInterval(pollTimer);
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
    const imported = JSON.parse(jsonData);
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
