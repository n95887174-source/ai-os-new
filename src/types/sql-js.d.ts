declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export class Database {
    constructor(data?: Uint8Array);
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}

declare module 'sql.js/dist/sql-wasm.js' {
  export * from 'sql.js';
  import initSqlJs from 'sql.js';
  export default initSqlJs;
}
