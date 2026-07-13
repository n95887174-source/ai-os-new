import type { DebateParticipant, DebateServiceDeps } from '../../contracts/debate-types';

export function checkDebatePreflight(
    deps: DebateServiceDeps,
    participants: DebateParticipant[],
): void {
    if (participants.length < 2) throw new Error('Need at least 2 participants for debate');
    const activeKeys = deps.keyService.getActiveKeys();
    if (activeKeys.length === 0) throw new Error('No active API keys available');
    const availableProviders = new Set(activeKeys.map((k) => k.provider));
    const DEBATE_PROVIDERS = [
        'groq',
        'gemini',
        'openrouter',
        'nvidia',
        'cerebras',
        'cloudflare',
        'deepseek',
        'cohere',
        'scaleway',
        'github',
        'blackbox',
        'cometapi',
    ];
    const hasDebateProvider = DEBATE_PROVIDERS.some((p) => availableProviders.has(p));
    if (!hasDebateProvider) {
        throw new Error(
            `No debate-capable provider with active keys. Active: ${[...availableProviders].join(', ') || 'none'}`,
        );
    }
}
