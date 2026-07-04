import type { DebatePhase } from './contracts/debate-types';

export type InitPhase =
    'pending' | 'kernel' | 'services' | 'topology' | 'ready' | 'failed' | 'degraded';

export interface BootstrapReport {
    phase: InitPhase;
    started: number;
    completed: number;
    duration: number;
    error: string | null;
    services: { name: string; status: 'ok' | 'error' | 'skipped'; error?: string }[];
}

export const CRITICAL_SERVICES = new Set([
    'kernel',
    'configService',
    'keyService',
    'pricingService',
]);

export const RUNNING_DEBATE_PHASES = new Set<DebatePhase>([
    'initializing',
    'active',
    'deliberating',
    'consensus',
    'summarizing',
]);
