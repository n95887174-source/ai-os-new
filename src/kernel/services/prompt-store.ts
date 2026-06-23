import { BucketStorageAdapter } from '../storage-adapter-instance';

const STORAGE_KEY = 'superagents_prompt_overrides';

export type PromptRole = 'attacker' | 'defender' | 'judge' | 'pro' | 'con' | 'default';

const DEFAULT_PROMPTS: Record<PromptRole, string> = {
  attacker: 'You are a critical examiner. Challenge assumptions, find flaws, and probe weaknesses in arguments.',
  defender: 'You are a defensive reasoner. Protect valid claims with evidence, address criticisms constructively.',
  judge: 'You are an impartial judge. Evaluate arguments based on logical validity, evidence, and coherence.',
  pro: 'You argue in favor of the proposition. Provide strong supporting evidence and reasoning.',
  con: 'You argue against the proposition. Identify weaknesses and present counterarguments.',
  default: 'Present your reasoning clearly and concisely.',
};

function loadOverrides(): Partial<Record<PromptRole, string>> {
  try {
    const raw = BucketStorageAdapter.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveOverrides(overrides: Partial<Record<PromptRole, string>>): void {
  try {
    BucketStorageAdapter.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

export function getPrompt(role: string | undefined): string {
  const overrides = loadOverrides();
  const r = (role as PromptRole) || 'default';
  return overrides[r] || DEFAULT_PROMPTS[r] || DEFAULT_PROMPTS.default;
}

export function setPrompt(role: PromptRole, prompt: string): void {
  const overrides = loadOverrides();
  overrides[role] = prompt;
  saveOverrides(overrides);
}

export function getAllPrompts(): Record<PromptRole, string> {
  const overrides = loadOverrides();
  const result = { ...DEFAULT_PROMPTS };
  for (const key of Object.keys(overrides) as PromptRole[]) {
    if (overrides[key]) result[key] = overrides[key]!;
  }
  return result;
}

export function resetAllPrompts(): void {
  try {
    BucketStorageAdapter.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
