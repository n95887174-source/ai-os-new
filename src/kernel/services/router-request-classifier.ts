import type { RouterConfig } from '../types/routing-types';
import type { RequestClassification, RequestIntent, RequestLanguage } from './router-types';

export function classifyRequest(
  classification: RouterConfig['classification'],
  prompt: string,
): RequestClassification {
  const codePatterns = new RegExp(classification.codePatterns, 'i');
  const reasoningPatterns = new RegExp(classification.reasoningPatterns, 'i');
  const multimodalPatterns = new RegExp(classification.multimodalPatterns, 'i');
  const length = prompt.length;

  const mathPatterns = /\b(integral|derivative|equation|theorem|proof|solve|compute|calculate|matrix|vector|∑|∫|π)\b/i;
  const creativePatterns = /\b(poem|story|essay|creative|write|generate|imagine|art|design|draft|novel)\b/i;
  const factualPatterns = /\b(fact|explain|define|what is|describe|summarize|overview|background|history|define|meaning)\b/i;
  const analysisPatterns = /\b(compare|contrast|analyze|evaluate|assess|why|how does|implications|pros.*cons|trade.?off)\b/i;
  const russianPatterns = /[а-яА-ЯёЁ]/;

  let intent: RequestIntent = 'general';
  if (codePatterns.test(prompt)) intent = 'code';
  else if (mathPatterns.test(prompt)) intent = 'math';
  else if (analysisPatterns.test(prompt)) intent = 'analysis';
  else if (creativePatterns.test(prompt)) intent = 'creative';
  else if (factualPatterns.test(prompt)) intent = 'factual';

  const language: RequestLanguage = russianPatterns.test(prompt) ? 'ru' : 'en';

  return {
    complexity:
      length > classification.complexThreshold || reasoningPatterns.test(prompt)
        ? 'complex'
        : length > classification.mediumThreshold
          ? 'medium'
          : 'simple',
    isCode: codePatterns.test(prompt),
    isLong: length > classification.longThreshold,
    isMultimodal: multimodalPatterns.test(prompt),
    intent,
    language,
  };
}
