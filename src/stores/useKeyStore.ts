import { useState, useEffect } from 'react';
import { eventBus, EVENTS } from '../core/events';
import { keyService } from '../services/KeyService';
import type { ApiKey } from '../types/metrics';

export const useKeyStore = () => {
  const [keys, setKeys] = useState<ApiKey[]>(() => keyService.getKeys());

  useEffect(() => {
    const unsub = eventBus.on(EVENTS.KEYS_LOADED, (updatedKeys) => {
      setKeys([...updatedKeys]);
    });
    return () => unsub();
  }, []);

  const addKey = (data: Omit<ApiKey, 'id' | 'stats'>) => {
    eventBus.emit(EVENTS.KEY_ADDED, data);
  };

  const removeKey = (id: string) => {
    eventBus.emit(EVENTS.KEY_REMOVED, id);
  };

  const checkHealth = (id: string) => {
    eventBus.emit(EVENTS.CHECK_HEALTH, id);
  };

  const checkAllHealth = () => {
    eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
  };

  return {
    keys,
    activeKeys: keys.filter(k => k.status === 'active'),
    addKey,
    removeKey,
    checkHealth,
    checkAllHealth
  };
};
