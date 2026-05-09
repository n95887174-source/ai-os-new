
/**
 * SuperAgents OS - Cognitive Database
 * 
 * A robust storage layer that provides a SQL-like interface for 
 * long-term persistence of chat history and system logs.
 * 
 * Uses IndexedDB for storage with a Promise-based API.
 */

class CognitiveDatabase {
  private dbName = 'super_agents_cognitive_db';
  private version = 1;

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Chat Sessions Table
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Chat History Table
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Provider Metrics Table
        if (!db.objectStoreNames.contains('metrics')) {
          const store = db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
          store.createIndex('provider', 'provider', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async query(storeName: string, indexName?: string, queryRange?: any): Promise<any[]> {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const request = target.getAll(queryRange);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async insert(storeName: string, data: any) {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string) {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const cognitiveDb = new CognitiveDatabase();
