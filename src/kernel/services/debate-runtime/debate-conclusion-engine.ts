import type {
    DebateSessionSnapshot,
    TimelineEntry,
    AgentStateEntry,
} from '../../contracts/debate-runtime';
import type {
    DebateVerdict,
    ConclusionType,
    StanceResult,
    VerdictKeyArgument,
    VerdictFeedback,
    VerdictFeedbackVote,
} from '../../contracts/debate-types';
import type { DebateStore } from '../../contracts/storage/debate-store';
import { DebateVerdictRecordSchema } from '../../types/schema-types';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import { rootLogger } from '../logger-service';
import { safeJsonParse } from '../../../kernel/utils/safe-json';
import { sanitizePromptVar } from '../../../shared/utils/sanitize';
import type { DebateProviderResolver } from './debate-query-engine';
import { DEBATE_MODEL_PRIORITY } from './debate-query-engine';

const LOGGER = rootLogger.child('DebateConclusionEngine');

export type LlmCallFn = (prompt: string, signal?: AbortSignal) => Promise<string>;

function combineSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const sig of signals) {
        if (sig.aborted) {
            controller.abort(new Error('CombinedSignalAlreadyAborted'));
            return controller.signal;
        }
        sig.addEventListener('abort', () => controller.abort(new Error('CombinedSignalAborted')), {
            once: true,
        });
    }
    return controller.signal;
}

const MAX_ENHANCED_SESSIONS = 500;

export class DebateConclusionEngine {
    private feedbackLog: VerdictFeedback[] = [];
    private enhancedSessions = new Set<string>();
    private enhancementInFlight = false;
    private enhancementRetryAfter = 0;

    private pruneEnhancedSessions(): void {
        if (this.enhancedSessions.size > MAX_ENHANCED_SESSIONS) {
            const entries = Array.from(this.enhancedSessions);
            this.enhancedSessions = new Set(entries.slice(-MAX_ENHANCED_SESSIONS));
        }
    }

    constructor(private llmCall?: LlmCallFn) {}

    generateVerdict(snapshot: DebateSessionSnapshot, timeline: TimelineEntry[]): DebateVerdict {
        const agentResponses = timeline.filter((e) => e.type === 'agent:responded');
        const keyArguments = this.extractKeyArguments(agentResponses, snapshot.agentStates);
        const conclusionType = this.determineConclusionType(snapshot, keyArguments);
        const stanceResult = this.determineStanceResult(keyArguments);
        const summary = this.buildSummary(snapshot, conclusionType, stanceResult, keyArguments);
        const reasoning = this.buildReasoning(conclusionType, stanceResult, keyArguments, snapshot);

        return {
            sessionId: snapshot.id,
            topic: snapshot.topic,
            summary,
            conclusionType,
            stanceResult,
            keyArguments,
            reasoning,
            confidence:
                snapshot.totalTokens > 0
                    ? Math.min(0.95, 0.5 + (snapshot.round / Math.max(1, snapshot.round + 3)) * 0.3)
                    : 0.3,
            generatedAt: Date.now(),
            roundsTotal: snapshot.round,
            totalTokens: snapshot.totalTokens,
        };
    }

    private extractKeyArguments(
        responses: TimelineEntry[],
        _agentStates: AgentStateEntry[],
    ): VerdictKeyArgument[] {
        const args: VerdictKeyArgument[] = [];
        for (const resp of responses) {
            const payload = resp.payload as { agentId: string; content: string; round: number };
            if (!payload?.agentId || !payload?.content) continue;
            const stance = this.inferStance(payload.content);
            args.push({
                agentId: payload.agentId,
                agentName: payload.agentId,
                content: payload.content.slice(0, 500),
                stance,
                strength: this.estimateStrength(payload.content),
            });
        }
        return args;
    }

    private inferStance(content: string): 'pro' | 'con' | 'neutral' {
        const lower = content.toLowerCase();
        const proSignals = [
            'поддерживаю',
            'согласен',
            'верно',
            'преимущество',
            'плюс',
            'за',
            'advantage',
            'support',
            'agree',
            'benefit',
        ];
        const conSignals = [
            'возражают',
            'несогласен',
            'нет',
            'против',
            'минус',
            'риск',
            'disagree',
            'against',
            'risk',
            'drawback',
        ];
        const proCount = proSignals.filter((s) => lower.includes(s)).length;
        const conCount = conSignals.filter((s) => lower.includes(s)).length;
        if (proCount > conCount + 1) return 'pro';
        if (conCount > proCount + 1) return 'con';
        return 'neutral';
    }

