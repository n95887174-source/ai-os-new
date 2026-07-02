import React, { useState } from 'react';
import {
    Shuffle,
    Plus,
    Play,
    RotateCcw,
    Trash2,
    ArrowRight,
    CheckCircle,
    XCircle,
    Clock,
    Loader,
    X,
} from 'lucide-react';
import PanelLoader from '../PanelLoader';
import { providerMigrationService } from '../../kernel/instances';

const STATUS_COLORS: Record<string, string> = {
    draft: '#64748b',
    in_progress: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
    rolled_back: '#f59e0b',
};

const ProviderMigrationPanelContent: React.FC = () => {
    const [plans, setPlans] = useState(() => providerMigrationService.getPlans());
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [source, setSource] = useState('Groq');
    const [target, setTarget] = useState('NVIDIA');
    const [models, setModels] = useState('');

    const refresh = () => setPlans([...providerMigrationService.getPlans()]);

    const handleCreate = () => {
        if (!name.trim()) return;
        const modelsList = models
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean);
        providerMigrationService.createPlan(
            name,
            source,
            target,
            modelsList.length > 0 ? modelsList : ['default-model'],
        );
        setShowForm(false);
        setName('');
        setModels('');
        refresh();
    };

    const handleExecute = async (id: string) => {
        await providerMigrationService.executePlan(id);
        refresh();
    };

    const handleRollback = async (id: string) => {
        await providerMigrationService.rollbackPlan(id);
        refresh();
    };

    const handleDelete = (id: string) => {
        providerMigrationService.deletePlan(id);
        refresh();
    };

    return (
        <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: '0 0 4px',
                            fontSize: 18,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Shuffle size={20} color="#f59e0b" /> Provider Migration Wizard
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                        Plan and execute provider migrations with automatic rollback support
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        background: showForm ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: showForm ? '#ef4444' : '#f59e0b',
                    }}
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'New Migration'}
                </button>
            </div>

            {showForm && (
                <div
                    style={{
                        background: '#1e293b',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: 16,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                            marginBottom: 12,
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                Plan Name
                            </div>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Groq -> NVIDIA"
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: '#0f172a',
                                    color: '#e2e8f0',
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                Models (comma separated)
                            </div>
                            <input
                                value={models}
                                onChange={(e) => setModels(e.target.value)}
                                placeholder="llama-3.1-8b, mixtral"
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: '#0f172a',
                                    color: '#e2e8f0',
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            gap: 8,
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            style={{
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: '#0f172a',
                                color: '#e2e8f0',
                                fontSize: 13,
                                outline: 'none',
                            }}
                        >
                            {['Groq', 'Gemini', 'NVIDIA', 'OpenRouter'].map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                        <ArrowRight size={16} color="#64748b" />
                        <select
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            style={{
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: '#0f172a',
                                color: '#e2e8f0',
                                fontSize: 13,
                                outline: 'none',
                            }}
                        >
                            {['Groq', 'Gemini', 'NVIDIA', 'OpenRouter']
                                .filter((p) => p !== source)
                                .map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: 'rgba(245,158,11,0.2)',
                            color: '#f59e0b',
                            fontSize: 13,
                            fontWeight: 600,
                            opacity: name.trim() ? 1 : 0.5,
                        }}
                    >
                        <Plus size={14} /> Create Migration Plan
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        style={{
                            background: '#1e293b',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: 16,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 10,
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
                                    {plan.name}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                    {plan.sourceProvider} → {plan.targetProvider} ·{' '}
                                    {plan.models.join(', ')}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                    style={{
                                        padding: '3px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: `${STATUS_COLORS[plan.status]}20`,
                                        color: STATUS_COLORS[plan.status],
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {plan.status.replace('_', ' ')}
                                </div>
                                {plan.status === 'draft' && (
                                    <button
                                        onClick={() => handleExecute(plan.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '6px 10px',
                                            borderRadius: 6,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: 'rgba(59,130,246,0.15)',
                                            color: '#3b82f6',
                                            fontSize: 11,
                                            fontWeight: 600,
                                        }}
                                    >
                                        <Play size={12} /> Execute
                                    </button>
                                )}
                                {(plan.status === 'completed' || plan.status === 'in_progress') && (
                                    <button
                                        onClick={() => handleRollback(plan.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '6px 10px',
                                            borderRadius: 6,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: 'rgba(245,158,11,0.15)',
                                            color: '#f59e0b',
                                            fontSize: 11,
                                            fontWeight: 600,
                                        }}
                                    >
                                        <RotateCcw size={12} /> Rollback
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '6px 10px',
                                        borderRadius: 6,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: 'rgba(239,68,68,0.15)',
                                        color: '#ef4444',
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {plan.steps.map((step) => (
                                <div
                                    key={step.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 12,
                                        color: '#94a3b8',
                                    }}
                                >
                                    {step.status === 'done' ? (
                                        <CheckCircle size={14} color="#10b981" />
                                    ) : step.status === 'error' ? (
                                        <XCircle size={14} color="#ef4444" />
                                    ) : step.status === 'running' ? (
                                        <Loader
                                            size={14}
                                            color="#3b82f6"
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Clock size={14} color="#475569" />
                                    )}
                                    <span
                                        style={{
                                            fontWeight: step.status === 'running' ? 600 : 400,
                                        }}
                                    >
                                        {step.action}
                                    </span>
                                    {step.detail && (
                                        <span style={{ color: '#64748b' }}>— {step.detail}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
                            Created {new Date(plan.createdAt).toLocaleDateString()}
                            {plan.completedAt &&
                                ` · Completed ${new Date(plan.completedAt).toLocaleDateString()}`}
                        </div>
                    </div>
                ))}
            </div>

            {plans.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <Shuffle size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: 14 }}>No migration plans yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                        Create your first plan to migrate between providers
                    </div>
                </div>
            )}
        </div>
    );
};

const ProviderMigrationPanel: React.FC = () => (
    <PanelLoader name="Provider Migration">
        <ProviderMigrationPanelContent />
    </PanelLoader>
);

export default ProviderMigrationPanel;
