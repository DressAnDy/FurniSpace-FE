import { createContext, useContext } from 'react';

export type ConfirmDialogOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  tone?: 'default' | 'danger';
  title?: string;
};

export const ConfirmDialogContext = createContext<((options: ConfirmDialogOptions) => Promise<boolean>) | null>(null);

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);

  if (!confirm) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider.');
  }

  return confirm;
}
