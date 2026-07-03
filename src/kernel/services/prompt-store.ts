const STORAGE_KEY = 'superagents_prompt_overrides';

export type PromptRole = 'attacker' | 'defender' | 'judge' | 'pro' | 'con' | 'default';

const DEFAULT_PROMPTS: Record<PromptRole, string> = {
    attacker:
        'You are a critical examiner. Challenge assumptions, find flaws, and probe weaknesses in arguments.',
    defender:
        'You are a defensive reasoner. Protect valid claims with evidence, address criticisms constructively.',
    judge: 'You are an impartial judge. Evaluate arguments based on logical validity, evidence, and coherence.',
    pro: 'You argue in favor of the proposition. Provide strong supporting evidence and reasoning.',
    con: 'You argue against the proposition. Identify weaknesses and present counterarguments.',
    default: 'Present your reasoning clearly and concisely.',
};

let _db: Promise<import('../types/interfaces').IDatabaseService> | null = null;
async function db(): Promise<import('../types/interfaces').IDatabaseService> {
    if (!_db)
        _db = (async () => {
            const { database } = await import('../instances');
            return database;
        })();
    return _db;
}

async function loadOverrides(): Promise<Partial<Record<PromptRole, string>>> {
    try {
        const raw = await (await db()).getKv<Partial<Record<PromptRole, string>>>(STORAGE_KEY);
        return raw ?? {};
    } catch (e) {
        console.warn('[PromptStore] loadOverrides failed', e);
    }
    return {};
}

async function saveOverrides(overrides: Partial<Record<PromptRole, string>>): Promise<void> {
    try {
        await (await db()).setKv(STORAGE_KEY, overrides);
    } catch (e) {
        console.warn('[PromptStore] saveOverrides failed', e);
    }
}

export async function getPrompt(role: string | undefined): Promise<string> {
    const overrides = await loadOverrides();
    const r = (role as PromptRole) || 'default';
    return overrides[r] || DEFAULT_PROMPTS[r] || DEFAULT_PROMPTS.default;
}

export async function setPrompt(role: PromptRole, prompt: string): Promise<void> {
    const overrides = await loadOverrides();
    overrides[role] = prompt;
    await saveOverrides(overrides);
}

export async function getAllPrompts(): Promise<Record<PromptRole, string>> {
    const overrides = await loadOverrides();
    const result = { ...DEFAULT_PROMPTS };
    for (const key of Object.keys(overrides) as PromptRole[]) {
        if (overrides[key]) result[key] = overrides[key]!;
    }
    return result;
}

export async function resetAllPrompts(): Promise<void> {
    try {
        await (await db()).setKv(STORAGE_KEY, {});
    } catch (e) {
        console.warn('[PromptStore] resetAllPrompts failed', e);
    }
}
