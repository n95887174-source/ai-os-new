import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserLevel } from '../types/routing';

export type LayoutMode =
    'default' | 'wide' | 'focus' | 'presentation' | 'debug' | 'mobile' | 'cinema';

export interface UiPreferencesState {
    onboardingCompleted: boolean;
    userLevel: UserLevel;
    theme: string;
    defaultLayout: LayoutMode;
    perRouteLayout: Record<string, LayoutMode>;
    collapsedSections: string[];
    pinnedSidebar: string[];
    recentCommands: string[];
    designTokenOverrides: Record<string, string>;
}

export interface UiPreferencesActions {
    setOnboardingCompleted: (v: boolean) => void;
    setUserLevel: (level: UserLevel) => void;
    setTheme: (theme: string) => void;
    setLayout: (route: string, mode: LayoutMode, global?: boolean) => void;
    getLayout: (route: string) => LayoutMode | null;
    toggleCollapsedSection: (sectionId: string) => void;
    setPinnedSidebar: (pinned: string[]) => void;
    addRecentCommand: (path: string) => void;
    getRecentCommands: () => string[];
    setDesignTokenOverrides: (overrides: Record<string, string>) => void;
    clearDesignTokenOverrides: () => void;
}

const MAX_RECENT = 8;

export const useUiPreferences = create<UiPreferencesState & UiPreferencesActions>()(
    persist(
        (set, get) => ({
            onboardingCompleted: false,
            userLevel: 'L2',
            theme: 'dark',
            defaultLayout: 'default' as LayoutMode,
            perRouteLayout: {},
            collapsedSections: [],
            pinnedSidebar: [],
            recentCommands: [],
            designTokenOverrides: {},

            setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),

            setUserLevel: (userLevel) => set({ userLevel }),

            setTheme: (theme) => set({ theme }),

            setLayout: (route, mode, global) => {
                if (global) {
                    set({ defaultLayout: mode, perRouteLayout: {} });
                } else {
                    set((s) => ({
                        defaultLayout: s.defaultLayout,
                        perRouteLayout: { ...s.perRouteLayout, [route]: mode },
                    }));
                }
            },

            getLayout: (route) => {
                const s = get();
                return s.perRouteLayout[route] ?? s.defaultLayout ?? null;
            },

            toggleCollapsedSection: (sectionId) => {
                set((s) => {
                    const next = s.collapsedSections.includes(sectionId)
                        ? s.collapsedSections.filter((id) => id !== sectionId)
                        : [...s.collapsedSections, sectionId];
                    return { collapsedSections: next };
                });
            },

            setPinnedSidebar: (pinnedSidebar) => set({ pinnedSidebar }),

            addRecentCommand: (path) => {
                set((s) => {
                    const prev = s.recentCommands.filter((p) => p !== path);
                    return { recentCommands: [path, ...prev].slice(0, MAX_RECENT) };
                });
            },

            getRecentCommands: () => get().recentCommands,

            setDesignTokenOverrides: (overrides) => set({ designTokenOverrides: overrides }),

            clearDesignTokenOverrides: () => set({ designTokenOverrides: {} }),
        }),
        {
            name: 'super-agents-ui-prefs',
            version: 2,
            migrate: (persisted: unknown, version: number) => {
                if (version === 0) {
                    const v0 = persisted as Partial<UiPreferencesState>;
                    return {
                        onboardingCompleted: v0.onboardingCompleted ?? false,
                        userLevel: v0.userLevel ?? ('L2' as UserLevel),
                        theme: v0.theme ?? 'dark',
                        defaultLayout: v0.defaultLayout ?? ('default' as LayoutMode),
                        perRouteLayout: v0.perRouteLayout ?? {},
                        collapsedSections: v0.collapsedSections ?? [],
                        pinnedSidebar: v0.pinnedSidebar ?? [],
                        recentCommands: v0.recentCommands ?? [],
                        designTokenOverrides: v0.designTokenOverrides ?? {},
                    } as UiPreferencesState;
                }
                // v1 → v2: existing users were defaulted to L0, which locks
                // all L1/L2 panels behind "Access Restricted". Auto-promote
                // everyone to L2 on next load (the owner/dev sees everything
                // by default; they can still drop to L0/L1 in Settings if they
                // want progressive disclosure back).
                if (version === 1) {
                    const v1 = persisted as Partial<UiPreferencesState>;
                    return {
                        ...v1,
                        userLevel: 'L2' as UserLevel,
                    } as UiPreferencesState;
                }
                return persisted as UiPreferencesState;
            },
            partialize: (state) => ({
                onboardingCompleted: state.onboardingCompleted,
                userLevel: state.userLevel,
                theme: state.theme,
                defaultLayout: state.defaultLayout,
                perRouteLayout: state.perRouteLayout,
                collapsedSections: state.collapsedSections,
                pinnedSidebar: state.pinnedSidebar,
                recentCommands: state.recentCommands,
                designTokenOverrides: state.designTokenOverrides,
            }),
        },
    ),
);
