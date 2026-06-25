import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Users, Play, Loader2, Bot, Activity, CheckCircle2, Zap,
  ChevronRight, ChevronLeft, Target,
} from 'lucide-react';
import type { DebateArchetypeId } from '../../kernel/services/debate-archetypes';
import { DEBATE_ARCHETYPES } from '../../kernel/services/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import type { AutoDebateResult, BatchTestResult, ProviderWinRate } from '../../kernel/contracts/auto-debate';
import AutoDebateSection from './AutoDebateSection';
import ProbeResults from './ProbeResults';
import {
  textCenter, stepCardPanel, h3StepTitle,
  iconCircleBase, iconCircleBlue, iconCircleGreen, btnNavShape,
  pageSubtitleMuted,
} from '../../styles/common';

interface DebateSetupWizardProps {
  topic: string;
  onTopicChange: (value: string) => void;
  // CRIT-9 fix: use DebateSessionStrategy instead of string — the parent already
  // casts to DebateSessionStrategy, so the prop must match to avoid dropping
  // jury_trial and cross_examination values.
  strategy: import('../../kernel/contracts/debate-types').DebateSessionStrategy;
  onStrategyChange: (value: import('../../kernel/contracts/debate-types').DebateSessionStrategy) => void;
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
  onAutoDebate: (options?: { topic?: string; category?: string; maxParticipants?: number; maxRounds?: number }) => Promise<AutoDebateResult>;
  onStressTest: (count?: number) => Promise<AutoDebateResult[]>;
  onBatchTest: (topic: string, runs?: number) => Promise<BatchTestResult>;
  onClearAuto: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedHistoricalCount: number;
  onOpenHistoricalFigures: () => void;
}

const STEPS = [
  { key: 'topic', icon: MessageSquare, labelKey: 'debate.wizard_step1' },
  { key: 'agents', icon: Users, labelKey: 'debate.wizard_step2' },
  { key: 'review', icon: Target, labelKey: 'debate.wizard_step3' },
];

