import { useMemo, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';

import { mockProductionRequests } from '@/features/ProductionPages/mock';
import {
  ProductionEmptyState,
  ProductionLayout,
  ProductionStatusBadge,
} from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';

const tabs = ['Overview', 'Production Items', 'Files & Notes', 'Timeline'] as const;
type DetailTab = (typeof tabs)[number];

export function ProductionRequestDetail() {
  const { productionRequestId } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');
  const request = useMemo(
    () => mockProductionRequests.find((item) => item.productionRequestId === productionRequestId) ?? mockProductionRequests[0],
    [productionRequestId],
  );

  if (!request) {
    return (
      <ProductionLayout activeLabel="Production Requests">
        <ProductionEmptyState message="Production request was not found." />
      </ProductionLayout>
    );
  }

  return (
    <ProductionLayout activeLabel="Production Requests" searchPlaceholder="Search production request detail...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>{request.productionCode}</span>
            <h2>{request.projectName}</h2>
            <p>{request.orderCode} - {request.note ?? 'No request note provided.'}</p>
          </div>
          <Link className="production-workspace-action-link production-workspace-button-secondary" to="/production/requests">
            <IconArrowLeft size={16} />
            Back
          </Link>
        </section>

        <section className="production-workspace-card">
          <div className="production-workspace-meta">
            <Meta label="Status" value={<ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} />} />
            <Meta label="Priority" value={request.priority} />
            <Meta label="Assigned Staff" value={request.assignedToName ?? '-'} />
            <Meta label="Estimated Start Date" value={formatDate(request.estimatedStartDate)} />
            <Meta label="Estimated Completion Date" value={formatDate(request.estimatedCompletionDate)} />
            <Meta label="Actual Start Date" value={formatDate(request.actualStartDate)} />
            <Meta label="Actual Completion Date" value={formatDate(request.actualCompletionDate)} />
            <Meta label="Order Code" value={request.orderCode} />
          </div>
        </section>

        <article className="production-workspace-card">
          <nav className="production-workspace-tabs">
            {tabs.map((tab) => (
              <button className={activeTab === tab ? 'is-active' : ''} key={tab} type="button" onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </nav>
          {activeTab === 'Overview' ? (
            <section className="production-workspace-detail-grid">
              <Field label="Project Information" value={`${request.projectCode} - ${request.projectName}`} />
              <Field label="Order Summary" value={`${request.orderCode}, ${request.items.length} production item(s)`} />
              <Field label="Assigned Production Staff" value={request.assignedToName ?? '-'} />
              <Field label="Request Note" value={request.note ?? '-'} />
              <Field label="Important Deadlines" value={`Start ${formatDate(request.estimatedStartDate)} / Complete ${formatDate(request.estimatedCompletionDate)}`} />
            </section>
          ) : null}
          {activeTab === 'Production Items' ? (
            <div className="production-workspace-table-wrap">
              <table className="production-workspace-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Product Version</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Material Note</th>
                    <th>Estimated Completion</th>
                    <th>Completed At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item) => (
                    <tr key={item.productionItemId}>
                      <td>{item.productNameSnapshot}</td>
                      <td>{item.productVersionNameSnapshot ?? '-'}</td>
                      <td>{item.quantity}</td>
                      <td><ProductionStatusBadge label={getProductionItemStatusLabel(item.status)} status={item.status} /></td>
                      <td>{item.materialNote ?? '-'}</td>
                      <td>{formatDate(item.estimatedCompletionDate)}</td>
                      <td>{formatDate(item.completedAt)}</td>
                      <td>
                        <div className="production-workspace-row-actions">
                          {item.status === 'PENDING' ? <button type="button">Start Item</button> : null}
                          {item.status === 'IN_PRODUCTION' ? <button type="button">Mark Completed</button> : null}
                          {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' ? <button className="is-secondary" type="button">Mark Blocked</button> : null}
                          {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' ? <button className="is-secondary" type="button">Cancel Item</button> : null}
                          <button className="is-secondary" type="button">Update Notes</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {activeTab === 'Files & Notes' ? (
            <section className="production-workspace-detail-grid">
              <Field label="Request Note" value={request.note ?? '-'} />
              <Field label="Cancellation Reason" value={request.cancellationReason ?? '-'} />
              <Field label="Production Files" value="Shop drawing package, approved proposal renders, and order item snapshots." />
              <Field label="Sales Notification Rule" value="Cancelled production items require a cancellation reason for order adjustment." />
            </section>
          ) : null}
          {activeTab === 'Timeline' ? (
            <section className="production-workspace-list">
              <TimelineItem label="Production request created" value={formatDate(request.createdAt)} />
              <TimelineItem label="Estimated start" value={formatDate(request.estimatedStartDate)} />
              <TimelineItem label="Actual start" value={formatDate(request.actualStartDate)} />
              <TimelineItem label="Estimated completion" value={formatDate(request.estimatedCompletionDate)} />
              <TimelineItem label="Actual completion" value={formatDate(request.actualCompletionDate)} />
            </section>
          ) : null}
        </article>
      </div>
    </ProductionLayout>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="production-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="production-workspace-queue-card">
      <strong>{label}</strong>
      <small>{value}</small>
    </div>
  );
}
