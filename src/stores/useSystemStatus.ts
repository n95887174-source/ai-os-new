import { useState, useEffect } from 'react';
import { systemStatusService } from '../kernel/instances';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import type { SystemStatusReport } from '../kernel/contracts/system-status';

const EVENTS_REFRESH = [EVENTS.KEY_STATE_CHANGED, EVENTS.GROUP_SYNC, EVENTS.KEY_ADDED, EVENTS.KEY_REMOVED, EVENTS.KERNEL_UPDATED];

/** Hook that tracks system status reactively — re-computes on key events */
export function useSystemStatus(): SystemStatusReport {
  const [report, setReport] = useState(() => systemStatusService.getStatus());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const recompute = () => {
      // H-29: Debounce to avoid N re-renders on batch events
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setReport(systemStatusService.getStatus());
        timer = null;
      }, 50);
    };
    const unsubs = EVENTS_REFRESH.map(e => eventBus.on(e, recompute));
    return () => {
      unsubs.forEach(u => u());
      if (timer) clearTimeout(timer);
    };
  }, []);

  return report;
}
