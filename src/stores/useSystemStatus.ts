import { useState, useEffect } from 'react';
import { systemStatusService } from '../kernel/instances';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import type { SystemStatusReport } from '../kernel/contracts/system-status';

const EVENTS_REFRESH = [EVENTS.KEY_STATE_CHANGED, EVENTS.GROUP_SYNC, EVENTS.KEY_ADDED, EVENTS.KEY_REMOVED, EVENTS.KERNEL_UPDATED];

/** Hook that tracks system status reactively — re-computes on key events */
export function useSystemStatus(): SystemStatusReport {
  const [report, setReport] = useState(() => systemStatusService.getStatus());

  useEffect(() => {
    const recompute = () => setReport(systemStatusService.getStatus());
    const unsubs = EVENTS_REFRESH.map(e => eventBus.on(e, recompute));
    return () => unsubs.forEach(u => u());
  }, []);

  return report;
}
