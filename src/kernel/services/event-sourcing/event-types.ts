export interface RecordedEvent {
  readonly sequence: number;
  readonly event: string;
  readonly data: unknown;
  readonly timestamp: number;
  readonly checksum: string;
}

export type EventFilter = (event: RecordedEvent) => boolean;
