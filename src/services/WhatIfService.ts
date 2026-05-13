import type { ApiKey } from '../types/metrics';
import { FREE_TIER_LIMITS } from './KeyService';
import { pricingService } from './PricingService';

export interface WhatIfScenario {
  id: string;
  title: string;
  description: string;
  type: 'add_key' | 'switch_provider' | 'change_strategy' | 'add_budget';
  impact: {
    dailyLimitIncrease: number;
    costChange: number;
    probability429Reduction: number;
    latencyImpact: string;
  };
}

class WhatIfService {
  analyzeAddKey(keys: ApiKey[], providerToAdd: string): WhatIfScenario {
    const existingKeys = keys.filter(k => k.provider.toLowerCase() === providerToAdd.toLowerCase());
    const limit = FREE_TIER_LIMITS[providerToAdd]?.requestsPerDay || 0;
    const currentUsage = existingKeys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0);
    const totalLimit = (existingKeys.length + 1) * limit;
    const dailyLimitIncrease = limit;

    const totalRequests = keys.reduce((s, k) => s + (k.stats?.successCount || 0), 0);
    const current429s = keys.reduce((s, k) => s + (k.stats?.extended?.errorBreakdown?.rateLimit || 0), 0);
    const current429Rate = totalRequests > 0 ? current429s / totalRequests : 0;
    const new429Rate = Math.max(0, current429Rate - current429Rate * (1 / (existingKeys.length + 2)));
    const probability429Reduction = Math.round((current429Rate - new429Rate) * 100);

    const avgCostPerRequest = keys.length > 0
      ? keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0) / Math.max(1, totalRequests)
      : 0;
    const additionalCostPerDay = avgCostPerRequest * limit * 0.5;
    const currentCost = totalRequests * avgCostPerRequest;
    const costChange = currentCost > 0 ? (additionalCostPerDay / currentCost) * 100 : 0;

    const avgLatency = keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length);

    return {
      id: crypto.randomUUID().slice(0, 8),
      title: `Add ${providerToAdd} key`,
      description: `Adding another ${providerToAdd} key increases daily capacity by ${limit.toLocaleString()} requests and reduces 429 probability by ~${probability429Reduction}%.`,
      type: 'add_key',
      impact: {
        dailyLimitIncrease,
        costChange: Math.round(costChange * 100) / 100,
        probability429Reduction,
        latencyImpact: avgLatency > 0 ? `${Math.round(avgLatency)}ms (current avg)` : 'Unknown',
      },
    };
  }

  analyzeSwitchProvider(keys: ApiKey[], fromProvider: string, toProvider: string): WhatIfScenario {
    const fromLimit = FREE_TIER_LIMITS[fromProvider]?.requestsPerDay || 0;
    const toLimit = FREE_TIER_LIMITS[toProvider]?.requestsPerDay || 0;

    return {
      id: crypto.randomUUID().slice(0, 8),
      title: `Switch from ${fromProvider} to ${toProvider}`,
      description: toLimit > fromLimit
        ? `Switching to ${toProvider} increases daily capacity by ${(toLimit - fromLimit).toLocaleString()} requests.`
        : `${toProvider} has lower limits (${toLimit.toLocaleString()} vs ${fromLimit.toLocaleString()}). Consider keeping both.`,
      type: 'switch_provider',
      impact: {
        dailyLimitIncrease: toLimit - fromLimit,
        costChange: 0,
        probability429Reduction: toLimit > fromLimit ? 15 : -10,
        latencyImpact: toLimit > fromLimit ? 'May vary by model' : 'Potentially slower',
      },
    };
  }

  analyzeBudgetChange(keys: ApiKey[], currentBudget: number, newBudget: number): WhatIfScenario {
    const totalCost = keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0);
    const currentProjection = totalCost > 0 ? totalCost * 30 : 0;

    return {
      id: crypto.randomUUID().slice(0, 8),
      title: `Change budget to $${newBudget}/month`,
      description: currentBudget === 0
        ? `Setting a $${newBudget}/month budget enables cost alerts when spending approaches the limit.`
        : `Increasing budget from $${currentBudget} to $${newBudget} allows ${Math.round((newBudget - currentBudget) / (totalCost || 1))} more days of current usage.`,
      type: 'add_budget',
      impact: {
        dailyLimitIncrease: 0,
        costChange: ((newBudget - currentBudget) / Math.max(1, currentBudget)) * 100,
        probability429Reduction: newBudget > currentBudget ? 5 : 0,
        latencyImpact: 'No direct impact',
      },
    };
  }
}

export const whatIfService = new WhatIfService();
