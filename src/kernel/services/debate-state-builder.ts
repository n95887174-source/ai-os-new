import type { DebateArgument } from './debate-service';

export interface ClaimEntry {
  agentName: string;
  role: string;
  text: string;
  round: number;
}

export interface DebateRoundState {
  round: number;
  claims: ClaimEntry[];
  /** agentNames that spoke this round */
  participants: string[];
}

export interface DebateState {
  rounds: DebateRoundState[];
  /** All claims ever made, flat */
  allClaims: ClaimEntry[];
  /** Claims from current round (most recent) */
  currentClaims: ClaimEntry[];
  /** Claims from previous round */
  previousClaims: ClaimEntry[];
  /** Claim texts from current participant already used in prior rounds */
  repeatedByAgent: Map<string, string[]>;
}

function extractClaims(arg: DebateArgument): string[] {
  return arg.content
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.startsWith('[') && !s.startsWith('('));
}

function normalizeClaim(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').trim();
}

export function buildDebateState(
  args: DebateArgument[],
  currentAgentId: string,
): DebateState {
  const byRound = new Map<number, DebateArgument[]>();
  for (const a of args) {
    const r = byRound.get(a.round) || [];
    r.push(a);
    byRound.set(a.round, r);
  }
  const roundNumbers = [...byRound.keys()].sort((a, b) => a - b);
  const currentRound = roundNumbers[roundNumbers.length - 1];
  const previousRound = roundNumbers.length >= 2 ? roundNumbers[roundNumbers.length - 2] : -1;

  const rounds: DebateRoundState[] = roundNumbers.map(r => {
    const raws = byRound.get(r)!;
    const claims: ClaimEntry[] = [];
    for (const raw of raws) {
      const texts = extractClaims(raw);
      for (const t of texts) {
        claims.push({ agentName: raw.agentName, role: raw.position, text: t, round: r });
      }
    }
    return { round: r, claims, participants: [...new Set(raws.map(a => a.agentName))] };
  });

  const allClaims = rounds.flatMap(r => r.claims);
  const currentClaims = currentRound >= 0 ? (rounds.find(r => r.round === currentRound)?.claims ?? []) : [];
  const previousClaims = previousRound >= 0 ? (rounds.find(r => r.round === previousRound)?.claims ?? []) : [];

  // Detect what the current agent already said in prior rounds
  const repeatedByAgent = new Map<string, string[]>();
  const agentPriorClaims = allClaims.filter(c => c.agentName === currentAgentId && c.round < currentRound);
  const agentCurrentClaimTexts = currentClaims
    .filter(c => c.agentName === currentAgentId)
    .map(c => normalizeClaim(c.text));

  for (const prior of agentPriorClaims) {
    for (const curText of agentCurrentClaimTexts) {
      const priorNorm = normalizeClaim(prior.text);
      // Simple word-overlap detection: if >60% words match, flag as repeat
      const priorWords = new Set(priorNorm.split(/\s+/));
      const curWords = curText.split(/\s+/);
      const overlap = curWords.filter(w => priorWords.has(w)).length;
      if (curWords.length > 0 && overlap / curWords.length > 0.6) {
        const list = repeatedByAgent.get(prior.agentName) || [];
        list.push(prior.text);
        repeatedByAgent.set(prior.agentName, list);
        break;
      }
    }
  }

  return { rounds, allClaims, currentClaims, previousClaims, repeatedByAgent };
}

/**
 * Build a structured prompt section from debate state.
 * Replaces the raw `[Agent]: text` dump with organized claims + diff.
 */
export function buildDebateStatePrompt(state: DebateState, participantName: string, round: number): string {
  const parts: string[] = [];

  // ── Claim summary (organized by participant) ──
  const byAgent = new Map<string, string[]>();
  for (const c of state.allClaims) {
    const list = byAgent.get(c.agentName) || [];
    let bullet = `- ${c.text}`;
    if (c.agentName === participantName) bullet += ' [YOU]';
    list.push(bullet);
    byAgent.set(c.agentName, list);
  }

  parts.push('### Claims Made So Far');
  for (const [agent, claims] of byAgent) {
    parts.push(`\n**${agent}**:`);
    parts.push(claims.join('\n'));
  }

  // ── What's new this round ──
  if (state.currentClaims.length > 0) {
    const newContent = state.currentClaims
      .filter(c => {
        // A claim is "new" if no prior round by another agent had the same normalized text
        const norm = normalizeClaim(c.text);
        return !state.previousClaims.some(p => normalizeClaim(p.text) === norm);
      })
      .map(c => `- [${c.agentName}]: ${c.text}`);

    if (newContent.length > 0) {
      parts.push('\n### New Arguments This Round');
      parts.push(newContent.join('\n'));
    }
  }

  // ── Pending counter-arguments (claims from previous round not yet addressed) ──
  const addressedRounds = new Set(state.currentClaims.map(c => c.round));
  const pending = state.previousClaims.filter(c => {
    const addressed = state.currentClaims.some(cur =>
      normalizeClaim(cur.text).includes(normalizeClaim(c.text).slice(0, 40)),
    );
    return !addressed;
  });
  if (pending.length > 0) {
    parts.push('\n### Arguments Awaiting Response');
    for (const p of pending) {
      parts.push(`- [${p.agentName}]: ${p.text}`);
    }
  }

  // ── Avoid repetition ──
  const repeats = state.repeatedByAgent.get(participantName);
  if (repeats && repeats.length > 0) {
    parts.push('\n### ⚠️ Detected Repetition');
    parts.push('You have made the following points in previous rounds. Do NOT repeat them. Either present new evidence or address unanswered arguments:');
    for (const r of repeats) {
      parts.push(`- "${r.slice(0, 100)}..."`);
    }
  }

  parts.push(`\n### Your Task (Round ${round})`);
  parts.push('DO NOT repeat previous arguments. Address new developments or respond to arguments that have not yet been answered. Strengthen your position with fresh reasoning or evidence. Respond in Russian.');

  return parts.join('\n');
}
