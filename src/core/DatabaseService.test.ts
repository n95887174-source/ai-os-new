import { describe, it, expect, beforeEach } from 'vitest';
import { dexieDb, db } from './DatabaseService';

describe('DatabaseService', () => {
  beforeEach(async () => {
    await dexieDb.notes.clear();
  });

  it('should insert and query notes via SQL proxy', async () => {
    const noteId = 'note-1';
    const keyId = 'key-1';
    
    // Test INSERT proxy
    await db.query(
      'INSERT INTO notes (id, keyId, text, type, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [noteId, keyId, 'Test Note', 'observation', 'system', Date.now()]
    );

    // Test SELECT proxy
    const result = await db.query('SELECT * FROM notes WHERE keyId = ?', [keyId]);
    
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as any).text).toBe('Test Note');
  });

  it('should delete notes via SQL proxy', async () => {
    const noteId = 'note-2';
    await dexieDb.notes.add({
      id: noteId,
      keyId: 'key-2',
      text: 'To be deleted',
      type: 'fact',
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
      type: 'decision',
      author: 'agent',
      timestamp: Date.now()
    });

    const note = await dexieDb.notes.get('direct-1');
    expect(note?.text).toBe('Direct Dexie');
  });
});
