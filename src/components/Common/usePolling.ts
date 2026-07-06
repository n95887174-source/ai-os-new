import { useEffect, useRef } from 'react';

/**
 * C-95: Polling hook that auto-pauses when the browser tab is hidden.
 * @param callback — the function to call on each tick (stable reference preferred)
 * @param intervalMs — polling interval in milliseconds
 * @param enabled — optionally disable polling entirely (default true)
 */
export function usePolling(
    callback: () => void,
    intervalMs: number,
    enabled = true,
): { isActive: boolean } {
    const savedCallback = useRef(callback);
    const isActive = useRef(false);

    // Keep the latest callback without restarting the interval
    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        if (!enabled) {
            isActive.current = false;
            return;
        }

        const tick = () => {
            if (!document.hidden) {
                savedCallback.current();
            }
        };

        // Fire once immediately (if visible) — useful for initial load
        if (!document.hidden) {
            savedCallback.current();
        }

        isActive.current = true;
        const id = setInterval(tick, intervalMs);
        return () => {
            isActive.current = false;
            clearInterval(id);
        };
    }, [intervalMs, enabled]);

    return { isActive: isActive.current };
}
