export type MemoryEntry = {
  id: string;
  content: string;
  vector?: number[];
  metadata: {
    source: string;
    type: 'decision' | 'observation' | 'fact';
    timestamp: number;
    importance: number;
  };
};
