import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventBus, EVENTS } from '../core/events';
import { keyService } from '../services/KeyService';
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
  exportKeys: () => string;
  importKeys: (jsonData: string) => Promise<number>;
  getKeyById: (id: string) => ApiKey | undefined;
  getKeysByProvider: (provider: string) => ApiKey[];
  getAlerts: () => ProviderAlert[];
  resolveAlert: (alertId: string) => void;
}

export const useKeyStore = (): KeyStoreState & KeyStoreActions => {
  const [keys, setKeys] = useState<ApiKey[]>(() => keyService.getKeys());
  const [alerts, setAlerts] = useState<ProviderAlert[]>(() => keyService.getAlerts ? keyService.getAlerts() : []);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubKeys = eventBus.on(EVENTS.KEYS_LOADED, (updatedKeys) => {
      setKeys([...updatedKeys]);
    });

    const unsubUpdated = eventBus.on(EVENTS.KEY_UPDATED, (updatedKeys) => {
      setKeys([...updatedKeys]);
    });

    const unsubAlert = eventBus.on(EVENTS.KEY_LATENCY_BURST, () => {
      setAlerts(keyService.getAlerts ? keyService.getAlerts() : []);
    });

    const unsubState = eventBus.on(EVENTS.KEY_STATE_CHANGED, () => {
      setKeys([...keyService.getKeys()]);
    });

    const unsubHealthStarted = eventBus.on(EVENTS.KEY_HEALTH_STARTED, (data) => {
      if (typeof data === 'string') {
        setCheckingIds(prev => new Set(prev).add(data));
      }
    });

    const unsubHealthCompleted = eventBus.on(EVENTS.KEY_HEALTH_COMPLETED, (data) => {
      // Guard against both string ID and object {id: string} payloads
      const id = typeof data === 'string' ? data : (data && typeof data === 'object' && 'id' in data ? (data as {id: string}).id : null);
      if (id) {
        setCheckingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });

    return () => {
      unsubKeys();
      unsubUpdated();
      unsubAlert();
      unsubState();
      unsubHealthStarted();
      unsubHealthCompleted();
    };
  }, []);

  const activeKeys = useMemo(() => keys.filter(k => k.status === 'active'), [keys]);

  const addKey = useCallback((data: Omit<ApiKey, 'id' | 'stats'>) => {
    eventBus.emit(EVENTS.KEY_ADDED, data);
  }, []);

  const removeKey = useCallback((id: string) => {
    eventBus.emit(EVENTS.KEY_REMOVED, id);
  }, []);

  const updateKey = useCallback((id: string, data: Partial<ApiKey>) => {
    const updated = keyService.updateKey(id, data);
    setKeys([...keyService.getKeys()]);
    return updated;
  }, []);

  const checkHealth = useCallback((id: string) => {
    eventBus.emit(EVENTS.CHECK_HEALTH, id);
  }, []);

  const checkAllHealth = useCallback(() => {
    eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
  }, []);

  const toggleKeyStatus = useCallback((id: string) => {
    keyService.toggleKeyStatus(id);
    setKeys([...keyService.getKeys()]);
  }, []);

  const enableAllKeys = useCallback(() => {
    keyService.enableAllKeys();
    setKeys([...keyService.getKeys()]);
  }, []);

  const disableAllKeys = useCallback(() => {
    keyService.disableAllKeys();
    setKeys([...keyService.getKeys()]);
  }, []);

  const exportKeys = useCallback(() => {
    return keyService.exportKeys();
  }, []);

  const importKeys = useCallback(async (jsonData: string) => {
    const count = await keyService.importKeys(jsonData);
    setKeys([...keyService.getKeys()]);
    return count;
  }, []);

  const getKeyById = useCallback((id: string) => {
    return keys.find(k => k.id === id);
  }, [keys]);

  const getKeysByProvider = useCallback((provider: string) => {
    return keys.filter(k => k.provider.toLowerCase() === provider.toLowerCase());
  }, [keys]);

  const getAlerts = useCallback(() => {
    return keyService.getAlerts ? keyService.getAlerts() : [];
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    keyService.resolveAlert?.(alertId);
    setAlerts(keyService.getAlerts ? keyService.getAlerts() : []);
  }, []);

  return {
    keys,
    activeKeys,
    alerts,
    checkingIds,
    totalKeys: keys.length,
    activeCount: activeKeys.length,
    errorCount: keys.filter(k => k.status === 'error').length,
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
  };
};
