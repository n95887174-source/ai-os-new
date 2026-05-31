import { EVENTS } from '../events/event-names';
import type { DebateParticipant, DebateSession } from '../contracts/debate-types';
import type { LLMCallFn } from './debate-participant-scheduler';

export async function generateDebateConsensus(
  session: DebateSession,
  callLLM: LLMCallFn,
  emit: (event: string, payload?: unknown) => void,
): Promise<void> {
  const keyDivergences = session.arguments
    .filter((a) => a.confidence > 0.7)
    .slice(-4)
    .map((a) => `[${a.agentName}]: ${a.content.slice(0, 200)}`)
    .join('\n\n');

  const participants = [...new Set(session.arguments.map((a) => a.agentName))].join(', ');

  const summaryPrompt = `## Topic: ${session.topic}

### Participants:
${participants}

### Key Arguments (highest confidence, most recent):
${keyDivergences}

Based on all arguments presented, provide a balanced synthesis that:
1. Identifies the KEY POINT OF DIVERGENCE between the participants — what is the core disagreement?
2. Acknowledges the strongest point from each side
3. Identifies areas of genuine agreement or common ground
4. Proposes a nuanced conclusion or resolution
5. Is approximately 150 words`;

  const consensusModerator: DebateParticipant = {
    id: `moderator-${session.id}`,
    name: 'Debate Moderator',
    role: 'neutral',
    systemPrompt: 'You are a fair and insightful debate moderator.',
  };

  try {
    session.consensus = (await callLLM(consensusModerator, summaryPrompt)).content;
    emit(EVENTS.DEBATE_CONSENSUS, {
      topic: session.topic,
      consensus: session.consensus,
      convergenceScore: session.convergenceScore,
    });
  } catch (error) {
    emit(EVENTS.NOTIFICATION, {
      message: `Failed to generate consensus: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'error',
    });
    session.consensus = 'Debate completed without consensus';
  }
}
