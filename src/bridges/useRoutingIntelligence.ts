import { useState, useEffect, useCallback } from 'react';
import { routerService } from '../kernel/instances';
import { settingsService } from '../kernel/instances';
import type { FallbackLink, RouterDecision, RoutingPolicySnapshot } from '../kernel/instances';
import type { ABTestConfig } from '../kernel/types/routing-types';

export interface RoutingState {
  decisions: RouterDecision[];
  config: RoutingPolicySnapshot | null;
  slaMode: string;
  abTest: ABTestConfig | null;
}

export interface RoutingActions {
  setFallbackChain: (strategy: string, chain: FallbackLink[]) => void;
  setDowngradeChain: (model: string, chain: string[]) => void;
  updateFallbackLink: (strategy: string, idx: number, patch: Partial<FallbackLink>) => void;
  setSlaMode: (mode: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<RoutingPolicySnapshot | null>>;
  getActiveProfile: () => string | undefined;
  setActiveProfile: (name: string) => Promise<void>;
  startABTest: (control: string, experiment: string, splitPercent: number) => Promise<boolean>;
  stopABTest: () => Promise<void>;
}

export interface UseRoutingResult extends RoutingState {
  actions: RoutingActions;
}

const POLL_INTERVAL = 3000;
const DECISION_LIMIT = 50;

export function useRoutingIntelligence(): UseRoutingResult {
  const [decisions, setDecisions] = useState<RouterDecision[]>(() => routerService.getDecisionHistory(DECISION_LIMIT));
  const [config, setConfig] = useState<RoutingPolicySnapshot | null>(() => routerService.getRawConfig());
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
    setConfig(routerService.getRawConfig());
  }, []);

  const setDowngradeChain = useCallback((model: string, chain: string[]) => {
    routerService.setDowngradeChain(model, chain);
    setConfig(routerService.getRawConfig());
  }, []);

  const updateFallbackLink = useCallback((strategy: string, idx: number, patch: Partial<FallbackLink>) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.fallbackChains[strategy] || [];
      return {
        ...current,
        fallbackChains: {
          ...current.fallbackChains,
          [strategy]: chain.map((link, i) => i === idx ? { ...link, ...patch } : link),
        },
      };
    });
  }, []);

  const setSlaModeAction = useCallback((mode: string) => {
    setSlaModeState(mode);
    settingsService.updateSettings({ slaMode: mode as any });
  }, []);

  const getActiveProfile = useCallback((): string | undefined => {
    const raw = routerService.getRawConfig();
    return raw?.activeProfile;
  }, []);

  const setActiveProfile = useCallback(async (name: string) => {
    await routerService.setActiveProfile(name);
    setConfig(routerService.getRawConfig());
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
      startABTest,
      stopABTest,
    },
  };
}
