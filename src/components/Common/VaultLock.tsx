import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, Key } from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { useKeyStore } from '../../stores/useKeyStore';
import { securityService } from '../../core/SecurityService';

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          width: 400, padding: '2.5rem', borderRadius: 24,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)', textAlign: 'center'
        }}
      >
        <div style={{ 
          width: 64, height: 64, background: 'rgba(59,130,246,0.1)', 
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <Lock size={32} color="#3b82f6" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Vault Locked</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Your API keys are encrypted. Enter the master password to continue.
        </p>

        <form onSubmit={handleUnlock}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Key size={18} />
            </div>
            <input
              type="password"
              placeholder="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isProcessing}
              style={{
                width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: 12,
                background: 'rgba(0,0,0,0.3)', border: `1px solid ${isError ? '#ef4444' : 'var(--border)'}`,
                color: 'white', outline: 'none', transition: 'all 0.2s'
              }}
            />
          </div>

          {isError && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <ShieldAlert size={14} /> Incorrect password. Please try again.
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isProcessing || !password}
            style={{
              width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
              background: '#3b82f6', color: 'white', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
              opacity: (isProcessing || !password) ? 0.5 : 1
            }}
          >
            {isProcessing ? 'Decrypting...' : 'Unlock'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Forgot your password? You will need to <span style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => { if (window.confirm('WARNING: This will permanently delete all API keys and system state. Continue?')) keyService.clearAllData(); }}>reset all data</span>.
        </p>
      </motion.div>
    </div>
  );
};

export default VaultLock;
