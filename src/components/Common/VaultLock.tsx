import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, Key } from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { useKeyStore } from '../../stores/useKeyStore';
import { securityService } from '../../core/SecurityService';
import { eventBus } from '../../core/events';

const VaultLock: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { keys } = useKeyStore();
  const isLocked = securityService.isLocked();
  const hasEncryptedKeys = keys.some(k => k.isEncrypted);

  if (!isLocked || !hasEncryptedKeys) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setIsError(false);

    const success = await keyService.unlockVault(password);
    if (success) {
      setPassword('');
    } else {
      setIsError(true);
    }
    setIsProcessing(false);
  };

  const handleClearData = () => {
    eventBus.emit('system:notification', {
      message: 'WARNING: This will permanently delete all API keys and system state.',
      type: 'error'
    });
    keyService.clearAllData();
  };

  return (
    <div className="vault-overlay" role="dialog" aria-modal="true" aria-label="Vault unlock">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="vault-panel">
        <div className="vault-icon-box"><Lock size={32} color="#3b82f6" /></div>

        <h2 className="vault-heading">Vault Locked</h2>
        <p className="vault-desc">Your API keys are encrypted. Enter the master password to continue.</p>

        <form onSubmit={handleUnlock}>
          <div className="vault-input-group">
            <div className="vault-input-icon"><Key size={18} /></div>
            <input type="password" placeholder="Master password" value={password}
              onChange={(e) => setPassword(e.target.value)} disabled={isProcessing}
              className={`vault-input${isError ? ' vault-input--error' : ''}`}
              aria-label="Master password"
              aria-invalid={isError}
            />
          </div>

          {isError && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="vault-error-msg" role="alert">
              <ShieldAlert size={14} /> Incorrect password. Please try again.
            </motion.div>
          )}

          <button type="submit" disabled={isProcessing || !password} className="vault-submit-btn">
            {isProcessing ? 'Decrypting...' : 'Unlock'}
          </button>
        </form>

        <p className="vault-forgot">
          Forgot your password? You will need to <span className="vault-reset-link" onClick={handleClearData} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') handleClearData(); }}>reset all data</span>.
        </p>
      </motion.div>
    </div>
  );
};

export default VaultLock;
