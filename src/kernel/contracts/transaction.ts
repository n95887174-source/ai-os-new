export interface ITransaction {
    deferEmit(event: string, data?: unknown): void;
    deferPersist(fn: () => Promise<void>): void;
    onCommit(cb: () => void): void;
    onRollback(cb: () => void): void;
}
