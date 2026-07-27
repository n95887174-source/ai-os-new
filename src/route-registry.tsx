import { CORE_SECTIONS } from './route-registry-core';
import { SYSTEM_SECTIONS } from './route-registry-system';
import { CONTENT_SECTIONS } from './route-registry-content';
import type { RouteMeta, NavSection } from './types/routing';

export type { RouteMeta, NavSection };

export const NAV_SECTIONS: NavSection[] = [
    ...CORE_SECTIONS,
    ...SYSTEM_SECTIONS,
    ...CONTENT_SECTIONS,
];
