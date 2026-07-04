import { Key, CheckCircle2, Shield } from 'lucide-react';
import { flexColGap6, textXsMutedAuto } from '../../styles/common';

interface StepSidebarProps {
    step: 0 | 1 | 2 | 3;
    t: (key: string) => string;
}

const StepSidebar: React.FC<StepSidebarProps> = ({ step, t }) => {
    const steps = [
        { label: t('settings.vault_title'), icon: Shield, fraction: '1/4' },
        { label: t('add_key.step_provider'), icon: null, fraction: '2/4' },
        { label: t('add_key.step_details'), icon: null, fraction: '3/4' },
        { label: 'Default Model', icon: null, fraction: '4/4' },
    ];

    return (
        <div className="modal-sidebar">
            <div className="modal-sidebar-header">
                <div className="modal-sidebar-header-icon">
                    <Key size={18} color="white" />
                </div>
                <span className="modal-sidebar-header-text">{t('add_key.section_connection')}</span>
            </div>
            <div style={flexColGap6}>
                {steps.map((s, i) => (
                    <div
                        key={`step-${i}`}
                        className="modal-step"
                        style={{ opacity: step === i ? 1 : 0.4 }}
                    >
                        <div
                            className="modal-step-number"
                            style={{
                                background:
                                    step === i
                                        ? i === 0
                                            ? '#f59e0b'
                                            : '#3b82f6'
                                        : step > i
                                          ? '#3b82f6'
                                          : 'transparent',
                            }}
                        >
                            {step > i ? (
                                <CheckCircle2 size={14} />
                            ) : i === 0 ? (
                                <Shield size={14} />
                            ) : (
                                String(i + 1)
                            )}
                        </div>
                        <span
                            className="modal-step-label"
                            style={{
                                fontWeight: step === i ? 700 : 500,
                                color: step === i && i === 0 ? '#f59e0b' : undefined,
                            }}
                        >
                            {s.label}
                        </span>
                        <span style={textXsMutedAuto}>{step === i ? s.fraction : ''}</span>
                    </div>
                ))}
            </div>
            <div className="modal-sidebar-footer">
                <div className="modal-sidebar-footer-title">
                    <Shield size={14} /> {t('add_key.section_secure')}
                </div>
                <p className="modal-sidebar-footer-text">{t('add_key.section_secure_desc')}</p>
            </div>
        </div>
    );
};

export default StepSidebar;
