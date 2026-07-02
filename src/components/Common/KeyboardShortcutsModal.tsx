import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Zap } from 'lucide-react';

interface ShortcutEntry {
    keys: string;
    label: string;
    category: string;
    icon?: React.ReactNode;
}

const SHORTCUTS: ShortcutEntry[] = [
    { keys: 'Ctrl+K / ⌘K', label: 'Command palette', category: 'Global', icon: <Zap size={14} /> },
    { keys: '?', label: 'Toggle this legend', category: 'Global' },
    { keys: 'Escape', label: 'Cancel / Close panel', category: 'Global' },
    { keys: 'Ctrl+,', label: 'Open Settings', category: 'Global' },
    { keys: 'Enter', label: 'Send message', category: 'Chat', icon: <Send size={14} /> },
    { keys: 'Ctrl+Shift+N', label: 'New chat session', category: 'Chat' },
    { keys: 'Ctrl+Shift+F', label: 'Search messages', category: 'Chat' },
    { keys: 'Ctrl+Shift+E', label: 'Export chat', category: 'Chat' },
    { keys: 'Ctrl+Shift+D', label: 'Start debate', category: 'Debate' },
    { keys: 'Ctrl+Shift+P', label: 'Pause / Resume debate', category: 'Debate' },
    { keys: 'Ctrl+Shift+S', label: 'Save debate snapshot', category: 'Debate' },
    { keys: 'Ctrl+Shift+H', label: 'Toggle health panel', category: 'Providers' },
    { keys: 'Ctrl+Shift+K', label: 'Toggle key manager', category: 'Providers' },
    { keys: 'Ctrl+Shift+T', label: 'Open traces panel', category: 'Diagnostics' },
    { keys: 'Ctrl+Shift+L', label: 'Open logs panel', category: 'Diagnostics' },
    { keys: 'Ctrl+Shift+M', label: 'Open memory panel', category: 'Knowledge' },
    { keys: 'Ctrl+Shift+R', label: 'Open routing trace', category: 'Diagnostics' },
    { keys: 'Ctrl+Shift+W', label: 'Toggle workspace explorer', category: 'Tools' },
    { keys: 'Ctrl+Shift+C', label: 'Open cache panel', category: 'Tools' },
    { keys: 'Ctrl+Shift+B', label: 'Toggle sidebar', category: 'Global' },
];

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
    isOpen,
    onClose,
}) => {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                if (isOpen) onClose();
            }
        },
        [onClose, isOpen],
    );

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9998,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: 520,
                            maxHeight: '80vh',
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1.25rem 1.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                                Keyboard Shortcuts
                            </h2>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: 4,
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div
                            style={{
                                padding: '1rem 1.5rem 1.5rem',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem',
                            }}
                        >
                            {categories.map((cat) => (
                                <div key={cat}>
                                    <div
                                        style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        {cat}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.35rem',
                                        }}
                                    >
                                        {SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                                            <div
                                                key={s.keys}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.4rem 0.5rem',
                                                    borderRadius: 8,
                                                    background: 'rgba(255,255,255,0.02)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        fontSize: '0.85rem',
                                                        color: '#e2e8f0',
                                                    }}
                                                >
                                                    {s.icon && (
                                                        <span
                                                            style={{
                                                                color: '#64748b',
                                                                display: 'flex',
                                                            }}
                                                        >
                                                            {s.icon}
                                                        </span>
                                                    )}
                                                    <span>{s.label}</span>
                                                </div>
                                                <kbd
                                                    style={{
                                                        padding: '0.2rem 0.5rem',
                                                        background: 'rgba(255,255,255,0.06)',
                                                        borderRadius: 4,
                                                        fontSize: '0.7rem',
                                                        fontFamily: 'monospace',
                                                        color: '#a855f7',
                                                        border: '1px solid rgba(168,85,247,0.2)',
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {s.keys}
                                                </kbd>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
