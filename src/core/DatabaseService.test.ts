import { describe, it, expect, beforeEach } from 'vitest';
import { dexieDb, db } from './DatabaseService';

describe('DatabaseService', () => {
  beforeEach(async () => {
    await dexieDb.notes.clear();
    await dexieDb.memories.clear();
    await dexieDb.keyValue.clear();
  });

  it('should insert and query notes via Dexie directly', async () => {
    const noteId = 'note-1';
    const keyId = 'key-1';
    
    await dexieDb.notes.add({
      id: noteId,
      keyId,
      text: 'Test Note',
      type: 'ai',
      author: 'system',
      timestamp: Date.now()
    });

    const rows = await dexieDb.notes.where('keyId').equals(keyId).toArray();
    
    expect(rows.length).toBe(1);
    expect(rows[0].text).toBe('Test Note');
  });

  it('should delete notes via Dexie directly', async () => {
    const noteId = 'note-2';
    await dexieDb.notes.add({
      id: noteId,
      keyId: 'key-2',
      text: 'To be deleted',
      type: 'ai',
      author: 'user',
      timestamp: Date.now()
    });

    await dexieDb.notes.delete(noteId);
    
    const count = await dexieDb.notes.count();
    expect(count).toBe(0);
  });

  it('should work with IndexedDB directly', async () => {
    await dexieDb.notes.add({
      id: 'direct-1',
      keyId: 'key-1',
      text: 'Direct Dexie',
      type: 'ai',
      author: 'agent',
      timestamp: Date.now()
    });

    const note = await dexieDb.notes.get('direct-1');
    expect(note?.text).toBe('Direct Dexie');
  });

  it('should export all tables to JSON', async () => {
    await dexieDb.notes.add({ id: 'n1', keyId: 'k1', text: 'test', type: 'ai', author: 'u', timestamp: 1 });
    await dexieDb.memories.add({ id: 'm1', content: 'mem', metadata: { source: 's', type: 'fact', timestamp: 1, importance: 0.5 } });
    await dexieDb.keyValue.put({ id: 'kv1', value: 'val', createdAt: 1 });

    const dump = await db.exportToJson();
    expect(dump.notes).toHaveLength(1);
    expect(dump.memories).toHaveLength(1);
    expect(dump.keyValue).toHaveLength(1);
    expect((dump.notes[0] as { id: string }).id).toBe('n1');
  });

  it('should import data from JSON', async () => {
    const data = {
      notes: [{ id: 'n2', keyId: 'k2', text: 'imported', type: 'observation' as const, author: 'sys', timestamp: 2 }],
      memories: [],
      apiKeys: [],
      sessions: [],
      roles: [],
      cognitiveTraces: [],
      traces: [],
      skills: [],
      connectors: [],
      keyValue: [],
    };

    await db.importFromJson(data);
    const count = await dexieDb.notes.count();
    expect(count).toBe(1);
    const note = await dexieDb.notes.get('n2');
    expect(note?.text).toBe('imported');
  });

  it('should handle key-value storage with createdAt', async () => {
    await db.setKv('test-key', { hello: 'world' });
    const val = await db.getKv<{ hello: string }>('test-key');
    expect(val?.hello).toBe('world');

    const raw = await dexieDb.keyValue.get('test-key');
    expect(raw?.createdAt).toBeDefined();
    expect(typeof raw?.createdAt).toBe('number');
  });

  it('should return null for missing key-value', async () => {
    const val = await db.getKv('non-existent');
    expect(val).toBeNull();
  });
});
