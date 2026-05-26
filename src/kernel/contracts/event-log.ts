export interface KernelEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  seq: number;
}

export interface KernelEventLog {
  append(event: KernelEvent): void;
  replay(): KernelEvent[];
  size(): number;
  clear(): void;
}
