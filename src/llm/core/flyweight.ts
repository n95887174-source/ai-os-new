import type { SendMessageOptions } from './types';

export class LLMFlyweightConfig {
  private static pool: Map<string, SendMessageOptions> = new Map();

  static get(options?: SendMessageOptions): SendMessageOptions | undefined {
    if (!options) return undefined;

    // Construct unique serialization key for intrinsic properties
    const key = JSON.stringify({
      temp: options.temperature,
      tokens: options.maxOutputTokens,
      stop: options.stopSequences,
      format: options.responseFormat,
      safety: options.safetySettings,
    });

    if (!this.pool.has(key)) {
      // Freeze the options to enforce immutability of intrinsic state
      const immutableOptions = Object.freeze({
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        stopSequences: options.stopSequences ? Object.freeze([...options.stopSequences]) : undefined,
        responseFormat: options.responseFormat ? Object.freeze({ ...options.responseFormat }) : undefined,
        safetySettings: options.safetySettings
          ? Object.freeze(options.safetySettings.map(s => Object.freeze({ ...s })))
          : undefined,
        tools: options.tools, // Tools can be extrinsic/dynamic
      });
      this.pool.set(key, immutableOptions);
    }

    return this.pool.get(key);
  }

  static getPoolSize(): number {
    return this.pool.size;
  }

  static clear(): void {
    this.pool.clear();
  }
}
