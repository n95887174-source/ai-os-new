import { Shield, Loader2 } from 'lucide-react';

interface VaultUnlockStepProps {
    vaultPassword: string;
    setVaultPassword: (v: string) => void;
    vaultError: string;
    vaultUnlocking: boolean;
    onUnlock: (e: React.FormEvent) => void;
    t: (key: string) => string;
}

const VaultUnlockStep: React.FC<VaultUnlockStepProps> = ({
    vaultPassword,
    setVaultPassword,
    vaultError,
    vaultUnlocking,
    onUnlock,
    t,
}) => (
    <form onSubmit={onUnlock} className="modal-form" noValidate>
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
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Enter your master password to unlock the vault and add API keys securely.
                </div>
            </div>
            <div style={{ width: '100%', maxWidth: 320 }}>
                <input
                    type="password"
                    autoFocus
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
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
                    <Loader2 size={18} className="spinning" aria-hidden="true" />
                ) : (
                    <Shield size={18} aria-hidden="true" />
                )}
                {vaultUnlocking ? 'Unlocking...' : 'Unlock Vault'}
            </button>
        </div>
    </form>
);

export default VaultUnlockStep;
