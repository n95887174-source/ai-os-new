import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export type LayoutMode =
    'default' | 'wide' | 'focus' | 'presentation' | 'debug' | 'mobile' | 'cinema';

export const LAYOUT_LABELS: Record<LayoutMode, string> = {
    default: 'Default',
    wide: 'Wide',
    focus: 'Focus',
    presentation: 'Presentation',
    debug: 'Debug',
    mobile: 'Mobile',
    cinema: 'Cinema',
};

export const LAYOUT_ICONS: Record<LayoutMode, string> = {
    default: '⊞',
    wide: '⇔',
    focus: '◎',
    presentation: '▣',
    debug: '⚙',
    mobile: '📱',
    cinema: '🎬',
};

const STORAGE_KEY = 'mavis:layout:per-route';
const DEFAULT_KEY = 'mavis:layout:default';

function getStoredLayout(route: string): LayoutMode | null {
    try {
        const perRoute = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (perRoute[route]) return perRoute[route] as LayoutMode;
        const def = localStorage.getItem(DEFAULT_KEY);
        if (def) return def as LayoutMode;
    } catch {
        /* noop */
    }
    return null;
}

function storeLayout(route: string, mode: LayoutMode, isGlobal: boolean) {
    try {
        if (isGlobal) {
            localStorage.setItem(DEFAULT_KEY, mode);
            const perRoute = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            delete perRoute[route];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(perRoute));
        } else {
            const perRoute = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            perRoute[route] = mode;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(perRoute));
        }
    } catch {
        /* noop */
    }
}

export interface LayoutContextValue {
    layout: LayoutMode;
    setLayout: (mode: LayoutMode, global?: boolean) => void;
    isGlobal: boolean;
    setIsGlobal: (v: boolean) => void;
    availableLayouts: LayoutMode[];
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
    const ctx = useContext(LayoutContext);
    if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
    return ctx;
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const route = location.pathname;

    const [isGlobal, setIsGlobal] = useState(() => {
        try {
            return !localStorage.getItem(STORAGE_KEY + ':' + route);
        } catch {
            return true;
        }
    });

    const [layout, setLayoutState] = useState<LayoutMode>(() => {
        return getStoredLayout(route) || 'default';
    });

    useEffect(() => {
        const stored = getStoredLayout(route);
        if (stored) {
            setLayoutState(stored);
            setIsGlobal(false);
        } else {
            const def = localStorage.getItem(DEFAULT_KEY) as LayoutMode | null;
            if (def) {
                setLayoutState(def);
                setIsGlobal(true);
            } else {
                setLayoutState('default');
                setIsGlobal(true);
            }
        }
    }, [route]);

    const setLayout = useCallback(
        (mode: LayoutMode, global?: boolean) => {
            const g = global ?? isGlobal;
            setLayoutState(mode);
            storeLayout(route, mode, g);
        },
        [route, isGlobal],
    );

    const availableLayouts = useMemo((): LayoutMode[] => {
        if (route.startsWith('/debate'))
            return ['default', 'wide', 'cinema', 'focus', 'presentation'];
        if (route.startsWith('/chat')) return ['default', 'wide', 'focus'];
        if (route.startsWith('/ecosystem') || route.startsWith('/aquarium'))
            return ['default', 'wide', 'cinema'];
        return ['default', 'wide', 'focus', 'debug'];
    }, [route]);

    return (
        <LayoutContext.Provider
            value={{ layout, setLayout, isGlobal, setIsGlobal, availableLayouts }}
        >
            <div data-layout={layout}>{children}</div>
        </LayoutContext.Provider>
    );
}
