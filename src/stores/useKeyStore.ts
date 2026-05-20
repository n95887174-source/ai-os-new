import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { keyService } from '../kernel/instances';
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

const STORAGE_KEY = 'super_agents_api_keys';

function loadKeysFromStorage(): ApiKey[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function getInitialKeys(): ApiKey[] {
  const fromService = keyService.getKeys();
  if (fromService.length > 0) return fromService;
  return loadKeysFromStorage();
}

// Module-level store for selector-based subscriptions
let store: Store = { keys: getInitialKeys(), alerts: keyService.getAlerts ? keyService.getAlerts() : [], checkingIds: new Set() };
const storeListeners = new Set<() => void>();

function setStore(partial: Partial<Store>) {
  store = { ...store, ...partial };
  storeListeners.forEach(l => l());
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
    setStore({ keys: [...keyService.getKeys()] });
  });

  eventBus.on(EVENTS.KEY_HEALTH_STARTED, (data) => {
    if (typeof data === 'string') {
      setStore({ checkingIds: new Set(store.checkingIds).add(data) });
    }
  });

  eventBus.on(EVENTS.KEY_HEALTH_COMPLETED, (data) => {
    const id = typeof data === 'string' ? data : (data && typeof data === 'object' && 'id' in data ? (data as {id: string}).id : null);
    if (id) {
      const next = new Set(store.checkingIds);
      next.delete(id);
      setStore({ checkingIds: next });
    }
  });

  const latestKeys = keyService.getKeys();
  if (latestKeys.length > 0) {
    setStore({ keys: [...latestKeys] });
  } else {
    const fromStorage = loadKeysFromStorage();
    if (fromStorage.length > 0) setStore({ keys: fromStorage });
  }

  let pollAttempts = 0;
  const pollTimer = setInterval(() => {
    pollAttempts++;
    const nextKeys = keyService.getKeys();
    if (nextKeys.length > 0 || pollAttempts >= 10) {
      if (nextKeys.length > 0) {
        setStore({ keys: [...nextKeys] });
      } else {
        const fromStorage = loadKeysFromStorage();
        if (fromStorage.length > 0) setStore({ keys: fromStorage });
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

  const addKey = useCallback((data: Omit<ApiKey, 'id' | 'stats'>) => {
    eventBus.emit(EVENTS.KEY_ADDED, data);
  }, []);

  const removeKey = useCallback((id: string) => {
    eventBus.emit(EVENTS.KEY_REMOVED, id);
  }, []);

  const updateKey = useCallback((id: string, data: Partial<ApiKey>) => {
    keyService.updateKey(id, data);
    setStore({ keys: [...keyService.getKeys()] });
  }, []);

  const checkHealth = useCallback((id: string) => {
    eventBus.emit(EVENTS.CHECK_HEALTH, id);
  }, []);

  const checkAllHealth = useCallback(() => {
    eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
  }, []);

  const toggleKeyStatus = useCallback((id: string) => {
    keyService.toggleKeyStatus(id);
    setStore({ keys: [...keyService.getKeys()] });
  }, []);

  const enableAllKeys = useCallback(() => {
    keyService.enableAllKeys();
    setStore({ keys: [...keyService.getKeys()] });
  }, []);

  const disableAllKeys = useCallback(() => {
    keyService.disableAllKeys();
    setStore({ keys: [...keyService.getKeys()] });
  }, []);

  const exportKeys = useCallback(() => keyService.exportKeys(), []);

  const importKeys = useCallback(async (jsonData: string) => {
    const count = await keyService.importKeys(jsonData);
    setStore({ keys: [...keyService.getKeys()] });
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
