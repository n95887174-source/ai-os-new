import type { ApiKey } from '../types/metrics-types';
import type { DebateConfig, DebateParticipant, DebateServiceDeps, DebateSession } from '../contracts/debate-types';
import type { ISessionAffinityStore } from '../contracts/session-affinity';
import { ARGUMENT_STRATEGY_INSTRUCTIONS, getDefaultSystemPrompt } from './debate-prompt-builder';
import { estimateTokens } from '../utils/tokenEstimate';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('DebateLLMCaller');

const DEBATE_MODEL_PRIORITY: Record<string, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-2.5-flash'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
openrouter: ['openrouter/auto', 'openrouter/free'],
  nvidia: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'],
};

export interface DebateLLMCallerState {
  participantProviderMap: Map<string, { provider: string; keyId: string }>;
  failedProviders: Map<string, { provider: string; keyId: string; reason: string }>;
  getSession: () => DebateSession | null;
  getDefaultConfig: () => DebateConfig;
  buildHistoryMessages: (currentAgentId: string) => Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class DebateLLMCaller {
  constructor(
    private deps: Pick<DebateServiceDeps, 'keyService' | 'routerService' | 'adapterRegistry' | 'workspaceService'> & { sessionAffinityStore?: ISessionAffinityStore },
    private state: DebateLLMCallerState,
  ) {}

  isProviderFailed(provider: string): boolean {
    return Array.from(this.state.failedProviders.values()).some((v) => v.provider === provider);
  }

  pickBestModelForDebate(
    provider: string,
    availableModels: string[],
    requestedModel?: string,
    offset = 0,
  ): string {
    const p = provider.toLowerCase();
    if (requestedModel && requestedModel !== 'auto' && availableModels.includes(requestedModel)) {
      return requestedModel;
    }
    const priorities = DEBATE_MODEL_PRIORITY[p];
    if (priorities) {
      for (let i = 0; i < priorities.length; i++) {
        const model = priorities[(i + offset) % priorities.length];
        if (availableModels.includes(model)) return model;
      }
    }
    return availableModels[0] || 'auto';
  }

  async callLLM(
    participant: DebateParticipant,
    prompt: string,
    externalSignal?: AbortSignal,
  ): Promise<{ content: string; provider: string; model: string }> {
    const providerName = participant.provider ?? '';
    let key: ApiKey | undefined = providerName
      ? this.deps.keyService.getKeys().find(
        (k) => k.provider.toLowerCase() === providerName.toLowerCase()
          && k.status !== 'error'
          && !this.isProviderFailed(k.provider),
      )
      : undefined;

    if (!key) {
      const cached = this.state.participantProviderMap.get(participant.id);
      if (cached) {
        const cachedKey = this.deps.keyService.getKey(cached.keyId);
        if (cachedKey && cachedKey.status !== 'error' && !this.isProviderFailed(cachedKey.provider)) {
          key = cachedKey;
        }
      }
      if (!key) {
        const session = this.state.getSession();
        const debateProviders = this.deps.routerService.getDebateProviders(session?.participants.length ?? 2);
        const assignedProviders = new Set(
          Array.from(this.state.participantProviderMap.values()).map((v) => v.provider),
        );
        const available = debateProviders.find(
          (dp) => !assignedProviders.has(dp.provider)
            && dp.key.status !== 'error'
            && !this.isProviderFailed(dp.provider),
        ) || debateProviders.find(
          (dp) => dp.key.status !== 'error' && !this.isProviderFailed(dp.provider),
        );
        if (available) {
          key = available.key;
          this.state.participantProviderMap.set(participant.id, {
            provider: available.provider,
            keyId: available.key.id,
          });
        }
      }
    }

    if (!key) {
      const sessionId = this.state.getSession()?.id;
      const ranked = this.deps.routerService.getRankedProviders(
        'performance', prompt, 'normal', undefined, undefined, undefined, undefined, undefined, sessionId,
      );
      key = ranked.find((k) => k.status !== 'error' && !this.isProviderFailed(k.provider));
    }

    if (!key) throw new Error('No available API keys for debate');

    let lastError: Error | null = null;
    let attemptKey: ApiKey = key;

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const activeSession = this.state.getSession();
        if (activeSession && this.deps.sessionAffinityStore) {
          this.deps.sessionAffinityStore.bind(activeSession.id, attemptKey.id, attemptKey.provider, participant.id);
        }

        const adapter = this.deps.adapterRegistry.getAdapter(attemptKey.provider);
        if (!adapter) throw new Error(`No adapter for provider: ${attemptKey.provider}`);

        const modelFromParticipant = participant.provider
          && participant.provider.toLowerCase() === attemptKey.provider.toLowerCase()
          ? participant.modelId
          : undefined;
        const modelOffset = participant.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        const modelId = modelFromParticipant
          || this.pickBestModelForDebate(
            attemptKey.provider,
            attemptKey.availableModels ?? [],
            participant.modelId || 'auto',
            modelOffset,
          );

        const baseSystem = participant.systemPrompt || getDefaultSystemPrompt(participant.role as 'pro' | 'con' | 'neutral');
        const strategyBlock = participant.strategy
          ? `\n\n### Argument Strategy\n${ARGUMENT_STRATEGY_INSTRUCTIONS[participant.strategy]}`
          : '';
        const systemMessage = `You are ${participant.name}. ${baseSystem}${strategyBlock}\n\nCRITICAL: You must provide a UNIQUE perspective based on your specific role and expertise. Do NOT repeat arguments that other agents have already made. If a point has been covered, acknowledge it and ADD new reasoning from your domain. Your response must be distinguishable from every other agent's response.`;
        const ws = this.deps.workspaceService;
        const workspaceContext = ws?.isAttached() ? await ws.getFileTreeSnapshot() : null;
        const historyMessages = activeSession ? this.state.buildHistoryMessages(participant.id) : [];
        const messages = [
          { role: 'system' as const, content: systemMessage },
          ...(workspaceContext
            ? [{ role: 'system' as const, content: `[WORKSPACE FILES]\n${workspaceContext}\n\nYou can read any file by requesting the read_file tool.` }]
            : []),
          ...historyMessages,
          { role: 'user' as const, content: prompt },
        ];

        const defaultConfig = this.state.getDefaultConfig();
        const timeoutMs = activeSession?.config?.timeoutMs ?? defaultConfig.timeoutMs;
        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        if (externalSignal) {
          externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
        const maxTokens = activeSession?.config?.maxTokens ?? defaultConfig.maxTokens;
        const baseTemp = activeSession?.config?.temperature ?? defaultConfig.temperature;
        const hash = participant.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        const temperature = participant.temperature ?? (baseTemp + (hash % 10) * 0.04 - 0.18);
        const options: import('../../llm/core/types').SendMessageOptions = {
          temperature,
          maxOutputTokens: maxTokens,
        };

        const startTime = Date.now();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        let response: { content: string };
        try {
          response = await adapter.sendMessage(messages, modelId, attemptKey.key, controller.signal, options);
          clearTimeout(timeoutId);
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        } finally {
          if (externalSignal) {
            externalSignal.removeEventListener('abort', onExternalAbort);
          }
        }

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(response.content);
        this.deps.keyService.recordUsage(attemptKey.id, latency, tokens, modelId, {
          task: `debate-${participant.id}`,
          round: activeSession?.currentRound,
        });
        LOGGER.debug('DebateLLMCaller', 'Debate model resolved', {
          agent: participant.name,
          provider: attemptKey.provider,
          model: modelId,
          key: attemptKey.label || attemptKey.id.slice(0, 8),
        });
        return { content: response.content, provider: attemptKey.provider, model: modelId };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const errMsg = lastError.message;
        const recordModelId = attemptKey.availableModels?.[0] || attemptKey.provider;
        this.deps.keyService.recordUsage(attemptKey.id, 0, 0, recordModelId, {
          failed: true,
          error: errMsg,
          task: `debate-${participant.id}`,
          round: this.state.getSession()?.currentRound,
        });

        if (attempt === 0) {
          const sameProvider = this.deps.keyService.getKeys().filter(
            (k) => k.provider.toLowerCase() === attemptKey.provider.toLowerCase()
              && k.id !== attemptKey.id
              && k.status !== 'error'
              && !this.isProviderFailed(k.provider),
          );
          if (sameProvider.length > 0) {
            attemptKey = sameProvider[0];
            continue;
          }
        }

        this.state.failedProviders.set(attemptKey.id, {
          provider: attemptKey.provider,
          keyId: attemptKey.id,
          reason: errMsg,
        });

        const sessionId = this.state.getSession()?.id;
        const ranked = this.deps.routerService.getRankedProviders(
          'performance', prompt, 'normal', undefined, undefined, undefined, undefined, undefined, sessionId,
        );
        const nextKey = ranked.find(
          (k) => k.id !== attemptKey.id && k.status !== 'error' && !this.isProviderFailed(k.provider),
        );
        if (nextKey) {
          attemptKey = nextKey;
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('All retry attempts exhausted');
  }
}
