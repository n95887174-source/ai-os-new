import React, { useState, useCallback, useEffect } from 'react';
import { GitBranch, GitMerge, RotateCcw, Trash2, Plus } from 'lucide-react';
import { DebateBranching, type DebateBranch } from '../../kernel/services/debate-runtime/debate-branching';

interface DebateBranchPanelProps {
  branching: DebateBranching;
  currentSessionId: string;
  onSwitchBranch?: (branchId: string) => void;
}

export const DebateBranchPanel: React.FC<DebateBranchPanelProps> = ({
  branching,
  currentSessionId: _currentSessionId,
  onSwitchBranch,
}) => {
  const [branches, setBranches] = useState<DebateBranch[]>(branching.getBranches());
  const [forkName, setForkName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setBranches(branching.getBranches());
  }, [branching]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleFork = useCallback(() => {
    const active = branching.getActiveBranch();
    if (!active) return;
    branching.fork(
      active.id,
      active.snapshot,
      active.timeline,
      active.arguments,
      active.participants,
      active.config,
      forkName || undefined,
    );
    setForkName('');
    refresh();
  }, [branching, forkName, refresh]);

  const handleMerge = useCallback(() => {
    if (!selectedBranch) return;
    const active = branching.getActiveBranch();
    if (!active) return;
    branching.merge(selectedBranch, active.id);
    refresh();
  }, [branching, selectedBranch, refresh]);

  const handleRollback = useCallback((branchId: string, round: number) => {
    branching.rollback(branchId, round);
    refresh();
  }, [branching, refresh]);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    branching.deleteBranch(id);
    refresh();
  }, [branching, refresh]);

  const handleActivate = useCallback((id: string) => {
    branching.setActiveBranch(id);
    onSwitchBranch?.(id);
    refresh();
  }, [branching, onSwitchBranch, refresh]);

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid var(--border)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <GitBranch size={18} color="#8b5cf6" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Ветки дебатов
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {branches.length} веток
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <input
          value={forkName}
          onChange={e => setForkName(e.target.value)}
          placeholder="Имя ветки (опционально)"
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.8rem',
          }}
        />
        <button
          onClick={handleFork}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
            border: '1px solid #8b5cf6', background: 'rgba(139,92,246,0.1)',
            color: '#8b5cf6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          }}
        >
          <Plus size={12} /> Fork
        </button>
        {selectedBranch && (
          <button
            onClick={handleMerge}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
              border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)',
              color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            <GitMerge size={12} /> Merge
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        {branches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Нет веток. Создайте форк текущей сессии.
          </div>
        )}
        {branches.map(branch => (
          <div
            key={branch.id}
            style={{
              padding: '0.6rem 0.8rem', borderRadius: 10,
              background: selectedBranch === branch.id ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selectedBranch === branch.id ? '#8b5cf6' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onClick={() => setSelectedBranch(branch.id === selectedBranch ? null : branch.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <GitBranch size={12} color={branch.merged ? '#6b7280' : '#8b5cf6'} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{branch.name}</span>
              {branch.merged && (
                <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(107,114,128,0.2)', color: '#6b7280' }}>
                  merged
                </span>
              )}
              {branch.id === branching.getActiveBranch()?.id && (
                <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                  active
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>Round {branch.forkRound}</span>
              <span>{branch.arguments.length} args</span>
              <span>{new Date(branch.createdAt).toLocaleTimeString()}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button
                  onClick={e => { e.stopPropagation(); handleRollback(branch.id, Math.max(1, branch.forkRound - 1)); }}
                  title="Rollback"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: 2 }}
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleActivate(branch.id); }}
                  title="Switch to this branch"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 2 }}
                >
                  <GitBranch size={12} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(branch.id); }}
                  title="Delete branch"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
