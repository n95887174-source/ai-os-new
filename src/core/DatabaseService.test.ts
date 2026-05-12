import { describe, it, expect, beforeEach } from 'vitest';
import { dexieDb, db } from './DatabaseService';

describe('DatabaseService', () => {
  beforeEach(async () => {
    await dexieDb.notes.clear();
    await dexieDb.memories.clear();
    await dexieDb.keyValue.clear();
    await dexieDb.chatMessages.clear();
  });

  it('should insert and query notes via SQL proxy', async () => {
    const noteId = 'note-1';
    const keyId = 'key-1';
    
    await db.query(
      'INSERT INTO notes (id, keyId, text, type, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [noteId, keyId, 'Test Note', 'observation', 'system', Date.now()]
    );

    const result = await db.query('SELECT * FROM notes WHERE keyId = ?', [keyId]);
    
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as { text: string }).text).toBe('Test Note');
  });

  it('should delete notes via SQL proxy', async () => {
    const noteId = 'note-2';
    await dexieDb.notes.add({
      id: noteId,
      keyId: 'key-2',
      text: 'To be deleted',
      type: 'ai',
      author: 'user',
      timestamp: Date.now()
    });

    await db.query('DELETE FROM notes WHERE id = ?', [noteId]);
    
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

  it('should insert and query chat messages by sessionId', async () => {
    const sessionId = 'session-1';
    const msg1 = { id: 'msg-1', sessionId, role: 'user' as const, text: 'Hello', entryId: 'e1', timestamp: 100 };
    const msg2 = { id: 'msg-2', sessionId, role: 'assistant' as const, text: 'Hi there!', entryId: 'e2', timestamp: 200 };
    const msg3 = { id: 'msg-3', sessionId: 'session-2', role: 'user' as const, text: 'Other', entryId: 'e3', timestamp: 300 };

    await dexieDb.chatMessages.bulkAdd([msg1, msg2, msg3]);

    const sessionMsgs = await dexieDb.chatMessages.where('sessionId').equals(sessionId).toArray();
    expect(sessionMsgs).toHaveLength(2);
    expect(sessionMsgs[0].text).toBe('Hello');
    expect(sessionMsgs[1].text).toBe('Hi there!');
  });

  it('should query chat messages by compound index sessionId+timestamp', async () => {
    const sessionId = 'session-c';
    const msgs = [
      { id: 'c1', sessionId, role: 'user' as const, text: 'First', entryId: 'e1', timestamp: 100 },
      { id: 'c2', sessionId, role: 'assistant' as const, text: 'Second', entryId: 'e2', timestamp: 200 },
      { id: 'c3', sessionId, role: 'user' as const, text: 'Third', entryId: 'e3', timestamp: 300 },
    ];
    await dexieDb.chatMessages.bulkAdd(msgs);

    const results = await dexieDb.chatMessages
      .where('[sessionId+timestamp]')
      .between([sessionId, 150], [sessionId, 350])
      .toArray();

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('c2');
    expect(results[1].id).toBe('c3');
  });

  it('should delete a chat message by id', async () => {
    await dexieDb.chatMessages.add({
      id: 'del-msg', sessionId: 's1', role: 'user' as const, text: 'delete me', entryId: 'e1', timestamp: 100
    });

    await dexieDb.chatMessages.delete('del-msg');
    const count = await dexieDb.chatMessages.count();
    expect(count).toBe(0);
  });

  it('should validate chat message schema on create', async () => {
    await expect(dexieDb.chatMessages.add({
      id: 'bad-msg', sessionId: 's1', role: 'unknown' as 'user' | 'assistant', text: 'bad', entryId: 'e1', timestamp: 100
    })).rejects.toThrow();
  });
});
