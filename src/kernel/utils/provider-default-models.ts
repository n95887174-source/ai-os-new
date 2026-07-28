/** Single source of truth for per-provider default model names.
 *  All production code should import from here instead of hardcoding model strings. */
export const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
    groq: 'llama-3.3-70b-versatile',
    gemini: 'gemini-2.0-flash',
    gemini_flash: 'gemini-3.1-flash-lite',
    gemini_pro: 'gemini-3.1-pro',
    anthropic: 'claude-3-5-sonnet',
    openrouter: 'meta-llama/llama-3.1-8b-instruct',
    nvidia: 'meta/llama-3.1-8b-instruct',
    openai: 'gpt-4o',
    cerebras: 'cerebras-gpt-3.5',
    cloudflare: '@cf/meta/llama-3.1-8b-instruct',
};

/** Preferred models for each provider (ordered by quality). */
export const PROVIDER_PREFERRED_MODELS: Record<string, string[]> = {
    groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'llama-3.1-8b-instant'],
    gemini: ['gemini-2.0-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite'],
    anthropic: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'],
    nvidia: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct', 'mistral-7b-instruct'],
    'nvidia-nim': ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct'],
};
