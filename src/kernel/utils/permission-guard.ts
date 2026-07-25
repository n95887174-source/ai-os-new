import type { KernelUserLevel } from '../contracts/authorization';
import { authorizationService } from '../instances/services-core';

/**
 * Require a minimum user level to proceed. Throws PermissionDeniedError if
 * the current user level is below the minimum.
 *
 * Uses lazyService to resolve the IAuthorizationService at runtime,
 * so it works in any kernel service without explicit DI wiring.
 */
export function requireLevel(minimum: KernelUserLevel): void {
    try {
        authorizationService.requireLevel(minimum);
    } catch (e) {
        if (
            e &&
            typeof e === 'object' &&
            'name' in e &&
            (e as { name: string }).name === 'PermissionDeniedError'
        ) {
            throw e;
        }
        // Service not registered — skip enforcement (falls back to UI-only PermissionGate)
    }
}
