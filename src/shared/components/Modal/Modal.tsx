import { Box, Modal as MuiModal, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { useUiStore } from '@/stores';

export type ModalProps = {
  children: ReactNode;
  id: string;
  title?: string;
};

export function Modal({ children, id, title }: ModalProps) {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const open = activeModal === id;
  const titleId = title ? `${id}-title` : undefined;

  return (
    <MuiModal onClose={closeModal} open={open}>
      <Box
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          left: '50%',
          maxHeight: 'calc(100vh - 48px)',
          maxWidth: 560,
          overflow: 'auto',
          p: 3,
          position: 'absolute',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100vw - 32px)',
        }}
        tabIndex={-1}
      >
        {title && (
          <Typography
            component="h2"
            fontWeight={700}
            id={titleId}
            sx={{ mb: 2 }}
            variant="h6"
          >
            {title}
          </Typography>
        )}
        {children}
      </Box>
    </MuiModal>
  );
}
