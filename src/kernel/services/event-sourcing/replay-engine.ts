import type { RecordedEvent } from './event-recorder';
import type { Checkpoint } from './checkpoint-store';

export type ReplayStatus = 'idle' | 'playing' | 'paused' | 'completed';

export interface ReplayConfig {
  readonly speed: number;
  readonly stepMode: 'auto' | 'manual';
  readonly onEvent?: (event: RecordedEvent, index: number) => void;
  readonly onStatusChange?: (status: ReplayStatus) => void;
  readonly onCheckpoint?: (checkpoint: Checkpoint) => void;
}

export interface ReplaySnapshot {
  readonly status: ReplayStatus;
  readonly currentIndex: number;
  readonly totalEvents: number;
  readonly currentEvent: RecordedEvent | null;
  readonly speed: number;
  readonly stepMode: 'auto' | 'manual';
  readonly progress: number;
}

export class ReplayEngine {
  private events: RecordedEvent[] = [];
  private currentIndex = -1;
  private status: ReplayStatus = 'idle';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: ReplayConfig;
  private _onEvent: ((event: RecordedEvent, index: number) => void) | null = null;
  private statusListeners: Array<(status: ReplayStatus) => void> = [];
  private sessionStartTime = 0;

  constructor(config?: Partial<ReplayConfig>) {
    this.config = {
      speed: 1,
      stepMode: 'manual',
      ...config,
    };
    this._onEvent = config?.onEvent ?? null;
    if (config?.onStatusChange) {
      this.statusListeners.push(config.onStatusChange);
    }
  }

  load(events: RecordedEvent[]): void {
    this.events = [...events].sort((a, b) => a.sequence - b.sequence);
    this.currentIndex = -1;
    this.status = 'idle';
    this.clearTimer();
    this.emitStatus();
  }

  loadFromCheckpoint(checkpoint: Checkpoint, events: RecordedEvent[]): void {
    const filtered = events.filter(e => e.sequence > checkpoint.sequence);
    this.load(filtered);
  }

  append(events: RecordedEvent[]): void {
    const existing = new Set(this.events.map(e => e.sequence));
    const newEvents = events.filter(e => !existing.has(e.sequence));
    this.events = [...this.events, ...newEvents].sort((a, b) => a.sequence - b.sequence);
  }

  play(): boolean {
    if (this.events.length === 0) return false;
    if (this.status === 'completed') {
      this.currentIndex = -1;
    }
    this.status = 'playing';
    this.sessionStartTime = Date.now();
    this.emitStatus();
    this.processNext();
    return true;
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.clearTimer();
    this.emitStatus();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    this.emitStatus();
    this.processNext();
  }

  stop(): void {
    this.clearTimer();
    this.status = 'idle';
    this.currentIndex = -1;
    this.emitStatus();
  }

  stepForward(): RecordedEvent | null {
    if (this.currentIndex >= this.events.length - 1) return null;
    this.currentIndex++;
    const event = this.events[this.currentIndex];
    this._onEvent?.(event, this.currentIndex);
    if (this.currentIndex >= this.events.length - 1) {
      this.status = 'completed';
      this.emitStatus();
    }
    return event;
  }

  stepBackward(): RecordedEvent | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex--;
    const event = this.events[this.currentIndex];
    this._onEvent?.(event, this.currentIndex);
    return event;
  }

  jumpTo(index: number): RecordedEvent | null {
    if (index < 0 || index >= this.events.length) return null;
    this.currentIndex = index;
    const event = this.events[this.currentIndex];
    this._onEvent?.(event, this.currentIndex);
    return event;
  }

  jumpToSequence(sequence: number): RecordedEvent | null {
    const idx = this.events.findIndex(e => e.sequence === sequence);
    if (idx < 0) return null;
    return this.jumpTo(idx);
  }

  jumpToCheckpoint(checkpoint: Checkpoint): RecordedEvent | null {
    return this.jumpToSequence(checkpoint.sequence);
  }

  getCurrentEvent(): RecordedEvent | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.events.length) return null;
    return this.events[this.currentIndex];
  }

  getEventsInRange(fromSequence: number, toSequence: number): RecordedEvent[] {
    return this.events.filter(e => e.sequence >= fromSequence && e.sequence <= toSequence);
  }

  getEventsSince(sequence: number): RecordedEvent[] {
    return this.events.filter(e => e.sequence > sequence);
  }

  snapshot(): ReplaySnapshot {
    return {
      status: this.status,
      currentIndex: this.currentIndex,
      totalEvents: this.events.length,
      currentEvent: this.getCurrentEvent(),
      speed: this.config.speed,
      stepMode: this.config.stepMode,
      progress: this.events.length > 0 ? (this.currentIndex + 1) / this.events.length : 0,
    };
  }

  onEvent(cb: (event: RecordedEvent, index: number) => void): void {
    this._onEvent = cb;
  }

  onStatusChange(cb: (status: ReplayStatus) => void): () => void {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  setSpeed(speed: number): void {
    this.config.speed = Math.max(0.1, speed);
  }

  setStepMode(mode: 'auto' | 'manual'): void {
    this.config.stepMode = mode;
    if (mode === 'auto' && this.status === 'playing') {
      this.clearTimer();
      this.processNext();
    }
  }

  getEventLog(): RecordedEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.stop();
    this.events = [];
  }

  destroy(): void {
    this.clearTimer();
    this.statusListeners = [];
    this._onEvent = null;
    this.events = [];
  }

  private processNext(): void {
    if (this.status !== 'playing') return;
    if (this.currentIndex >= this.events.length - 1) {
      this.status = 'completed';
      this.emitStatus();
      return;
    }

    if (this.config.stepMode === 'manual') return;

    const event = this.stepForward();
    if (!event) {
      this.status = 'completed';
      this.emitStatus();
      return;
    }

    const delay = this.config.speed > 0 ? 1000 / this.config.speed : 0;
    this.timer = setTimeout(() => this.processNext(), delay);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emitStatus(): void {
    for (const cb of this.statusListeners) cb(this.status);
    this.config.onStatusChange?.(this.status);
  }
}
