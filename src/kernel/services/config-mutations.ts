import type { ConfigRegistry } from '../contracts/config-registry';
import { EVENTS } from '../events/event-names';
import { eventBus } from '../events/event-bus';
import { rawConfig } from './config-registry';

/** Replace entire rawConfig with a new snapshot (used by config-history rollback). */
export function replaceConfig(next: ConfigRegistry): void {
    for (const key of Object.keys(rawConfig))
        delete (rawConfig as unknown as Record<string, unknown>)[key];
    for (const key of Object.keys(next))
        (rawConfig as unknown as Record<string, unknown>)[key] = (
            next as unknown as Record<string, unknown>
        )[key];
    eventBus.emit(EVENTS.SETTINGS_UPDATED, { settings: {}, changes: { full: true } });
}

/** Update a single top-level section in rawConfig (used by config-service). */
export function setConfig<K extends keyof ConfigRegistry>(key: K, value: ConfigRegistry[K]): void {
    (rawConfig as unknown as Record<string, unknown>)[key as string] = value;
    eventBus.emit(EVENTS.SETTINGS_UPDATED, { settings: {}, changes: { [key]: true } });
}

/** Update a feature flag value in rawConfig. Clones the section, mutates, and replaces via setConfig. */
export function setFeatureFlag(path: string, enabled: boolean): void {
    const section = structuredClone(rawConfig.featureFlags);
    const parts = path.replace(/^featureFlags\./, '').split('.');
    let target = section as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
        const next = target[parts[i]];
        if (!next || typeof next !== 'object') return;
        target = next as Record<string, unknown>;
    }
    const flagKey = parts[parts.length - 1];
    if (target[flagKey] === enabled) return;
    target[flagKey] = enabled;
    setConfig('featureFlags', section);
}
