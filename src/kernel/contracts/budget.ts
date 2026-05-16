import type { Result } from './results';
import type { ConfigError } from './errors';

export interface AgentBudget {
  agentId: string;
  monthlyBudget: number;
  spentThisMonth: number;
}

export interface SpendSummary {
  global: { budget: number; spent: number; remaining: number; pct: number };
  providers: Array<{ provider: string; budget: number; spent: number; remaining: number; pct: number }>;
  agents: Array<{ agentId: string; name: string; budget: number; spent: number; remaining: number; pct: number }>;
}

export interface BudgetAlert {
  type: 'global' | 'provider' | 'agent';
  level: number;
  entity: string;
  current: number;
  limit: number;
  message: string;
  timestamp: number;
}

export interface IBudgetService {
  init(): Promise<void>;
  destroy(): void;
  getAgentBudget(agentId: string): number | undefined;
  setAgentBudget(agentId: string, budget: number): void;
  getAllAgentBudgets(): Record<string, number>;
  getProviderBudget(provider: string): number | undefined;
  setProviderBudget(provider: string, budget: number): void;
  recordSpend(agentId: string | null, provider: string, amount: number): void;
  getSpendSummary(): SpendSummary;
  getAlertsHistory(): BudgetAlert[];
  trySetAgentBudget?(agentId: string, budget: number): Result<void, ConfigError>;
  trySetProviderBudget?(provider: string, budget: number): Result<void, ConfigError>;
}
