import type { Phase } from './helpers';
import { ResearchEngineService } from '../services/research-engine-service';
import { GeminiAugmentedResearchService } from '../services/gemini-research-service';
import { googleGenAIService } from '../services/google-genai-service';

export const registerPhase9: Phase = ({ register, get }) => {
    const eventBus = get<{ emit: (event: string, data?: unknown) => void }>('eventBus');
    register('researchEngine', new ResearchEngineService({ eventBus }));

    const researchEngine = get<ResearchEngineService>('researchEngine');
    register(
        'geminiResearchService',
        new GeminiAugmentedResearchService({ googleGenAI: googleGenAIService, researchEngine }),
    );
};
