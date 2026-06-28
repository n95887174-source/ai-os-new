import React, { useState, useCallback, useMemo } from 'react';
import { strategyRegistry } from '../../kernel/instances';
import type {
    StrategyPrimitive,
    StrategyDefinition,
    ValidationResult,
    SequencePrimitive,
    DebateGraphPrimitive,
    CriticLoopPrimitive,
    VotingPrimitive,
    PeerReviewPrimitive,
    GraphAgentConfig,
    GraphEdge,
    ReviewCriteria,
    VotingMechanism,
    GraphEdgeType,
} from '../../kernel/contracts/debate-strategy-dsl';
import {
    Save,
    Upload,
    Play,
    CheckCircle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    X,
    Copy,
    FileCode,
} from 'lucide-react';

const s = {
    panel: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        background: 'rgba(15,23,42,0.98)',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid rgba(100,116,139,0.2)',
        flexWrap: 'wrap' as const,
    },
    btn: {
        padding: '4px 10px',
        borderRadius: 4,
        border: '1px solid rgba(100,116,139,0.3)',
        background: 'rgba(30,41,59,0.8)',
        color: '#cbd5e1',
        cursor: 'pointer',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    btnPrimary: {
        padding: '4px 10px',
        borderRadius: 4,
        border: '1px solid #3b82f6',
        background: '#3b82f6',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    btnDanger: {
        padding: '4px 10px',
        borderRadius: 4,
        border: '1px solid #ef4444',
        background: 'rgba(239,68,68,0.2)',
        color: '#ef4444',
        cursor: 'pointer',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    btnSuccess: {
        padding: '4px 10px',
        borderRadius: 4,
        border: '1px solid #22c55e',
        background: 'rgba(34,197,94,0.15)',
        color: '#22c55e',
        cursor: 'pointer',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    palette: {
        width: 160,
        borderRight: '1px solid rgba(100,116,139,0.2)',
        padding: 8,
        overflowY: 'auto' as const,
        flexShrink: 0,
    },
    paletteTitle: {
        fontSize: 10,
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    paletteItem: {
        padding: '6px 8px',
        borderRadius: 4,
        background: 'rgba(30,41,59,0.8)',
        border: '1px solid rgba(100,116,139,0.2)',
        marginBottom: 4,
        cursor: 'grab',
        fontSize: 11,
        color: '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    paletteDot: (color: string) => ({
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
    }),
    canvas: {
        flex: 1,
        padding: 8,
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 6,
    },
    canvasEmpty: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: 13,
    },
    primitiveCard: (color: string, selected: boolean) => ({
        padding: '8px 10px',
        borderRadius: 6,
        border: selected ? `1px solid ${color}` : '1px solid rgba(100,116,139,0.25)',
        background: selected ? `rgba(${hexToRgb(color)},0.08)` : 'rgba(30,41,59,0.5)',
        cursor: 'pointer',
        transition: 'all 0.12s',
    }),
    primitiveHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    primitiveType: (color: string) => ({
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        color,
    }),
    primitiveLabel: { fontSize: 12, color: '#e2e8f0' },
    inspector: {
        width: 300,
        borderLeft: '1px solid rgba(100,116,139,0.2)',
        padding: 8,
        overflowY: 'auto' as const,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 6,
    },
    inspectorTitle: {
        fontSize: 10,
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    preview: {
        width: 260,
        borderLeft: '1px solid rgba(100,116,139,0.2)',
        padding: 8,
        overflowY: 'auto' as const,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 6,
    },
    previewTitle: {
        fontSize: 10,
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    json: {
        fontFamily: 'monospace',
        fontSize: 9,
        color: '#94a3b8',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-all' as const,
        background: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 4,
        maxHeight: 300,
        overflowY: 'auto' as const,
    },
    fieldLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 600,
        marginBottom: 2,
        display: 'block',
    },
    input: {
        width: '100%',
        padding: '4px 6px',
        borderRadius: 4,
        border: '1px solid rgba(100,116,139,0.3)',
        background: 'rgba(0,0,0,0.3)',
        color: '#e2e8f0',
        fontSize: 11,
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    select: {
        width: '100%',
        padding: '4px 6px',
        borderRadius: 4,
        border: '1px solid rgba(100,116,139,0.3)',
        background: 'rgba(0,0,0,0.3)',
        color: '#e2e8f0',
        fontSize: 11,
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    agentRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 4px',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.03)',
        marginBottom: 2,
        fontSize: 10,
    },
    addBtn: {
        padding: '2px 6px',
        borderRadius: 3,
        border: '1px dashed rgba(100,116,139,0.3)',
        background: 'transparent',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: 10,
        width: '100%',
        textAlign: 'center' as const,
    },
    iconBtn: {
        background: 'transparent',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        borderRadius: 3,
    },
    validBadge: (ok: boolean) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: ok ? '#22c55e' : '#ef4444',
    }),
    sectionTitle: {
        fontSize: 10,
        color: '#64748b',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        fontWeight: 600,
        marginTop: 4,
        marginBottom: 2,
    },
    toast: {
        position: 'fixed' as const,
        bottom: 20,
        right: 20,
        padding: '8px 14px',
        borderRadius: 6,
        fontSize: 11,
        zIndex: 9999,
        color: '#fff',
    },
};

function hexToRgb(hex: string): string {
    const v = parseInt(hex.replace('#', ''), 16);
    return `${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}`;
}

const PRIMITIVE_META: Record<string, { color: string; label: string; description: string }> = {
    sequence: { color: '#3b82f6', label: 'Sequence', description: 'Run steps in order' },
    debate_graph: {
        color: '#8b5cf6',
        label: 'Debate Graph',
        description: 'Multi-agent interaction',
    },
    critic_loop: { color: '#06b6d4', label: 'Critic Loop', description: 'Iterative refinement' },
    voting: { color: '#f59e0b', label: 'Voting', description: 'Opinion tallying' },
    peer_review: { color: '#10b981', label: 'Peer Review', description: 'Structured evaluation' },
};

const REVIEW_CRITERIA_OPTIONS: ReviewCriteria[] = [
    'correctness',
    'completeness',
    'clarity',
    'evidence',
    'originality',
    'feasibility',
];
const VOTING_MECHANISMS: VotingMechanism[] = [
    'simple_majority',
    'supermajority',
    'unanimous',
    'ranked_choice',
    'weighted',
];
const EDGE_TYPES: GraphEdgeType[] = [
    'sequential',
    'broadcast',
    'conditional',
    'challenge',
    'refine',
];
const AGENT_ROLES = ['pro', 'con', 'neutral', 'judge', 'attacker', 'defender'] as const;

function createDefaultPrimitive(type: string): StrategyPrimitive {
    const id = `${type}-${Date.now()}`;
    switch (type) {
        case 'sequence':
            return { type: 'sequence', id, steps: [] } as SequencePrimitive;
        case 'debate_graph':
            return {
                type: 'debate_graph',
                id,
                agents: [
                    { nodeId: 'agent-a', role: 'pro', label: 'Agent A' },
                    { nodeId: 'agent-b', role: 'con', label: 'Agent B' },
                ],
                edges: [{ from: 'agent-a', to: 'agent-b', type: 'sequential' }],
                maxRounds: 4,
            } as DebateGraphPrimitive;
        case 'critic_loop':
            return {
                type: 'critic_loop',
                id,
                proponent: { nodeId: 'proponent', role: 'pro', label: 'Proponent' },
                critic: { nodeId: 'critic', role: 'con', label: 'Critic' },
                maxIterations: 5,
                stopWhen: 'agreement',
            } as CriticLoopPrimitive;
        case 'voting':
            return {
                type: 'voting',
                id,
                voters: [
                    { nodeId: 'voter-1', role: 'neutral', label: 'Voter 1' },
                    { nodeId: 'voter-2', role: 'neutral', label: 'Voter 2' },
                ],
                mechanism: 'simple_majority',
            } as VotingPrimitive;
        case 'peer_review':
            return {
                type: 'peer_review',
                id,
                authors: [{ nodeId: 'author', role: 'pro', label: 'Author' }],
                reviewers: [{ nodeId: 'reviewer', role: 'neutral', label: 'Reviewer' }],
                criteria: ['correctness', 'clarity'],
                minReviewsPerAuthor: 1,
            } as PeerReviewPrimitive;
        default:
            return { type: 'sequence', id, steps: [] } as SequencePrimitive;
    }
}

function clonePrimitive(p: StrategyPrimitive): StrategyPrimitive {
    return structuredClone(p);
}

interface AgentEditorProps {
    agents: GraphAgentConfig[];
    onChange: (agents: GraphAgentConfig[]) => void;
}

const AgentEditor: React.FC<AgentEditorProps> = ({ agents, onChange }) => (
    <div>
        <div style={s.fieldLabel}>Agents</div>
        {agents.map((a, i) => (
            <div key={i} style={s.agentRow}>
                <input
                    value={a.nodeId}
                    onChange={(e) => {
                        const c = [...agents];
                        c[i] = { ...c[i], nodeId: e.target.value };
                        onChange(c);
                    }}
                    style={{ ...s.input, width: 60 }}
                    placeholder="ID"
                />
                <input
                    value={a.label || ''}
                    onChange={(e) => {
                        const c = [...agents];
                        c[i] = { ...c[i], label: e.target.value };
                        onChange(c);
                    }}
                    style={{ ...s.input, width: 70 }}
                    placeholder="Label"
                />
                <select
                    value={a.role}
                    onChange={(e) => {
                        const c = [...agents];
                        c[i] = { ...c[i], role: e.target.value as GraphAgentConfig['role'] };
                        onChange(c);
                    }}
                    style={{ ...s.select, width: 65, fontSize: 9 }}
                >
                    {AGENT_ROLES.map((r) => (
                        <option key={r} value={r}>
                            {r}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => onChange(agents.filter((_, j) => j !== i))}
                    style={s.iconBtn}
                    title="Remove"
                >
                    <X size={12} />
                </button>
            </div>
        ))}
        <button
            onClick={() =>
                onChange([
                    ...agents,
                    {
                        nodeId: `agent-${agents.length + 1}`,
                        role: 'neutral',
                        label: `Agent ${agents.length + 1}`,
                    },
                ])
            }
            style={s.addBtn}
        >
            + Add Agent
        </button>
    </div>
);

interface EdgeEditorProps {
    edges: GraphEdge[];
    agents: GraphAgentConfig[];
    onChange: (edges: GraphEdge[]) => void;
}

const EdgeEditor: React.FC<EdgeEditorProps> = ({ edges, agents, onChange }) => (
    <div>
        <div style={s.fieldLabel}>Edges</div>
        {edges.map((e, i) => (
            <div key={i} style={s.agentRow}>
                <select
                    value={e.from}
                    onChange={(v) => {
                        const c = [...edges];
                        c[i] = { ...c[i], from: v.target.value };
                        onChange(c);
                    }}
                    style={{ ...s.select, width: 60, fontSize: 9 }}
                >
                    {agents.map((a) => (
                        <option key={a.nodeId} value={a.nodeId}>
                            {a.nodeId}
                        </option>
                    ))}
                </select>
                <span style={{ color: '#64748b', fontSize: 9 }}>→</span>
                <select
                    value={e.to}
                    onChange={(v) => {
                        const c = [...edges];
                        c[i] = { ...c[i], to: v.target.value };
                        onChange(c);
                    }}
                    style={{ ...s.select, width: 60, fontSize: 9 }}
                >
                    {agents.map((a) => (
                        <option key={a.nodeId} value={a.nodeId}>
                            {a.nodeId}
                        </option>
                    ))}
                </select>
                <select
                    value={e.type}
                    onChange={(v) => {
                        const c = [...edges];
                        c[i] = { ...c[i], type: v.target.value as GraphEdgeType };
                        onChange(c);
                    }}
                    style={{ ...s.select, width: 70, fontSize: 9 }}
                >
                    {EDGE_TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                <button onClick={() => onChange(edges.filter((_, j) => j !== i))} style={s.iconBtn}>
                    <X size={12} />
                </button>
            </div>
        ))}
        {agents.length >= 2 && (
            <button
                onClick={() =>
                    onChange([
                        ...edges,
                        { from: agents[0].nodeId, to: agents[1].nodeId, type: 'sequential' },
                    ])
                }
                style={s.addBtn}
            >
                + Add Edge
            </button>
        )}
    </div>
);

const DebateStrategyBuilder: React.FC = () => {
    const [primitives, setPrimitives] = useState<StrategyPrimitive[]>([]);
    const [strategyName, setStrategyName] = useState('Custom Strategy');
    const [strategyDesc, setStrategyDesc] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [jsonOutput, setJsonOutput] = useState('');
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [draggedType, setDraggedType] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [loadingBuiltins, setLoadingBuiltins] = useState(false);

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const addPrimitive = useCallback((type: string) => {
        setPrimitives((prev) => [...prev, createDefaultPrimitive(type)]);
        setSelectedIndex(null);
    }, []);

    const removePrimitive = useCallback((index: number) => {
        setPrimitives((prev) => prev.filter((_, i) => i !== index));
        setSelectedIndex((i) => (i === index ? null : i));
    }, []);

    const duplicatePrimitive = useCallback((index: number) => {
        setPrimitives((prev) => {
            const c = {
                ...clonePrimitive(prev[index]),
                id: `${prev[index].type}-${Date.now()}`,
            } as StrategyPrimitive;
            return [...prev.slice(0, index + 1), c, ...prev.slice(index + 1)];
        });
    }, []);

    const movePrimitive = useCallback(
        (index: number, dir: -1 | 1) => {
            const target = index + dir;
            if (target < 0 || target >= primitives.length) return;
            setPrimitives((prev) => {
                const c = [...prev];
                [c[index], c[target]] = [c[target], c[index]];
                return c;
            });
            setSelectedIndex(target);
        },
        [primitives.length],
    );

    const updatePrimitive = useCallback((index: number, upd: StrategyPrimitive) => {
        setPrimitives((prev) => {
            const c = [...prev];
            c[index] = upd;
            return c;
        });
    }, []);

    const toggleSelected = useCallback((index: number) => {
        setSelectedIndex((i) => (i === index ? null : index));
    }, []);

    const buildStrategy = useCallback((): StrategyDefinition => {
        const root =
            primitives.length === 1
                ? primitives[0]
                : {
                      type: 'sequence' as const,
                      id: 'custom-root',
                      steps: primitives.map((p, i) => ({ stepId: `step-${i}`, primitive: p })),
                  };
        return {
            id: `custom-${Date.now()}`,
            name: strategyName,
            description: strategyDesc || 'Custom strategy built with visual builder',
            version: '1.0.0',
            root,
        };
    }, [primitives, strategyName, strategyDesc]);

    const handleValidate = useCallback(() => {
        setValidation(strategyRegistry.validate(buildStrategy()));
    }, [buildStrategy]);

    const handleExport = useCallback(() => {
        const def = buildStrategy();
        setJsonOutput(JSON.stringify(def, null, 2));
        setValidation(strategyRegistry.validate(def));
    }, [buildStrategy]);

    const handleImport = useCallback(() => {
        if (!jsonOutput) return;
        try {
            JSON.parse(jsonOutput);
            const result = strategyRegistry.importJson(jsonOutput);
            if (result.success) {
                setValidation({ valid: true, errors: [], warnings: [] });
                showToast('Strategy imported successfully');
            } else {
                setValidation({
                    valid: false,
                    errors: result.errors || [
                        { path: 'json', message: 'Import failed', code: 'IMPORT_ERROR' },
                    ],
                    warnings: [],
                });
                showToast('Import failed', false);
            }
        } catch {
            showToast('Invalid JSON', false);
        }
    }, [jsonOutput, showToast]);

    const handleSaveMode = useCallback(() => {
        try {
            const def = buildStrategy();
            const result = strategyRegistry.validate(def);
            if (!result.valid) {
                showToast('Cannot save: validation errors', false);
                return;
            }
            strategyRegistry.register(def, false);
            showToast(`Strategy "${def.name}" saved to registry`);
        } catch (e) {
            showToast(`Save failed: ${e}`, false);
        }
    }, [buildStrategy, showToast]);

    const handleDeploy = useCallback(() => {
        try {
            const def = buildStrategy();
            const result = strategyRegistry.validate(def);
            if (!result.valid) {
                showToast('Cannot deploy: validation errors', false);
                return;
            }
            showToast(`Deployed: "${def.name}" — ready for debate`);
        } catch (e) {
            showToast(`Deploy failed: ${e}`, false);
        }
    }, [buildStrategy, showToast]);

    const loadBuiltin = useCallback(
        (id: string) => {
            setLoadingBuiltins(true);
            try {
                const def = strategyRegistry.get(id);
                if (!def) {
                    showToast(`Strategy "${id}" not found`, false);
                    return;
                }
                const extracted: StrategyPrimitive[] = [];
                if (def.root.type === 'sequence') {
                    const seq = def.root as SequencePrimitive;
                    extracted.push(...(seq.steps?.map((s) => s.primitive) || []));
                } else {
                    extracted.push(clonePrimitive(def.root));
                }
                setPrimitives(extracted.length > 0 ? extracted : [clonePrimitive(def.root)]);
                setStrategyName(def.name);
                setStrategyDesc(def.description);
                setSelectedIndex(null);
                showToast(`Loaded: "${def.name}"`);
            } catch (e) {
                showToast(`Failed to load: ${e}`, false);
            } finally {
                setLoadingBuiltins(false);
            }
        },
        [showToast],
    );

    const handleDragStart = useCallback((type: string) => {
        setDraggedType(type);
    }, []);
    const handleDrop = useCallback(() => {
        if (draggedType) {
            addPrimitive(draggedType);
            setDraggedType(null);
        }
    }, [draggedType, addPrimitive]);
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const builtinList = useMemo(() => strategyRegistry.list().filter((e) => e.builtin), []);

    const selectedPrimitive = selectedIndex !== null ? primitives[selectedIndex] : null;

    return (
        <div style={s.panel}>
            <div style={s.toolbar}>
                <input
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    style={{ ...s.input, width: 140 }}
                    placeholder="Strategy name"
                />
                <input
                    value={strategyDesc}
                    onChange={(e) => setStrategyDesc(e.target.value)}
                    style={{ ...s.input, width: 180 }}
                    placeholder="Description (optional)"
                />
                <button style={s.btn} onClick={handleValidate}>
                    <CheckCircle size={12} /> Validate
                </button>
                <button style={s.btnPrimary} onClick={handleExport}>
                    <Save size={12} /> Export
                </button>
                <button style={s.btn} onClick={handleImport}>
                    <Upload size={12} /> Import
                </button>
                <button style={s.btnSuccess} onClick={handleSaveMode}>
                    <FileCode size={12} /> Save to Registry
                </button>
                <button style={s.btn} onClick={handleDeploy}>
                    <Play size={12} /> Deploy
                </button>
                {validation && (
                    <span style={s.validBadge(validation.valid)}>
                        {validation.valid ? '✓ Valid' : `✗ ${validation.errors.length} error(s)`}
                    </span>
                )}
                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
                    {primitives.length} primitive{primitives.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Templates bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 12px',
                    borderBottom: '1px solid rgba(100,116,139,0.1)',
                    background: 'rgba(0,0,0,0.15)',
                }}
            >
                <span
                    style={{
                        fontSize: 9,
                        color: '#64748b',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        marginRight: 4,
                    }}
                >
                    Templates:
                </span>
                {loadingBuiltins && (
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>Loading...</span>
                )}
                {builtinList.map((entry) => (
                    <button
                        key={entry.definition.id}
                        onClick={() => loadBuiltin(entry.definition.id)}
                        style={{
                            padding: '2px 8px',
                            borderRadius: 3,
                            border: '1px solid rgba(100,116,139,0.2)',
                            background: 'rgba(30,41,59,0.6)',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: 10,
                        }}
                    >
                        {entry.definition.name}
                    </button>
                ))}
            </div>

            <div style={s.main}>
                {/* Palette */}
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

                {/* Canvas */}
                <div style={s.canvas} onDrop={handleDrop} onDragOver={handleDragOver}>
                    {primitives.length === 0 && (
                        <div style={s.canvasEmpty}>Drag primitives here or click to add</div>
                    )}
                    {primitives.map((p, i) => {
                        const meta = PRIMITIVE_META[p.type];
                        const isSelected = selectedIndex === i;
                        return (
                            <div
                                key={p.id}
                                style={s.primitiveCard(meta.color, isSelected)}
                                onClick={() => toggleSelected(i)}
                            >
                                <div style={s.primitiveHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={s.paletteDot(meta.color)} />
                                        <span style={s.primitiveType(meta.color)}>
                                            {meta.label}
                                        </span>
                                    </div>
                                    <div
                                        style={{ display: 'flex', gap: 2 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => movePrimitive(i, -1)}
                                            disabled={i === 0}
                                            style={{ ...s.iconBtn, opacity: i === 0 ? 0.3 : 1 }}
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <button
                                            onClick={() => movePrimitive(i, 1)}
                                            disabled={i === primitives.length - 1}
                                            style={{
                                                ...s.iconBtn,
                                                opacity: i === primitives.length - 1 ? 0.3 : 1,
                                            }}
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                        <button
                                            onClick={() => duplicatePrimitive(i)}
                                            style={s.iconBtn}
                                        >
                                            <Copy size={12} />
                                        </button>
                                        <button
                                            onClick={() => removePrimitive(i)}
                                            style={{ ...s.iconBtn, color: '#ef4444' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div style={s.primitiveLabel}>{p.label || p.id}</div>
                                {p.type === 'debate_graph' && (
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                                        {(p as DebateGraphPrimitive).agents?.length ?? 0} agents ·{' '}
                                        {(p as DebateGraphPrimitive).edges?.length ?? 0} edges ·{' '}
                                        {(p as DebateGraphPrimitive).maxRounds ?? 4} rounds
                                    </div>
                                )}
                                {p.type === 'critic_loop' && (
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                                        {(p as CriticLoopPrimitive).maxIterations} iterations ·{' '}
                                        {(p as CriticLoopPrimitive).stopWhen}
                                    </div>
                                )}
                                {p.type === 'voting' && (
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                                        {(p as VotingPrimitive).mechanism} ·{' '}
                                        {(p as VotingPrimitive).voters?.length ?? 0} voters
                                    </div>
                                )}
                                {p.type === 'peer_review' && (
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                                        {(p as PeerReviewPrimitive).criteria?.join(', ') ?? ''}
                                    </div>
                                )}
                                {p.type === 'sequence' && (
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                                        {(p as SequencePrimitive).steps?.length ?? 0} steps
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Inspector */}
                <div style={s.inspector}>
                    <div style={s.inspectorTitle}>
                        {selectedPrimitive
                            ? `Inspector: ${PRIMITIVE_META[selectedPrimitive.type]?.label ?? selectedPrimitive.type}`
                            : 'Properties Inspector'}
                    </div>
                    {!selectedPrimitive ? (
                        <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                            Click a primitive to edit its properties
                        </div>
                    ) : (
                        <>
                            <div>
                                <div style={s.fieldLabel}>Label</div>
                                <input
                                    value={selectedPrimitive.label || ''}
                                    onChange={(e) =>
                                        updatePrimitive(selectedIndex!, {
                                            ...selectedPrimitive,
                                            label: e.target.value,
                                        })
                                    }
                                    style={s.input}
                                    placeholder="Custom label"
                                />
                            </div>
                            {selectedPrimitive.type === 'debate_graph' &&
                                (() => {
                                    const p = selectedPrimitive as DebateGraphPrimitive;
                                    return (
                                        <>
                                            <AgentEditor
                                                agents={p.agents}
                                                onChange={(agents) =>
                                                    updatePrimitive(selectedIndex!, {
                                                        ...p,
                                                        agents,
                                                    })
                                                }
                                            />
                                            <EdgeEditor
                                                edges={p.edges}
                                                agents={p.agents}
                                                onChange={(edges) =>
                                                    updatePrimitive(selectedIndex!, { ...p, edges })
                                                }
                                            />
                                            <div>
                                                <div style={s.fieldLabel}>Max Rounds</div>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={p.maxRounds ?? 4}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            maxRounds: Number(e.target.value),
                                                        })
                                                    }
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>
                                                    Convergence Threshold
                                                </div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={1}
                                                    step={0.05}
                                                    value={p.convergenceThreshold ?? 0.85}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            convergenceThreshold: Number(
                                                                e.target.value,
                                                            ),
                                                        })
                                                    }
                                                    style={s.input}
                                                />
                                            </div>
                                        </>
                                    );
                                })()}
                            {selectedPrimitive.type === 'critic_loop' &&
                                (() => {
                                    const p = selectedPrimitive as CriticLoopPrimitive;
                                    return (
                                        <>
                                            <div>
                                                <div style={s.fieldLabel}>Proponent</div>
                                                <input
                                                    value={p.proponent.label || ''}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            proponent: {
                                                                ...p.proponent,
                                                                label: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    style={s.input}
                                                    placeholder="Proponent label"
                                                />
                                                <select
                                                    value={p.proponent.role}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            proponent: {
                                                                ...p.proponent,
                                                                role: e.target
                                                                    .value as GraphAgentConfig['role'],
                                                            },
                                                        })
                                                    }
                                                    style={{ ...s.select, marginTop: 2 }}
                                                >
                                                    {AGENT_ROLES.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Critic</div>
                                                <input
                                                    value={p.critic.label || ''}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            critic: {
                                                                ...p.critic,
                                                                label: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    style={s.input}
                                                    placeholder="Critic label"
                                                />
                                                <select
                                                    value={p.critic.role}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            critic: {
                                                                ...p.critic,
                                                                role: e.target
                                                                    .value as GraphAgentConfig['role'],
                                                            },
                                                        })
                                                    }
                                                    style={{ ...s.select, marginTop: 2 }}
                                                >
                                                    {AGENT_ROLES.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Max Iterations</div>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={p.maxIterations}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            maxIterations: Number(e.target.value),
                                                        })
                                                    }
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Stop When</div>
                                                <select
                                                    value={p.stopWhen ?? 'agreement'}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            stopWhen: e.target
                                                                .value as CriticLoopPrimitive['stopWhen'],
                                                        })
                                                    }
                                                    style={s.select}
                                                >
                                                    <option value="agreement">Agreement</option>
                                                    <option value="max_iterations">
                                                        Max iterations
                                                    </option>
                                                    <option value="no_improvement">
                                                        No improvement
                                                    </option>
                                                </select>
                                            </div>
                                        </>
                                    );
                                })()}
                            {selectedPrimitive.type === 'voting' &&
                                (() => {
                                    const p = selectedPrimitive as VotingPrimitive;
                                    return (
                                        <>
                                            <AgentEditor
                                                agents={p.voters}
                                                onChange={(voters) =>
                                                    updatePrimitive(selectedIndex!, {
                                                        ...p,
                                                        voters,
                                                    })
                                                }
                                            />
                                            <div>
                                                <div style={s.fieldLabel}>Mechanism</div>
                                                <select
                                                    value={p.mechanism}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            mechanism: e.target
                                                                .value as VotingMechanism,
                                                        })
                                                    }
                                                    style={s.select}
                                                >
                                                    {VOTING_MECHANISMS.map((m) => (
                                                        <option key={m} value={m}>
                                                            {m.replace(/_/g, ' ')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Quorum</div>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={p.quorum ?? 1}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            quorum: Number(e.target.value),
                                                        })
                                                    }
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Tie Breaker</div>
                                                <select
                                                    value={p.tieBreaker ?? 'judge'}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            tieBreaker: e.target
                                                                .value as VotingPrimitive['tieBreaker'],
                                                        })
                                                    }
                                                    style={s.select}
                                                >
                                                    <option value="judge">Judge</option>
                                                    <option value="random">Random</option>
                                                    <option value="skip">Skip</option>
                                                </select>
                                            </div>
                                        </>
                                    );
                                })()}
                            {selectedPrimitive.type === 'peer_review' &&
                                (() => {
                                    const p = selectedPrimitive as PeerReviewPrimitive;
                                    return (
                                        <>
                                            <AgentEditor
                                                agents={p.authors}
                                                onChange={(authors) =>
                                                    updatePrimitive(selectedIndex!, {
                                                        ...p,
                                                        authors,
                                                    })
                                                }
                                            />
                                            <AgentEditor
                                                agents={p.reviewers}
                                                onChange={(reviewers) =>
                                                    updatePrimitive(selectedIndex!, {
                                                        ...p,
                                                        reviewers,
                                                    })
                                                }
                                            />
                                            <div>
                                                <div style={s.fieldLabel}>Criteria</div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: 2,
                                                    }}
                                                >
                                                    {REVIEW_CRITERIA_OPTIONS.map((c) => (
                                                        <label
                                                            key={c}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 2,
                                                                fontSize: 9,
                                                                color: '#94a3b8',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={p.criteria.includes(c)}
                                                                onChange={() => {
                                                                    const next =
                                                                        p.criteria.includes(c)
                                                                            ? p.criteria.filter(
                                                                                  (x) => x !== c,
                                                                              )
                                                                            : [...p.criteria, c];
                                                                    updatePrimitive(
                                                                        selectedIndex!,
                                                                        { ...p, criteria: next },
                                                                    );
                                                                }}
                                                            />
                                                            {c}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Revision Rounds</div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    value={p.revisionRounds ?? 2}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            revisionRounds: Number(e.target.value),
                                                        })
                                                    }
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <div style={s.fieldLabel}>Pass Threshold</div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={1}
                                                    step={0.05}
                                                    value={p.passThreshold ?? 0.7}
                                                    onChange={(e) =>
                                                        updatePrimitive(selectedIndex!, {
                                                            ...p,
                                                            passThreshold: Number(e.target.value),
                                                        })
                                                    }
                                                    style={s.input}
                                                />
                                            </div>
                                        </>
                                    );
                                })()}
                        </>
                    )}
                </div>

                {/* JSON Preview */}
                <div style={s.preview}>
                    <div style={s.previewTitle}>JSON Output</div>
                    {jsonOutput ? (
                        <>
                            <div style={s.json}>{jsonOutput}</div>
                            {validation && validation.errors.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    {validation.errors.map((e, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                fontSize: 9,
                                                color: '#ef4444',
                                                marginBottom: 1,
                                            }}
                                        >
                                            {e.path}: {e.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                            Click <strong>Export</strong> to generate the strategy JSON
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    style={{
                        ...s.toast,
                        background: toast.ok ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
                    }}
                >
                    {toast.ok ? (
                        <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    ) : (
                        <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    )}
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default DebateStrategyBuilder;
