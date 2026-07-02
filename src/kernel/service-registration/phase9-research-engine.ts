import type { Phase } from './helpers';
import { ResearchEngineService } from '../services/research-engine-service';
import { GeminiAugmentedResearchService } from '../services/gemini-research-service';

export const registerPhase9: Phase = ({ register, get }) => {
    const eventBus = get<{ emit: (event: string, data?: unknown) => void }>('eventBus');
    register('researchEngine', new ResearchEngineService({ eventBus }));

    const googleGenAI =
        get<import('../services/google-genai-service').GoogleGenAIService>('googleGenAI');
    const researchEngine = get<ResearchEngineService>('researchEngine');
    if (googleGenAI && researchEngine) {
        register(
            'geminiResearchService',
            new GeminiAugmentedResearchService({ googleGenAI, researchEngine }),
        );
    }
};
