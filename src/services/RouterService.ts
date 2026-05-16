import { db } from '../core/DatabaseService';
import { kernel } from '../core/Kernel';
import { keyService } from './KeyService';
import { pricingService } from './PricingService';
import { eventBus, EVENTS } from '../core/events';
import { budgetService } from './BudgetService';
import { policyService } from './PolicyService';
import { RouterService as KernelRouter } from '../kernel/services/provider-router';
import type { RouterConfig } from '../types/routing';
import { DEFAULT_ROUTER_CONFIG } from '../types/routing';

export type { RoutingStrategy, RouterDecision } from '../kernel/services/provider-router';
export type { RouterConfig } from '../types/routing';

export class RouterService extends KernelRouter {
  constructor() {
    super({
      kernel: kernel as any,
      keyService: keyService as any,
      pricingService: pricingService as any,
      eventBus,
      budgetService: budgetService as any,
      policyService: policyService as any,
      database: db as any,
    });
    this.init().catch(() => {});
    this.updateConfig(DEFAULT_ROUTER_CONFIG).catch(() => {});
  }
}

export const routerService = new RouterService();
