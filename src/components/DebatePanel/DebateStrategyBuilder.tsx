import React, { useState, useCallback, useMemo } from 'react';
import { strategyRegistry } from '../../kernel/instances';
import type { StrategyPrimitive, StrategyDefinition, ValidationResult, SequencePrimitive, DebateGraphPrimitive, CriticLoopPrimitive, VotingPrimitive, PeerReviewPrimitive } from '../../kernel/contracts/debate-strategy-dsl';

const s = {
  panel: { display: 'flex', flexDirection: 'column' as const, height: '100%', background: 'rgba(15,23,42,0.95)' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(100,116,139,0.2)', flexWrap: 'wrap' as const },
  btn: { padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(30,41,59,0.8)', color: '#cbd5e1', cursor: 'pointer', fontSize: 11 },
  btnPrimary: { padding: '4px 10px', borderRadius: 4, border: '1px solid #3b82f6', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 11 },
  btnDanger: { padding: '4px 10px', borderRadius: 4, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: 11 },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  palette: { width: 180, borderRight: '1px solid rgba(100,116,139,0.2)', padding: 8, overflowY: 'auto' as const },
  paletteTitle: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  paletteItem: { padding: '6px 8px', borderRadius: 4, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)', marginBottom: 4, cursor: 'grab', fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 },
  paletteDot: (color: string) => ({ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }),
  canvas: { flex: 1, padding: 12, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 8 },
  canvasEmpty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 },
  primitive: { padding: 10, borderRadius: 6, border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(30,41,59,0.6)', position: 'relative' as const },
  primitiveHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  primitiveType: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  primitiveLabel: { fontSize: 12, color: '#e2e8f0' },
  primitiveRemove: { cursor: 'pointer', color: '#64748b', fontSize: 14, lineHeight: 1 },
  primitiveBody: { fontSize: 11, color: '#94a3b8' },
  preview: { width: 280, borderLeft: '1px solid rgba(100,116,139,0.2)', padding: 8, overflowY: 'auto' as const },
  previewTitle: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  json: { fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const, background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 4, maxHeight: 400, overflowY: 'auto' as const },
  validBadge: { display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 },
  errorBadge: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  okBadge: { background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  dropTarget: { minHeight: 40, border: '1px dashed rgba(100,116,139,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 11, marginTop: 4 },
};

const PRIMITIVE_META: Record<string, { color: string; label: string; description: string }> = {
  sequence: { color: '#3b82f6', label: 'Sequence', description: 'Run steps in order' },
  debate_graph: { color: '#8b5cf6', label: 'Debate Graph', description: 'Multi-agent interaction' },
  critic_loop: { color: '#06b6d4', label: 'Critic Loop', description: 'Iterative refinement' },
  voting: { color: '#f59e0b', label: 'Voting', description: 'Opinion tallying' },
  peer_review: { color: '#10b981', label: 'Peer Review', description: 'Structured evaluation' },
};

function renderPrimitive(p: StrategyPrimitive, onRemove: () => void): React.ReactNode {
  const meta = PRIMITIVE_META[p.type];
  return (
    <div key={p.id} style={{ ...s.primitive, borderColor: meta.color + '44' }}>
      <div style={s.primitiveHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={s.paletteDot(meta.color)} />
          <span style={{ ...s.primitiveType, color: meta.color }}>{meta.label}</span>
        </div>
        <span style={s.primitiveRemove} onClick={onRemove} title="Remove">✕</span>
      </div>
      <div style={s.primitiveLabel}>{p.label || p.id}</div>
      <div style={s.primitiveBody}>{meta.description}</div>
      {p.type === 'debate_graph' && (
        <div style={{ ...s.primitiveBody, marginTop: 4 }}>
          {(p as DebateGraphPrimitive).agents?.length ?? 0} agents, {(p as DebateGraphPrimitive).edges?.length ?? 0} edges
        </div>
      )}
      {p.type === 'critic_loop' && (
        <div style={{ ...s.primitiveBody, marginTop: 4 }}>
          Max {(p as CriticLoopPrimitive).maxIterations} iterations
        </div>
      )}
      {p.type === 'voting' && (
        <div style={{ ...s.primitiveBody, marginTop: 4 }}>
          {(p as VotingPrimitive).mechanism} — {(p as VotingPrimitive).voters?.length ?? 0} voters
        </div>
      )}
      {p.type === 'peer_review' && (
        <div style={{ ...s.primitiveBody, marginTop: 4 }}>
          {(p as PeerReviewPrimitive).criteria?.join(', ')}
        </div>
      )}
      {p.type === 'sequence' && (
        <div style={s.dropTarget}>+ Add step</div>
      )}
    </div>
  );
}

function createDefaultPrimitive(type: string): StrategyPrimitive {
  const id = `${type}-${Date.now()}`;
  switch (type) {
    case 'sequence':
      return { type: 'sequence', id, steps: [] } as SequencePrimitive;
    case 'debate_graph':
      return {
        type: 'debate_graph', id,
        agents: [
          { nodeId: 'agent-a', role: 'pro', label: 'Agent A' },
          { nodeId: 'agent-b', role: 'con', label: 'Agent B' },
        ],
        edges: [{ from: 'agent-a', to: 'agent-b', type: 'sequential' }],
        maxRounds: 4,
      } as DebateGraphPrimitive;
    case 'critic_loop':
      return {
        type: 'critic_loop', id,
        proponent: { nodeId: 'proponent', role: 'pro', label: 'Proponent' },
        critic: { nodeId: 'critic', role: 'con', label: 'Critic' },
        maxIterations: 5,
        stopWhen: 'agreement',
      } as CriticLoopPrimitive;
    case 'voting':
      return {
        type: 'voting', id,
        voters: [
          { nodeId: 'voter-1', role: 'neutral', label: 'Voter 1' },
          { nodeId: 'voter-2', role: 'neutral', label: 'Voter 2' },
        ],
        mechanism: 'simple_majority',
      } as VotingPrimitive;
    case 'peer_review':
      return {
        type: 'peer_review', id,
        authors: [{ nodeId: 'author', role: 'pro', label: 'Author' }],
        reviewers: [{ nodeId: 'reviewer', role: 'neutral', label: 'Reviewer' }],
        criteria: ['correctness', 'clarity'],
        minReviewsPerAuthor: 1,
      } as PeerReviewPrimitive;
    default:
      return { type: 'sequence', id, steps: [] } as SequencePrimitive;
  }
}

const DebateStrategyBuilder: React.FC = () => {
  const [primitives, setPrimitives] = useState<StrategyPrimitive[]>([]);
  const [strategyName, setStrategyName] = useState('Custom Strategy');
  const [strategyDesc, setStrategyDesc] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [draggedType, setDraggedType] = useState<string | null>(null);

  const addPrimitive = useCallback((type: string) => {
    setPrimitives(prev => [...prev, createDefaultPrimitive(type)]);
  }, []);

  const removePrimitive = useCallback((index: number) => {
    setPrimitives(prev => prev.filter((_, i) => i !== index));
  }, []);

  const buildStrategy = useCallback((): StrategyDefinition => {
    const root = primitives.length === 1
      ? primitives[0]
      : { type: 'sequence' as const, id: 'custom-root', steps: primitives.map((p, i) => ({ stepId: `step-${i}`, primitive: p })) };
    return {
      id: `custom-${Date.now()}`,
      name: strategyName,
      description: strategyDesc || 'Custom strategy built with visual builder',
      version: '1.0.0',
      root,
    };
  }, [primitives, strategyName, strategyDesc]);

  const handleValidate = useCallback(() => {
    const def = buildStrategy();
    const result = strategyRegistry.validate(def);
    setValidation(result);
  }, [buildStrategy]);

  const handleExport = useCallback(() => {
    const def = buildStrategy();
    const json = JSON.stringify(def, null, 2);
    setJsonOutput(json);
    handleValidate();
  }, [buildStrategy, handleValidate]);

  const handleImport = useCallback(() => {
    if (!jsonOutput) return;
    const result = strategyRegistry.importJson(jsonOutput);
    if (result.success) {
      setValidation({ valid: true, errors: [], warnings: [] });
    } else {
      setValidation({ valid: false, errors: result.errors || [{ path: 'json', message: 'Import failed', code: 'IMPORT_ERROR' }], warnings: [] });
    }
  }, [jsonOutput]);

  const handleDragStart = useCallback((type: string) => { setDraggedType(type); }, []);
  const handleDrop = useCallback(() => {
    if (draggedType) { addPrimitive(draggedType); setDraggedType(null); }
  }, [draggedType, addPrimitive]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  return (
    <div style={s.panel}>
      <div style={s.toolbar}>
        <input value={strategyName} onChange={e => setStrategyName(e.target.value)} style={{ ...s.btn, width: 150, textAlign: 'left' }} placeholder="Strategy name" />
        <input value={strategyDesc} onChange={e => setStrategyDesc(e.target.value)} style={{ ...s.btn, width: 200, textAlign: 'left' }} placeholder="Description" />
        <button style={s.btn} onClick={handleValidate}>Validate</button>
        <button style={s.btnPrimary} onClick={handleExport}>Export JSON</button>
        <button style={s.btn} onClick={handleImport}>Import</button>
        {validation && (
          <span style={{ ...s.validBadge, ...(validation.valid ? s.okBadge : s.errorBadge) }}>
            {validation.valid ? '✓ Valid' : `${validation.errors.length} error(s)`}
          </span>
        )}
        <span style={{ fontSize: 10, color: '#64748b' }}>{primitives.length} primitives</span>
      </div>

      <div style={s.main}>
        <div style={s.palette}>
          <div style={s.paletteTitle}>Primitives</div>
          {Object.entries(PRIMITIVE_META).map(([type, meta]) => (
            <div
              key={type}
              style={s.paletteItem}
              draggable
              onDragStart={() => handleDragStart(type)}
              onClick={() => addPrimitive(type)}
              title={meta.description}
            >
              <div style={s.paletteDot(meta.color)} />
              {meta.label}
            </div>
          ))}
        </div>

        <div style={s.canvas} onDrop={handleDrop} onDragOver={handleDragOver}>
          {primitives.length === 0 && (
            <div style={s.canvasEmpty}>Drag primitives here or click to add</div>
          )}
          {primitives.map((p, i) => renderPrimitive(p, () => removePrimitive(i)))}
        </div>

        <div style={s.preview}>
          <div style={s.previewTitle}>JSON Output</div>
          {jsonOutput ? (
            <div style={s.json}>{jsonOutput}</div>
          ) : (
            <div style={{ fontSize: 11, color: '#64748b' }}>Click "Export JSON" to generate</div>
          )}
          {validation && validation.errors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {validation.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 10, color: '#ef4444', marginBottom: 2 }}>{e.path}: {e.message}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebateStrategyBuilder;
