/** Single source of truth for per-provider default model names.
 *  All production code should import from here instead of hardcoding model strings. */
export const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
    groq: 'llama-3.1-8b-instant',
    gemini: 'gemini-2.5-flash',
    gemini_flash: 'gemini-2.0-flash',
    gemini_pro: 'gemini-2.5-pro',
    anthropic: 'claude-3-5-sonnet',
    openrouter: 'anthropic/claude-3.5-sonnet',
    nvidia: 'meta/llama-3.1-8b-instruct',
    openai: 'gpt-4o',
    cerebras: 'cerebras-gpt-3.5',
    cloudflare: '@cf/meta/llama-3.1-8b-instruct',
};

/** Preferred models for each provider (ordered by quality). */
export const PROVIDER_PREFERRED_MODELS: Record<string, string[]> = {
    groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    anthropic: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'],
};
