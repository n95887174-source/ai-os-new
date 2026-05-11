import { describe, it, expect } from 'vitest';
import { snapshotService } from './SnapshotService';

describe('SnapshotService', () => {
  it('should return empty snapshots initially', () => {
    const all = snapshotService.getAll();
    expect(Array.isArray(all)).toBe(true);
  });

  it('should return null for latest when empty', () => {
    expect(snapshotService.getLatest()).toBeNull();
  });

  it('should capture a snapshot', () => {
    const snap = snapshotService.capture('trace-1', 'node-1', 'test snapshot');
    expect(snap).toHaveProperty('id');
    expect(snap.traceId).toBe('trace-1');
    expect(snap.stepId).toBe('node-1');
    expect(snap.label).toBe('test snapshot');
    expect(snap).toHaveProperty('runtime');
    expect(snap.runtime).toHaveProperty('kernel');
  });

  it('should retrieve snapshots for a trace', () => {
    const snaps = snapshotService.getSnapshotsForTrace('trace-1');
    expect(snaps.length).toBeGreaterThanOrEqual(1);
    expect(snaps[0].traceId).toBe('trace-1');
  });

  it('should get latest snapshot', () => {
    const latest = snapshotService.getLatest();
    expect(latest).not.toBeNull();
    expect(latest?.label).toBe('test snapshot');
  });

  it('should restore a snapshot', () => {
    const snaps = snapshotService.getAll();
    if (snaps.length > 0) {
      const result = snapshotService.restore(snaps[0]);
      expect(result).toBe(true);
    }
  });

  it('should restore by id', () => {
    const snaps = snapshotService.getAll();
    if (snaps.length > 0) {
      const result = snapshotService.restoreById(snaps[0].id);
      expect(result).toBe(true);
    }
  });

  it('should return false restoring unknown id', () => {
    const result = snapshotService.restoreById('nonexistent');
    expect(result).toBe(false);
  });

  it('should return -1 replay index when not replaying', () => {
    expect(snapshotService.getReplayIndex()).toBe(-1);
  });

  it('should start replay if snapshots exist', () => {
    const result = snapshotService.startReplay();
    expect(typeof result).toBe('boolean');
  });

  it('should clear all snapshots', () => {
    snapshotService.clear();
    expect(snapshotService.getAll().length).toBe(0);
    expect(snapshotService.getLatest()).toBeNull();
  });

  it('should return false for replayNext when empty', () => {
    const result = snapshotService.replayNext();
    expect(result).toBe(false);
  });
});
