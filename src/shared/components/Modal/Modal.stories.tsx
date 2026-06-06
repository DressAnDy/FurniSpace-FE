import { Stack, Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/shared/components/Button';
import { useUiStore } from '@/stores';

import { Modal } from './Modal';

const modalId = 'storybook-modal';

function ModalStory() {
  const openModal = useUiStore((state) => state.openModal);
  const closeModal = useUiStore((state) => state.closeModal);

  return (
    <Stack alignItems="flex-start" spacing={2}>
      <Button onClick={() => openModal(modalId)}>Open modal</Button>
      <Modal id={modalId} title="Project details">
        <Stack spacing={2}>
          <Typography color="text.secondary">
            This modal is controlled by the shared uiStore.
          </Typography>
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

const meta = {
  title: 'Shared/Modal',
  component: ModalStory,
} satisfies Meta<typeof ModalStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
