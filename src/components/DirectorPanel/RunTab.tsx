import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import type { ConversationScenario } from '../../kernel/contracts/conversation/scenario';
import type { TurnProposal } from '../../kernel/contracts/conversation/turn';
import { createDirectorControls } from '../../stores/directorController';
import { useDirectorStore } from '../../stores/directorStore';

const CARD: React.CSSProperties = {
    margin: '0.75rem 0',
    padding: '0.6rem 0.75rem',
    borderRadius: 8,
    border: '1px solid rgba(59,130,246,0.3)',
    background: 'rgba(59,130,246,0.08)',
};

const LOG_ROW: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    padding: '0.3rem 0.5rem',
    borderRadius: 6,
    border: '1px solid #2a2a35',
    marginBottom: '0.35rem',
};

/**
 * Run tab (B5.4c) — the full runtime UI bound to the Director runtime.
 *
 * The UI talks ONLY to `directorController` (which wraps `ConversationDirectorService`)
 * and observes live state through `DirectorStore` (fed by `conversation:*` events).
 * It never touches `ConversationDirectorService` directly and never becomes a second
 * orchestrator. `Override` reuses the existing `TurnProposal` contract.
 */
const RunTab: React.FC<{ scenario?: ConversationScenario | null }> = ({ scenario }) => {
    const { t } = useTranslation();
    const controls = useMemo(() => createDirectorControls(), []);
    const { status, currentParticipantId, turnLog } = useDirectorStore();

    const [overrideOpen, setOverrideOpen] = useState(false);
    const [overrideParticipant, setOverrideParticipant] = useState('');
    const [overrideObjective, setOverrideObjective] = useState('');

    if (!scenario) {
        return (
            <div>
                <h3 style={{ marginTop: 0 }}>{t('director.run.heading')}</h3>
                <p style={{ opacity: 0.75 }}>{t('director.run.noScenario')}</p>
            </div>
        );
    }

    const isRunning = status === 'running';
    const isPaused = status === 'paused';
    const busy = isRunning || isPaused;
    const canRun = !busy;
    const currentTurn = scenario.turns.find((turn) => turn.participantId === currentParticipantId);
    const total = scenario.turns.length;
    const done = turnLog.filter((e) => e.status === 'complete').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    const handleRun = async () => {
        await controls.load(scenario.id);
        await controls.run();
    };

    const handleOverride = () => {
        if (!overrideParticipant || !overrideObjective) return;
        const proposal: TurnProposal = {
            participantId: overrideParticipant,
            objective: { type: 'CHALLENGE', description: overrideObjective, constraints: [] },
        };
        controls.override(proposal);
        setOverrideOpen(false);
        setOverrideParticipant('');
        setOverrideObjective('');
    };

    return (
        <div>
            <h3 style={{ marginTop: 0 }}>{t('director.run.heading')}</h3>

            <div style={CARD}>
                <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                    {t('director.run.selected')}
                </div>
                <div style={{ fontWeight: 600 }}>{scenario.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                    {scenario.participants.length} · {scenario.turns.length} · v{scenario.version}
                </div>
            </div>

            <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
            >
                <span className={`badge status-${status}`}>
                    {t(`director.run.status.${status}`)}
                </span>
                <span style={{ fontSize: '0.8rem' }}>
                    {t('director.run.current')}: {currentParticipantId ?? '—'}
                </span>
                {currentTurn && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {t('director.run.objective')}: {currentTurn.objective.description}
                    </span>
                )}
            </div>

            <div style={{ margin: '0.5rem 0' }}>
                <div
                    style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6' }} />
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 4 }}>
                    {t('director.run.progress')}: {done}/{total}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0' }}>
                <button onClick={handleRun} disabled={!canRun}>
                    {t('director.run.run')}
                </button>
                <button onClick={() => controls.pause()} disabled={!isRunning}>
                    {t('director.run.pause')}
                </button>
                <button onClick={() => controls.resume()} disabled={!isPaused}>
                    {t('director.run.resume')}
                </button>
                <button onClick={() => controls.skip()} disabled={!busy}>
                    {t('director.run.skip')}
                </button>
                <button onClick={() => setOverrideOpen((o) => !o)} disabled={!busy}>
                    {t('director.run.override')}
                </button>
                <button onClick={() => controls.abort()} disabled={!busy}>
                    {t('director.run.abort')}
                </button>
            </div>

            {overrideOpen && (
                <div style={CARD}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <select
                            value={overrideParticipant}
                            onChange={(e) => setOverrideParticipant(e.target.value)}
                        >
                            <option value="">{t('director.run.overrideParticipant')}</option>
                            {scenario.participants.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.id}
                                </option>
                            ))}
                        </select>
                        <input
                            value={overrideObjective}
                            onChange={(e) => setOverrideObjective(e.target.value)}
                            placeholder={t('director.run.overrideObjective')}
                        />
                        <button
                            onClick={handleOverride}
                            disabled={!overrideParticipant || !overrideObjective}
                        >
                            {t('director.run.overrideSubmit')}
                        </button>
                    </div>
                </div>
            )}

            <h4 style={{ margin: '1rem 0 0.5rem' }}>{t('director.run.log')}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {turnLog.map((e, i) => (
                    <li key={i} style={{ ...LOG_ROW, opacity: e.status === 'running' ? 1 : 0.8 }}>
                        <span style={{ fontWeight: 600 }}>{e.participantId}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {t(`director.run.turnStatus.${e.status}`)}
                        </span>
                        {e.content && (
                            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{e.content}</span>
                        )}
                        {e.success === false && (
                            <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{e.error}</span>
                        )}
                    </li>
                ))}
                {turnLog.length === 0 && (
                    <li style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                        {t('director.run.logEmpty')}
                    </li>
                )}
            </ul>
        </div>
    );
};

export default RunTab;
