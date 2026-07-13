export type Locale = 'en' | 'ru';
export type TranslationKey = string;

const _loaded: Partial<Record<Locale, Record<string, string>>> = {};

export async function loadLocale(locale: Locale): Promise<Record<string, string>> {
    if (_loaded[locale]) return _loaded[locale]!;
    if (locale === 'ru') {
        const mod = await import('./ru');
        _loaded.ru = mod.ru;
    } else {
        const mod = await import('./en');
        _loaded.en = mod.en;
    }
    return _loaded[locale]!;
}

export const translations = new Proxy({} as Record<Locale, Record<string, string>>, {
    get(_, locale: string) {
        return _loaded[locale as Locale];
    },
    ownKeys() {
        return Object.keys(_loaded);
    },
    getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
    },
});

export function getTranslation(
    locale: Locale,
    key: TranslationKey,
    params?: Record<string, string | number>,
): string {
    let text = _loaded[locale]?.[key] || _loaded.en?.[key] || key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, String(v));
        }
    }
    return text;
}

export const DEFAULT_LOCALE: Locale = 'en';

// Kick off initial locale load immediately (non-blocking)
loadLocale(DEFAULT_LOCALE);
