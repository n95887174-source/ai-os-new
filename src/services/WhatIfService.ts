import { advisorService } from './AdvisorService';
import type { WhatIfScenario } from '../kernel/contracts/advisor';

export type { WhatIfScenario };

class WhatIfService {
  analyzeAddKey(provider: string): WhatIfScenario {
    return advisorService.analyzeAddKey(provider);
  }

  analyzeSwitchProvider(fromProvider: string, toProvider: string): WhatIfScenario {
    return advisorService.analyzeSwitchProvider(fromProvider, toProvider);
  }

  analyzeBudgetChange(currentBudget: number, newBudget: number): WhatIfScenario {
    return advisorService.analyzeBudgetChange(currentBudget, newBudget);
  }
}

export const whatIfService = new WhatIfService();
