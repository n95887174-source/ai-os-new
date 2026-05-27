import type { Claim } from './types';

let _claimCounter = 0;

function nextClaimId(): string {
  _claimCounter++;
  return `c${_claimCounter}-${Date.now().toString(36)}`;
}

export function extractClaims(
  text: string,
  sourceArgumentId: string,
  speaker: string,
  role: string,
  round: number,
): Claim[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => {
      const clean = s.replace(/[[\]()]/g, '').trim();
      return clean.length > 25 && !clean.startsWith('-') && !clean.startsWith('*');
    });

  const claims: Claim[] = [];
  const seen = new Set<string>();

  for (const raw of sentences) {
    const normal = raw.toLowerCase()
      .replace(/[^a-zа-я0-9\s]/g, '')
      .trim();
    if (normal.length < 30) continue;
    const fingerprint = normal.split(/\s+/).slice(0, 8).join(' ');
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    claims.push({
      id: nextClaimId(),
      text: raw,
      sourceArgumentId,
      speaker,
      role,
      round,
      status: 'active',
      supportCount: 0,
      challengeCount: 0,
      createdAt: Date.now(),
    });
  }

  return claims;
}
