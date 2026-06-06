import { IconPlus } from '@tabler/icons-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders children and handles click', async () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables click while loading', async () => {
    const onClick = vi.fn();

    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: /save/i });

    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders an icon', () => {
    render(
      <Button icon={<IconPlus data-testid="button-icon" />}>Add</Button>,
    );

    expect(screen.getByTestId('button-icon')).toBeInTheDocument();
  });
});
