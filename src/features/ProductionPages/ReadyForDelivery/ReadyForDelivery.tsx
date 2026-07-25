import { IconClipboardCheck, IconNotes, IconPackage, IconTruckDelivery } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockProductionRequests } from '@/features/ProductionPages/mock';
import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';

export function ReadyForDelivery() {
  const readyRequests = mockProductionRequests.filter((request) => request.status === 'COMPLETED');
  const completedItems = readyRequests.flatMap((request) => request.items.filter((item) => item.status === 'COMPLETED').map((item) => ({ item, request })));

  return (
    <ProductionLayout activeLabel="Ready for Delivery" searchPlaceholder="Search ready production requests...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Ready for Delivery</h2>
            <p>Review completed production requests and support Sales in preparing delivery or handover.</p>
          </div>
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconTruckDelivery} label="Ready Production Requests" value={readyRequests.length} />
          <ProductionSummaryCard icon={IconPackage} label="Completed Items" value={completedItems.length} />
          <ProductionSummaryCard icon={IconNotes} label="Delivery Preparation Notes" value={readyRequests.length} />
          <ProductionSummaryCard icon={IconClipboardCheck} label="Sales Handover" value={readyRequests.length} />
        </section>

        <article className="production-workspace-card">
          <header>
            <div>
              <h3>Ready Production Requests</h3>
              <p>Completed production requests that can be prepared for Sales delivery coordination.</p>
            </div>
          </header>
          <div className="production-workspace-table-wrap">
            <table className="production-workspace-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Order Code</th>
                  <th>Production Code</th>
                  <th>Completed Items</th>
                  <th>Ready Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {readyRequests.map((request) => (
                  <tr key={request.productionRequestId}>
                    <td>{request.projectName}</td>
                    <td>{request.orderCode}</td>
                    <td>{request.productionCode}</td>
                    <td>{request.items.filter((item) => item.status === 'COMPLETED').length} / {request.items.length}</td>
                    <td>{formatDate(request.actualCompletionDate)}</td>
                    <td><ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} /></td>
                    <td>
                      <div className="production-workspace-row-actions">
                        <Link to={`/production/requests/${request.productionRequestId}`}>View Production Detail</Link>
                        <button className="is-secondary" type="button">Mark Ready for Delivery</button>
                        <button className="is-secondary" type="button">Add Delivery Preparation Note</button>
                      </div>
                    </td>
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
                <h3>Completed Items</h3>
                <p>Full quantity completion only. Partial item completion is not supported in MVP.</p>
              </div>
            </header>
            <div className="production-workspace-list">
              {completedItems.map(({ item, request }) => (
                <div className="production-workspace-queue-card" key={item.productionItemId}>
                  <strong>{item.productNameSnapshot}</strong>
                  <ProductionStatusBadge label={getProductionItemStatusLabel(item.status)} status={item.status} />
                  <small>{request.projectName} - Qty {item.quantity}</small>
                  <small>Completed {formatDate(item.completedAt)}</small>
                </div>
              ))}
            </div>
          </article>
          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Delivery Preparation Notes</h3>
                <p>Production and Sales coordinate handover because there is no Delivery Staff role.</p>
              </div>
            </header>
            <div className="production-workspace-detail-grid">
              <div className="production-workspace-field">
                <span>Packing</span>
                <strong>Confirm packed item count against order snapshots.</strong>
              </div>
              <div className="production-workspace-field">
                <span>Sales Coordination</span>
                <strong>Notify Sales when the production request can move to READY_FOR_DELIVERY.</strong>
              </div>
            </div>
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}
