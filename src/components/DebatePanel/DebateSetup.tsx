import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Play, Loader2, Bot, Activity, CheckCircle2, Zap } from 'lucide-react';
import type { DebateArchetypeId } from '../../kernel/services/debate-runtime/debate-archetypes';
import { DEBATE_ARCHETYPES } from '../../kernel/services/debate-runtime/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import type {
    AutoDebateResult,
    BatchTestResult,
    ProviderWinRate,
} from '../../kernel/contracts/auto-debate';
import AutoDebateSection from './AutoDebateSection';
import { textCenter, textSecondaryItalic } from '../../styles/common';

interface DebateSetupProps {
    topic: string;
    onTopicChange: (value: string) => void;
    strategy: string;
    onStrategyChange: (value: string) => void;
    maxRounds: number;
    onMaxRoundsChange: (value: number) => void;
    debateTemperature: number;
    onTemperatureChange: (value: number) => void;
    agentArchetypes: Record<string, DebateArchetypeId>;
    onArchetypeChange: (id: DebateArchetypeId | 'auto') => void;
    selectedAgents: string[];
    onToggleAgent: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    availableAgents: Array<{ id: string; label: string }>;
    agentConstraints: Record<string, string>;
    onConstraintChange: (agentId: string, constraint: string) => void;
    probeResults: Map<string, ProbeResult> | null;
    probeLoading: boolean;
    onProbe: () => void;
    expandedProbe: string | null;
    onToggleProbe: (id: string | null) => void;
    actionLoading: 'start' | 'inject' | null;
    onStart: () => void;
    showAuto: boolean;
    onToggleAuto: () => void;
    autoResults: AutoDebateResult[];
    autoWinRates: ProviderWinRate[];
    onAutoDebate: (options?: {
        topic?: string;
        category?: string;
        maxParticipants?: number;
        maxRounds?: number;
    }) => Promise<AutoDebateResult>;
    onStressTest: (count?: number) => Promise<AutoDebateResult[]>;
    onBatchTest: (topic: string, runs?: number) => Promise<BatchTestResult>;
    onClearAuto: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const STATUS_COLORS: Record<string, string> = {
    ready: '#10b981',
    degraded: '#f59e0b',
    limited: '#f97316',
    broken: '#ef4444',
    unknown: '#64748b',
};

const DebateSetup: React.FC<DebateSetupProps> = ({
    topic,
    onTopicChange,
    strategy,
    onStrategyChange,
    maxRounds,
    onMaxRoundsChange,
    debateTemperature,
    onTemperatureChange,
    agentArchetypes,
    onArchetypeChange,
    selectedAgents,
    onToggleAgent,
    onSelectAll,
    onDeselectAll,
    availableAgents,
    agentConstraints,
    onConstraintChange,
    probeResults,
    probeLoading,
    onProbe,
    expandedProbe,
    onToggleProbe,
    actionLoading,
    onStart,
    showAuto,
    onToggleAuto,
    autoResults,
    autoWinRates,
    onAutoDebate,
    onStressTest,
    onBatchTest,
    onClearAuto,
    t,
}) => {
    return (
        <div style={{ flex: 1, display: 'flex', padding: '3rem', overflowY: 'auto' }}>
            <div
                style={{
                    width: '100%',
                    maxWidth: 750,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem',
                }}
            >
                <div style={textCenter}>
                    <div
                        style={{
                            display: 'inline-flex',
                            padding: '1.25rem',
                            background: 'rgba(168,85,247,0.1)',
                            borderRadius: '50%',
                            marginBottom: '1.5rem',
                            border: '1px solid rgba(168,85,247,0.2)',
                            boxShadow: '0 0 30px rgba(168,85,247,0.15)',
                        }}
                    >
                        <Users size={56} color="#a855f7" />
                    </div>
                    <h3
                        style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            margin: '0 0 0.5rem 0',
                            color: '#f8fafc',
                        }}
                    >
                        {t('debate.config_title')}
                    </h3>
                    <p
                        style={{
                            color: '#94a3b8',
                            fontSize: '1rem',
                            maxWidth: '500px',
                            margin: '0 auto',
                        }}
                    >
                        {t('debate.config_desc')}
                    </p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '2.5rem',
                        borderRadius: 24,
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <div>
                        <label className="debate-label debate-label--block">
                            {t('debate.thesis')}
                        </label>
                        <textarea
                            rows={3}
                            placeholder={t('debate.thesis_placeholder')}
                            aria-label={t('debate.thesis')}
                            className="debate-input debate-textarea"
                            value={topic}
                            onChange={(e) => onTopicChange(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="debate-label debate-label--block">
                                {t('debate.strategy')}
                            </label>
                            <select
                                value={strategy}
                                onChange={(e) => onStrategyChange(e.target.value)}
                                aria-label={t('debate.strategy')}
                                className="debate-input debate-select"
                            >
                                <option value="round_robin">{t('debate.strategy_rr')}</option>
                                <option value="moderated">{t('debate.strategy_moderated')}</option>
                                <option value="free_for_all">{t('debate.strategy_ffa')}</option>
                                <option value="socratic">{t('debate.strategy_socratic')}</option>
                                <option value="argument_tree">{t('debate.strategy_tree')}</option>
                                <option value="constrained">
                                    {t('debate.strategy_constrained')}
                                </option>
                                <option value="jury_trial">Jury Trial</option>
                            </select>
                        </div>
                        <div>
                            <label className="debate-label debate-label--block">
                                {t('debate.max_rounds')}
                            </label>
                            <input
                                type="number"
                                min={2}
                                max={50}
                                value={maxRounds}
                                onChange={(e) => onMaxRoundsChange(parseInt(e.target.value) || 10)}
                                aria-label={t('debate.max_rounds')}
                                className="debate-input"
                            />
                        </div>
                        <div>
                            <label
                                className="debate-label debate-label--block"
                                style={{ marginTop: 6 }}
                            >
                                {t('debate.temperature_label')}:{' '}
                                {
                                    [
                                        'Pure Logic',
                                        'Mostly Logic',
                                        'Slightly Logical',
                                        'Analytical',
                                        'Leaning Logic',
                                        'Balanced',
                                        'Leaning Emotion',
                                        'Passionate',
                                        'Very Emotional',
                                        'Intense',
                                        'Pure Emotion',
                                    ][debateTemperature]
                                }
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={10}
                                step={1}
                                value={debateTemperature}
                                onChange={(e) => onTemperatureChange(parseInt(e.target.value))}
                                aria-label={t('debate.temperature')}
                                className="debate-input"
                                style={{
                                    width: '100%',
                                    accentColor:
                                        debateTemperature <= 2
                                            ? '#38bdf8'
                                            : debateTemperature <= 4
                                              ? '#34d399'
                                              : debateTemperature <= 6
                                                ? '#fbbf24'
                                                : debateTemperature <= 8
                                                  ? '#fb923c'
                                                  : '#ef4444',
                                }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 11,
                                    color: '#64748b',
                                    marginTop: 2,
                                }}
                            >
                                <span>{t('debate.temperature_min')}</span>
                                <span>{t('debate.temperature_mid')}</span>
                                <span>{t('debate.temperature_max')}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="debate-label debate-label--block">
                            {t('debate.archetype')}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(
                                [
                                    'auto',
                                    ...(Object.keys(DEBATE_ARCHETYPES) as DebateArchetypeId[]),
                                ] as Array<'auto' | DebateArchetypeId>
                            ).map((key) => {
                                const isActive =
                                    key === 'auto'
                                        ? Object.keys(agentArchetypes).length === 0
                                        : Object.values(agentArchetypes).includes(key);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => onArchetypeChange(key)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: 8,
                                            border: '1px solid',
                                            fontSize: '0.78rem',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            background: isActive
                                                ? 'rgba(168,85,247,0.15)'
                                                : 'transparent',
                                            borderColor: isActive
                                                ? 'rgba(168,85,247,0.3)'
                                                : 'rgba(255,255,255,0.08)',
                                            color: isActive ? '#a855f7' : '#94a3b8',
                                        }}
                                    >
                                        {key === 'auto' ? 'Auto' : DEBATE_ARCHETYPES[key].name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="debate-label debate-label--flex">
                            {t('debate.participants')}
                            <span
                                className="debate-badge"
                                style={{
                                    color: '#a855f7',
                                    background: 'rgba(168,85,247,0.1)',
                                    border: '1px solid rgba(168,85,247,0.2)',
                                }}
                            >
                                {selectedAgents.length} {t('debate.selected')}
                            </span>
                        </label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
                            <button
                                onClick={onSelectAll}
                                className="btn-ghost"
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.75rem',
                                    color: '#a855f7',
                                    border: '1px solid rgba(168,85,247,0.3)',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: 'transparent',
                                }}
                            >
                                {t('debate.select_all')}
                            </button>
                            <button
                                onClick={onDeselectAll}
                                className="btn-ghost"
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.75rem',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: 'transparent',
                                }}
                            >
                                {t('debate.deselect_all')}
                            </button>
                        </div>
                        <motion.div
                            layout
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '1rem',
                            }}
                        >
                            <AnimatePresence>
                                {availableAgents.map((agent, i) => (
                                    <motion.div
                                        key={agent.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ type: 'spring', delay: i * 0.05 }}
                                        onClick={() => onToggleAgent(agent.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onToggleAgent(agent.id);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={selectedAgents.includes(agent.id)}
                                        aria-label={`${agent.label}${selectedAgents.includes(agent.id) ? ' (selected)' : ''}`}
                                        className={`debate-card${selectedAgents.includes(agent.id) ? ' debate-card--selected' : ''}`}
                                    >
                                        {selectedAgents.includes(agent.id) ? (
                                            <CheckCircle2 size={18} color="#a855f7" />
                                        ) : (
                                            <Bot size={18} color="#64748b" />
                                        )}
                                        <span
                                            style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 700,
                                                color: selectedAgents.includes(agent.id)
                                                    ? 'white'
                                                    : '#94a3b8',
                                            }}
                                        >
                                            {agent.label}
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {availableAgents.length === 0 && (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="debate-error-msg"
                                >
                                    {t('debate.no_agents')}
                                </motion.div>
                            )}
                        </motion.div>
                    </div>

                    {strategy === 'constrained' && selectedAgents.length > 0 && (
                        <div>
                            <label
                                className="debate-label debate-label--block"
                                style={{ marginTop: '0.75rem' }}
                            >
                                {t('debate.constraints')}
                                <span
                                    className="debate-badge"
                                    style={{
                                        marginLeft: 8,
                                        color: '#f59e0b',
                                        background: 'rgba(245,158,11,0.1)',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        fontSize: '0.65rem',
                                    }}
                                >
                                    {t('debate.constraints_desc')}
                                </span>
                            </label>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem',
                                    marginTop: '0.4rem',
                                }}
                            >
                                {selectedAgents.map((id) => {
                                    const node = availableAgents.find((a) => a.id === id);
                                    return (
                                        <div
                                            key={id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontSize: '0.78rem',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: '#e2e8f0',
                                                    minWidth: 140,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {node?.label || id}
                                            </span>
                                            <select
                                                value={agentConstraints[id] || 'none'}
                                                onChange={(e) =>
                                                    onConstraintChange(id, e.target.value)
                                                }
                                                style={{
                                                    padding: '0.25rem 0.4rem',
                                                    borderRadius: 4,
                                                    border: '1px solid rgba(245,158,11,0.3)',
                                                    background: 'rgba(15,15,30,0.6)',
                                                    color: '#e2e8f0',
                                                    fontSize: '0.7rem',
                                                    outline: 'none',
                                                    flex: 1,
                                                }}
                                            >
                                                <option value="none">
                                                    {t('debate.constraint_none')}
                                                </option>
                                                <option value="facts_only">
                                                    {t('debate.constraint_facts')}
                                                </option>
                                                <option value="emotional_only">
                                                    {t('debate.constraint_emotional')}
                                                </option>
                                                <option value="data_driven">
                                                    {t('debate.constraint_data')}
                                                </option>
                                                <option value="ethical_framework">
                                                    {t('debate.constraint_ethical')}
                                                </option>
                                                <option value="first_principles">
                                                    {t('debate.constraint_first')}
                                                </option>
                                                <option value="pragmatic">
                                                    {t('debate.constraint_pragmatic')}
                                                </option>
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '1rem' }}>
                        <button
                            onClick={onProbe}
                            className="btn-secondary"
                            disabled={probeLoading || availableAgents.length === 0}
                            style={{
                                padding: '0.7rem 1.2rem',
                                borderRadius: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: '#a855f7',
                                borderColor: 'rgba(168,85,247,0.3)',
                                background: 'rgba(168,85,247,0.05)',
                            }}
                        >
                            {probeLoading ? (
                                <Loader2 size={18} className="spinning" />
                            ) : (
                                <Activity size={18} />
                            )}
                            {t('debate.check_participants')}
                        </button>

                        {probeResults && probeResults.size > 0 && (
                            <div
                                style={{
                                    marginTop: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    {t('debate.probe_title')}
                                    <span
                                        style={{ marginLeft: 8, color: '#64748b', fontWeight: 400 }}
                                    >
                                        {
                                            Array.from(probeResults.values()).filter(
                                                (r) => r.status === 'ready',
                                            ).length
                                        }
                                        /{probeResults.size} {t('debate.probe_ready')}
                                    </span>
                                </div>
                                {Array.from(probeResults.entries()).map(([id, r]) => {
                                    const node = availableAgents.find((a) => a.id === id);
                                    const name = node?.label || id;
                                    const c = STATUS_COLORS[r.status] || '#64748b';
                                    const isExpanded = expandedProbe === id;
                                    const preview = r.responseContent
                                        ? r.responseContent.slice(0, 50) +
                                          (r.responseContent.length > 50 ? '\u2026' : '')
                                        : undefined;
                                    return (
                                        <div key={id}>
                                            <div
                                                onClick={() =>
                                                    onToggleProbe(isExpanded ? null : id)
                                                }
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '7px 10px',
                                                    borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                                                    background: 'rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.78rem',
                                                    border: isExpanded
                                                        ? '1px solid rgba(168,85,247,0.12)'
                                                        : '1px solid transparent',
                                                    borderBottom: isExpanded
                                                        ? 'none'
                                                        : '1px solid transparent',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: c,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        color: '#e2e8f0',
                                                        fontWeight: 600,
                                                        minWidth: 80,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {name}
                                                </span>
                                                <span
                                                    style={{
                                                        color: c,
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        fontSize: '0.65rem',
                                                        minWidth: 40,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {r.status}
                                                </span>
                                                {r.latency > 0 && (
                                                    <span
                                                        style={{
                                                            color: '#475569',
                                                            fontSize: '0.7rem',
                                                            minWidth: 35,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {r.latency}ms
                                                    </span>
                                                )}
                                                {preview ? (
                                                    <span
                                                        style={{
                                                            color: '#94a3b8',
                                                            fontSize: '0.72rem',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        {preview}
                                                    </span>
                                                ) : r.error ? (
                                                    <span
                                                        style={{
                                                            color: '#ef4444',
                                                            fontSize: '0.7rem',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        {r.error}
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            color: '#64748b',
                                                            fontSize: '0.7rem',
                                                            fontStyle: 'italic',
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        {t('debate.probe_no_response')}
                                                    </span>
                                                )}
                                                <span
                                                    style={{
                                                        color: '#475569',
                                                        fontSize: '0.6rem',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {isExpanded ? '\u25B2' : '\u25BC'}
                                                </span>
                                            </div>
                                            {isExpanded && (
                                                <div
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '0 0 8px 8px',
                                                        background: 'rgba(0,0,0,0.15)',
                                                        border: '1px solid rgba(168,85,247,0.12)',
                                                        borderTop: 'none',
                                                        fontSize: '0.78rem',
                                                        color: '#cbd5e1',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        maxHeight: 150,
                                                        overflowY: 'auto',
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {r.responseContent || (
                                                        <span style={textSecondaryItalic}>
                                                            {t('debate.probe_no_response')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onStart}
                        className="btn-primary"
                        aria-label={t('debate.initialize')}
                        style={{
                            padding: '1.25rem',
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            marginTop: '1rem',
                            background: 'linear-gradient(90deg, #9333ea, #a855f7)',
                            boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
                            borderRadius: 14,
                        }}
                        disabled={selectedAgents.length < 2 || !topic || actionLoading === 'start'}
                    >
                        {actionLoading === 'start' ? (
                            <Loader2 size={22} className="spinning" />
                        ) : (
                            <Play size={22} fill="currentColor" />
                        )}
                        {t('debate.initialize')}
                    </button>

                    <div style={textCenter}>
                        <button
                            onClick={onToggleAuto}
                            className="btn-secondary"
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: '0.9rem',
                            }}
                        >
                            <Zap size={18} color="#f59e0b" />
                            {showAuto ? t('debate.hide_auto') : t('debate.show_auto')}
                        </button>
                    </div>

                    {showAuto && (
                        <div
                            style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '1.5rem',
                                borderRadius: 20,
                                border: '1px solid rgba(255,255,255,0.03)',
                            }}
                        >
                            <AutoDebateSection
                                onAutoDebate={onAutoDebate}
                                onStressTest={onStressTest}
                                onBatchTest={onBatchTest}
                                results={autoResults}
                                winRates={autoWinRates}
                                onClear={onClearAuto}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DebateSetup;
