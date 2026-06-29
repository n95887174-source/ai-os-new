import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    X,
    Key,
    Eye,
    EyeOff,
    Shield,
    CheckCircle2,
    HelpCircle,
    Loader2,
    Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusScope } from '@react-aria/focus';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { useKeyStore } from '../../stores/useKeyStore';
import { keyService, adapterRegistry } from '../../kernel/instances';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { useTranslation } from '../../i18n/useTranslation';
import { flexColGap6, textXsMutedAuto } from '../../styles/common';
import { useKeyIntelligence } from '../../stores/useKeyIntelligence';
import type { ParsedKeyResult } from '../../kernel/contracts/key-intelligence';
import { PROVIDER_META, type BulkImportReport } from './add-key-constants';
import BulkImportStep from './BulkImportStep';

interface Props {
    onClose: () => void;
    defaultProvider?: string;
}

const AddKeyModal: React.FC<Props> = ({ onClose, defaultProvider }) => {
    const { addKey, keys } = useKeyStore();
    const [step, setStep] = useState<0 | 1 | 2 | 3>(defaultProvider ? 2 : 1);
    const [provider, setProvider] = useState(defaultProvider || 'OpenRouter');
    const [label, setLabel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkInput, setBulkInput] = useState('');
    const [bulkReport, setBulkReport] = useState<BulkImportReport | null>(null);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(
        null,
    );
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [group, setGroup] = useState('');
    const [account, setAccount] = useState('');
    const [accountId, setAccountId] = useState<string>('');
    const [vaultPassword, setVaultPassword] = useState('');
    const [vaultUnlocking, setVaultUnlocking] = useState(false);
    const [vaultError, setVaultError] = useState('');

    const pipeline = useKeyIntelligence();
    const { t } = useTranslation();
    const isMountedRef = useRef(true);

    // Check vault status on mount - if locked, require unlock first
    useEffect(() => {
        if (step !== 0 && keyService.vaultService?.isLocked()) {
            queueMicrotask(() => setStep(0));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const providers = useMemo(() => {
        const fromRegistry = adapterRegistry.getAllProviders();
        const all = new Set(fromRegistry);
        Object.keys(PROVIDER_META).forEach((k) => all.add(k));
        return Array.from(all).map((id) => ({
            id,
            name: PROVIDER_META[id]?.name || id,
            desc: PROVIDER_META[id]?.desc || '',
            docsUrl: PROVIDER_META[id]?.docsUrl || null,
        }));
    }, []);

    const generateAlias = useCallback(
        (prov: string) => {
            const providerName = providers.find((p) => p.id === prov)?.name || prov;
            const existingCount = keys.filter((k) => k.provider === prov).length;
            return `${providerName.toLowerCase().replace(/\s+/g, '-')}-${String(existingCount + 1).padStart(2, '0')}`;
        },
        [providers, keys],
    );

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (defaultProvider && !label) {
            queueMicrotask(() => setLabel(generateAlias(defaultProvider)));
        }
    }, [defaultProvider, label, generateAlias]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (
                e.key === 'Escape' &&
                !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
            )
                onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        setStep(2);
        setError('');
        setBulkMode(false);
        setBulkReport(null);
        setBulkInput('');
        setLabel(generateAlias(newProvider));
    };

    const handleKeyChange = (value: string) => {
        setApiKey(value);
        if (value.trim()) {
            const detected = keyService.detectProvider(value);
            if (detected && isMountedRef.current) {
                const match = providers.find((p) => p.id.toLowerCase() === detected.toLowerCase());
                const catalogId = match?.id ?? detected;
                if (catalogId !== provider && match) {
                    setProvider(match.id);
                    setLabel(generateAlias(match.id));
                }
            }
        }
    };

    const handleVaultUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vaultPassword.trim()) {
            setVaultError(t('settings.error_vault_password'));
            return;
        }

        setVaultUnlocking(true);
        setVaultError('');

        try {
            const ok = await keyService.unlockVault(vaultPassword);
            if (!isMountedRef.current) return;
            if (ok) {
                setStep(defaultProvider ? 2 : 1);
                setVaultPassword('');
            } else {
                setVaultError(t('settings.error_vault_operation'));
            }
        } catch {
            if (!isMountedRef.current) return;
            setVaultError(t('settings.error_vault_operation'));
        } finally {
            if (isMountedRef.current) setVaultUnlocking(false);
        }
    };

    const handleBack = () => {
        if (step === 3) {
            setStep(2);
            setError('');
            setBulkMode(false);
            setBulkReport(null);
            setBulkInput('');
            return;
        }
        if (step === 0) {
            onClose();
            return;
        }
        if (step === 2) {
            setStep(1);
            setError('');
            setBulkMode(false);
            setBulkReport(null);
            setBulkInput('');
            return;
        }
        if (step === 1) {
            onClose();
            return;
        }
        setStep(1);
        setError('');
        setBulkMode(false);
        setBulkReport(null);
        setBulkInput('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim() || !apiKey.trim()) {
            setError(t('add_key.error_required'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const isValid = await keyService.verifyKey(provider, apiKey);
            if (!isMountedRef.current) return;
            if (!isValid) {
                throw new Error(t('add_key.error_invalid_format'));
            }

            const extractedAccountId = keyService.extractAccountId(provider, apiKey.trim());
            setAccountId(extractedAccountId);

            const adapter = adapterRegistry.getAdapter(provider);
            let models: string[] = [];
            if (adapter) {
                try {
                    models = await adapter.getAvailableModels(apiKey.trim());
                } catch {
                    // model fetch is non-critical
                }
            }

            if (!isMountedRef.current) return;
            setAvailableModels(models);
            setStep(3);
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            const errMsg =
                err instanceof Error
                    ? err.message
                    : 'Failed to validate API key. Please try again.';
            setError(errMsg);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const handleFinalize = (selectedModel?: string) => {
        addKey({
            provider,
            label: label.trim(),
            key: apiKey.trim(),
            status: 'pending',
            group: group.trim() || undefined,
            account: account.trim() || undefined,
            accountId,
            model: selectedModel || undefined,
            availableModels: availableModels.length > 0 ? availableModels : undefined,
        });

        eventBus.emit(EVENTS.NOTIFICATION, {
            message: `${provider} key added — ${availableModels.length > 0 ? availableModels.length + ' models available' : 'health check pending'}${selectedModel ? ', default: ' + selectedModel : ''}`,
            type: 'success',
        });

        onClose();
    };

    const checkDuplicateKey = useCallback(
        async (keyValue: string): Promise<string | null> => {
            try {
                const fp = await keyService.fingerprintKey(keyValue);
                for (const k of keys) {
                    const existingFp = await keyService.fingerprintKey(k.key);
                    if (existingFp === fp) return k.label;
                }
            } catch {
                /* fingerprint failure is non-blocking */
            }
            return null;
        },
        [keys],
    );

    const handleSaveAndClose = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!label.trim() || !apiKey.trim()) {
            setError(t('add_key.error_required'));
            return;
        }
        const dup = await checkDuplicateKey(apiKey.trim());
        if (dup) {
            setError(t('add_key.error_duplicate').replace('{0}', dup));
            return;
        }
        handleFinalize();
    };

    const handleSkipModel = () => handleFinalize();

    const handleBulkImport = useCallback(async () => {
        if (!bulkInput.trim()) {
            setError(t('add_key.error_paste'));
            return;
        }

        setLoading(true);
        setError('');
        setBulkReport(null);

        try {
            const existingFps = await Promise.all(
                keys.map(async (k) => ({
                    fingerprint: await keyService.fingerprintKey(k.key),
                    provider: k.provider,
                    label: k.label,
                })),
            );

            await pipeline.runPipeline({ rawText: bulkInput, existingKeys: existingFps });
            const r = pipeline.report;
            if (!r) {
                throw new Error('Pipeline returned no report');
            }

            const healthIssuesList: { provider: string; issue: string }[] = [];
            const report: BulkImportReport = {
                added: r.added,
                duplicates: r.duplicates,
                invalid: r.invalid,
                total: r.totalInput,
                breakdown: {},
                groups: r.groups,
                healthIssues: healthIssuesList,
            };

            for (const p of r.parsed) {
                const prov = p.provider || 'Custom';
                if (!report.breakdown[prov])
                    report.breakdown[prov] = { added: 0, duplicates: 0, invalid: 0 };
                if (p.isValid) report.breakdown[prov].added++;
                else report.breakdown[prov].invalid++;
            }

            for (const risk of r.riskAssessments) {
                const critical = risk.factors.find((f) => f.severity === 'critical');
                if (critical)
                    healthIssuesList.push({
                        provider: risk.provider || 'Unknown',
                        issue: critical.description,
                    });
            }

            if (!isMountedRef.current) return;
            setBulkReport(report);

            if (r.added > 0) {
                const parsedByFp = new Map<string, ParsedKeyResult>();
                for (const p of r.parsed) {
                    if (p.isValid) parsedByFp.set(p.fingerprint, p);
                }

                const rawToLabel = new Map<string, string>();
                const trimmedInput = bulkInput.trim();
                let rawKeys: string[];
                if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
                    try {
                        const jsonParsed = JSON.parse(trimmedInput);
                        const items = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
                        rawKeys = [];
                        for (const item of items) {
                            const raw = item?.key || item?.apiKey;
                            if (typeof raw === 'string' && raw.length > 0) {
                                rawKeys.push(raw);
                                if (item.label) rawToLabel.set(raw, String(item.label));
                            }
                        }
                    } catch {
                        rawKeys = bulkInput
                            .split(/[\n,;]+/)
                            .map((k) => k.trim())
                            .filter((k) => k.length > 0);
                    }
                } else {
                    rawKeys = bulkInput
                        .split(/[\n,;]+/)
                        .map((k) => k.trim())
                        .filter((k) => k.length > 0);
                }
                setBulkProgress({ current: 0, total: rawKeys.length });
                const addedFps = new Set<string>();
                let processed = 0;
                for (const raw of rawKeys) {
                    processed++;
                    setBulkProgress({ current: processed, total: rawKeys.length });
                    const fp = await keyService.fingerprintKey(raw);
                    const prov = keyService.detectProvider(raw) || 'Custom';
                    if (!(await keyService.verifyKey(prov, raw))) continue;
                    if (addedFps.has(fp)) continue;
                    addedFps.add(fp);
                    const parsedEntry = parsedByFp.get(fp);
                    const existingCount = keys.filter((k) => k.provider === prov).length;
                    const label =
                        rawToLabel.get(raw) ||
                        `${prov.toLowerCase()}-${String(existingCount + addedFps.size).padStart(2, '0')}`;
                    addKey({
                        provider: prov,
                        label,
                        key: raw,
                        status: 'pending',
                        group: group.trim() || parsedEntry?.accountId || undefined,
                        account: account.trim() || parsedEntry?.accountId || undefined,
                        accountId: parsedEntry?.accountId,
                    });
                }
                setBulkProgress(null);
            }

            eventBus.emit(EVENTS.NOTIFICATION, {
                message: `Bulk import complete: ${r.added} added (pending verification), ${r.duplicates} duplicates, ${r.invalid} invalid${healthIssuesList.length > 0 ? ' — ' + healthIssuesList.length + ' key(s) failed health check' : ''}`,
                type: r.added > 0 ? 'info' : 'warning',
            });
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Bulk import failed.');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [bulkInput, addKey, keys, pipeline, account, group, t]);

    const currentProvider = providers.find((p) => p.id === provider);
    const docsUrl = currentProvider?.docsUrl;

    const handleDocsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (docsUrl) {
            window.open(docsUrl, '_blank', 'noopener,noreferrer');
        } else {
            eventBus.emit(EVENTS.NOTIFICATION, {
                message: 'No official documentation link available for this provider.',
                type: 'info',
            });
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-label={t('add_key.dialog_aria')}
            >
                <FocusScope contain restoreFocus autoFocus>
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-panel"
                    >
                        <div className="modal-sidebar">
                            <div className="modal-sidebar-header">
                                <div className="modal-sidebar-header-icon">
                                    <Key size={18} color="white" />
                                </div>
                                <span className="modal-sidebar-header-text">
                                    {t('add_key.section_connection')}
                                </span>
                            </div>
                            <div style={flexColGap6}>
                                <div
                                    className="modal-step"
                                    style={{ opacity: step === 0 ? 1 : 0.4 }}
                                >
                                    <div
                                        className="modal-step-number"
                                        style={{
                                            background:
                                                step === 0
                                                    ? '#f59e0b'
                                                    : step > 0
                                                      ? '#3b82f6'
                                                      : 'transparent',
                                        }}
                                    >
                                        {step > 0 ? (
                                            <CheckCircle2 size={14} />
                                        ) : (
                                            <Shield size={14} />
                                        )}
                                    </div>
                                    <span
                                        className="modal-step-label"
                                        style={{
                                            fontWeight: step === 0 ? 700 : 500,
                                            color: step === 0 ? '#f59e0b' : undefined,
                                        }}
                                    >
                                        {t('settings.vault_title')}
                                    </span>
                                    <span style={textXsMutedAuto}>{step === 0 ? '1/4' : ''}</span>
                                </div>
                                <div
                                    className="modal-step"
                                    style={{ opacity: step === 1 ? 1 : 0.4 }}
                                >
                                    <div
                                        className="modal-step-number"
                                        style={{
                                            background: step >= 1 ? '#3b82f6' : 'transparent',
                                        }}
                                    >
                                        {step > 1 ? <CheckCircle2 size={14} /> : '2'}
                                    </div>
                                    <span
                                        className="modal-step-label"
                                        style={{ fontWeight: step === 1 ? 700 : 500 }}
                                    >
                                        {t('add_key.step_provider')}
                                    </span>
                                    <span style={textXsMutedAuto}>{step === 1 ? '2/4' : ''}</span>
                                </div>
                                <div
                                    className="modal-step"
                                    style={{ opacity: step === 2 ? 1 : 0.4 }}
                                >
                                    <div
                                        className="modal-step-number"
                                        style={{
                                            background: step >= 2 ? '#3b82f6' : 'transparent',
                                        }}
                                    >
                                        {step > 2 ? <CheckCircle2 size={14} /> : '3'}
                                    </div>
                                    <span
                                        className="modal-step-label"
                                        style={{ fontWeight: step === 2 ? 700 : 500 }}
                                    >
                                        {t('add_key.step_details')}
                                    </span>
                                    <span style={textXsMutedAuto}>{step === 2 ? '3/4' : ''}</span>
                                </div>
                                <div
                                    className="modal-step"
                                    style={{ opacity: step === 3 ? 1 : 0.4 }}
                                >
                                    <div
                                        className="modal-step-number"
                                        style={{
                                            background: step === 3 ? '#3b82f6' : 'transparent',
                                        }}
                                    >
                                        4
                                    </div>
                                    <span
                                        className="modal-step-label"
                                        style={{ fontWeight: step === 3 ? 700 : 500 }}
                                    >
                                        Default Model
                                    </span>
                                    <span style={textXsMutedAuto}>{step === 3 ? '4/4' : ''}</span>
                                </div>
                            </div>
                            <div className="modal-sidebar-footer">
                                <div className="modal-sidebar-footer-title">
                                    <Shield size={14} /> {t('add_key.section_secure')}
                                </div>
                                <p className="modal-sidebar-footer-text">
                                    {t('add_key.section_secure_desc')}
                                </p>
                            </div>
                        </div>

                        <div className="modal-body">
                            <div className="modal-body-header">
                                <h3 className="modal-body-title">
                                    {step === 0
                                        ? t('settings.vault_title')
                                        : step === 1
                                          ? t('add_key.title_provider')
                                          : step === 3
                                            ? 'Select Default Model'
                                            : step === 2 && bulkMode
                                              ? t('add_key.title_bulk')
                                              : t('add_key.title_configure').replace(
                                                    '{0}',
                                                    provider,
                                                )}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="modal-close-btn"
                                    aria-label={t('add_key.close_aria')}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-content">
                                {step === 0 ? (
                                    <form
                                        onSubmit={handleVaultUnlock}
                                        className="modal-form"
                                        noValidate
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '1.5rem',
                                                padding: '1rem 0',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 64,
                                                    height: 64,
                                                    borderRadius: '50%',
                                                    background: 'rgba(245,158,11,0.1)',
                                                    border: '2px solid rgba(245,158,11,0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Shield size={28} color="#f59e0b" />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600,
                                                        color: '#f8fafc',
                                                        marginBottom: '0.5rem',
                                                    }}
                                                >
                                                    Vault is Locked
                                                </div>
                                                <div
                                                    style={{ fontSize: '0.8rem', color: '#94a3b8' }}
                                                >
                                                    Enter your master password to unlock the vault
                                                    and add API keys securely.
                                                </div>
                                            </div>
                                            <div style={{ width: '100%', maxWidth: 320 }}>
                                                <input
                                                    type="password"
                                                    autoFocus
                                                    value={vaultPassword}
                                                    onChange={(e) =>
                                                        setVaultPassword(e.target.value)
                                                    }
                                                    placeholder={t('settings.vault_password_aria')}
                                                    className="modal-input"
                                                    style={{ width: '100%', textAlign: 'center' }}
                                                    aria-label={t('settings.vault_password_aria')}
                                                    aria-invalid={vaultError ? 'true' : undefined}
                                                />
                                                {vaultError && (
                                                    <div
                                                        className="modal-error"
                                                        role="alert"
                                                        style={{
                                                            marginTop: '0.5rem',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        {vaultError}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                style={{
                                                    width: '100%',
                                                    maxWidth: 320,
                                                    padding: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                }}
                                                disabled={vaultUnlocking}
                                            >
                                                {vaultUnlocking ? (
                                                    <Loader2
                                                        size={18}
                                                        className="spinning"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Shield size={18} aria-hidden="true" />
                                                )}
                                                {vaultUnlocking ? 'Unlocking...' : 'Unlock Vault'}
                                            </button>
                                        </div>
                                    </form>
                                ) : step === 1 ? (
                                    <div className="modal-provider-grid">
                                        {providers.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleProviderChange(p.id)}
                                                className={`modal-provider-btn${provider === p.id ? ' modal-provider-btn--active' : ''}`}
                                                aria-pressed={provider === p.id}
                                            >
                                                <ProviderIcon provider={p.id} size={24} />
                                                <div>
                                                    <div
                                                        className={`modal-provider-name${provider === p.id ? ' modal-provider-name--active' : ''}`}
                                                    >
                                                        {p.name}
                                                    </div>
                                                    <div className="modal-provider-desc">
                                                        {p.desc}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : step === 3 ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                        }}
                                    >
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                            Key for{' '}
                                            <strong style={{ color: '#e2e8f0' }}>{provider}</strong>{' '}
                                            verified successfully.
                                            {availableModels.length > 0
                                                ? ` Choose a default model for new conversations:`
                                                : ' No models were fetched — you can set a default model later.'}
                                        </div>
                                        {availableModels.length > 0 ? (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.35rem',
                                                    maxHeight: 280,
                                                    overflowY: 'auto',
                                                }}
                                            >
                                                {availableModels.map((m) => (
                                                    <button
                                                        key={m}
                                                        onClick={() => handleFinalize(m)}
                                                        className="modal-provider-btn"
                                                        style={{
                                                            textAlign: 'left',
                                                            padding: '0.6rem 0.75rem',
                                                        }}
                                                    >
                                                        <div className="modal-provider-name">
                                                            {m}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                        <div
                                            className="modal-actions"
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            <button
                                                onClick={handleSkipModel}
                                                className="btn-primary"
                                                style={{ flex: 1, padding: '0.75rem 1.25rem' }}
                                            >
                                                {availableModels.length > 0
                                                    ? 'Skip — use default'
                                                    : 'Done'}
                                            </button>
                                        </div>
                                    </div>
                                ) : bulkMode ? (
                                    <BulkImportStep
                                        bulkInput={bulkInput}
                                        setBulkInput={setBulkInput}
                                        error={error}
                                        loading={loading}
                                        bulkReport={bulkReport}
                                        bulkProgress={bulkProgress}
                                        onBack={handleBack}
                                        onImport={handleBulkImport}
                                        onClose={onClose}
                                    />
                                ) : (
                                    <form onSubmit={handleSubmit} className="modal-form" noValidate>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                marginBottom: '0.5rem',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBulkMode(true);
                                                    setError('');
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#3b82f6',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <Upload size={14} /> {t('add_key.bulk_import')}
                                            </button>
                                        </div>
                                        <div>
                                            <label
                                                className="modal-field-label"
                                                htmlFor="connectionName"
                                            >
                                                {t('add_key.name_label')}
                                            </label>
                                            <input
                                                id="connectionName"
                                                type="text"
                                                autoFocus
                                                value={label}
                                                onChange={(e) => setLabel(e.target.value)}
                                                placeholder={t('add_key.name_placeholder')}
                                                className="modal-input"
                                                aria-label="Connection name"
                                                aria-invalid={
                                                    error && error.includes('Label')
                                                        ? 'true'
                                                        : undefined
                                                }
                                                aria-describedby={error ? 'key-error' : undefined}
                                            />
                                            <p className="modal-input-hint">
                                                {t('add_key.name_hint')}
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '1rem',
                                            }}
                                        >
                                            <div>
                                                <label
                                                    className="modal-field-label"
                                                    htmlFor="keyGroup"
                                                >
                                                    Group
                                                </label>
                                                <input
                                                    id="keyGroup"
                                                    type="text"
                                                    value={group}
                                                    onChange={(e) => setGroup(e.target.value)}
                                                    placeholder="e.g. Personal, Work, Client-A"
                                                    className="modal-input"
                                                    aria-label="Key group"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    className="modal-field-label"
                                                    htmlFor="keyAccount"
                                                >
                                                    Account
                                                </label>
                                                <input
                                                    id="keyAccount"
                                                    type="text"
                                                    value={account}
                                                    onChange={(e) => setAccount(e.target.value)}
                                                    placeholder="e.g. alice@gmail.com"
                                                    className="modal-input"
                                                    aria-label="Account identifier"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="modal-field-row">
                                                <label
                                                    className="modal-field-label"
                                                    htmlFor="apiKey"
                                                >
                                                    {t('add_key.key_label')}
                                                </label>
                                                <a
                                                    href="#"
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                    }}
                                                    onClick={handleDocsClick}
                                                    aria-label="Open documentation to find API key"
                                                >
                                                    <HelpCircle size={12} aria-hidden="true" />{' '}
                                                    {t('add_key.key_help')}
                                                </a>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    id="apiKey"
                                                    type={showKey ? 'text' : 'password'}
                                                    value={apiKey}
                                                    onChange={(e) =>
                                                        handleKeyChange(e.target.value)
                                                    }
                                                    placeholder={t('add_key.key_placeholder')}
                                                    className="modal-input modal-input--mono"
                                                    aria-label="API key"
                                                    aria-invalid={
                                                        error && error.includes('API key')
                                                            ? 'true'
                                                            : undefined
                                                    }
                                                    aria-describedby={
                                                        error ? 'key-error' : undefined
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKey(!showKey)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: 12,
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                    }}
                                                    aria-label={
                                                        showKey
                                                            ? t('add_key.hide_aria')
                                                            : t('add_key.show_aria')
                                                    }
                                                >
                                                    {showKey ? (
                                                        <EyeOff size={18} aria-hidden="true" />
                                                    ) : (
                                                        <Eye size={18} aria-hidden="true" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <div
                                                id="key-error"
                                                className="modal-error"
                                                role="alert"
                                                aria-live="polite"
                                            >
                                                {error}
                                            </div>
                                        )}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                onClick={handleBack}
                                                className="btn-secondary"
                                                style={{ padding: '0.75rem 1.25rem' }}
                                                disabled={loading}
                                            >
                                                {t('add_key.back')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveAndClose}
                                                className="btn-secondary"
                                                style={{
                                                    padding: '0.75rem 1.25rem',
                                                    color: '#10b981',
                                                    borderColor: 'rgba(16,185,129,0.3)',
                                                }}
                                                disabled={loading}
                                            >
                                                {t('add_key.save_close')}
                                            </button>
                                            <button
                                                type="submit"
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
                                                    <Loader2
                                                        size={18}
                                                        className="spinning"
                                                        aria-hidden="true"
                                                    />
                                                ) : null}
                                                {loading
                                                    ? t('add_key.verifying')
                                                    : t('add_key.add')}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <div className="modal-footer-dots">
                                <div
                                    className={`modal-dot${step === 0 ? ' modal-dot--active' : step > 0 ? ' modal-dot--done' : ''}`}
                                />
                                <div
                                    className={`modal-dot${step === 1 ? ' modal-dot--active' : step > 1 ? ' modal-dot--done' : ''}`}
                                />
                                <div
                                    className={`modal-dot${step === 2 ? ' modal-dot--active' : step > 2 ? ' modal-dot--done' : ''}`}
                                />
                                <div
                                    className={`modal-dot${step === 3 ? ' modal-dot--active' : ''}`}
                                />
                            </div>
                        </div>
                    </motion.div>
                </FocusScope>
            </motion.div>
        </AnimatePresence>
    );
};

export default AddKeyModal;
