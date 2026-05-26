import { useState, useEffect } from 'react';
import { systemStatusService } from '../kernel/instances';
import { eventBus } from '../kernel/events/event-bus';
import type { SystemStatusReport } from '../kernel/contracts/system-status';

const EVENTS_REFRESH = ['key:state:changed', 'key:group:sync', 'key:added', 'key:removed', 'kernel:updated'];

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
