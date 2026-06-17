import { useState, useCallback, useRef, useEffect } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

/**
 * Reusable confirmation state hook — returns { confirm, ConfirmDialog }.
 * confirm() shows the dialog and returns a Promise<boolean>.
 * ConfirmDialog is a renderless wrapper — render it in your JSX tree.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'default',
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        ...options,
        open: true,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog = useCallback(() => {
    const s = stateRef.current;
    if (!s.open) return null;
    const variantClass = s.variant === 'danger' ? 'confirm-danger' : '';
    return (
      <div className="modal-overlay" onClick={handleCancel}>
        <div className={`modal-content ${variantClass}`} onClick={e => e.stopPropagation()}>
          <h3>{s.title}</h3>
          <p>{s.message}</p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={handleCancel}>
              {s.cancelLabel || 'Cancel'}
            </button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              {s.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
