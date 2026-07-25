import {
  IconAlertTriangle,
  IconBan,
  IconCheck,
  IconClock,
  IconClockCog,
  IconPackage,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockCustomizationRequests, mockProductionRequests } from '@/features/ProductionPages/mock';
import {
  ProductionLayout,
  ProductionStatusBadge,
  ProductionSummaryCard,
} from '@/features/ProductionPages/productioncomponents';
import type { ProductionItem, ProductionRequest } from '@/features/ProductionPages/types';
import { formatDate } from '@/features/ProductionPages/utils';
import {
  getCustomizationStatusLabel,
  getProductionItemStatusLabel,
  getProductionRequestStatusLabel,
} from '@/features/ProductionPages/utils';
import { useProductionCustomizationRequests } from '@/services/queries';

import './ProductionDashbroad.css';

type ProductionItemReportRow = {
  item: ProductionItem;
  request: ProductionRequest;
};

export function ProductionDashbroad() {
  const queueQuery = useProductionCustomizationRequests({ page: 1, pageSize: 50 });
  const apiRequests = queueQuery.data?.items ?? [];
  const customizationRequests = apiRequests.length > 0
    ? apiRequests.map((request) => ({
        customizationRequestId: request.customizationRequestId,
        itemName: request.proposalItem?.itemName ?? request.proposalItemId,
        projectCode: request.projectId,
        projectName: request.project?.projectName ?? request.projectId,
        requestTitle: request.requestTitle,
        status: request.status ?? 'PRODUCTION_REVIEWING',
        updatedAt: request.updatedAt ?? request.createdAt ?? '',
      }))
    : mockCustomizationRequests;
  const itemRows = mockProductionRequests.flatMap((request) => request.items.map((item) => ({ item, request })));
  const blockedItems = itemRows.filter(({ item }) => item.status === 'BLOCKED');
  const readyRequests = mockProductionRequests.filter((request) => request.status === 'COMPLETED');

  return (
    <ProductionLayout activeLabel="Dashboard" searchPlaceholder="Search production item reports...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Production Dashboard</h2>
            <p>Track production item workload, blocked/cancelled items, and ready-for-delivery requests.</p>
          </div>
          <Link className="production-workspace-action-link" to="/production/requests">
            Open Requests
          </Link>
        </section>

        <section className="production-workspace-summary-grid production-dashboard-report-summary">
          <ProductionSummaryCard icon={IconPackage} label="Total Production Items" value={itemRows.length} />
          <ProductionSummaryCard icon={IconClock} label="Pending Items" value={countItems(itemRows, 'PENDING')} />
          <ProductionSummaryCard icon={IconClockCog} label="In Production Items" value={countItems(itemRows, 'IN_PRODUCTION')} />
          <ProductionSummaryCard icon={IconCheck} label="Completed Items" value={countItems(itemRows, 'COMPLETED')} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Blocked Items" value={countItems(itemRows, 'BLOCKED')} />
          <ProductionSummaryCard icon={IconBan} label="Cancelled Items" value={countItems(itemRows, 'CANCELLED')} />
        </section>

        {queueQuery.isError ? (
          <section className="production-workspace-message production-workspace-message-error">
            Customization API is unavailable, showing production mock queue.
          </section>
        ) : null}

        <article className="production-workspace-card">
          <header>
            <div>
              <h3>Production Item Report</h3>
              <p>Grouped by production request and shown at production_items level. No partial quantity completion is reported in MVP.</p>
            </div>
          </header>
          <div className="production-workspace-table-wrap">
            <table className="production-workspace-table production-dashboard-report-table">
              <thead>
                <tr>
                  <th>Production Code</th>
                  <th>Project</th>
                  <th>Order Code</th>
                  <th>Product Name</th>
                  <th>Product Version</th>
                  <th>Quantity</th>
                  <th>Item Status</th>
                  <th>Estimated Completion</th>
                  <th>Completed At</th>
                  <th>Material Note</th>
                  <th>Production Note</th>
                  <th>Cancellation Reason</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map(({ item, request }) => (
                  <tr key={item.productionItemId}>
                    <td>
                      <Link to={`/production/requests/${request.productionRequestId}`}>{request.productionCode}</Link>
                    </td>
                    <td>{request.projectName}</td>
                    <td>{request.orderCode}</td>
                    <td>{item.productNameSnapshot}</td>
                    <td>{item.productVersionNameSnapshot ?? '-'}</td>
                    <td>{item.quantity}</td>
                    <td><ProductionStatusBadge label={getProductionItemStatusLabel(item.status)} status={item.status} /></td>
                    <td>{formatDate(item.estimatedCompletionDate)}</td>
                    <td>{formatDate(item.completedAt)}</td>
                    <td>{item.materialNote ?? '-'}</td>
                    <td>{item.productionNote ?? '-'}</td>
                    <td>{item.cancellationReason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <section className="production-workspace-grid">
          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Recent Customization Reviews</h3>
                <p>Queue-first feasibility reviews before quotation/order confirmation.</p>
              </div>
            </header>
            <div className="production-workspace-list">
              {customizationRequests.slice(0, 4).map((request) => (
                <Link
                  className="production-dashboard-list-item"
                  key={request.customizationRequestId}
                  to={`/production/customization-reviews?requestId=${request.customizationRequestId}`}
                >
                  <strong>{request.requestTitle}</strong>
                  <ProductionStatusBadge label={getCustomizationStatusLabel(request.status)} status={request.status} />
                  <small>{request.projectName} - {request.itemName}</small>
                  <small>Updated {formatDate(request.updatedAt)}</small>
                </Link>
              ))}
            </div>
          </article>

          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Blocked Items</h3>
                <p>Material or technical blockers that need resolution.</p>
              </div>
              <Link className="production-workspace-action-link" to="/production/blocked-issues">View All</Link>
            </header>
            <div className="production-workspace-list">
              {blockedItems.map(({ item, request }) => (
                <Link className="production-dashboard-list-item" key={item.productionItemId} to={`/production/requests/${request.productionRequestId}`}>
                  <strong>{item.productNameSnapshot}</strong>
                  <ProductionStatusBadge label={getProductionItemStatusLabel(item.status)} status={item.status} />
                  <small>{request.productionCode} - {request.projectName}</small>
                  <p>{item.materialNote ?? item.productionNote ?? 'No blocker note provided.'}</p>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <section className="production-workspace-grid">
          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Production Requests Overview</h3>
                <p>Request-level status remains a summary above item-level reporting.</p>
              </div>
            </header>
            <div className="production-workspace-table-wrap">
              <table className="production-workspace-table">
                <thead>
                  <tr>
                    <th>Production Code</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Estimated Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProductionRequests.map((request) => (
                    <tr key={request.productionRequestId}>
                      <td>{request.productionCode}</td>
                      <td>{request.projectName}</td>
                      <td>{request.priority}</td>
                      <td><ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} /></td>
                      <td>{formatDate(request.estimatedCompletionDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Ready for Delivery</h3>
                <p>Completed production requests waiting for Sales coordination.</p>
              </div>
              <Link className="production-workspace-action-link" to="/production/ready-for-delivery">Prepare</Link>
            </header>
            <div className="production-workspace-list">
              {readyRequests.map((request) => (
                <Link className="production-dashboard-list-item" key={request.productionRequestId} to={`/production/requests/${request.productionRequestId}`}>
                  <strong>{request.projectName}</strong>
                  <ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} />
                  <small>{request.orderCode} - {request.productionCode}</small>
                  <small>Completed {formatDate(request.actualCompletionDate)}</small>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}

function countItems(rows: ProductionItemReportRow[], status: ProductionItem['status']) {
  return rows.filter(({ item }) => item.status === status).length;
}
