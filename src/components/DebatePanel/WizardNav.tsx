import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { btnNavShape } from '../../styles/common';

interface WizardNavProps {
    step: number;
    maxSteps: number;
    canNext: boolean;
    onBack: () => void;
    onNext: () => void;
}

const WizardNav: React.FC<WizardNavProps> = ({ step, maxSteps, canNext, onBack, onNext }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
            onClick={onBack}
            disabled={step === 0}
            className="btn-secondary"
            style={{
                ...btnNavShape,
                opacity: step === 0 ? 0.4 : 1,
                cursor: step === 0 ? 'default' : 'pointer',
            }}
        >
            <ChevronLeft size={18} /> Back
        </button>

        <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: maxSteps }).map((_, i) => (
                <div
                    key={`step-${i}`}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                            i === step ? '#a855f7' : i < step ? '#10b981' : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.2s',
                    }}
                />
            ))}
        </div>

        {step < maxSteps - 1 ? (
            <button
                onClick={onNext}
                disabled={!canNext}
                className="btn-primary"
                style={{
                    ...btnNavShape,
                    opacity: !canNext ? 0.4 : 1,
                    cursor: !canNext ? 'default' : 'pointer',
                    background: 'linear-gradient(90deg, #9333ea, #a855f7)',
                }}
            >
                Next <ChevronRight size={18} />
            </button>
        ) : (
            <div style={{ width: 120 }} />
        )}
    </div>
);

export default WizardNav;
