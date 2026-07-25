import { useEffect } from 'react';
import { useUiPreferences } from '../../stores/uiPreferencesStore';
import { authorizationService } from '../../kernel/instances/services-core';

/**
 * Syncs Zustand userLevel to the kernel AuthorizationService on every change.
 * Mount once at the App root — provides defense-in-depth by ensuring kernel
 * services can enforce permission checks independently of the UI PermissionGate.
 */
export function AuthLevelSync(): null {
    const userLevel = useUiPreferences((s) => s.userLevel);

    useEffect(() => {
        try {
            authorizationService.setLevel(userLevel);
        } catch {
            // Service not registered yet (bootstrapping phase)
        }
    }, [userLevel]);

    return null;
}