const DebateSetupWizard: React.FC<DebateSetupWizardProps> = ({
  topic, onTopicChange, strategy, onStrategyChange,
  maxRounds, onMaxRoundsChange, debateTemperature, onTemperatureChange,
  agentArchetypes, onArchetypeChange,
  selectedAgents, onToggleAgent, onSelectAll, onDeselectAll, availableAgents,
  agentConstraints, onConstraintChange,
  probeResults, probeLoading, onProbe, expandedProbe, onToggleProbe,
  actionLoading, onStart,
  showAuto, onToggleAuto, autoResults, autoWinRates,
  onAutoDebate, onStressTest, onBatchTest, onClearAuto, t,
  selectedHistoricalCount, onOpenHistoricalFigures,
}) => {
  const [step, setStep] = useState(0);

  const canNextStep = () => {
    if (step === 0) return topic.trim().length > 0;
    if (step === 1) return selectedAgents.length + selectedHistoricalCount >= 2;
    return true;
  };

  const TEMP_LABELS = ['Pure Logic','Mostly Logic','Slightly Logical','Analytical','Leaning Logic','Balanced','Leaning Emotion','Passionate','Very Emotional','Intense','Pure Emotion'];
  const strategyName = (s: string) => {
    const names: Record<string, string> = {
      round_robin: 'Round Robin', moderated: 'Moderated', free_for_all: 'Free-for-all',
      socratic: 'Socratic', argument_tree: 'Argument Tree', constrained: 'Constrained',
    };
    return names[s] || s;
  };

  return (
    <div style={{ flex: 1, display: 'flex', padding: '3rem', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 750, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button
                key={s.key}
                onClick={() => { if (i < step) setStep(i); }}
                disabled={i > step}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem',
                  borderRadius: 12, border: '1px solid',
                  background: isActive ? 'rgba(168,85,247,0.12)' : isDone ? 'rgba(16,185,129,0.1)' : 'transparent',
                  borderColor: isActive ? 'rgba(168,85,247,0.3)' : isDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#a855f7' : isDone ? '#10b981' : '#64748b',
                  cursor: i > step ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
                  opacity: i > step ? 0.4 : 1,
                }}
              >
                <Icon size={16} />
                <span>{t(s.labelKey)}</span>
                {isDone && <CheckCircle2 size={14} />}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
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
                    <label className="debate-label debate-label--block">{t('debate.strategy')}</label>
                    <select
                      value={strategy}
                      onChange={(e) => onStrategyChange(e.target.value as import('../../kernel/contracts/debate-types').DebateSessionStrategy)}
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
                    <label className="debate-label debate-label--block">{t('debate.max_rounds')}</label>
                    <input
                      type="number" min={2} max={50}
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
                    type="range" min={0} max={10} step={1}
                    value={debateTemperature}
                    onChange={(e) => onTemperatureChange(parseInt(e.target.value))}
                    aria-label="Debate temperature"
                    className="debate-input"
                    style={{
                      width: '100%',
                      accentColor: debateTemperature <= 2 ? '#38bdf8' : debateTemperature <= 4 ? '#34d399' : debateTemperature <= 6 ? '#fbbf24' : debateTemperature <= 8 ? '#fb923c' : '#ef4444',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    <span>Pure Logic</span>
                    <span>Balanced</span>
                    <span>Pure Emotion</span>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={stepCardPanel}>
                <div style={textCenter}>
                  <div style={iconCircleBlue}>
                    <Users size={40} color="#3b82f6" />
                  </div>
                  <h3 style={h3StepTitle}>Select Participants</h3>
                  <p style={pageSubtitleMuted}>Choose agents and set their thinking archetype.</p>
                </div>

                <div>
                  <label className="debate-label debate-label--block">Thinking Archetype</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(['auto', ...(Object.keys(DEBATE_ARCHETYPES) as DebateArchetypeId[])] as Array<'auto' | DebateArchetypeId>).map(key => {
                      const isActive = key === 'auto'
                        ? Object.keys(agentArchetypes).length === 0
                        : Object.values(agentArchetypes).includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => onArchetypeChange(key)}
                          style={{
                            padding: '4px 12px', borderRadius: 8, border: '1px solid',
                            fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                            background: isActive ? 'rgba(168,85,247,0.15)' : 'transparent',
                            borderColor: isActive ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)',
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
                    <span className="debate-badge" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      {selectedAgents.length} {t('debate.selected')}
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
                    <button onClick={onSelectAll} className="btn-ghost" style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#a855f7',
                      border: '1px solid rgba(168,85,247,0.3)', borderRadius: 6, cursor: 'pointer', background: 'transparent',
                    }}>Select All</button>
                    <button onClick={onDeselectAll} className="btn-ghost" style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', background: 'transparent',
                    }}>Deselect All</button>
                  </div>
                  <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
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
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleAgent(agent.id); } }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selectedAgents.includes(agent.id)}
                          aria-label={`${agent.label}${selectedAgents.includes(agent.id) ? ' (selected)' : ''}`}
                          className={`debate-card${selectedAgents.includes(agent.id) ? ' debate-card--selected' : ''}`}
                        >
                          {selectedAgents.includes(agent.id) ? <CheckCircle2 size={18} color="#a855f7" /> : <Bot size={18} color="#64748b" />}
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selectedAgents.includes(agent.id) ? 'white' : '#94a3b8' }}>{agent.label}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {availableAgents.length === 0 && (
                      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="debate-error-msg">
                        {t('debate.no_agents')}
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                <div>
                  <button
                    onClick={onOpenHistoricalFigures}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '0.5rem 1rem', borderRadius: 10,
                      border: '1px solid rgba(168,85,247,0.3)',
                      background: selectedHistoricalCount > 0 ? 'rgba(168,85,247,0.15)' : 'rgba(30,30,50,0.4)',
                      color: '#a855f7', fontWeight: 600, fontSize: '0.85rem',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    Historical Figures
                    {selectedHistoricalCount > 0 && (
                      <span style={{ background: 'rgba(168,85,247,0.3)', borderRadius: 6, padding: '1px 6px', fontSize: '0.75rem' }}>
                        {selectedHistoricalCount}
                      </span>
                    )}
                  </button>
                </div>

                {strategy === 'constrained' && selectedAgents.length > 0 && (
                  <div>
                    <label className="debate-label debate-label--block" style={{ marginTop: '0.75rem' }}>
                      Argument Constraints
                      <span className="debate-badge" style={{
                        marginLeft: 8, color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.65rem',
                      }}>
                        Per-agent
                      </span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {selectedAgents.map(id => {
                        const node = availableAgents.find(a => a.id === id);
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                            <span style={{ color: '#e2e8f0', minWidth: 140, fontWeight: 600 }}>{node?.label || id}</span>
                            <select
                              value={agentConstraints[id] || 'none'}
                              onChange={e => onConstraintChange(id, e.target.value)}
                              style={{
                                padding: '0.25rem 0.4rem', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)',
                                background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.7rem', outline: 'none', flex: 1,
                              }}
                            >
                              <option value="none">No constraint</option>
                              <option value="facts_only">Facts Only</option>
                              <option value="emotional_only">Emotional Only</option>
                              <option value="data_driven">Data Driven</option>
                              <option value="ethical_framework">Ethical Framework</option>
                              <option value="first_principles">First Principles</option>
                              <option value="pragmatic">Pragmatic</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div style={stepCardPanel}>
                <div style={textCenter}>
                  <div style={iconCircleGreen}>
                    <Target size={40} color="#10b981" />
                  </div>
                  <h3 style={h3StepTitle}>Review & Launch</h3>
                  <p style={pageSubtitleMuted}>Verify configuration, probe participants, and start.</p>
                </div>

                {/* Review summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.25rem', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Thesis</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{topic}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Strategy</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{strategyName(strategy)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Rounds</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{maxRounds}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Temperature</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{TEMP_LABELS[debateTemperature]}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Participants ({selectedAgents.length})</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {selectedAgents.map(id => {
                        const node = availableAgents.find(a => a.id === id);
                        return <span key={id} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(168,85,247,0.1)', color: '#c084fc', fontSize: '0.75rem' }}>{node?.label || id}</span>;
                      })}
                    </div>
                  </div>
                </div>

                {/* Probe */}
                <div>
                  <button
                    onClick={onProbe}
                    className="btn-secondary"
                    disabled={probeLoading || selectedAgents.length < 2}
                    style={{
                      padding: '0.7rem 1.2rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
                      fontSize: '0.9rem', fontWeight: 700, color: '#a855f7', borderColor: 'rgba(168,85,247,0.3)',
                      background: 'rgba(168,85,247,0.05)',
                    }}
                  >
                    {probeLoading ? <Loader2 size={18} className="spinning" /> : <Activity size={18} />}
                    Check Participants
                  </button>

                  {probeResults && probeResults.size > 0 && (
                    <ProbeResults
                      results={probeResults}
                      availableAgents={availableAgents}
                      expandedProbe={expandedProbe}
                      onToggleProbe={onToggleProbe}
                    />
                  )}
                </div>

                {/* Auto-debate */}
                <div style={textCenter}>
                  <button
                    onClick={onToggleAuto}
                    className="btn-secondary"
                    style={btnNavShape}
                  >
                    <Zap size={18} color="#f59e0b" />
                    {showAuto ? 'Hide Auto-Debate' : 'Auto-Debate'}
                  </button>
                </div>

                {showAuto && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 20, border: '1px solid rgba(255,255,255,0.03)' }}>
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

                {/* Launch */}
                <button
                  onClick={onStart}
                  className="btn-primary"
                  aria-label={t('debate.initialize')}
                  style={{
                    padding: '1.25rem', fontSize: '1.05rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '0.5rem',
                    background: 'linear-gradient(90deg, #9333ea, #a855f7)',
                    boxShadow: '0 4px 20px rgba(168,85,247,0.4)', borderRadius: 14,
                  }}
                  disabled={selectedAgents.length < 2 || !topic || actionLoading === 'start'}
                >
                  {actionLoading === 'start' ? <Loader2 size={22} className="spinning" /> : <Play size={22} fill="currentColor" />}
                  {t('debate.initialize')}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary"
            style={{
              ...btnNavShape, opacity: step === 0 ? 0.4 : 1, cursor: step === 0 ? 'default' : 'pointer',
            }}
          >
            <ChevronLeft size={18} /> Back
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === step ? '#a855f7' : i < step ? '#10b981' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>

          {step < 2 ? (
            <button
              onClick={() => setStep(s => Math.min(2, s + 1))}
              disabled={!canNextStep()}
              className="btn-primary"
              style={{
                ...btnNavShape, opacity: !canNextStep() ? 0.4 : 1, cursor: !canNextStep() ? 'default' : 'pointer',
                background: 'linear-gradient(90deg, #9333ea, #a855f7)',
              }}
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <div style={{ width: 120 }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DebateSetupWizard;