    private estimateStrength(content: string): number {
        const len = content.length;
        const sentences = content.split(/[.!?]+/).length;
        const hasNumbers = /\d/.test(content) ? 0.1 : 0;
        const hasEvidence = /доказательств|исследовани|данных|evidence|study|data/i.test(content)
            ? 0.15
            : 0;
        const lengthScore = Math.min(0.4, len / 2000);
        const structureScore = Math.min(0.3, sentences / 20);
        return Math.min(1, lengthScore + structureScore + hasNumbers + hasEvidence + 0.2);
    }

    private determineConclusionType(
        snapshot: DebateSessionSnapshot,
        keyArguments: VerdictKeyArgument[],
    ): ConclusionType {
        const proCount = keyArguments.filter((a) => a.stance === 'pro').length;
        const conCount = keyArguments.filter((a) => a.stance === 'con').length;
        const total = keyArguments.length;
        if (total === 0) return 'inconclusive';
        if (snapshot.totalTokens < 500) return 'inconclusive';
        const dominantRatio = Math.max(proCount, conCount) / total;
        if (dominantRatio > 0.75) return 'dominance';
        if (proCount > 0 && conCount > 0 && dominantRatio < 0.6) return 'partial_agreement';
        if (proCount > 0 && conCount > 0) return 'consensus';
        return 'stalemate';
    }

    private determineStanceResult(keyArguments: VerdictKeyArgument[]): StanceResult {
        const proStrength = keyArguments
            .filter((a) => a.stance === 'pro')
            .reduce((s, a) => s + a.strength, 0);
        const conStrength = keyArguments
            .filter((a) => a.stance === 'con')
            .reduce((s, a) => s + a.strength, 0);
        const diff = proStrength - conStrength;
        if (diff > 0.5) return 'pro_wins';
        if (diff < -0.5) return 'con_wins';
        if (Math.abs(diff) < 0.15) return 'balanced';
        return 'no_clear_winner';
    }

    private buildSummary(
        snapshot: DebateSessionSnapshot,
        conclusionType: ConclusionType,
        stanceResult: StanceResult,
        _keyArguments: VerdictKeyArgument[],
    ): string {
        const typeLabels: Record<ConclusionType, string> = {
            consensus: 'участники пришли к общему мнению',
            dominance: 'одна сторона доминировала',
            stalemate: 'не удалось достичь согласия',
            partial_agreement: 'есть частичное согласие по отдельным аспектам',
            inconclusive: 'недостаточно данных для вывода',
        };
        const stanceLabels: Record<StanceResult, string> = {
            pro_wins: 'аргументы "за" убедительнее',
            con_wins: 'аргументы "против" убедительнее',
            balanced: 'аргументы сбалансированы',
            no_clear_winner: 'ясного победителя нет',
        };
        return `Тема: ${snapshot.topic}. ${typeLabels[conclusionType]}. ${stanceLabels[stanceResult]}. Участников: ${snapshot.agentStates?.length ?? 0}, раундов: ${snapshot.round}.`;
    }

    private buildReasoning(
        conclusionType: ConclusionType,
        stanceResult: StanceResult,
        keyArguments: VerdictKeyArgument[],
        snapshot: DebateSessionSnapshot,
    ): string {
        const lines: string[] = [];
        lines.push(
            `Заключение основано на ${keyArguments.length} аргументах за ${snapshot.round} раундов.`,
        );
        if (conclusionType === 'dominance') {
            const dominant =
                stanceResult === 'pro_wins'
                    ? 'за'
                    : stanceResult === 'con_wins'
                      ? 'против'
                      : 'одной стороне';
            lines.push(`Сторона ${dominant} выдвинула более убедительные аргументы.`);
        } else if (conclusionType === 'partial_agreement') {
            lines.push('Участники согласны по некоторым пунктам, но расходятся по другим.');
        } else if (conclusionType === 'stalemate') {
            lines.push('Аргументы обеих сторон оказались равносильными.');
        }
        if (keyArguments.length > 0) {
            const strongest = keyArguments.reduce(
                (best, a) => (a.strength > best.strength ? a : best),
                keyArguments[0],
            );
            lines.push(
                `Самый сильный аргумент: "${strongest.content.slice(0, 100)}..." (${strongest.agentName}).`,
            );
        }
        return lines.join(' ');
    }

