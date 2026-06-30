import React from 'react';
import { MessageSquare } from 'lucide-react';
import { TEMP_LABELS } from './wizard-constants';
import {
    textCenter,
    stepCardPanel,
    h3StepTitle,
    iconCircleBase,
    pageSubtitleMuted,
} from '../../styles/common';

interface TopicStepProps {
    topic: string;
    onTopicChange: (v: string) => void;
    strategy: string;
    onStrategyChange: (v: string) => void;
    maxRounds: number;
    onMaxRoundsChange: (v: number) => void;
    debateTemperature: number;
    onTemperatureChange: (v: number) => void;
    t: (key: string) => string;
}

const TopicStep: React.FC<TopicStepProps> = ({
    topic,
    onTopicChange,
    strategy,
    onStrategyChange,
    maxRounds,
    onMaxRoundsChange,
    debateTemperature,
    onTemperatureChange,
    t,
}) => {
    const accentColor =
        debateTemperature <= 2
            ? '#38bdf8'
            : debateTemperature <= 4
              ? '#34d399'
              : debateTemperature <= 6
                ? '#fbbf24'
                : debateTemperature <= 8
                  ? '#fb923c'
                  : '#ef4444';

    return (
        <div style={stepCardPanel}>
            <div style={textCenter}>
                <div style={iconCircleBase}>
                    <MessageSquare size={40} color="#a855f7" />
                </div>
                <h3 style={h3StepTitle}>{t('debate.config_title')}</h3>
                <p style={pageSubtitleMuted}>{t('debate.config_desc')}</p>
            </div>

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
                        <option value="round_robin">Round Robin (Sequential)</option>
                        <option value="moderated">Moderated (LLM chosen speaker)</option>
                        <option value="free_for_all">Free-for-all</option>
                        <option value="socratic">Socratic Method</option>
                        <option value="argument_tree">Argument Tree</option>
                        <option value="constrained">Constrained</option>
                        <option value="jury_trial">Jury Trial (Prosecution vs Defense)</option>
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
            </div>

            <div>
                <label className="debate-label debate-label--block" style={{ marginTop: 6 }}>
                    Temperature: {TEMP_LABELS[debateTemperature]}
                </label>
                <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={debateTemperature}
                    onChange={(e) => onTemperatureChange(parseInt(e.target.value))}
                    aria-label="Debate temperature"
                    className="debate-input"
                    style={{ width: '100%', accentColor }}
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
                    <span>Pure Logic</span>
                    <span>Balanced</span>
                    <span>Pure Emotion</span>
                </div>
            </div>
        </div>
    );
};

export default TopicStep;
