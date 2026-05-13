import { create, insert, remove as oramaRemove, search as oramaSearch, type AnyOrama } from '@orama/orama';
import { pipeline } from '@huggingface/transformers';
import type { MemoryEntry } from '../types/memory';

let db: unknown = null;
let entries: MemoryEntry[] = [];
let extractor: unknown = null;
let semanticReady = false;
const vectors = new Map<string, number[]>();

const SCHEMA = {
  id: 'string',
  content: 'string',
  metadata: {
    source: 'string',
    type: 'string',
    timestamp: 'number',
    importance: 'number',
  },
} as const;

async function loadEmbeddingModel() {
  try {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    semanticReady = true;
  } catch (e) {
    self.postMessage({ type: 'semantic_error', payload: { message: (e as Error)?.message ?? String(e) } });
  }
}

async function getEmbedding(text: string): Promise<number[]> {
  const result = await (extractor as (text: string, opts: Record<string, unknown>) => Promise<{ data: number[] }>)(text, { pooling: 'mean', normalize: true });
  return Array.from((result as { data: number[] }).data) as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.onmessage = async (event: MessageEvent) => {
  const { requestId, type, payload } = event.data;

  try {
    switch (type) {

      case 'init': {
        db = await create({ schema: SCHEMA });
        entries = payload?.memories || [];
        for (const m of entries) {
          await insert(db as AnyOrama, m);
          if (m.vector) vectors.set(m.id, m.vector);
        }
        self.postMessage({ requestId, type: 'init' });
        break;
      }

      case 'enable_semantic': {
        await loadEmbeddingModel();
        self.postMessage({ requestId, type: 'semantic_ready' });
        break;
      }

      case 'insert': {
        const entry: MemoryEntry = payload.entry;
        if (db) await insert(db as AnyOrama, entry);
        entries.push(entry);

        let embedding: number[] | undefined;
        if (payload.generateEmbedding && semanticReady) {
          embedding = await getEmbedding(entry.content);
          vectors.set(entry.id, embedding);
        }

        self.postMessage({ requestId, type: 'insert', payload: { id: entry.id, embedding } });
        break;
      }

      case 'remove': {
        const id = payload.id;
        entries = entries.filter(e => e.id !== id);
        vectors.delete(id);
        try { if (db) await oramaRemove(db as AnyOrama, id); } catch {}
        self.postMessage({ requestId, type: 'remove', payload: { id } });
        break;
      }

      case 'search': {
        if (!db) {
          self.postMessage({ requestId, type: 'search', payload: { hits: [] } });
          break;
        }
        const results = await oramaSearch(db as AnyOrama, {
          term: payload.query,
          limit: payload.limit ?? 5,
          boost: { content: 2 },
        });
        self.postMessage({ requestId, type: 'search', payload: { hits: results.hits } });
        break;
      }

      case 'search_semantic': {
        if (!semanticReady || !db) {
          self.postMessage({ requestId, type: 'search_semantic', payload: { hits: [] } });
          break;
        }

        const queryVec = await getEmbedding(payload.query);
        const scored = entries
          .filter(e => vectors.has(e.id))
          .map(e => ({
            ...e,
            score: cosineSimilarity(queryVec, vectors.get(e.id)!),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, payload.limit ?? 5);

        self.postMessage({ requestId, type: 'search_semantic', payload: { hits: scored } });
        break;
      }

      default:
        self.postMessage({
          requestId,
          type: 'error',
          payload: { message: `Unknown message type: ${type}` },
        });
    }
  } catch (error) {
    self.postMessage({
      requestId,
      type: 'error',
      payload: { message: (error as Error)?.message ?? String(error) },
    });
  }
};