    async generateVerdictWithLLM(
        snapshot: DebateSessionSnapshot,
        timeline: TimelineEntry[],
        signal?: AbortSignal,
    ): Promise<DebateVerdict> {
        const base = this.generateVerdict(snapshot, timeline);
        if (!this.llmCall) return base;
        if (this.enhancedSessions.has(snapshot.id)) return base;
        if (this.enhancementInFlight) return base;

        const now = Date.now();
        if (now < this.enhancementRetryAfter) {
            return base;
        }

        this.enhancementInFlight = true;
        try {
            const timeoutMs = 30_000;
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(
                () => timeoutController.abort(new Error('ConclusionTimedOut')),
                timeoutMs,
            );
            const combinedSignal = signal
                ? combineSignals(signal, timeoutController.signal)
                : timeoutController.signal;
            // Extract needed fields from snapshot BEFORE the await — the full
            // snapshot holds all argument content strings and would otherwise
            // stay alive in the async closure during the LLM call (2-10s).
            const round = snapshot.round;
            const agentCount = snapshot.agentStates.length;
            const prompt = this.buildLLMPrompt(base, round, agentCount);
            const response = await this.llmCall(prompt, combinedSignal);
            clearTimeout(timeoutId);
            const enhanced = this.parseLLMResponse(response, base);
            this.enhancedSessions.add(snapshot.id);
            this.pruneEnhancedSessions();
            return enhanced;
        } catch (e) {
            if (signal?.aborted) {
                this.enhancementInFlight = false;
                return base;
            }
            this.enhancedSessions.add(snapshot.id);
            this.pruneEnhancedSessions();
            this.enhancementRetryAfter = Date.now() + 10 * 60 * 1000;
            LOGGER.warn(
                'DebateConclusionEngine',
                'LLM verdict enhancement failed, using heuristic base',
                { error: e },
            );
            return base;
        } finally {
            this.enhancementInFlight = false;
        }
    }

    private buildLLMPrompt(verdict: DebateVerdict, round: number, agentCount: number): string {
        const argsSummary = verdict.keyArguments
            .slice(0, 10)
            .map(
                (a, i) =>
                    `${i + 1}. [${a.stance}] ${sanitizePromptVar(a.agentName)}: ${sanitizePromptVar(a.content.slice(0, 300))}`,
            )
            .join('\n');

        return `You are a debate analyst. Analyze the following debate verdict and provide an enhanced summary and reasoning.

DEBATE TOPIC: ${sanitizePromptVar(verdict.topic)}
ROUNDS: ${round}
PARTICIPANTS: ${agentCount}
CONCLUSION TYPE: ${verdict.conclusionType}
STANCE: ${verdict.stanceResult}

KEY ARGUMENTS:
${argsSummary}

Respond in JSON format:
{
  "summary": "A concise 2-3 sentence summary of the debate outcome",
  "reasoning": "A detailed explanation of WHY this conclusion was reached, citing specific arguments and patterns"
}

Respond ONLY with valid JSON, no markdown.`;
    }

    private parseLLMResponse(response: string, base: DebateVerdict): DebateVerdict {
        const cleaned = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        const parsed = safeJsonParse(cleaned) as { summary?: string; reasoning?: string };
        return {
            ...base,
            summary: parsed.summary || base.summary,
            reasoning: parsed.reasoning || base.reasoning,
        };
    }

    destroy(): void {
        this.feedbackLog = [];
        this.llmCall = undefined;
        this.enhancedSessions.clear();
        this.enhancementInFlight = false;
        this.enhancementRetryAfter = 0;
    }

    recordFeedback(sessionId: string, vote: VerdictFeedbackVote, comment?: string): void {
        this.feedbackLog.push({ sessionId, vote, comment, timestamp: Date.now() });
        if (this.feedbackLog.length > 500) this.feedbackLog.shift();
    }

    getFeedback(sessionId?: string): VerdictFeedback[] {
        return sessionId
            ? this.feedbackLog.filter((f) => f.sessionId === sessionId)
            : [...this.feedbackLog];
    }

    getFeedbackStats(sessionId: string): { agrees: number; disagrees: number; ratio: number } {
        const fb = this.getFeedback(sessionId);
        const agrees = fb.filter((f) => f.vote === 'agree').length;
        const disagrees = fb.filter((f) => f.vote === 'disagree').length;
        const total = agrees + disagrees;
        return { agrees, disagrees, ratio: total > 0 ? agrees / total : 0.5 };
    }
}

