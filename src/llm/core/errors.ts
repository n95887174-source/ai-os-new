export class LLMError extends Error {
  readonly provider: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    provider: string,
    statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'LLMError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class RetryableError extends LLMError {
  readonly attempt?: number;
  readonly retryAfter?: number;

  constructor(
    message: string,
    provider: string,
    statusCode?: number,
    attempt?: number,
    retryAfter?: number,
    options?: ErrorOptions,
  ) {
    super(message, provider, statusCode, options);
    this.name = 'RetryableError';
    this.attempt = attempt;
    this.retryAfter = retryAfter;
  }
}

export class SafetyError extends LLMError {
  readonly finishReason: 'SAFETY' | 'RECITATION';
  readonly safetyRatings?: Array<{ category: string; probability: string }>;

  constructor(
    provider: string,
    finishReason: 'SAFETY' | 'RECITATION',
    safetyRatings?: Array<{ category: string; probability: string }>,
  ) {
    super(`Generation blocked due to ${finishReason}`, provider);
    this.name = 'SafetyError';
    this.finishReason = finishReason;
    this.safetyRatings = safetyRatings;
  }
}

export class ModelValidationError extends LLMError {
  constructor(model: string, reason: string, provider: string) {
    super(`Invalid model "${model}": ${reason}`, provider);
    this.name = 'ModelValidationError';
  }
}

/**
 * Authentication error with dual-mode constructor:
 * - `new AuthError('providerName')` — auto-generates "Authentication failed for {providerName}"
 * - `new AuthError('Custom message', 'providerName')` — uses custom message
 */
export class AuthError extends LLMError {
  constructor(messageOrProvider: string, provider?: string, statusCode = 401) {
    super(
      provider ? messageOrProvider : `Authentication failed for ${messageOrProvider}`,
      provider ?? messageOrProvider,
      statusCode,
    );
    this.name = 'AuthError';
  }
}
