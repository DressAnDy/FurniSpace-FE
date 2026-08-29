import { useMemo, useState } from 'react';
import { IconAlertTriangle, IconBan, IconBell } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionItemStatusLabel } from '@/features/ProductionPages/utils';
import { getProductionServiceResultMessage, type UnavailableProductionItemDto } from '@/services/api/production';
import { useUnavailableProductionItems } from '@/services/queries';

const EMPTY_UNAVAILABLE_ITEMS: UnavailableProductionItemDto[] = [];

export function BlockedIssues() {
  const [keyword, setKeyword] = useState('');
  const unavailableQuery = useUnavailableProductionItems({
    keyword: keyword.trim() || undefined,
    page: 1,
    pageSize: 100,
  });

  const items = unavailableQuery.data?.items ?? EMPTY_UNAVAILABLE_ITEMS;

  const requestGroups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const group = map.get(item.productionRequestId) ?? [];
      group.push(item);
      map.set(item.productionRequestId, group);
    }
    return map;
  }, [items]);

  const missingReasonCount = items.filter((item) => !item.cancellationReason?.trim()).length;

  return (
    <ProductionLayout activeLabel="Unavailable Items" searchPlaceholder="Search unavailable production items...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Unavailable Items</h2>
            <p>Review cancelled production items caused by material, technical, or customization issues.</p>
          </div>
          <input
            className="production-workspace-search"
            placeholder="Production code, project, product, reason..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </section>

        {unavailableQuery.isError ? (
          <p className="production-workspace-error">{getProductionServiceResultMessage(unavailableQuery.error)}</p>
        ) : null}

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconAlertTriangle} label="Requests With Unavailable Items" value={requestGroups.size} />
          <ProductionSummaryCard icon={IconBan} label="Unavailable Items" value={items.length} />
          <ProductionSummaryCard icon={IconBell} label="Sales Notifications" value={items.length} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Cancellation Reasons Needed" value={missingReasonCount} />
        </section>

        <BlockedTable
          title="Requests With Unavailable Items"
          rows={[...requestGroups.entries()].map(([requestId, group]) => {
            const first = group[0];
            return {
              id: requestId,
              type: 'Request',
              project: first.projectName,
              productionCode: first.productionCode ?? '-',
              item: `${group.length} item(s)`,
              note: group.map((item) => item.cancellationReason).filter(Boolean).join('; ') || '-',
              updatedAt: formatDate(first.completedAt ?? undefined),
              assignedTo: first.assignedToName ?? '-',
              status: 'CANCELLED',
              label: getProductionItemStatusLabel('CANCELLED'),
              detailPath: `/production/requests/${requestId}`,
            };
          })}
        />

        <BlockedTable
          title="Unavailable Items"
          rows={items.map((item) => ({
            id: item.productionItemId,
            type: 'Item',
            project: item.projectName,
            productionCode: item.productionCode ?? '-',
            item: item.productNameSnapshot ?? '-',
            note: item.cancellationReason ?? '-',
            updatedAt: formatDate(item.completedAt ?? undefined),
            assignedTo: item.assignedToName ?? '-',
            status: item.status,
            label: getProductionItemStatusLabel(item.status),
            detailPath: `/production/requests/${item.productionRequestId}`,
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>No unavailable items found.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <ProductionStatusBadge label={row.type} status={row.status} />
                  </td>
                  <td>{row.project}</td>
                  <td>{row.productionCode}</td>
                  <td>{row.item}</td>
                  <td>{row.note}</td>
                  <td>{row.updatedAt}</td>
                  <td>{row.assignedTo}</td>
                  <td>
                    <div className="production-workspace-row-actions">
                      <Link to={row.detailPath}>View Detail</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
