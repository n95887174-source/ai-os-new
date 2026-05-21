import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

export function useAutoClearError(
  setError: Dispatch<SetStateAction<string | null>>,
  delay = 5000
): () => void {
  const isMountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, delay);
  }, [setError, delay]);
}
