/**
 * Authorization service for kernel-level permission enforcement.
 *
 * The UI has client-side PermissionGate which is trivially bypassed.
 * Kernel services MUST call requireLevel() before executing sensitive
 * operations to provide defense-in-depth.
 */

export type KernelUserLevel = 'L0' | 'L1' | 'L2';

export const LEVEL_RANK: Record<KernelUserLevel, number> = {
    L0: 0,
    L1: 1,
    L2: 2,
};

export interface IAuthorizationService {
    /** Get the current user level (defaults to L0). */
    getLevel(): KernelUserLevel;

    /** Set the current user level — called by UI layer on auth change. */
    setLevel(level: KernelUserLevel): void;

    /**
     * Check if current user meets the minimum level.
     * Throws PermissionDeniedError if not.
     */
    requireLevel(minimum: KernelUserLevel): void;

    /**
     * Check if current user meets the minimum level.
     * Returns boolean (no throw) for conditional UI logic in services.
     */
    can(minimum: KernelUserLevel): boolean;
}

export class PermissionDeniedError extends Error {
    constructor(
        public readonly required: KernelUserLevel,
        public readonly current: KernelUserLevel,
    ) {
        super(`Permission denied: required ${required}, current ${current}`);
        this.name = 'PermissionDeniedError';
    }
}
