import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/stores';

import { Modal } from './Modal';

describe('Modal', () => {
  beforeEach(() => {
    useUiStore.setState({ activeModal: null });
  });

  it('opens when activeModal matches id', () => {
    useUiStore.getState().openModal('settings');

    render(
      <Modal id="settings" title="Settings">
        Modal body
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    useUiStore.getState().openModal('settings');

    render(
      <Modal id="settings" title="Settings">
        Modal body
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(useUiStore.getState().activeModal).toBeNull();
    });
  });
});
