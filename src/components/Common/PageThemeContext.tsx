import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface PageThemeContextValue {
    getPageTheme: (route: string) => 'dark' | 'light' | null;
    setPageTheme: (route: string, theme: 'dark' | 'light' | null) => void;
    getAllOverrides: () => Record<string, 'dark' | 'light'>;
}

const STORAGE_KEY = 'pageThemeOverrides';

function loadOverrides(): Record<string, 'dark' | 'light'> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

const PageThemeContext = createContext<PageThemeContextValue>({
    getPageTheme: () => null,
    setPageTheme: () => {},
    getAllOverrides: () => ({}),
});

export const PageThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [overrides, setOverrides] = useState<Record<string, 'dark' | 'light'>>(loadOverrides);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
        document.documentElement.setAttribute('data-page-theme', '');
    }, [overrides]);

    const getPageTheme = useCallback((route: string) => overrides[route] || null, [overrides]);

    const setPageTheme = useCallback((route: string, theme: 'dark' | 'light' | null) => {
        setOverrides((prev) => {
            const next = { ...prev };
            if (theme === null) delete next[route];
            else next[route] = theme;
            return next;
        });
    }, []);

    const getAllOverrides = useCallback(() => ({ ...overrides }), [overrides]);

    return (
        <PageThemeContext.Provider value={{ getPageTheme, setPageTheme, getAllOverrides }}>
            {children}
        </PageThemeContext.Provider>
    );
};

export const usePageTheme = () => useContext(PageThemeContext);
