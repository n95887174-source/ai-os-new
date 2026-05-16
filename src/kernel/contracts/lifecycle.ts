export interface ILifecycle {
  init(): Promise<void>;
  start(): Promise<void>;
  destroy(): Promise<void>;
}
