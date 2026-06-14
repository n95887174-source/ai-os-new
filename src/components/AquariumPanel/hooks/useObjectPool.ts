import { useRef, useCallback } from 'react';

interface PoolItem<T> {
  value: T;
  inUse: boolean;
}

const MAX_POOL_SIZE = 500;

export function useObjectPool<T>(factory: () => T, initialSize = 50) {
  const poolRef = useRef<PoolItem<T>[]>([]);

  const init = useCallback(() => {
    if (poolRef.current.length === 0) {
      for (let i = 0; i < initialSize; i++) {
        poolRef.current.push({ value: factory(), inUse: false });
      }
    }
  }, [factory, initialSize]);

  const acquire = useCallback((): T => {
    init();
    const available = poolRef.current.find(p => !p.inUse);
    if (available) {
      available.inUse = true;
      return available.value;
    }
    if (poolRef.current.length >= MAX_POOL_SIZE) {
      throw new Error(`Pool exhausted (max ${MAX_POOL_SIZE})`);
    }
    const newItem = { value: factory(), inUse: true };
    poolRef.current.push(newItem);
    return newItem.value;
  }, [factory, init]);

  const release = useCallback((item: T) => {
    const poolItem = poolRef.current.find(p => p.value === item);
    if (poolItem) poolItem.inUse = false;
  }, []);

  const releaseAll = useCallback(() => {
    for (const item of poolRef.current) item.inUse = false;
  }, []);

  const getStats = useCallback(() => {
    const total = poolRef.current.length;
    const inUse = poolRef.current.filter(p => p.inUse).length;
    return { total, inUse, available: total - inUse };
  }, []);

  const clear = useCallback(() => {
    poolRef.current = [];
  }, []);

  return { acquire, release, releaseAll, getStats, clear };
}
