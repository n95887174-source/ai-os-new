import type { ITransaction } from '../contracts/transaction';

export class TransactionContext implements ITransaction {
  private pendingEmits: Array<{ event: string; data: unknown }> = [];
  private pendingPersists: Array<() => Promise<void>> = [];
  private commitCbs: Array<() => void> = [];
  private rollbackCbs: Array<() => void> = [];
  private _committed = false;
  private _rolledBack = false;

  readonly source: string;

  constructor(source = 'unknown') {
    this.source = source;
  }

  deferEmit(event: string, data?: unknown): void {
    if (this._committed || this._rolledBack) return;
    this.pendingEmits.push({ event, data });
  }

  deferPersist(fn: () => Promise<void>): void {
    if (this._committed || this._rolledBack) return;
    this.pendingPersists.push(fn);
  }

  onCommit(cb: () => void): void {
    if (this._committed) return;
    this.commitCbs.push(cb);
  }

  onRollback(cb: () => void): void {
    if (this._rolledBack) return;
    this.rollbackCbs.push(cb);
  }

  async commit(eventBus?: { emit: (event: string, data?: unknown) => void }): Promise<void> {
    if (this._committed || this._rolledBack) return;
    this._committed = true;
    for (const persist of this.pendingPersists) {
      await persist();
    }
    for (const { event, data } of this.pendingEmits) {
      eventBus?.emit(event, data);
    }
    for (const cb of this.commitCbs) cb();
  }

  async rollback(eventBus?: { emit: (event: string, data?: unknown) => void }): Promise<void> {
    if (this._committed || this._rolledBack) return;
    this._rolledBack = true;

    const emitCount = this.pendingEmits.length;
    const persistCount = this.pendingPersists.length;

    if (emitCount > 0 || persistCount > 0) {
      console.warn(`[Transaction] rollback from "${this.source}": dropped ${emitCount} deferred emits, ${persistCount} deferred persists`);
      eventBus?.emit('system:notification', {
        message: `Transaction rollback [${this.source}]: ${emitCount} events, ${persistCount} persists discarded`,
        type: 'warning',
        source: 'Transaction',
      });
    }

    for (const cb of this.rollbackCbs) cb();
    this.pendingEmits = [];
    this.pendingPersists = [];
    this.commitCbs = [];
    this.rollbackCbs = [];
  }
}
