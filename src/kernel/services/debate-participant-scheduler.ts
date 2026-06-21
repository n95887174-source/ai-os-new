import type { DebateParticipant, DebateSession } from '../contracts/debate-types';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('DebateParticipantScheduler');

export interface ParticipantSchedulerState {
  lastParticipantId: string | null;
}

export type LLMCallFn = (
  participant: DebateParticipant,
  prompt: string,
) => Promise<{ content: string }>;

export async function selectNextParticipant(
  session: DebateSession,
  state: ParticipantSchedulerState,
  callLLM: LLMCallFn,
): Promise<DebateParticipant | null> {
  if (session.strategy === 'socratic') {
    const questionerIdx = session.socraticQuestioner ?? 0;
    const questioner = session.participants[questionerIdx];
    const others = session.participants.filter((_, i) => i !== questionerIdx);
    const argsThisRound = session.arguments.filter((a) => a.round === session.currentRound);
    if (argsThisRound.length === 0 || argsThisRound[argsThisRound.length - 1].agentId === questioner.id) {
      return others[argsThisRound.length % others.length];
    }
    return questioner;
  }

  if (session.strategy === 'argument_tree') {
    const argsThisRound = session.arguments.filter((a) => a.round === session.currentRound).length;
    return session.participants[argsThisRound % session.participants.length];
  }

  if (session.strategy === 'round_robin') {
    const argCount = session.arguments.filter((a) => a.round === session.currentRound).length;
    return session.participants[argCount % session.participants.length];
  }

  if (session.strategy === 'free_for_all') {
    const candidates = session.participants.filter((p) => p.id !== state.lastParticipantId);
    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : session.participants[Math.floor(Math.random() * session.participants.length)];
    state.lastParticipantId = chosen.id;
    return chosen;
  }

  if (session.strategy === 'constrained') {
    const argCount = session.arguments.filter((a) => a.round === session.currentRound).length;
    return session.participants[argCount % session.participants.length];
  }

  try {
    const chosen = await selectModeratorParticipant(session, callLLM);
    if (chosen) return chosen;
  } catch (e) {
    LOGGER.warn('DebateParticipantScheduler', 'Moderator decision failed, falling through', { error: e });
  }

  const proArgs = session.arguments.filter((a) => a.position === 'pro').length;
  const conArgs = session.arguments.filter((a) => a.position === 'con').length;
  if (proArgs <= conArgs) {
    return session.participants.find((p) => p.role === 'pro') || session.participants[0];
  }
  return session.participants.find((p) => p.role === 'con') || session.participants[0];
}

async function selectModeratorParticipant(
  session: DebateSession,
  callLLM: LLMCallFn,
): Promise<DebateParticipant | null> {
  const recentArgs = session.arguments.slice(-6)
    .map((a) => `[${a.agentName} (${a.position})]: ${a.content}`)
    .join('\n\n');

  const participantList = session.participants
    .map((p) => `${p.id}: ${p.name} (${p.role})`)
    .join('\n');

  const prompt = `## Debate Moderation

You are a debate moderator. Review the recent arguments and decide which participant should speak next.

### Participants:
${participantList}

### Recent Arguments:
${recentArgs || 'No arguments yet — choose the first speaker.'}

### Your Task:
Respond with ONLY the participant ID (e.g., "agent-1") of the next speaker. Choose the participant whose perspective is most underrepresented or most needed to advance the debate.`;

  const moderator: DebateParticipant = {
    id: `moderator-${session.id}`,
    name: 'Debate Moderator',
    role: 'neutral',
    systemPrompt: 'You are an impartial debate moderator. You select the next speaker based on whose voice is most needed.',
  };

  const { content: response } = await callLLM(moderator, prompt);
  const chosenId = response.trim().toLowerCase();

  return session.participants.find((p) => p.id.toLowerCase() === chosenId)
    || session.participants.find((p) => chosenId.includes(p.id.toLowerCase()))
    || null;
}
