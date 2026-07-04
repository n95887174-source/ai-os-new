import { Users, Play, Loader2, Activity, Zap } from 'lucide-react';
import type { DebateArchetypeId } from '../../kernel/services/debate-runtime/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import type {
    AutoDebateResult,
    BatchTestResult,
    ProviderWinRate,
} from '../../kernel/contracts/auto-debate';
import AutoDebateSection from './AutoDebateSection';
import { textCenter } from '../../styles/common';
import {
    TemperatureSlider,
    ArchetypeSelector,
    ParticipantSelector,
    ConstraintsSection,
} from './DebateSetupFormSections';
import { ProbeResultsList } from './ProbeResultsList';

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
}) => (
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
                    <label className="debate-label debate-label--block">{t('debate.thesis')}</label>
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
                            <option value="constrained">{t('debate.strategy_constrained')}</option>
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
                    <TemperatureSlider
                        value={debateTemperature}
                        onChange={onTemperatureChange}
                        t={t}
                    />
                </div>

                <ArchetypeSelector
                    agentArchetypes={agentArchetypes}
                    onChange={onArchetypeChange}
                    t={t}
                />
                <ParticipantSelector
                    selectedAgents={selectedAgents}
                    onToggle={onToggleAgent}
                    onSelectAll={onSelectAll}
                    onDeselectAll={onDeselectAll}
                    availableAgents={availableAgents}
                    t={t}
                />
                <ConstraintsSection
                    strategy={strategy}
                    selectedAgents={selectedAgents}
                    agentConstraints={agentConstraints}
                    onConstraintChange={onConstraintChange}
                    availableAgents={availableAgents}
                    t={t}
                />

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
                        <ProbeResultsList
                            probeResults={probeResults}
                            availableAgents={availableAgents}
                            expandedProbe={expandedProbe}
                            onToggleProbe={onToggleProbe}
                            t={t}
                        />
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

export default DebateSetup;
