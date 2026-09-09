import { useMemo, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';

import {
  ProductionEmptyState,
  ProductionLayout,
  ProductionStatusBadge,
} from '@/features/ProductionPages/productioncomponents';
import type { ProductionItem, ProductionRequestStatus } from '@/features/ProductionPages/types';
import { OperationalDelayPanel } from '@/features/operationalDelayReports/OperationalDelayPanel';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';
import { ProjectPhaseTimelineCard } from '@/features/projectPhaseDeadlines/ProjectPhaseTimelineCard';
import { getProductionServiceResultMessage } from '@/services/api/production';
import {
  useCompleteProductionRequest,
  useProductionRequestDetail,
  useStartProductionRequest,
  useUpdateProductionItemStatus,
} from '@/services/queries';

const tabs = ['Overview', 'Production Items'] as const;
type DetailTab = (typeof tabs)[number];

export function ProductionRequestDetail() {
  const { productionRequestId } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const requestQuery = useProductionRequestDetail(productionRequestId);
  const startMutation = useStartProductionRequest();
  const completeMutation = useCompleteProductionRequest();
  const itemStatusMutation = useUpdateProductionItemStatus();
  const request = requestQuery.data ?? null;
  const productionItems = useMemo(() => sortProductionItems(request?.items ?? []), [request?.items]);
  const canUpdateProductionItems = canUpdateProductionItemsForRequest(request?.status);

  if (requestQuery.isLoading) {
    return (
      <ProductionLayout activeLabel="Production Requests">
        <ProductionEmptyState message="Loading production request..." />
      </ProductionLayout>
    );
  }

  if (!request || requestQuery.isError) {
    return (
      <ProductionLayout activeLabel="Production Requests">
        <ProductionEmptyState message={requestQuery.isError ? getProductionServiceResultMessage(requestQuery.error) : 'Production request was not found.'} />
      </ProductionLayout>
    );
  }

  async function runRequestAction(action: 'start' | 'complete') {
    if (!request) return;

    setMessage(null);

    try {
      if (action === 'start') {
        await startMutation.mutateAsync({ productionRequestId: request.productionRequestId });
        setMessage({ tone: 'success', text: 'Production request started.' });
      } else {
        await completeMutation.mutateAsync(request.productionRequestId);
        setMessage({ tone: 'success', text: 'Production completed and order moved to delivery readiness.' });
      }
    } catch (error) {
      setMessage({ tone: 'error', text: getProductionServiceResultMessage(error) });
    }
  }

  async function startProductionItem(item: ProductionItem) {
    if (!canUpdateProductionItems) {
      setMessage({ tone: 'error', text: 'Start this production request before updating production items.' });
      return;
    }

    if (item.status !== 'PENDING') {
      return;
    }

    setMessage(null);

    try {
      await itemStatusMutation.mutateAsync({
        cancellationReason: null,
        productionItemId: item.productionItemId,
        productionNote: null,
        status: 'IN_PRODUCTION',
      });

      setMessage({
        tone: 'success',
        text: `${item.quantity} production item quantity started.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: getProductionServiceResultMessage(error) });
    }
  }

  async function completeProductionItem(item: ProductionItem) {
    if (!canUpdateProductionItems) {
      setMessage({ tone: 'error', text: 'Start this production request before updating production items.' });
      return;
    }

    if (item.status !== 'IN_PRODUCTION') {
      return;
    }

    setMessage(null);

    try {
      await itemStatusMutation.mutateAsync({
        cancellationReason: null,
        productionItemId: item.productionItemId,
        productionNote: null,
        status: 'COMPLETED',
      });

      setMessage({
        tone: 'success',
        text: `${item.quantity} production item quantity completed.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: getProductionServiceResultMessage(error) });
    }
  }

  const allItemsResolved = request.items.every((item) => item.status === 'COMPLETED' || item.status === 'CANCELLED');

  return (
    <ProductionLayout activeLabel="Production Requests" searchPlaceholder="Search production request detail...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>{request.productionCode}</span>
            <h2>{request.projectName}</h2>
            <p>{request.orderCode} - {request.note ?? 'No request note provided.'}</p>
          </div>
          <div className="production-workspace-actions">
            <Link
              className="production-workspace-action-link production-workspace-button-secondary"
              to={`/production/chat?projectId=${encodeURIComponent(request.projectId)}&productionRequestId=${encodeURIComponent(request.productionRequestId)}`}
            >
              Open Chat
            </Link>
            {request.status === 'PENDING' ? (
              <button className="production-workspace-button" disabled={startMutation.isPending} type="button" onClick={() => void runRequestAction('start')}>
                Start
              </button>
            ) : null}
            {request.status === 'IN_PRODUCTION' ? (
              <button className="production-workspace-button" disabled={!allItemsResolved || completeMutation.isPending} type="button" onClick={() => void runRequestAction('complete')}>
                Complete
              </button>
            ) : null}
            <Link className="production-workspace-action-link production-workspace-button-secondary" to="/production/requests">
              <IconArrowLeft size={16} />
              Back
            </Link>
          </div>
        </section>

        {message ? <section className={`production-workspace-message production-workspace-message-${message.tone}`}>{message.text}</section> : null}

        <section className="production-workspace-card">
          <div className="production-workspace-meta">
            <Meta label="Status" value={<ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} />} />
            <Meta label="Priority" value={request.priority} />
            <Meta label="Assigned Staff" value={request.assignedToName ?? '-'} />
            <Meta label="Production Deadline" value={formatDate(request.productionDeadline)} />
            <Meta label="Actual Start Date" value={formatDate(request.actualStartDate)} />
            <Meta label="Actual Completion Date" value={formatDate(request.actualCompletionDate)} />
            <Meta label="Order Code" value={request.orderCode} />
          </div>
        </section>

        <ProjectPhaseTimelineCard
          projectId={request.projectId}
          phases={['PRODUCTION', 'DELIVERY']}
          title="Production Timeline"
          description="Production and delivery phase deadlines for this assigned project."
          emptyText="No production deadline has been planned yet."
        />

        <OperationalDelayPanel
          allowedPhases={['PRODUCTION']}
          defaultPhase="PRODUCTION"
          productionRequestId={request.productionRequestId}
          projectId={request.projectId}
          title="Production delay history"
        />

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
              <Field label="Order Summary" value={`${request.orderCode}, ${request.items.length} production line(s)`} />
              <Field label="Assigned Production Staff" value={request.assignedToName ?? '-'} />
              <Field label="Request Note" value={request.note ?? '-'} />
              <Field label="Production Deadline" value={formatDate(request.productionDeadline)} />
              <Field label="Created" value={formatDate(request.createdAt)} />
              <Field label="Actual Timeline" value={`Start ${formatDate(request.actualStartDate)} / Complete ${formatDate(request.actualCompletionDate)}`} />
              <Field label="Cancellation Reason" value={request.cancellationReason ?? '-'} />
            </section>
          ) : null}
          {activeTab === 'Production Items' ? (
            <div className="production-workspace-table-wrap">
              {!canUpdateProductionItems ? (
                <p className="production-workspace-muted">Start this production request before updating production items.</p>
              ) : null}
              <table className="production-workspace-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Product Version</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Start At</th>
                    <th>Completed At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productionItems.map((item) => (
                    <tr key={item.productionItemId}>
                      <td>
                        <strong>{item.productNameSnapshot}</strong>
                      </td>
                      <td>{item.productVersionNameSnapshot ?? '-'}</td>
                      <td>{item.quantity}</td>
                      <td><ProductionStatusBadge label={getProductionItemStatusLabel(item.status)} status={item.status} /></td>
                      <td>{formatDate(getProductionItemStartAt(item))}</td>
                      <td>{formatDate(item.completedAt)}</td>
                      <td>
                        <div className="production-workspace-row-actions">
                          {item.status === 'PENDING' ? (
                            <button disabled={itemStatusMutation.isPending || !canUpdateProductionItems} type="button" onClick={() => void startProductionItem(item)}>Start Item</button>
                          ) : item.status === 'IN_PRODUCTION' ? (
                            <button disabled={itemStatusMutation.isPending || !canUpdateProductionItems} type="button" onClick={() => void completeProductionItem(item)}>Complete Item</button>
                          ) : (
                            <span className="production-workspace-muted">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

function sortProductionItems(items: ProductionItem[]) {
  return [...items].sort(
    (first, second) =>
      first.productNameSnapshot.localeCompare(second.productNameSnapshot)
      || first.productionItemId.localeCompare(second.productionItemId),
  );
}

function getProductionItemStartAt(item: ProductionItem) {
  return item.startAt ?? item.startedAt;
}

function canUpdateProductionItemsForRequest(status?: ProductionRequestStatus | null) {
  return status === 'IN_PRODUCTION';
}
