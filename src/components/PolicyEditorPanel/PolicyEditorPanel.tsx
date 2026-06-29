import React, { useState, useEffect, useCallback } from 'react';
import { debatePolicyEngine } from '../../kernel/instances';
import type {
    PolicyRule,
    PolicyCondition,
    PolicyAction,
    PolicyFireResult,
} from '../../kernel/services/debate-runtime/debate-policy-engine';
import { BUILTIN_POLICY_RULES } from '../../kernel/services/debate-runtime/debate-policy-engine';
import type { DebatePhase } from '../../kernel/contracts/debate-runtime';
import type { PolicyType } from '../../kernel/contracts/debate-mode-system';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    CheckCircle,
    AlertCircle,
    X,
    Power,
    PowerOff,
    Copy,
    Zap,
    GitBranch,
} from 'lucide-react';
import { useConfirm } from '../../hooks/useConfirm';

const CONDITION_TYPES = [
    { value: 'phase_is', label: 'Phase is', group: 'Phase' },
    { value: 'phase_in', label: 'Phase in list', group: 'Phase' },
    { value: 'round_gt', label: 'Round >', group: 'Round' },
    { value: 'round_lt', label: 'Round <', group: 'Round' },
    { value: 'round_eq', label: 'Round =', group: 'Round' },
    { value: 'tokens_gt', label: 'Tokens >', group: 'Tokens' },
    { value: 'tokens_lt', label: 'Tokens <', group: 'Tokens' },
    { value: 'cost_gt', label: 'Cost >', group: 'Cost' },
    { value: 'agent_error_rate_gt', label: 'Error Rate >', group: 'Agent' },
    { value: 'confidence_lt', label: 'Confidence <', group: 'Consensus' },
    { value: 'pressure_is', label: 'Pressure is', group: 'Budget' },
    { value: 'policy_equals', label: 'Policy equals', group: 'Policy' },
    { value: 'and', label: 'AND', group: 'Logic' },
    { value: 'or', label: 'OR', group: 'Logic' },
    { value: 'not', label: 'NOT', group: 'Logic' },
] as const;

const ACTION_TYPES = [
    { value: 'set_policy', label: 'Set Policy', fields: ['policyType', 'value'] },
    { value: 'adjust_temperature', label: 'Adjust Temperature', fields: ['delta'] },
    { value: 'reduce_rounds', label: 'Reduce Rounds', fields: ['by'] },
    { value: 'skip_agent', label: 'Skip Agent', fields: ['agentId'] },
    { value: 'inject_message', label: 'Inject Message', fields: ['target', 'content'] },
    { value: 'pause', label: 'Pause', fields: [] },
    { value: 'emit_event', label: 'Emit Event', fields: ['eventName', 'payload'] },
    { value: 'log', label: 'Log', fields: ['level', 'message'] },
] as const;

const PHASES: DebatePhase[] = [
    'created',
    'queued',
    'initializing',
    'active',
    'deliberating',
    'consensus',
    'summarizing',
    'paused',
    'completed',
    'failed',
    'cancelled',
];
const LOG_LEVELS = ['info', 'warn', 'error'] as const;
const PRESSURE_LEVELS = ['low', 'normal', 'high', 'critical'];
const POLICY_TYPES: PolicyType[] = [
    'max_rounds',
    'time_limit_ms',
    'require_evidence',
    'forbid_emotion',
    'min_participants',
    'auto_summarize',
    'budget_cap_tokens',
    'temperature_cap',
    'require_sources',
    'contradiction_penalty',
];
const POLICY_TYPE_LABELS: Record<string, string> = {
    max_rounds: 'Max Rounds',
    time_limit_ms: 'Time Limit',
    require_evidence: 'Require Evidence',
    forbid_emotion: 'Forbid Emotion',
    min_participants: 'Min Participants',
    auto_summarize: 'Auto Summarize',
    budget_cap_tokens: 'Budget Cap',
    temperature_cap: 'Temperature Cap',
    require_sources: 'Require Sources',
    contradiction_penalty: 'Contradiction Penalty',
};

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
    ruleList: {
        width: 320,
        borderRight: '1px solid rgba(100,116,139,0.2)',
        padding: 8,
        overflowY: 'auto' as const,
        flexShrink: 0,
    },
    ruleCard: (enabled: boolean, selected: boolean) => ({
        padding: '8px 10px',
        borderRadius: 6,
        border: selected ? '1px solid #3b82f6' : '1px solid rgba(100,116,139,0.2)',
        background: selected ? 'rgba(59,130,246,0.08)' : 'rgba(30,41,59,0.5)',
        marginBottom: 4,
        cursor: 'pointer',
        opacity: enabled ? 1 : 0.5,
    }),
    editor: {
        flex: 1,
        padding: 8,
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 8,
    },
    preview: {
        width: 280,
        borderLeft: '1px solid rgba(100,116,139,0.2)',
        padding: 8,
        overflowY: 'auto' as const,
        flexShrink: 0,
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
    sectionTitle: {
        fontSize: 10,
        color: '#64748b',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        fontWeight: 600,
        marginTop: 6,
        marginBottom: 4,
    },
    badge: (color: string) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 600,
        background: `${color}15`,
        color,
    }),
    conditionBlock: {
        padding: '6px 8px',
        borderRadius: 4,
        border: '1px solid rgba(100,116,139,0.2)',
        background: 'rgba(0,0,0,0.15)',
        marginBottom: 4,
    },
    actionRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 6px',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.02)',
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
        marginTop: 2,
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
    row: { display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' as const },
};

