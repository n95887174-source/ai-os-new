import React, { useEffect, useRef } from 'react'
import { X, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HISTORICAL_FIGURES } from '../../kernel/services/debate-historical-figures'

interface HistoricalFiguresPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  max?: number;
}

export const HistoricalFiguresPicker: React.FC<HistoricalFiguresPickerProps> = ({ isOpen, onClose, selectedIds, onToggle, max = 5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Move focus into the modal and trap it
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusable = containerRef.current?.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"]), input, select, textarea');
    focusable?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Trap Tab cycling within the modal
      if (e.key === 'Tab' && containerRef.current) {
        const all = containerRef.current.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
        if (all.length === 0) return;
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      prevFocus?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 580, maxHeight: '80vh', overflow: 'auto', background: 'linear-gradient(145deg, rgba(20,20,40,0.98), rgba(15,15,30,0.98))', borderRadius: 16, border: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={20} color="#a855f7" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Historical Figures</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Select up to {max} figures for your debate</p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {HISTORICAL_FIGURES.map(fig => {
                const selected = selectedIds.includes(fig.id);
                const disabled = !selected && selectedIds.length >= max;
                return (
                  <button
                    key={fig.id}
                    onClick={() => !disabled && onToggle(fig.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 10, border: `1px solid ${selected ? `${fig.color}60` : 'rgba(100,116,139,0.15)'}`,
                      background: selected ? `${fig.color}15` : 'rgba(30,30,50,0.4)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{fig.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: selected ? fig.color : '#e2e8f0' }}>{fig.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{fig.era} · {fig.expertise.split(',')[0]!}</div>
                    </div>
                    {selected && <Check size={16} color={fig.color} />}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(100,116,139,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedIds.length}/{max} selected</span>
              <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
