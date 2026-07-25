import { IconAlertTriangle, IconBan, IconBell } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockProductionRequests } from '@/features/ProductionPages/mock';
import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';

export function BlockedIssues() {
  const blockedRequests = mockProductionRequests.filter((request) => request.status === 'BLOCKED');
  const blockedItems = mockProductionRequests.flatMap((request) => request.items.filter((item) => item.status === 'BLOCKED').map((item) => ({ item, request })));

  return (
    <ProductionLayout activeLabel="Blocked Issues" searchPlaceholder="Search blocked production issues...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Blocked Issues</h2>
            <p>Review production blockers caused by material, technical, or customization issues.</p>
          </div>
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconAlertTriangle} label="Blocked Requests" value={blockedRequests.length} />
          <ProductionSummaryCard icon={IconBan} label="Blocked Items" value={blockedItems.length} />
          <ProductionSummaryCard icon={IconBell} label="Sales Notifications" value={blockedItems.length} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Cancellation Reasons Needed" value={0} />
        </section>

        <BlockedTable
          title="Blocked Requests"
          rows={blockedRequests.map((request) => ({
            id: request.productionRequestId,
            type: 'Request',
            project: request.projectName,
            productionCode: request.productionCode,
            item: '-',
            note: request.note ?? '-',
            blockedSince: formatDate(request.updatedAt),
            assignedTo: request.assignedToName ?? '-',
            status: request.status,
            label: getProductionRequestStatusLabel(request.status),
            detailPath: `/production/requests/${request.productionRequestId}`,
          }))}
        />

        <BlockedTable
          title="Blocked Items"
          rows={blockedItems.map(({ item, request }) => ({
            id: item.productionItemId,
            type: 'Item',
            project: request.projectName,
            productionCode: request.productionCode,
            item: item.productNameSnapshot,
            note: item.materialNote ?? item.productionNote ?? '-',
            blockedSince: formatDate(item.startedAt ?? request.updatedAt),
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
  blockedSince: string;
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
          <p>Blocked production work that needs a decision or Sales coordination.</p>
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
              <th>Blocked Since</th>
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
                <td>{row.blockedSince}</td>
                <td>{row.assignedTo}</td>
                <td>
                  <div className="production-workspace-row-actions">
                    <Link to={row.detailPath}>View Detail</Link>
                    <button className="is-secondary" type="button">Resolve Blocked</button>
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