function genId(): string {
    return `rule-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function createDefaultCondition(): PolicyCondition {
    return { type: 'round_gt', value: 2 };
}

function createDefaultAction(): PolicyAction {
    return { type: 'log', level: 'warn', message: 'Policy triggered' };
}

function createEmptyRule(): PolicyRule {
    return {
        id: genId(),
        name: '',
        description: '',
        enabled: true,
        priority: 50,
        condition: createDefaultCondition(),
        actions: [createDefaultAction()],
    };
}

function cloneRule(r: PolicyRule): PolicyRule {
    return structuredClone(r);
}

function conditionSummary(c: PolicyCondition): string {
    if (c.type === 'and' || c.type === 'or')
        return `${c.type.toUpperCase()} (${c.conditions.length} sub-conditions)`;
    if (c.type === 'not') return `NOT ${conditionSummary(c.condition)}`;
    if (c.type === 'phase_is') return `Phase = ${c.value}`;
    if (c.type === 'phase_in') return `Phase in [${c.values.join(', ')}]`;
    if (c.type === 'pressure_is') return `Pressure = ${c.value}`;
    if (c.type === 'policy_equals') return `${c.policyType} = ${c.value}`;
    if (c.type === 'agent_error_rate_gt') return `Error Rate > ${c.value}`;
    if (c.type === 'confidence_lt') return `Confidence < ${c.value}`;
    return `${c.type.replace(/_/g, ' ')} ${String('value' in c ? c.value : '')}`;
}

// ── Condition Editor ─────────────────────────────────────────────────

interface ConditionEditorProps {
    condition: PolicyCondition;
    onChange: (c: PolicyCondition) => void;
    onRemove?: () => void;
    depth?: number;
}

const ConditionEditor: React.FC<ConditionEditorProps> = ({
    condition,
    onChange,
    onRemove,
    depth = 0,
}) => {
    const setType = (type: string) => {
        switch (type) {
            case 'and':
                onChange({
                    type: 'and',
                    conditions: [createDefaultCondition(), createDefaultCondition()],
                });
                break;
            case 'or':
                onChange({
                    type: 'or',
                    conditions: [createDefaultCondition(), createDefaultCondition()],
                });
                break;
            case 'not':
                onChange({ type: 'not', condition: createDefaultCondition() });
                break;
            case 'phase_is':
                onChange({ type: 'phase_is', value: 'active' });
                break;
            case 'phase_in':
                onChange({ type: 'phase_in', values: ['active', 'deliberating'] });
                break;
            case 'round_gt':
                onChange({ type: 'round_gt', value: 2 });
                break;
            case 'round_lt':
                onChange({ type: 'round_lt', value: 5 });
                break;
            case 'round_eq':
                onChange({ type: 'round_eq', value: 3 });
                break;
            case 'tokens_gt':
                onChange({ type: 'tokens_gt', value: 10000 });
                break;
            case 'tokens_lt':
                onChange({ type: 'tokens_lt', value: 100000 });
                break;
            case 'cost_gt':
                onChange({ type: 'cost_gt', value: 0.05 });
                break;
            case 'agent_error_rate_gt':
                onChange({ type: 'agent_error_rate_gt', value: 0.5 });
                break;
            case 'confidence_lt':
                onChange({ type: 'confidence_lt', value: 0.3 });
                break;
            case 'pressure_is':
                onChange({ type: 'pressure_is', value: 'high' });
                break;
            case 'policy_equals':
                onChange({ type: 'policy_equals', policyType: 'max_rounds', value: 10 });
                break;
        }
    };

    const isLogical = condition.type === 'and' || condition.type === 'or';
    const isNot = condition.type === 'not';
    const showValue = !isLogical && !isNot && condition.type !== 'phase_in';
    const showValues = condition.type === 'phase_in';

    return (
        <div style={{ ...s.conditionBlock, marginLeft: depth * 16 }}>
            <div style={s.row}>
                <select
                    value={condition.type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ ...s.select, width: 120, fontSize: 10 }}
                >
                    {CONDITION_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                            {ct.label}
                        </option>
                    ))}
                </select>
                {showValue &&
                    (condition.type as string) !== 'not' &&
                    (condition.type === 'pressure_is' ? (
                        <select
                            value={String((condition as { value: string }).value)}
                            onChange={(e) =>
                                onChange({ ...condition, value: e.target.value } as PolicyCondition)
                            }
                            style={{ ...s.select, width: 80, fontSize: 10 }}
                        >
                            {PRESSURE_LEVELS.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    ) : condition.type === 'policy_equals' ? (
                        <>
                            <select
                                value={(condition as { policyType: string }).policyType}
                                onChange={(e) =>
                                    onChange({
                                        ...condition,
                                        policyType: e.target.value,
                                    } as PolicyCondition)
                                }
                                style={{ ...s.select, width: 100, fontSize: 10 }}
                            >
                                {POLICY_TYPES.map((pt) => (
                                    <option key={pt} value={pt}>
                                        {POLICY_TYPE_LABELS[pt] || pt}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={String((condition as { value: unknown }).value ?? '')}
                                onChange={(e) => {
                                    const n = parseFloat(e.target.value);
                                    onChange({
                                        ...condition,
                                        value: isNaN(n) ? e.target.value : n,
                                    } as PolicyCondition);
                                }}
                                style={{ ...s.input, width: 60, fontSize: 10 }}
                                placeholder="value"
                            />
                        </>
                    ) : condition.type === 'phase_is' ? (
                        <select
                            value={(condition as { value: DebatePhase }).value}
                            onChange={(e) =>
                                onChange({ ...condition, value: e.target.value } as PolicyCondition)
                            }
                            style={{ ...s.select, width: 100, fontSize: 10 }}
                        >
                            {PHASES.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="number"
                            step="any"
                            value={Number((condition as { value: number }).value)}
                            onChange={(e) =>
                                onChange({
                                    ...condition,
                                    value: Number(e.target.value),
                                } as PolicyCondition)
                            }
                            style={{ ...s.input, width: 70, fontSize: 10 }}
                        />
                    ))}
                {showValues && (
                    <input
                        type="text"
                        value={(condition as { values: string[] }).values.join(', ')}
                        onChange={(e) =>
                            onChange({
                                ...condition,
                                values: e.target.value
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                            } as PolicyCondition)
                        }
                        style={{ ...s.input, width: 140, fontSize: 10 }}
                        placeholder="phase1, phase2"
                    />
                )}
                {onRemove && (
                    <button onClick={onRemove} style={s.iconBtn} aria-label="Remove condition">
                        <X size={12} />
                    </button>
                )}
            </div>
            {isLogical &&
                (condition as { conditions: PolicyCondition[] }).conditions.map((sub, i) => (
                    <ConditionEditor
                        key={`${sub.type}-${i}`}
                        condition={sub}
                        depth={depth + 1}
                        onChange={(c) => {
                            const cc = {
                                ...condition,
                                conditions: [
                                    ...(condition as { conditions: PolicyCondition[] }).conditions,
                                ],
                            };
                            cc.conditions[i] = c;
                            onChange(cc);
                        }}
                        onRemove={() => {
                            const cc = {
                                ...condition,
                                conditions: (
                                    condition as { conditions: PolicyCondition[] }
                                ).conditions.filter((_, j) => j !== i),
                            };
                            onChange(cc);
                        }}
                    />
                ))}
            {isLogical && (
                <button
                    onClick={() => {
                        const cc = {
                            ...condition,
                            conditions: [
                                ...(condition as { conditions: PolicyCondition[] }).conditions,
                                createDefaultCondition(),
                            ],
                        };
                        onChange(cc);
                    }}
                    style={s.addBtn}
                >
                    + Sub-condition
                </button>
            )}
            {isNot && (
                <ConditionEditor
                    condition={(condition as { condition: PolicyCondition }).condition}
                    depth={depth + 1}
                    onChange={(c) => onChange({ ...condition, condition: c })}
                />
            )}
        </div>
    );
};

// ── Action Editor ────────────────────────────────────────────────────

interface ActionEditorProps {
    action: PolicyAction;
    onChange: (a: PolicyAction) => void;
    onRemove: () => void;
}

const ActionEditor: React.FC<ActionEditorProps> = ({ action, onChange, onRemove }) => {
    const setType = (type: string) => {
        switch (type) {
            case 'set_policy':
                onChange({ type: 'set_policy', policyType: 'max_rounds', value: 10 });
                break;
            case 'adjust_temperature':
                onChange({ type: 'adjust_temperature', delta: -0.1 });
                break;
            case 'reduce_rounds':
                onChange({ type: 'reduce_rounds', by: 2 });
                break;
            case 'skip_agent':
                onChange({ type: 'skip_agent', agentId: 'agent-name' });
                break;
            case 'inject_message':
                onChange({
                    type: 'inject_message',
                    target: 'agent-id',
                    content: 'Please consider...',
                });
                break;
            case 'pause':
                onChange({ type: 'pause' } as PolicyAction);
                break;
            case 'emit_event':
                onChange({ type: 'emit_event', eventName: 'debate:custom', payload: {} });
                break;
            case 'log':
                onChange({ type: 'log', level: 'warn', message: 'Policy triggered' });
                break;
        }
    };

    return (
        <div style={s.actionRow}>
            <select
                value={action.type}
                onChange={(e) => setType(e.target.value)}
                style={{ ...s.select, width: 110, fontSize: 10 }}
            >
                {ACTION_TYPES.map((at) => (
                    <option key={at.value} value={at.value}>
                        {at.label}
                    </option>
                ))}
            </select>
            {action.type === 'log' && (
                <>
                    <select
                        value={action.level}
                        onChange={(e) =>
                            onChange({
                                ...action,
                                level: e.target.value as 'info' | 'warn' | 'error',
                            })
                        }
                        style={{ ...s.select, width: 55, fontSize: 10 }}
                    >
                        {LOG_LEVELS.map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>
                    <input
                        value={action.message}
                        onChange={(e) => onChange({ ...action, message: e.target.value })}
                        style={{ ...s.input, flex: 1, fontSize: 10 }}
                        placeholder="message"
                    />
                </>
            )}
            {action.type === 'set_policy' && (
                <>
                    <select
                        value={action.policyType}
                        onChange={(e) =>
                            onChange({ ...action, policyType: e.target.value as PolicyType })
                        }
                        style={{ ...s.select, width: 100, fontSize: 10 }}
                    >
                        {POLICY_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                                {POLICY_TYPE_LABELS[pt] || pt}
                            </option>
                        ))}
                    </select>
                    <input
                        value={String(action.value ?? '')}
                        onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            onChange({ ...action, value: isNaN(n) ? e.target.value : n });
                        }}
                        style={{ ...s.input, width: 60, fontSize: 10 }}
                        placeholder="value"
                    />
                </>
            )}
            {action.type === 'adjust_temperature' && (
                <input
                    type="number"
                    step={0.05}
                    value={action.delta}
                    onChange={(e) => onChange({ ...action, delta: Number(e.target.value) })}
                    style={{ ...s.input, width: 60, fontSize: 10 }}
                />
            )}
            {action.type === 'reduce_rounds' && (
                <input
                    type="number"
                    min={1}
                    value={action.by}
                    onChange={(e) => onChange({ ...action, by: Number(e.target.value) })}
                    style={{ ...s.input, width: 50, fontSize: 10 }}
                />
            )}
            {action.type === 'skip_agent' && (
                <input
                    value={action.agentId}
                    onChange={(e) => onChange({ ...action, agentId: e.target.value })}
                    style={{ ...s.input, width: 100, fontSize: 10 }}
                    placeholder="agent ID"
                />
            )}
            {action.type === 'inject_message' && (
                <>
                    <input
                        value={action.target}
                        onChange={(e) => onChange({ ...action, target: e.target.value })}
                        style={{ ...s.input, width: 80, fontSize: 10 }}
                        placeholder="target"
                    />
                    <input
                        value={action.content}
                        onChange={(e) => onChange({ ...action, content: e.target.value })}
                        style={{ ...s.input, flex: 1, fontSize: 10 }}
                        placeholder="message"
                    />
                </>
            )}
            {action.type === 'emit_event' && (
                <>
                    <input
                        value={action.eventName}
                        onChange={(e) => onChange({ ...action, eventName: e.target.value })}
                        style={{ ...s.input, width: 120, fontSize: 10 }}
                        placeholder="event name"
                    />
                </>
            )}
            {action.type === 'pause' && (
                <span style={{ fontSize: 10, color: '#64748b' }}>(no config needed)</span>
            )}
            <button onClick={onRemove} style={s.iconBtn} aria-label="Remove action">
                <X size={12} />
            </button>
        </div>
    );
};

// ── Main Panel ───────────────────────────────────────────────────────

const PolicyEditorPanel: React.FC = () => {
    const [rules, setRules] = useState<PolicyRule[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editing, setEditing] = useState<PolicyRule | null>(null);
    const [jsonOutput, setJsonOutput] = useState('');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const refresh = useCallback(() => {
        const list = debatePolicyEngine.listRules();
        setRules(list);
        if (selectedId && !list.find((r) => r.id === selectedId)) setSelectedId(null);
    }, [selectedId]);

    useEffect(() => {
        debatePolicyEngine.setFireListener((result: PolicyFireResult) => {
            showToast(`Rule fired: "${result.ruleName}" (${result.actionsExecuted} actions)`);
            refresh();
        });
        refresh();
        return () => debatePolicyEngine.setFireListener(() => {});
    }, [showToast, refresh]);

    const selectRule = useCallback((id: string) => {
        setSelectedId(id);
        const rule = debatePolicyEngine.getRule(id);
        if (rule) setEditing(cloneRule(rule));
    }, []);

    const handleNew = useCallback(() => {
        const rule = createEmptyRule();
        setEditing(rule);
        setSelectedId(null);
    }, []);

    const handleSave = useCallback(() => {
        if (!editing) return;
        try {
            debatePolicyEngine.addRule(cloneRule(editing));
            showToast(`Rule "${editing.name || editing.id}" saved`);
            refresh();
            setSelectedId(editing.id);
        } catch (e) {
            showToast(`Save failed: ${e}`, false);
        }
    }, [editing, refresh, showToast]);

    const handleDelete = useCallback(
        async (id: string) => {
            if (
                !(await confirm({
                    title: 'Delete Rule',
                    message: 'Are you sure you want to delete this rule? This cannot be undone.',
                    variant: 'danger',
                }))
            )
                return;
            debatePolicyEngine.removeRule(id);
            showToast('Rule deleted');
            if (selectedId === id) {
                setSelectedId(null);
                setEditing(null);
            }
            refresh();
        },
        [selectedId, refresh, showToast, confirm],
    );

    const handleToggle = useCallback(
        (id: string, enabled: boolean) => {
            if (enabled) debatePolicyEngine.enableRule(id);
            else debatePolicyEngine.disableRule(id);
            refresh();
        },
        [refresh],
    );

    const handleDuplicate = useCallback(
        (id: string) => {
            const rule = debatePolicyEngine.getRule(id);
            if (!rule) return;
            const copy = {
                ...cloneRule(rule),
                id: genId(),
                name: `${rule.name} (copy)`,
            } as PolicyRule;
            debatePolicyEngine.addRule(copy);
            showToast('Rule duplicated');
            refresh();
        },
        [refresh, showToast],
    );

    const handleExport = useCallback(() => {
        setJsonOutput(debatePolicyEngine.exportRules());
        showToast('Rules exported to JSON');
    }, [showToast]);

    const handleImport = useCallback(() => {
        if (!jsonOutput) return;
        const result = debatePolicyEngine.importRules(jsonOutput);
        if (result.success) {
            showToast(`Imported ${result.count} rules`);
            refresh();
        } else {
            showToast(`Import failed: ${result.error}`, false);
        }
    }, [jsonOutput, refresh, showToast]);

    const handleReset = useCallback(async () => {
        if (
            !(await confirm({
                title: 'Reset All Rules',
                message: 'Are you sure you want to reset all debate rules? This cannot be undone.',
                variant: 'danger',
            }))
        )
            return;
        debatePolicyEngine.reset();
        showToast('All rules cleared');
        setSelectedId(null);
        setEditing(null);
        refresh();
    }, [refresh, showToast, confirm]);

    const loadPresets = useCallback(() => {
        for (const rule of BUILTIN_POLICY_RULES) {
            debatePolicyEngine.addRule(cloneRule(rule));
        }
        showToast(`Loaded ${BUILTIN_POLICY_RULES.length} built-in rules`);
        refresh();
    }, [refresh, showToast]);

    const conditionCount = (c: PolicyCondition): number => {
        if (c.type === 'and' || c.type === 'or')
            return 1 + c.conditions.reduce((s, sc) => s + conditionCount(sc), 0);
        if (c.type === 'not') return 1 + conditionCount(c.condition);
        return 1;
    };

    return (
        <div style={s.panel}>
            <div style={s.toolbar}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
                    Debate Policy Rules Engine
                </span>
                <button style={s.btnSuccess} onClick={handleNew}>
                    <Plus size={12} /> New Rule
                </button>
                <button style={s.btn} onClick={loadPresets}>
                    <GitBranch size={12} /> Load Built-ins
                </button>
                <button style={s.btn} onClick={handleExport}>
                    <Save size={12} /> Export
                </button>
                <button style={s.btn} onClick={handleImport}>
                    <Upload size={12} /> Import
                </button>
                <button style={s.btnDanger} onClick={handleReset}>
                    <Trash2 size={12} /> Reset
                </button>
                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
                    {rules.length} rule{rules.length !== 1 ? 's' : ''} ·{' '}
                    {rules.filter((r) => r.enabled).length} active
                </span>
            </div>

            <div style={s.main}>
                {/* Rule List */}
                <div style={s.ruleList}>
                    <div style={s.fieldLabel}>Rules</div>
                    {rules.length === 0 && (
                        <div
                            style={{
                                fontSize: 10,
                                color: '#64748b',
                                fontStyle: 'italic',
                                padding: 8,
                                textAlign: 'center',
                            }}
                        >
                            No rules. Click "New Rule" or "Load Built-ins" to start.
                        </div>
                    )}
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            style={s.ruleCard(rule.enabled, selectedId === rule.id)}
                            onClick={() => selectRule(rule.id)}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 2,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggle(rule.id, !rule.enabled);
                                        }}
                                        style={{
                                            ...s.iconBtn,
                                            color: rule.enabled ? '#22c55e' : '#64748b',
                                        }}
                                        aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                    >
                                        {rule.enabled ? (
                                            <Power size={11} />
                                        ) : (
                                            <PowerOff size={11} />
                                        )}
                                    </button>
                                    <span
                                        style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}
                                    >
                                        {rule.name || rule.id.slice(0, 16)}
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 9,
                                        color: '#64748b',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    P{rule.priority}
                                </span>
                            </div>
                            <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>
                                {conditionSummary(rule.condition)}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <span style={s.badge('#8b5cf6')}>
                                    {rule.actions.length} action
                                    {rule.actions.length !== 1 ? 's' : ''}
                                </span>
                                <span style={s.badge('#06b6d4')}>
                                    {conditionCount(rule.condition)} condition
                                    {conditionCount(rule.condition) !== 1 ? 's' : ''}
                                </span>
                                {rule.cooldownMs && (
                                    <span style={s.badge('#f59e0b')}>
                                        {rule.cooldownMs / 1000}s cooldown
                                    </span>
                                )}
                                {rule.maxFirings && (
                                    <span style={s.badge('#ef4444')}>max {rule.maxFirings}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Editor */}
                <div style={s.editor}>
                    {!editing ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#64748b',
                                gap: 8,
                            }}
                        >
                            <Zap size={32} style={{ opacity: 0.3 }} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                                Select a rule or create a new one
                            </span>
                            <span style={{ fontSize: 10 }}>
                                Use conditions and actions to define debate policy automation
                            </span>
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                        style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}
                                    >
                                        {editing.name || 'New Rule'}
                                    </span>
                                    <span style={s.badge(editing.enabled ? '#22c55e' : '#64748b')}>
                                        {editing.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={handleSave} style={s.btnPrimary}>
                                        <Save size={12} /> Save
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(editing.id)}
                                        style={s.btn}
                                    >
                                        <Copy size={12} /> Duplicate
                                    </button>
                                    <button
                                        onClick={() => handleDelete(editing.id)}
                                        style={s.btnDanger}
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            </div>

                            {/* General */}
                            <div>
                                <div style={s.sectionTitle}>General</div>
                                <div style={s.row}>
                                    <div style={{ flex: 1 }}>
                                        <div style={s.fieldLabel}>Name</div>
                                        <input
                                            value={editing.name}
                                            onChange={(e) =>
                                                setEditing({ ...editing, name: e.target.value })
                                            }
                                            style={s.input}
                                            placeholder="Rule name"
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={s.fieldLabel}>Description</div>
                                        <input
                                            value={editing.description || ''}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    description: e.target.value,
                                                })
                                            }
                                            style={s.input}
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div style={{ width: 70 }}>
                                        <div style={s.fieldLabel}>Priority</div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={editing.priority}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    priority: Number(e.target.value),
                                                })
                                            }
                                            style={s.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Conditions */}
                            <div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div style={s.sectionTitle}>Condition</div>
                                    <span style={{ fontSize: 9, color: '#64748b' }}>
                                        {conditionCount(editing.condition)} sub-condition
                                        {conditionCount(editing.condition) !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <ConditionEditor
                                    condition={editing.condition}
                                    onChange={(c) => setEditing({ ...editing, condition: c })}
                                />
                            </div>

                            {/* Actions */}
                            <div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div style={s.sectionTitle}>
                                        Actions ({editing.actions.length})
                                    </div>
                                    <button
                                        onClick={() =>
                                            setEditing({
                                                ...editing,
                                                actions: [
                                                    ...editing.actions,
                                                    createDefaultAction(),
                                                ],
                                            })
                                        }
                                        style={s.addBtn}
                                    >
                                        + Action
                                    </button>
                                </div>
                                {editing.actions.map((action, i) => (
                                    <ActionEditor
                                        key={`${action.type}-${i}`}
                                        action={action}
                                        onChange={(a) => {
                                            const aa = [...editing.actions];
                                            aa[i] = a;
                                            setEditing({ ...editing, actions: aa });
                                        }}
                                        onRemove={() =>
                                            setEditing({
                                                ...editing,
                                                actions: editing.actions.filter((_, j) => j !== i),
                                            })
                                        }
                                    />
                                ))}
                            </div>

                            {/* Cooldown & Limits */}
                            <div>
                                <div style={s.sectionTitle}>Limits</div>
                                <div style={s.row}>
                                    <div style={{ width: 120 }}>
                                        <div style={s.fieldLabel}>Cooldown (ms)</div>
                                        <input
                                            type="number"
                                            min={0}
                                            value={editing.cooldownMs ?? 0}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    cooldownMs: Number(e.target.value) || undefined,
                                                })
                                            }
                                            style={s.input}
                                            placeholder="0 = no cooldown"
                                        />
                                    </div>
                                    <div style={{ width: 120 }}>
                                        <div style={s.fieldLabel}>Max Firings</div>
                                        <input
                                            type="number"
                                            min={0}
                                            value={editing.maxFirings ?? 0}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    maxFirings: Number(e.target.value) || undefined,
                                                })
                                            }
                                            style={s.input}
                                            placeholder="0 = unlimited"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Preview */}
                <div style={s.preview}>
                    <div style={s.fieldLabel}>JSON Preview</div>
                    {jsonOutput ? (
                        <div
                            style={{
                                fontFamily: 'monospace',
                                fontSize: 9,
                                color: '#94a3b8',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                background: 'rgba(0,0,0,0.3)',
                                padding: 8,
                                borderRadius: 4,
                                maxHeight: 'calc(100% - 200px)',
                                overflow: 'auto',
                            }}
                        >
                            {jsonOutput}
                        </div>
                    ) : editing ? (
                        <div
                            style={{
                                fontFamily: 'monospace',
                                fontSize: 9,
                                color: '#94a3b8',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                background: 'rgba(0,0,0,0.3)',
                                padding: 8,
                                borderRadius: 4,
                                maxHeight: 'calc(100% - 200px)',
                                overflow: 'auto',
                            }}
                        >
                            {JSON.stringify(editing, null, 2)}
                        </div>
                    ) : (
                        <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                            Select or create a rule to preview
                        </div>
                    )}
                </div>
            </div>

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
            <ConfirmDialog />
        </div>
    );
};

export default PolicyEditorPanel;
