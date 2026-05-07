import { eventBus } from './events';
import type { KeyNote } from '../types/metrics';

/**
 * DatabaseService (SQLite Proxy)
 * 
 * Provides a SQL-like interface for persisting complex data.
 * Currently backed by JSON/LocalStorage, designed to be swapped with a real SQLite-WASM 
 * or Backend API without changing the consumer logic.
 */

export interface QueryResult<T> {
  rows: T[];
  affectedRows: number;
}

class DatabaseService {
  private dbName = 'super_agents_os_db';

  constructor() {
    this.init();
  }

  private init() {
    // Ensure tables exist in our "virtual sqlite"
    if (!localStorage.getItem(`${this.dbName}_notes`)) {
      localStorage.setItem(`${this.dbName}_notes`, JSON.stringify([]));
    }
  }

  /**
   * Execute a "SQL" query
   * Simplified for this OS: "SELECT * FROM notes WHERE keyId = ?"
   */
  async query<T>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    console.log(`[DB] Executing: ${sql}`, params);

    if (sql.includes('SELECT') && sql.includes('notes')) {
      const notes: KeyNote[] = JSON.parse(localStorage.getItem(`${this.dbName}_notes`) || '[]');
      const keyId = params[0];
      const filtered = notes.filter(n => n.keyId === keyId);
      return { rows: filtered as unknown as T[], affectedRows: 0 };
    }

    if (sql.includes('INSERT INTO notes')) {
      const notes: KeyNote[] = JSON.parse(localStorage.getItem(`${this.dbName}_notes`) || '[]');
      const [id, keyId, text, type, author, timestamp] = params;
      const newNote: KeyNote = { id, keyId, text, type, author, timestamp };
      notes.push(newNote);
      localStorage.setItem(`${this.dbName}_notes`, JSON.stringify(notes));
      
      eventBus.emit('db:row_inserted', { table: 'notes', id });
      return { rows: [], affectedRows: 1 };
    }

    if (sql.includes('DELETE FROM notes')) {
      const notes: KeyNote[] = JSON.parse(localStorage.getItem(`${this.dbName}_notes`) || '[]');
      const id = params[0];
      const filtered = notes.filter(n => n.id !== id);
      localStorage.setItem(`${this.dbName}_notes`, JSON.stringify(filtered));
      return { rows: [], affectedRows: 1 };
    }

    return { rows: [], affectedRows: 0 };
  }
}

export const db = new DatabaseService();
