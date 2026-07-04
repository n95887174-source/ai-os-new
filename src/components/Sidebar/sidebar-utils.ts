import { safeJsonParse } from '../../kernel/utils/safe-json';

const RECENT_KEY = 'mavis:palette:recent';
const PINNED_KEY = 'mavis:sidebar:pinned';

export function getRecent(): string[] {
    try {
        return (safeJsonParse(localStorage.getItem(RECENT_KEY) || '[]') as string[]) ?? [];
    } catch {
        return [];
    }
}

export function getPinned(): string[] {
    try {
        return (safeJsonParse(localStorage.getItem(PINNED_KEY) || '[]') as string[]) ?? [];
    } catch {
        return [];
    }
}

export function savePinned(pinned: string[]) {
    try {
        localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
    } catch {
        /* noop */
    }
}

const COLLAPSED_KEY = 'mavis:collapsedSections';

export function getCollapsedSections(): Set<string> {
    try {
        return new Set<string>((safeJsonParse(localStorage.getItem(COLLAPSED_KEY) || '[]') as string[]) ?? []);
    } catch {
        return new Set<string>();
    }
}

export function saveCollapsedSections(sections: Set<string>) {
    try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...sections]));
    } catch {
        /* noop */
    }
}

