/**
 * Embeddings Adapter Interface and Implementations
 * Supports OpenAI, Voyage, Jina, and Ollama embeddings
 */

export interface EmbeddingsConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  batchSize?: number;
  maxRetries?: number;
}

export interface EmbedResult {
  embedding: number[];
  index: number;
}

export interface EmbeddingsResponse {
  data: EmbedResult[];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Base interface for embeddings adapters
 */
export interface IEmbeddingsAdapter {
  /** Embed a single text */
  embed(text: string): Promise<number[]>;
  
  /** Embed multiple texts in batch */
  embedBatch(texts: string[]): Promise<number[][]>;
  
  /** Get the embedding dimension */
  getDimension(): number;
  
  /** Check if the adapter is available (configured) */
  isAvailable(): boolean;
  
  /** Get model name */
  getModelName(): string;
}

/**
 * OpenAI Embeddings Adapter
 */
export class OpenAIEmbeddingsAdapter implements IEmbeddingsAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private dimension: number;

  constructor(config: EmbeddingsConfig) {
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.model = config.model || 'text-embedding-3-small';
    this.dimension = this.model.includes('3-large') ? 3072 : 1536;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embeddings error: ${error}`);
    }

    const data = await response.json() as EmbeddingsResponse;
    return data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);
  }

  getDimension(): number {
    return this.dimension;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * Voyage AI Embeddings Adapter
 */
export class VoyageEmbeddingsAdapter implements IEmbeddingsAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private dimension: number;

  constructor(config: EmbeddingsConfig) {
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || 'https://api.voyageai.com/v1';
    this.model = config.model || 'voyage-3';
    this.dimension = 1024;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Voyage API key not configured');
    }

    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage embeddings error: ${error}`);
    }

    const data = await response.json() as EmbeddingsResponse;
    return data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);
  }

  getDimension(): number {
    return this.dimension;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * Jina AI Embeddings Adapter
 */
export class JinaEmbeddingsAdapter implements IEmbeddingsAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private dimension: number;

  constructor(config: EmbeddingsConfig) {
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || 'https://api.jina.ai/v1';
    this.model = config.model || 'jina-embeddings-v3';
    this.dimension = 1024;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Jina API key not configured');
    }

    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jina embeddings error: ${error}`);
    }

    const data = await response.json() as EmbeddingsResponse;
    return data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);
  }

  getDimension(): number {
    return this.dimension;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * Ollama Embeddings Adapter (local)
 */
export class OllamaEmbeddingsAdapter implements IEmbeddingsAdapter {
  private baseURL: string;
  private model: string;
  private dimension: number;

  constructor(config: EmbeddingsConfig) {
    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.model = config.model || 'nomic-embed-text';
    this.dimension = 768; // nomic-embed-text dimension
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseURL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embeddings error: ${error}`);
    }

    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't support batch natively, embed sequentially
    const results: number[][] = [];
    for (const text of texts) {
      const embedding = await this.embed(text);
      results.push(embedding);
    }
    return results;
  }

  getDimension(): number {
    return this.dimension;
  }

  isAvailable(): boolean {
    // Check if Ollama is running
    return true; // Will fail on actual call if not available
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * Embeddings Adapter Registry
 */
export type EmbeddingsProvider = 'openai' | 'voyage' | 'jina' | 'ollama';

export class EmbeddingsAdapterFactory {
  private static adapters: Map<EmbeddingsProvider, IEmbeddingsAdapter> = new Map();

  static create(provider: EmbeddingsProvider, config: EmbeddingsConfig): IEmbeddingsAdapter {
    let adapter: IEmbeddingsAdapter;

    switch (provider) {
      case 'openai':
        adapter = new OpenAIEmbeddingsAdapter(config);
        break;
      case 'voyage':
        adapter = new VoyageEmbeddingsAdapter(config);
        break;
      case 'jina':
        adapter = new JinaEmbeddingsAdapter(config);
        break;
      case 'ollama':
        adapter = new OllamaEmbeddingsAdapter(config);
        break;
      default:
        throw new Error(`Unknown embeddings provider: ${provider}`);
    }

    this.adapters.set(provider, adapter);
    return adapter;
  }

  static get(provider: EmbeddingsProvider): IEmbeddingsAdapter | undefined {
    return this.adapters.get(provider);
  }

  static getAvailable(): EmbeddingsProvider[] {
    return Array.from(this.adapters.entries())
      .filter(([, adapter]) => adapter.isAvailable())
      .map(([provider]) => provider);
  }
}