import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { ConfirmDialogContext, type ConfirmDialogOptions } from './ConfirmDialogContext';

import './ConfirmDialog.css';

type PendingConfirmation = Required<Pick<ConfirmDialogOptions, 'confirmLabel' | 'description' | 'tone' | 'title'>> & {
  cancelLabel: string;
  resolve: (confirmed: boolean) => void;
};

export function ConfirmDialogProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions) => (
    new Promise<boolean>((resolve) => {
      setPendingConfirmation({
        cancelLabel: options.cancelLabel ?? 'Cancel',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        description: options.description,
        resolve,
        title: options.title ?? 'Confirm action',
        tone: options.tone ?? 'default',
      });
    })
  ), []);

  const contextValue = useMemo(() => confirm, [confirm]);

  function close(confirmed: boolean) {
    const current = pendingConfirmation;

    if (!current) {
      return;
    }

    setPendingConfirmation(null);
    current.resolve(confirmed);
  }

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {pendingConfirmation ? (
        <div className="confirm-dialog-backdrop" role="presentation">
          <section
            aria-describedby="confirm-dialog-description"
            aria-labelledby="confirm-dialog-title"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <header className="confirm-dialog-header">
              <h2 id="confirm-dialog-title">{pendingConfirmation.title}</h2>
              <button aria-label="Close confirmation dialog" type="button" onClick={() => close(false)}>
                x
              </button>
            </header>
            <p id="confirm-dialog-description">{pendingConfirmation.description}</p>
            <footer className="confirm-dialog-actions">
              <button className="confirm-dialog-secondary" type="button" onClick={() => close(false)}>
                {pendingConfirmation.cancelLabel}
              </button>
              <button
                className={pendingConfirmation.tone === 'danger' ? 'confirm-dialog-primary confirm-dialog-danger' : 'confirm-dialog-primary'}
                type="button"
                onClick={() => close(true)}
              >
                {pendingConfirmation.confirmLabel}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}
