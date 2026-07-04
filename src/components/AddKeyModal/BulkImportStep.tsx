import { Loader2, Upload } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import type { BulkImportReport } from './add-key-constants';

interface BulkImportStepProps {
    bulkInput: string;
    setBulkInput: (v: string) => void;
    error: string;
    loading: boolean;
    bulkReport: BulkImportReport | null;
    bulkProgress: { current: number; total: number } | null;
    onBack: () => void;
    onImport: () => void;
    onClose: () => void;
}

const BulkImportStep: React.FC<BulkImportStepProps> = ({
    bulkInput,
    setBulkInput,
    error,
    loading,
    bulkReport,
    bulkProgress,
    onBack,
    onImport,
    onClose,
}) => {
    const { t } = useTranslation();

    if (bulkReport) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Import complete — {bulkReport.total} keys processed
                </div>

                <div
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}
                >
                    <div
                        style={{
                            padding: '0.75rem',
                            borderRadius: 12,
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                            {bulkReport.added}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>
                            {t('add_key.stat_added')}
                        </div>
                    </div>
                    <div
                        style={{
                            padding: '0.75rem',
                            borderRadius: 12,
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                            {bulkReport.duplicates}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#fde68a' }}>
                            {t('add_key.stat_duplicates')}
                        </div>
                    </div>
                    <div
                        style={{
                            padding: '0.75rem',
                            borderRadius: 12,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                            {bulkReport.invalid}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
                            {t('add_key.stat_invalid')}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        marginTop: '0.25rem',
                    }}
                >
                    Accounts
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {bulkReport.groups.map((g) => (
                        <div
                            key={g.accountId}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                padding: '0.5rem 0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 8,
                            }}
                        >
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{g.label}</span>
                            <span style={{ color: '#94a3b8' }}>
                                {g.keyCount} key{g.keyCount > 1 ? 's' : ''} @ {g.provider}
                            </span>
                        </div>
                    ))}
                </div>

                {bulkReport.healthIssues.length > 0 && (
                    <>
                        <div
                            style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#ef4444',
                                marginTop: '0.25rem',
                            }}
                        >
                            Health Check Failures
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {bulkReport.healthIssues.map((h, _i) => (
                                <div
                                    key={`${h.provider}-${h.issue}`}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                        borderRadius: 8,
                                    }}
                                >
                                    <span style={{ fontWeight: 600, color: '#ef4444' }}>
                                        {h.provider}
                                    </span>
                                    <span style={{ color: '#fca5a5', marginLeft: '0.5rem' }}>
                                        {h.issue}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div
                    style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        marginTop: '0.25rem',
                    }}
                >
                    Per Provider
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {Object.entries(bulkReport.breakdown).map(([prov, stats]) => (
                        <div
                            key={prov}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                padding: '0.5rem 0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 8,
                            }}
                        >
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{prov}</span>
                            <span style={{ color: '#94a3b8' }}>
                                +{stats.added} / {stats.duplicates} dup / {stats.invalid} inv
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="btn-primary"
                    style={{ padding: '0.75rem', width: '100%', marginTop: '0.25rem' }}
                >
                    Done
                </button>
            </div>
        );
    }

    return (
        <>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                {t('add_key.bulk_instruction')}
            </div>
            <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={t('add_key.bulk_placeholder')}
                rows={10}
                className="modal-input"
                style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    resize: 'vertical',
                    minHeight: 160,
                }}
                aria-label="Bulk API keys input"
            />
            {bulkProgress && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                        }}
                    >
                        <span>Importing keys...</span>
                        <span>
                            {bulkProgress.current} / {bulkProgress.total}
                        </span>
                    </div>
                    <div
                        style={{
                            width: '100%',
                            height: 6,
                            borderRadius: 3,
                            background: 'rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                                height: '100%',
                                borderRadius: 3,
                                background: '#3b82f6',
                                transition: 'width 0.3s ease',
                            }}
                        />
                    </div>
                </div>
            )}
            {error && (
                <div className="modal-error" role="alert" aria-live="polite">
                    {error}
                </div>
            )}
            <div className="modal-actions">
                <button
                    type="button"
                    onClick={onBack}
                    className="btn-secondary"
                    style={{ padding: '0.75rem 1.25rem' }}
                    disabled={loading}
                >
                    {t('add_key.back')}
                </button>
                <button
                    type="button"
                    onClick={onImport}
                    className="btn-primary"
                    style={{
                        flex: 1,
                        padding: '0.75rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 size={18} className="spinning" aria-hidden="true" />
                    ) : (
                        <Upload size={18} aria-hidden="true" />
                    )}
                    {loading ? t('add_key.importing') : t('add_key.import_all')}
                </button>
            </div>
        </>
    );
};

export default BulkImportStep;
