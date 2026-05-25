import React, { useState, useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm, onCancel
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
    }} onClick={onCancel}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '1.5rem', minWidth: 320, maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>{title}</h3>
        <p style={{ margin: '0.75rem 0 1.25rem', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem'
          }}>{cancelLabel}</button>
          <button ref={confirmRef} onClick={onConfirm} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: variant === 'danger' ? '#ef4444' : '#3b82f6',
            color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};
