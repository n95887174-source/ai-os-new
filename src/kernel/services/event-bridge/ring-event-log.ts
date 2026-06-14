import type { KernelEvent, KernelEventLog } from '../../contracts/event-log';

export class RingEventLog implements KernelEventLog {
  private buffer: KernelEvent[] = [];
  private cursor = 0;
  private seq = 0;
  /** True if the buffer has wrapped at least once — consumers can check for gaps */
  hasWrapped = false;
  /** The first sequence number still in the buffer (valid after first wrap) */
  firstAvailableSeq = -1;

  constructor(private maxSize = 10_000) {}

  append(event: KernelEvent): void {
    const entry = { ...event, seq: this.seq++ };
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(entry);
    } else {
      if (!this.hasWrapped) {
        this.hasWrapped = true;
        this.firstAvailableSeq = this.buffer[this.cursor]?.seq ?? -1;
        console.info('[RingEventLog] Buffer wrapped — oldest events evicted', { maxSize: this.maxSize, firstAvailableSeq: this.firstAvailableSeq });
      }
      this.buffer[this.cursor] = entry;
      this.cursor = (this.cursor + 1) % this.maxSize;
      this.firstAvailableSeq = this.buffer[this.cursor]?.seq ?? -1;
    }
  }

  replay(): KernelEvent[] {
    if (this.buffer.length < this.maxSize) return [...this.buffer];
    const ordered: KernelEvent[] = [];
    for (let i = 0; i < this.maxSize; i++) {
      ordered.push(this.buffer[(this.cursor + i) % this.maxSize]);
    }
    return ordered;
  }

  size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
    this.cursor = 0;
    this.seq = 0;
    this.hasWrapped = false;
    this.firstAvailableSeq = -1;
  }
}
