import type React from 'react';
import type { TranslationKey } from '../i18n/translations';
import type { FeatureFlag } from '../kernel/contracts/feature-flags';

export type UserLevel = 'L0' | 'L1' | 'L2';

export interface RouteMeta {
    id: string;
    path?: string;
    labelKey: TranslationKey;
    icon: React.ReactNode;
    color: string;
    lazy?: boolean;
    level?: UserLevel;
    featureFlag?: FeatureFlag;
}

export interface NavSection {
    id: string;
    labelKey: TranslationKey;
    items: RouteMeta[];
}

export type {
    StrategyWeightConfig,
    AutoDynamicAdjustment,
    LatencyVarianceBand,
    ScoringConfig,
    ClassificationConfig,
    AffinityConfig,
    PriorityBonuses,
    ProviderComplexityMapping,
    RouterConfig,
} from '../kernel/types/routing-types';
