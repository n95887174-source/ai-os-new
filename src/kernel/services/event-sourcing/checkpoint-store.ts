export interface Checkpoint {
  readonly id: string;
  readonly label: string;
  readonly sequence: number;
  readonly timestamp: number;
  readonly stateSnapshot: unknown;
  readonly tags?: string[];
  readonly description?: string;
}

export interface CheckpointStoreConfig {
  readonly maxCheckpoints: number;
  readonly autoCheckpointInterval: number;
}

const DEFAULT_CONFIG: CheckpointStoreConfig = {
  maxCheckpoints: 50,
  autoCheckpointInterval: 0,
};

export class CheckpointStore {
  private checkpoints: Checkpoint[] = [];
  private config: CheckpointStoreConfig;
  private autoInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<CheckpointStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  create(label: string, sequence: number, stateSnapshot: unknown, options?: { tags?: string[]; description?: string }): Checkpoint {
    const cp: Checkpoint = {
      id: `cp-${crypto.randomUUID().slice(0, 8)}`,
      label,
      sequence,
      timestamp: Date.now(),
      stateSnapshot,
      tags: options?.tags,
      description: options?.description,
    };
    this.checkpoints.push(cp);
    if (this.checkpoints.length > this.config.maxCheckpoints) {
      this.checkpoints = this.checkpoints.slice(-this.config.maxCheckpoints);
    }
    return cp;
  }

  get(id: string): Checkpoint | undefined {
    return this.checkpoints.find(cp => cp.id === id);
  }

  getLatest(): Checkpoint | null {
    if (this.checkpoints.length === 0) return null;
    return this.checkpoints[this.checkpoints.length - 1];
  }

  getBySequence(sequence: number): Checkpoint | undefined {
    return [...this.checkpoints]
      .sort((a, b) => b.sequence - a.sequence)
      .find(cp => cp.sequence <= sequence);
  }

  getByLabel(label: string): Checkpoint[] {
    return this.checkpoints.filter(cp => cp.label.includes(label));
  }

  getByTag(tag: string): Checkpoint[] {
    return this.checkpoints.filter(cp => cp.tags?.includes(tag));
  }

  getAll(): Checkpoint[] {
    return [...this.checkpoints];
  }

  getRecent(count: number): Checkpoint[] {
    return this.checkpoints.slice(-count).reverse();
  }

  remove(id: string): boolean {
    const before = this.checkpoints.length;
    this.checkpoints = this.checkpoints.filter(cp => cp.id !== id);
    return this.checkpoints.length < before;
  }

  clear(): void {
    this.checkpoints = [];
  }

  getCount(): number {
    return this.checkpoints.length;
  }

  startAutoCheckpoint(
    getSnapshot: () => unknown,
    getSequence: () => number,
    labelPrefix = 'auto'
  ): void {
    this.stopAutoCheckpoint();
    if (this.config.autoCheckpointInterval <= 0) return;
    this.autoInterval = setInterval(() => {
      const seq = getSequence();
      this.create(
        `${labelPrefix}-${seq}`,
        seq,
        getSnapshot(),
        { tags: ['auto'] }
      );
    }, this.config.autoCheckpointInterval);
  }

  stopAutoCheckpoint(): void {
    if (this.autoInterval) {
      clearInterval(this.autoInterval);
      this.autoInterval = null;
    }
  }

  updateConfig(partial: Partial<CheckpointStoreConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  exportCheckpoints(): string {
    return JSON.stringify({ checkpoints: this.checkpoints });
  }

  importCheckpoints(json: string): number {
    try {
      const data = JSON.parse(json);
      const imported: Checkpoint[] = data.checkpoints ?? [];
      let count = 0;
      for (const cp of imported) {
        if (!this.checkpoints.some(c => c.id === cp.id)) {
          this.checkpoints.push(cp);
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  destroy(): void {
    this.stopAutoCheckpoint();
    this.checkpoints = [];
  }
}
