import { useMemo } from 'react';
import type { TopologyNode } from '../../kernel/contracts/debate-runtime';

export function useActiveSpeaker(
  participants: TopologyNode[],
  streamingContent: Map<string, string>,
  currentThinking: Map<string, string>,
  sessionId: string | undefined,
): string | null {
  return useMemo(() => {
    for (const p of participants) {
      if (streamingContent.get(`${sessionId}:${p.id}`)) return p.id;
    }
    for (const p of participants) {
      if (currentThinking.get(`${sessionId}:${p.id}`)) return p.id;
    }
    return null;
  }, [participants, streamingContent, currentThinking, sessionId]);
}
