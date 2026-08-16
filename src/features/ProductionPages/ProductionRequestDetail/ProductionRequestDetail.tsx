import { useMemo, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';

import {
  ProductionEmptyState,
  ProductionLayout,
  ProductionStatusBadge,
} from '@/features/ProductionPages/productioncomponents';
import type { ProductionItem, ProductionItemStatus, ProductionRequestStatus } from '@/features/ProductionPages/types';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';
import { getProductionServiceResultMessage } from '@/services/api/production';
import {
  useCompleteProductionRequest,
  useMarkProductionRequestFeasible,
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
  const markFeasibleMutation = useMarkProductionRequestFeasible();
  const startMutation = useStartProductionRequest();
  const completeMutation = useCompleteProductionRequest();
  const itemStatusMutation = useUpdateProductionItemStatus();
  const request = requestQuery.data ?? null;
  const groupedItems = useMemo(() => groupProductionItems(request?.items ?? []), [request?.items]);
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

  async function runRequestAction(action: 'feasible' | 'start' | 'complete') {
    if (!request) return;

    setMessage(null);

    try {
      if (action === 'feasible') {
        await markFeasibleMutation.mutateAsync({ productionRequestId: request.productionRequestId, note: 'Materials are feasible.' });
        setMessage({ tone: 'success', text: 'Production request marked feasible.' });
      } else if (action === 'start') {
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

  async function startItemGroup(group: ProductionItemGroup) {
    if (!canUpdateProductionItems) {
      setMessage({ tone: 'error', text: 'Start this production request before updating production items.' });
      return;
    }

    if (group.status !== 'PENDING') {
      return;
    }

    setMessage(null);

    try {
      for (const item of group.items) {
        await itemStatusMutation.mutateAsync({
          cancellationReason: null,
          productionItemId: item.productionItemId,
          productionNote: null,
          status: 'IN_PRODUCTION',
        });
      }

      setMessage({
        tone: 'success',
        text: `${group.totalQuantity} production item quantity started.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: getProductionServiceResultMessage(error) });
    }
  }

  async function completeItemGroup(group: ProductionItemGroup) {
    if (!canUpdateProductionItems) {
      setMessage({ tone: 'error', text: 'Start this production request before updating production items.' });
      return;
    }

    const inProductionItems = group.items.filter((item) => item.status === 'IN_PRODUCTION');

    if (inProductionItems.length === 0) {
      return;
    }

    setMessage(null);

    try {
      for (const item of inProductionItems) {
        await itemStatusMutation.mutateAsync({
          cancellationReason: null,
          productionItemId: item.productionItemId,
          productionNote: null,
          status: 'COMPLETED',
        });
      }

      const completedQuantity = inProductionItems.reduce((total, item) => total + item.quantity, 0);

      setMessage({
        tone: 'success',
        text: `${completedQuantity} production item quantity completed.`,
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
            {request.status === 'PENDING_REVIEW' ? (
              <button className="production-workspace-button" disabled={markFeasibleMutation.isPending} type="button" onClick={() => void runRequestAction('feasible')}>
                Mark Feasible
              </button>
            ) : null}
            {request.status === 'FEASIBLE' ? (
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
                    <th>Material Note</th>
                    <th>Estimated Completion</th>
                    <th>Completed At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedItems.map((group) => (
                    <tr key={group.key}>
                      <td>
                        <strong>{group.productName}</strong>
                        {group.items.length > 1 ? <small>{group.items.length} matching record(s)</small> : null}
                      </td>
                      <td>{group.productVersionName}</td>
                      <td>{group.totalQuantity}</td>
                      <td><ProductionStatusBadge label={getProductionItemStatusLabel(group.status)} status={group.status} /></td>
                      <td>{group.materialNote}</td>
                      <td>{formatDate(group.estimatedCompletionDate)}</td>
                      <td>{formatDate(group.completedAt)}</td>
                      <td>
                        <div className="production-workspace-row-actions">
                          {group.status === 'PENDING' ? (
                            <button disabled={itemStatusMutation.isPending || !canUpdateProductionItems} type="button" onClick={() => void startItemGroup(group)}>Start Items</button>
                          ) : group.status === 'IN_PRODUCTION' ? (
                            <button disabled={itemStatusMutation.isPending || !canUpdateProductionItems} type="button" onClick={() => void completeItemGroup(group)}>Complete Items</button>
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

type ProductionItemGroup = {
  completedAt?: string;
  estimatedCompletionDate?: string;
  items: ProductionItem[];
  key: string;
  materialNote: string;
  productName: string;
  productVersionName: string;
  status: ProductionItemStatus;
  totalQuantity: number;
};

function groupProductionItems(items: ProductionItem[]): ProductionItemGroup[] {
  const groupsByKey = new Map<string, ProductionItemGroup>();

  for (const item of items) {
    const key = [
      item.productVersionId ?? item.productVersionNameSnapshot ?? item.productNameSnapshot,
      item.productNameSnapshot,
      item.productVersionNameSnapshot ?? '-',
    ].join('|');
    const existingGroup = groupsByKey.get(key);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalQuantity += item.quantity;
      continue;
    }

    groupsByKey.set(key, {
      completedAt: item.completedAt,
      estimatedCompletionDate: item.estimatedCompletionDate,
      items: [item],
      key,
      materialNote: item.materialNote ?? '-',
      productName: item.productNameSnapshot,
      productVersionName: item.productVersionNameSnapshot ?? '-',
      status: item.status,
      totalQuantity: item.quantity,
    });
  }

  return Array.from(groupsByKey.values());
}

function canUpdateProductionItemsForRequest(status?: ProductionRequestStatus | null) {
  return status === 'IN_PRODUCTION';
}
