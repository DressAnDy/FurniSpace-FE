import { IconPlus } from '@tabler/icons-react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: {
    children: 'Create',
    variant: 'primary',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const WithIcon: Story = {
  args: {
    icon: <IconPlus size={18} />,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
