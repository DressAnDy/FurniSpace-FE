import { IconAlertTriangle, IconBan, IconBell } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockProductionRequests } from '@/features/ProductionPages/mock';
import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';

export function BlockedIssues() {
  const unavailableRequests = mockProductionRequests.filter((request) => request.items.some((item) => item.status === 'CANCELLED'));
  const unavailableItems = mockProductionRequests.flatMap((request) => request.items.filter((item) => item.status === 'CANCELLED').map((item) => ({ item, request })));

  return (
    <ProductionLayout activeLabel="Unavailable Items" searchPlaceholder="Search unavailable production items...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Unavailable Items</h2>
            <p>Review cancelled production items caused by material, technical, or customization issues.</p>
          </div>
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconAlertTriangle} label="Requests With Unavailable Items" value={unavailableRequests.length} />
          <ProductionSummaryCard icon={IconBan} label="Unavailable Items" value={unavailableItems.length} />
          <ProductionSummaryCard icon={IconBell} label="Sales Notifications" value={unavailableItems.length} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Cancellation Reasons Needed" value={0} />
        </section>

        <BlockedTable
          title="Requests With Unavailable Items"
          rows={unavailableRequests.map((request) => ({
            id: request.productionRequestId,
            type: 'Request',
            project: request.projectName,
            productionCode: request.productionCode,
            item: '-',
            note: request.note ?? '-',
            updatedAt: formatDate(request.updatedAt),
            assignedTo: request.assignedToName ?? '-',
            status: request.status,
            label: getProductionRequestStatusLabel(request.status),
            detailPath: `/production/requests/${request.productionRequestId}`,
          }))}
        />

        <BlockedTable
          title="Unavailable Items"
          rows={unavailableItems.map(({ item, request }) => ({
            id: item.productionItemId,
            type: 'Item',
            project: request.projectName,
            productionCode: request.productionCode,
            item: item.productNameSnapshot,
            note: item.materialNote ?? item.productionNote ?? '-',
            updatedAt: formatDate(item.startedAt ?? request.updatedAt),
            assignedTo: request.assignedToName ?? '-',
            status: item.status,
            label: getProductionItemStatusLabel(item.status),
            detailPath: `/production/requests/${request.productionRequestId}`,
          }))}
        />
      </div>
    </ProductionLayout>
  );
}

type BlockedRow = {
  assignedTo: string;
  updatedAt: string;
  detailPath: string;
  id: string;
  item: string;
  label: string;
  note: string;
  productionCode: string;
  project: string;
  status: string;
  type: string;
};

function BlockedTable({ rows, title }: { rows: BlockedRow[]; title: string }) {
  return (
    <article className="production-workspace-card">
      <header>
        <div>
          <h3>{title}</h3>
          <p>Unavailable production work that needs Sales/customer coordination.</p>
        </div>
      </header>
      <div className="production-workspace-table-wrap">
        <table className="production-workspace-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Project</th>
              <th>Production Code</th>
              <th>Item</th>
              <th>Reason / Note</th>
              <th>Updated Since</th>
              <th>Assigned To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><ProductionStatusBadge label={row.type} status={row.status} /></td>
                <td>{row.project}</td>
                <td>{row.productionCode}</td>
                <td>{row.item}</td>
                <td>{row.note}</td>
                <td>{row.updatedAt}</td>
                <td>{row.assignedTo}</td>
                <td>
                  <div className="production-workspace-row-actions">
                    <Link to={row.detailPath}>View Detail</Link>
                    <button className="is-secondary" type="button">Review Item</button>
                    <button className="is-secondary" type="button">Notify Sales</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
