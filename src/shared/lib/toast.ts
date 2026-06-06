export type ToastVariant = 'error' | 'info' | 'success' | 'warning';

export type ToastDetail = {
  message: string;
  variant: ToastVariant;
};

export function notifyError(message: string) {
  window.dispatchEvent(
    new CustomEvent<ToastDetail>('app:toast', {
      detail: {
        message,
        variant: 'error',
      },
    }),
  );
}
