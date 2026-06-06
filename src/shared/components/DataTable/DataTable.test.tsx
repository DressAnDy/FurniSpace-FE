import type { ColumnDef } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { DataTable } from './DataTable';

type Row = Record<string, unknown> & {
  id: string;
  name: string;
  type: string;
};

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'type', header: 'Type' },
];

const data: Row[] = [
  { id: '1', name: 'Sofa', type: 'Model' },
  { id: '2', name: 'Texture', type: 'Image' },
];

describe('DataTable', () => {
  it('renders rows', () => {
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} />);

    expect(screen.getByText('Sofa')).toBeInTheDocument();
    expect(screen.getByText('Texture')).toBeInTheDocument();
  });

  it('filters rows', async () => {
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} />);

    await userEvent.type(screen.getByLabelText(/filter/i), 'sofa');

    expect(screen.getByText('Sofa')).toBeInTheDocument();
    expect(screen.queryByText('Texture')).not.toBeInTheDocument();
  });

  it('sorts rows by clicking header', async () => {
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} />);

    await userEvent.click(screen.getByText('Name'));

    const bodyRows = screen
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('cell').length > 0);

    expect(within(bodyRows[0]).getByText('Sofa')).toBeInTheDocument();
  });

  it('renders loading skeletons', () => {
    render(<DataTable columns={columns} data={[]} loading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
