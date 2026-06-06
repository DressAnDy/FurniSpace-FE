import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from './DataTable';

type AssetRow = Record<string, unknown> & {
  id: string;
  name: string;
  size: number;
  type: string;
};

const data: AssetRow[] = [
  { id: 'asset-1', name: 'Sofa.glb', size: 128, type: 'Model' },
  { id: 'asset-2', name: 'Oak texture.jpg', size: 42, type: 'Texture' },
  { id: 'asset-3', name: 'Chair.glb', size: 86, type: 'Model' },
];

const columns: ColumnDef<AssetRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'size',
    header: 'Size MB',
  },
];

function AssetDataTable(args: {
  columns: ColumnDef<AssetRow, unknown>[];
  data: AssetRow[];
  getRowId: (row: AssetRow) => string;
  loading?: boolean;
}) {
  return <DataTable<AssetRow> {...args} />;
}

const meta = {
  title: 'Shared/DataTable',
  component: AssetDataTable,
  args: {
    columns,
    data,
    getRowId: (row: AssetRow) => row.id,
  },
} satisfies Meta<typeof AssetDataTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