export interface ConclusionLlmDeps {
    getAdapterRegistry(): IAdapterRegistry;
    getKeyService(): {
        getKeys(): Array<{
            id: string;
            key: string;
            provider: string;
            status: string;
            model?: string;
            availableModels?: string[];
        }>;
    };
    getKeyStateStore?(): {
        get(
            id: string,
        ):
            | { flags: { authFailed: boolean; circuitOpen: boolean; rateLimited: boolean } }
            | undefined;
        update(id: string, patch: { flags: Record<string, boolean> }): void;
    };
    providerResolver: DebateProviderResolver;
}

export function buildConclusionLlmCall(
    deps: ConclusionLlmDeps,
): (prompt: string, signal?: AbortSignal) => Promise<string> {
    return async (prompt: string, signal?: AbortSignal): Promise<string> => {
        const adapterRegistry = deps.getAdapterRegistry();
        const keyService = deps.getKeyService();
        const keys = keyService.getKeys();
        const preferredProviders = [
            'groq',
            'gemini',
            'openrouter',
            'nvidia',
            'cerebras',
            'cloudflare',
        ];
        const messages = [{ role: 'user' as const, content: prompt }];
        const stateStore = deps.getKeyStateStore?.();
        const candidateKeys = [
            ...preferredProviders.flatMap((provider) =>
                keys.filter(
                    (k) =>
                        k.provider.toLowerCase() === provider &&
                        k.status === 'active' &&
                        !deps.providerResolver.isKeyAuthFailed(k.id),
                ),
            ),
            ...keys.filter(
                (k) => k.status === 'active' && !deps.providerResolver.isKeyAuthFailed(k.id),
            ),
        ];

        for (const activeKey of candidateKeys) {
            const keyState = stateStore?.get(activeKey.id);
            if (
                keyState?.flags.authFailed ||
                keyState?.flags.circuitOpen ||
                keyState?.flags.rateLimited
            )
                continue;
            const providerStatus = adapterRegistry.getProviderRuntimeStatus(activeKey.provider);
            if (providerStatus.circuitOpen || providerStatus.rateLimited) continue;

            const adapter = adapterRegistry.getAdapter(activeKey.provider);
            if (!adapter) continue;

            const model =
                activeKey.model && activeKey.model !== 'auto'
                    ? activeKey.model
                    : (DEBATE_MODEL_PRIORITY[activeKey.provider.toLowerCase()] ?? [])[0] || 'auto';

            try {
                const result = await adapter.sendMessage(messages, model, activeKey.key, signal);
                return typeof result.content === 'string' ? result.content : String(result.content);
            } catch (error) {
                const sc = (error as { statusCode?: number }).statusCode;
                const msg = String(error);
                const isProviderAuthError =
                    sc === 401 ||
                    sc === 402 ||
                    sc === 403 ||
                    msg.includes('401') ||
                    msg.includes('402') ||
                    msg.includes('403') ||
                    msg.includes('Unauthorized') ||
                    msg.includes('Forbidden') ||
                    msg.includes('Payment Required');
                const isProviderThrottle =
                    sc === 429 ||
                    msg.includes('429') ||
                    msg.includes('Too Many Requests') ||
                    msg.includes('Rate limit');
                if (isProviderAuthError || isProviderThrottle) {
                    const kss = deps.getKeyStateStore?.();
                    if (kss) {
                        try {
                            kss.update(activeKey.id, {
                                flags: {
                                    ...(keyState?.flags ?? {
                                        circuitOpen: false,
                                        rateLimited: false,
                                        authFailed: false,
                                    }),
                                    authFailed:
                                        (keyState?.flags.authFailed ?? false) ||
                                        isProviderAuthError,
                                    rateLimited:
                                        (keyState?.flags.rateLimited ?? false) ||
                                        isProviderThrottle,
                                },
                            });
                        } catch {
                            /* best-effort */
                        }
                    }
                    continue;
                }
                throw error;
            }
        }

        throw new Error('No usable key for conclusion LLM');
    };
}

export async function validateAndSaveVerdict(
    store: DebateStore,
    verdict: Omit<DebateVerdict, 'keyArguments'> & { keyArguments: string },
): Promise<void> {
    const vp = DebateVerdictRecordSchema.safeParse(verdict);
    if (!vp.success) {
        LOGGER.warn('DebateEngine', 'verdict validation failed', { errors: vp.error.issues });
        return;
    }
    await store.saveVerdict(verdict);
}
