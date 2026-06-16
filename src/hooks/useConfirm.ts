import { useState, useCallback, useRef } from 'react';

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
 * Reusable confirmation state hook — wraps ConfirmDialog.
 * Returns { confirm, ConfirmDialog } where confirm() shows the dialog
 * and returns a Promise<boolean> (true = confirmed, false = cancelled).
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

  return { confirm, handleConfirm, handleCancel, state, setState };
}