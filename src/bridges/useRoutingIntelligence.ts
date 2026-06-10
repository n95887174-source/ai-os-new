import { useState, useEffect, useCallback } from 'react';
import { routerService, settingsService } from '../kernel/instances';
import type { FallbackLink, RoutingPolicySnapshot } from '../kernel/contracts/index';
import type { RouterDecision } from '../kernel/services/provider-router';
import type { ABTestConfig, RouterConfig } from '../kernel/types/routing-types';

type RoutingConfigWithProfile = RoutingPolicySnapshot & Pick<RouterConfig, 'activeProfile' | 'weightProfiles'>;

export interface RoutingState {
  decisions: RouterDecision[];
  config: RoutingConfigWithProfile | null;
  slaMode: string;
  abTest: ABTestConfig | null;
}

export interface RoutingActions {
  setFallbackChain: (strategy: string, chain: FallbackLink[]) => void;
  setDowngradeChain: (model: string, chain: string[]) => void;
  updateFallbackLink: (strategy: string, idx: number, patch: Partial<FallbackLink>) => void;
  setSlaMode: (mode: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<RoutingConfigWithProfile | null>>;
  getActiveProfile: () => string | undefined;
  setActiveProfile: (name: string) => Promise<void>;
  updateActiveProfileWeights: (weights: { ttft: number; tps: number; reliability: number }) => Promise<void>;
  startABTest: (control: string, experiment: string, splitPercent: number) => Promise<boolean>;
  stopABTest: () => Promise<void>;
}

export interface UseRoutingResult extends RoutingState {
  actions: RoutingActions;
}

const POLL_INTERVAL = 3000;
const DECISION_LIMIT = 50;
const getRoutingConfig = (): RoutingConfigWithProfile => routerService.getRawConfig() as RoutingConfigWithProfile;

export function useRoutingIntelligence(): UseRoutingResult {
  const [decisions, setDecisions] = useState<RouterDecision[]>(() => routerService.getDecisionHistory(DECISION_LIMIT));
  const [config, setConfig] = useState<RoutingConfigWithProfile | null>(() => getRoutingConfig());
  const [slaMode, setSlaModeState] = useState<string>(() => {
    const s = settingsService.getSettings();
    return s.slaMode || 'BALANCED';
  });
  const [abTest, setABTest] = useState<ABTestConfig | null>(() => routerService.getABTest());

  useEffect(() => {
    const s = settingsService.getSettings();
    if (s.slaMode) setSlaModeState(s.slaMode);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDecisions(routerService.getDecisionHistory(DECISION_LIMIT));
      setABTest(routerService.getABTest());
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const setFallbackChain = useCallback((strategy: string, chain: FallbackLink[]) => {
    routerService.setFallbackChain(strategy, chain);
    setConfig(getRoutingConfig());
  }, []);

  const setDowngradeChain = useCallback((model: string, chain: string[]) => {
    routerService.setDowngradeChain(model, chain);
    setConfig(getRoutingConfig());
  }, []);

  const updateFallbackLink = useCallback((strategy: string, idx: number, patch: Partial<FallbackLink>) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.fallbackChains[strategy] || [];
      const updated = chain.map((link, i) => i === idx ? { ...link, ...patch } : link);
      // B10-115: Sync router service with updated chain to prevent desync
      void settingsService.updateSettings({ fallbackChains: { ...(settingsService.getSettings().fallbackChains || {}), [strategy]: updated } });
      return {
        ...current,
        fallbackChains: {
          ...current.fallbackChains,
          [strategy]: updated,
        },
      };
    });
  }, []);

  const setSlaModeAction = useCallback((mode: string) => {
    setSlaModeState(mode);
    settingsService.updateSettings({ slaMode: mode as 'BALANCED' | 'PERFORMANCE' | 'ECONOMY' | 'EXPERIMENTAL' | 'FREE_FIRST' });
  }, []);

  const getActiveProfile = useCallback((): string | undefined => {
    const raw = getRoutingConfig();
    return raw?.activeProfile;
  }, []);

  const setActiveProfile = useCallback(async (name: string) => {
    await routerService.setActiveProfile(name);
    setConfig(getRoutingConfig());
  }, []);

  const updateActiveProfileWeights = useCallback(async (weights: { ttft: number; tps: number; reliability: number }) => {
    await routerService.updateActiveProfileWeights(weights);
    setConfig(getRoutingConfig());
  }, []);

  const startABTest = useCallback(async (control: string, experiment: string, splitPercent: number): Promise<boolean> => {
    const ok = await routerService.startABTest(control, experiment, splitPercent);
    if (ok) setABTest(routerService.getABTest());
    return ok;
  }, []);

  const stopABTest = useCallback(async (): Promise<void> => {
    await routerService.stopABTest();
    setABTest(null);
  }, []);

  return {
    decisions,
    config,
    slaMode,
    abTest,
    actions: {
      setFallbackChain,
      setDowngradeChain,
      updateFallbackLink,
      setSlaMode: setSlaModeAction,
      setConfig,
      getActiveProfile,
      setActiveProfile,
      updateActiveProfileWeights,
      startABTest,
      stopABTest,
    },
  };
}
