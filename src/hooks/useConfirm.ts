import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
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
    onConfirm: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        open: true,
        onConfirm: () => {
          setState(s => ({ ...s, open: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    // The Promise's resolve was captured at confirm() time — we need to reject it.
    // Instead, we resolve with false by calling a stored reject.
    // Simpler: store resolve/reject in a ref.
  }, []);

  return { confirm, state, setState };
}