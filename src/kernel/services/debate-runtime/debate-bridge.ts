import type {
  DebateSessionSnapshot,
  DebatePhase,
  DebateTopology,
  ParticipantConfig,
  TimelineEntry,
} from '../../contracts/debate-runtime';
import type {
  DebateParticipant,
  DebateArgument,
  DebateConfig,
  DebateSession,
} from '../../contracts/debate-types';

export interface SnapshotBridgeContext {
  participants: DebateParticipant[];
  strategy: string;
  maxRounds: number;
  config: DebateConfig;
  timeline?: TimelineEntry[];
}

export function mapPhaseToLegacyStatus(phase: DebatePhase): DebateSession['status'] {
  if (phase === 'paused') return 'paused';
  if (phase === 'completed') return 'completed';
  if (phase === 'failed' || phase === 'cancelled') return 'completed';
  return 'active';
}

export function participantsToConfig(participants: DebateParticipant[]): ParticipantConfig[] {
  return participants.map((p) => ({
    agentId: p.id,
    nodeId: p.id,
    modelId: p.modelId,
    provider: p.provider,
    systemPrompt: p.systemPrompt,
  }));
}

export function buildRoundtableTopology(participants: DebateParticipant[]): DebateTopology {
  const nodes = participants.map((p) => ({
    id: p.id,
    label: p.name,
    role: p.role,
    modelId: p.modelId,
    provider: p.provider,
  }));
  const edges =
    participants.length > 1
      ? participants.map((p, i) => ({
          from: p.id,
          to: participants[(i + 1) % participants.length].id,
          type: 'sequential' as const,
        }))
      : [];
  return {
    id: `topo-${Date.now()}`,
    type: 'roundtable',
    nodes,
    edges,
  };
}

export function timelineToArguments(
  timeline: TimelineEntry[],
  participants: DebateParticipant[],
): DebateArgument[] {
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const roleById = new Map(participants.map((p) => [p.id, p.role]));
  return timeline
    .filter((e) => e.type === 'agent:responded')
    .map((e, idx) => {
      const payload = e.payload as { agentId?: string; content?: string; round?: number };
      const agentId = payload.agentId ?? 'unknown';
      return {
        id: e.id || `arg-${idx}`,
        agentId,
        agentName: nameById.get(agentId) || agentId,
        content: payload.content ?? '',
        confidence: 0.7,
        timestamp: e.timestamp,
        round: payload.round ?? 1,
        position: roleById.get(agentId) ?? 'neutral',
        source: 'llm' as const,
      };
    });
}

export function snapshotToSession(
  snapshot: DebateSessionSnapshot,
  ctx: SnapshotBridgeContext,
): DebateSession {
  const args = ctx.timeline ? timelineToArguments(ctx.timeline, ctx.participants) : [];
  return {
    id: snapshot.id,
    topic: snapshot.topic,
    status: mapPhaseToLegacyStatus(snapshot.phase),
    strategy: ctx.strategy,
    maxRounds: ctx.maxRounds,
    currentRound: Math.max(1, snapshot.round),
    participants: ctx.participants,
    arguments: args,
    convergenceScore: 0,
    openingStatements: args.filter((a) => a.round === 0),
    config: ctx.config,
    socraticQuestioner: 0,
    argumentTreeRoundMap: new Map(),
  };
}
