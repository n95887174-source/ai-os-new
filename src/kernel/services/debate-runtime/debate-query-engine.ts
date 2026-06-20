import type { TimelineEntry } from '../../contracts/debate-runtime';
import type { DebateSession } from '../../contracts/debate-types';

export interface IDebateQueryEngine {
  query(
    session: DebateSession,
    criteria: {
      agentId?: string;
      round?: number;
      type?: string;
      confidenceMin?: number;
    }
  ): TimelineEntry[];
}

export class DebateQueryEngine implements IDebateQueryEngine {
  query(
    session: DebateSession,
    criteria: {
      agentId?: string;
      round?: number;
      type?: string;
      confidenceMin?: number;
    }
  ): TimelineEntry[] {
    // В текущей архитектуре Timeline хранится внутри сессии (или как часть state/snapshot)
    // Но DebateService также имеет доступ к arguments
    const entries: TimelineEntry[] = session.arguments.map(arg => ({
        type: 'agent:responded',
        payload: arg,
        timestamp: arg.timestamp
    })) as TimelineEntry[];

    return entries.filter(e => {
        const arg = e.payload as { agentId?: string; round?: number; confidence?: number };
        if (criteria.agentId && arg.agentId !== criteria.agentId) return false;
        if (criteria.round !== undefined && arg.round !== criteria.round) return false;
        if (criteria.confidenceMin !== undefined && (arg.confidence ?? 0) < criteria.confidenceMin) return false;
        return true;
    });
  }
}
