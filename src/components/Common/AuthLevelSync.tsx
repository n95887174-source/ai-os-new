import { useEffect, useRef } from 'react';
import { useUiPreferences } from '../../stores/uiPreferencesStore';
import { authorizationService } from '../../kernel/instances/services-core';

/**
 * Syncs Zustand userLevel to the kernel AuthorizationService on every change.
 * Mount once at the App root — provides defense-in-depth by ensuring kernel
 * services can enforce permission checks independently of the UI PermissionGate.
 *
 * On first mount, detects if there are zero API keys (fresh/incognito tab)
 * and downgrades userLevel to 'L0' immediately, preventing a L2→L0 flicker
 * that would trigger a flood of PermissionDenied errors from services.
 */
export function AuthLevelSync(): null {
    const userLevel = useUiPreferences((s) => s.userLevel);
    const setUserLevel = useUiPreferences((s) => s.setUserLevel);
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            const keyCount = (globalThis as unknown as Record<string, unknown>)
                .__BOOTSTRAP_KEY_COUNT__;
            if (typeof keyCount === 'number' && keyCount === 0 && userLevel !== 'L0') {
                setUserLevel('L0');
                return; // will re-render with new level
            }
        }
        try {
            authorizationService.setLevel(userLevel);
        } catch {
            // Service not registered yet (bootstrapping phase)
        }
    }, [userLevel, setUserLevel]);

    return null;
}
