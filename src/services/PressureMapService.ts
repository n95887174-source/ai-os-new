import { advisorService } from './AdvisorService';
import type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../kernel/contracts/advisor';

export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel };

class PressureMapService {
  generateSnapshot(): PressureMapSnapshot {
    return advisorService.getPressureSnapshot();
  }

  getLastSnapshot(): PressureMapSnapshot | null {
    return advisorService.getLastPressureSnapshot();
  }

  onUpdate(cb: (snapshot: PressureMapSnapshot) => void): () => void {
    return advisorService.onPressureUpdate(cb);
  }

  startAutoRefresh(intervalMs = 10000) {
    advisorService.startAutoRefresh(intervalMs);
  }

  stopAutoRefresh() {
    advisorService.stopAutoRefresh();
  }

  destroy() {
    this.stopAutoRefresh();
  }
}

export const pressureMapService = new PressureMapService();
