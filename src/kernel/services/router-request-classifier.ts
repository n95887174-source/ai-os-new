import type { RouterConfig } from '../types/routing-types';
import type { RequestClassification, RequestIntent, RequestLanguage } from './router-types';

// B10-152: Cache compiled RegExp to avoid re-compiling on every call
const regexCache = new Map<string, RegExp>();

function getRegex(pattern: string, flags = 'i'): RegExp {
  const key = `${flags}:${pattern}`;
  let r = regexCache.get(key);
  if (!r) { r = new RegExp(pattern, flags); regexCache.set(key, r); }
  return r;
}

const MATH_PATTERNS = /\b(integral|derivative|equation|theorem|proof|solve|compute|calculate|matrix|vector|∑|∫|π)\b/i;
const CREATIVE_PATTERNS = /\b(poem|story|essay|creative|write|generate|imagine|art|design|draft|novel)\b/i;
const FACTUAL_PATTERNS = /\b(fact|explain|define|what is|describe|summarize|overview|background|history|define|meaning)\b/i;
const ANALYSIS_PATTERNS = /\b(compare|contrast|analyze|evaluate|assess|why|how does|implications|pros.*cons|trade.?off)\b/i;
const RUSSIAN_PATTERNS = /[а-яА-ЯёЁ]/;

export function classifyRequest(
  classification: RouterConfig['classification'],
  prompt: string,
): RequestClassification {
  const codePatterns = getRegex(classification.codePatterns, 'i');
  const reasoningPatterns = getRegex(classification.reasoningPatterns, 'i');
  const multimodalPatterns = getRegex(classification.multimodalPatterns, 'i');
  const length = prompt.length;

  let intent: RequestIntent = 'general';
  if (codePatterns.test(prompt)) intent = 'code';
  else if (MATH_PATTERNS.test(prompt)) intent = 'math';
  else if (ANALYSIS_PATTERNS.test(prompt)) intent = 'analysis';
  else if (CREATIVE_PATTERNS.test(prompt)) intent = 'creative';
  else if (FACTUAL_PATTERNS.test(prompt)) intent = 'factual';

  const language: RequestLanguage = RUSSIAN_PATTERNS.test(prompt) ? 'ru' : 'en';

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
