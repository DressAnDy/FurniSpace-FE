import { useEffect, useMemo, useState } from 'react';
import { IconClipboardCheck, IconNotes, IconPackage, IconTruckDelivery } from '@tabler/icons-react';

import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate } from '@/features/ProductionPages/utils';
import { getOrderServiceResultMessage, type OrderItemDto } from '@/services/api/orders';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import {
  useCompleteOrderDelivery,
  useOrderDetail,
  useProductionRequests,
  useProjectScheduleList,
  useStartOrderDelivery,
} from '@/services/queries';

export function ReadyForDelivery() {
  const [selectedProductionRequestId, setSelectedProductionRequestId] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const readyRequestsQuery = useProductionRequests({ status: 'COMPLETED' });
  const readyRequests = useMemo(() => readyRequestsQuery.data?.items ?? [], [readyRequestsQuery.data?.items]);
  const requestPageSize = 4;
  const requestPageCount = Math.max(Math.ceil(readyRequests.length / requestPageSize), 1);
  const pagedReadyRequests = useMemo(
    () => readyRequests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize),
    [readyRequests, requestPage],
  );
  const selectedRequest = readyRequests.find((request) => request.productionRequestId === selectedProductionRequestId) ?? readyRequests[0] ?? null;
  const orderDetailQuery = useOrderDetail(selectedRequest?.orderId, { enabled: Boolean(selectedRequest?.orderId) });
  const order = orderDetailQuery.data ?? null;
  const deliverySchedulesQuery = useProjectScheduleList(
    selectedRequest
      ? {
          limit: 20,
          page: 1,
          projectId: selectedRequest.projectId,
          scheduleType: 'DELIVERY',
        }
      : undefined,
  );
  const startDeliveryMutation = useStartOrderDelivery();
  const completeDeliveryMutation = useCompleteOrderDelivery();
  const deliverableItems = useMemo(
    () => (order?.items ?? []).filter((item) => (item.quantity ?? 0) > 0 && item.status !== 'UNAVAILABLE' && item.status !== 'CANCELLED'),
    [order?.items],
  );
  const deliverableItemGroups = useMemo(() => groupOrderItemsByName(deliverableItems), [deliverableItems]);
  const confirmedDeliverySchedule = deliverySchedulesQuery.data?.items.some((schedule) => schedule.status === 'CONFIRMED') ?? false;
  const readyCount = readyRequests.length;
  const deliveringCount = readyRequests.filter((request) => request.orderId === order?.orderId && order?.status === 'DELIVERING').length;

  useEffect(() => {
    if (!selectedProductionRequestId && readyRequests.length > 0) {
      setSelectedProductionRequestId(readyRequests[0].productionRequestId);
    }
  }, [readyRequests, selectedProductionRequestId]);

  useEffect(() => {
    setRequestPage((currentPage) => Math.min(currentPage, requestPageCount));
  }, [requestPageCount]);

  async function startDelivery() {
    if (!order) return;
    setMessage(null);

    try {
      await startDeliveryMutation.mutateAsync(order.orderId);
      setMessage({ tone: 'success', text: 'Delivery started. Complete delivery when the full order has arrived.' });
      void orderDetailQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  async function completeDelivery() {
    if (!order) return;
    setMessage(null);

    try {
      const result = await completeDeliveryMutation.mutateAsync(order.orderId);
      setMessage({ tone: 'success', text: `Delivery completed for ${result.deliveredItemCount} item(s). Waiting for customer confirmation.` });
      void orderDetailQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  return (
    <ProductionLayout activeLabel="Ready for Delivery" searchPlaceholder="Search ready production requests...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Ready for Delivery</h2>
            <p>Review completed production requests, start delivery when schedule is confirmed, and complete delivery for the full order.</p>
          </div>
        </section>

        {message ? <section className={`production-workspace-message production-workspace-message-${message.tone}`}>{message.text}</section> : null}
        {readyRequestsQuery.isError ? (
          <section className="production-workspace-message production-workspace-message-error">Cannot load completed production requests.</section>
        ) : null}
        {orderDetailQuery.isError ? (
          <section className="production-workspace-message production-workspace-message-error">{getOrderServiceResultMessage(orderDetailQuery.error)}</section>
        ) : null}
        {deliverySchedulesQuery.isError ? (
          <section className="production-workspace-message production-workspace-message-error">{getProjectScheduleServiceResultMessage(deliverySchedulesQuery.error)}</section>
        ) : null}

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconTruckDelivery} label="Ready Requests" value={readyCount} />
          <ProductionSummaryCard icon={IconPackage} label="Deliverable Items" value={deliverableItems.length} />
          <ProductionSummaryCard icon={IconNotes} label="Confirmed Schedules" value={deliverySchedulesQuery.data?.items.filter((schedule) => schedule.status === 'CONFIRMED').length ?? 0} />
          <ProductionSummaryCard icon={IconClipboardCheck} label="Delivering Orders" value={deliveringCount} />
        </section>

        <section className="production-workspace-grid production-ready-layout">
          <article className="production-workspace-card production-ready-request-card">
            <header>
              <div>
                <h3>Completed Production Requests</h3>
                <p>Select the completed production request tied to a delivery-ready order.</p>
              </div>
            </header>
            <div className="production-workspace-list">
              {readyRequestsQuery.isLoading ? <p className="production-workspace-muted">Loading completed requests...</p> : null}
              {!readyRequestsQuery.isLoading && readyRequests.length === 0 ? <p className="production-workspace-muted">No completed production request is ready for delivery yet.</p> : null}
              {pagedReadyRequests.map((request) => (
                <button
                  className={`production-workspace-queue-card ${request.productionRequestId === selectedRequest?.productionRequestId ? 'is-active' : ''}`}
                  key={request.productionRequestId}
                  type="button"
                  onClick={() => {
                    setSelectedProductionRequestId(request.productionRequestId);
                    setMessage(null);
                  }}
                >
                  <strong>
                    {request.projectName}
                    <span>{request.productionCode}</span>
                  </strong>
                  <p>{request.orderCode}</p>
                  <small>{request.productionItemCount ?? 0} item(s) - completed {formatDate(request.updatedAt)}</small>
                </button>
              ))}
            </div>
            {readyRequests.length > requestPageSize ? (
              <div className="production-ready-pagination">
                <button disabled={requestPage === 1} type="button" onClick={() => setRequestPage((page) => Math.max(page - 1, 1))}>
                  Previous
                </button>
                <span>{requestPage} / {requestPageCount}</span>
                <button disabled={requestPage === requestPageCount} type="button" onClick={() => setRequestPage((page) => Math.min(page + 1, requestPageCount))}>
                  Next
                </button>
              </div>
            ) : null}
          </article>

          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Delivery Control</h3>
                <p>Start delivery only after a confirmed delivery schedule exists.</p>
              </div>
              {order?.status ? <ProductionStatusBadge label={formatEnumLabel(order.status)} status={order.status} /> : null}
            </header>
            {selectedRequest && order ? (
              <div className="production-workspace-detail-grid">
                <Field label="Project" value={selectedRequest.projectName} />
                <Field label="Order" value={order.orderCode} />
                <Field label="Order status" value={formatEnumLabel(order.status ?? 'UNKNOWN')} />
                <Field label="Confirmed delivery schedule" value={confirmedDeliverySchedule ? 'Yes' : 'No'} />
              </div>
            ) : (
              <p className="production-workspace-muted">Select a completed request to control delivery.</p>
            )}
            <div className="production-workspace-row-actions">
              {order?.status === 'READY_FOR_DELIVERY' ? (
                <button
                  disabled={!confirmedDeliverySchedule || startDeliveryMutation.isPending}
                  type="button"
                  onClick={() => void startDelivery()}
                >
                  Start Delivery
                </button>
              ) : null}
              {order?.status === 'DELIVERING' ? (
                <button
                  disabled={completeDeliveryMutation.isPending}
                  type="button"
                  onClick={() => void completeDelivery()}
                >
                  {completeDeliveryMutation.isPending ? 'Completing...' : 'Complete Delivery'}
                </button>
              ) : null}
            </div>

            <div className="production-ready-deliverable-section">
              <header>
                <div>
                  <h3>Deliverable Items</h3>
                  <p>Delivery is completed once for the whole order. Item rows reflect backend delivery status.</p>
                </div>
              </header>
              <div className="production-workspace-table-wrap production-ready-items-wrap">
                <table className="production-workspace-table production-ready-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Ordered</th>
                      <th>Status</th>
                      <th>Delivered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetailQuery.isLoading ? (
                      <tr>
                        <td colSpan={4}>Loading order items...</td>
                      </tr>
                    ) : null}
                    {!orderDetailQuery.isLoading && deliverableItemGroups.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No deliverable product item is available.</td>
                      </tr>
                    ) : null}
                    {deliverableItemGroups.map((group) => (
                      <tr key={group.key}>
                        <td>{group.name}</td>
                        <td>{group.quantity}</td>
                        <td>{group.statusSummary}</td>
                        <td>{formatDate(group.deliveredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}

type OrderItemGroup = {
  deliveredAt?: string | null;
  items: OrderItemDto[];
  key: string;
  name: string;
  quantity: number;
  statusSummary: string;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="production-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? '-';
}

function groupOrderItemsByName(items: OrderItemDto[]): OrderItemGroup[] {
  const groupsByKey = new Map<string, OrderItemDto[]>();

  for (const item of items) {
    const key = getOrderItemName(item);
    const groupItems = groupsByKey.get(key);

    if (groupItems) {
      groupItems.push(item);
    } else {
      groupsByKey.set(key, [item]);
    }
  }

  return Array.from(groupsByKey.entries()).map(([key, groupItems]) => {
    const quantity = sumItemNumbers(groupItems, 'quantity');
    const deliveredDates = groupItems
      .map((item) => item.deliveredAt)
      .filter((value): value is string => Boolean(value))
      .sort();
    const latestDeliveredAt = deliveredDates[deliveredDates.length - 1];
    const statuses = Array.from(new Set(groupItems.map((item) => item.status ?? 'PENDING')));

    return {
      deliveredAt: latestDeliveredAt,
      items: groupItems,
      key,
      name: getOrderItemName(groupItems[0] ?? {}),
      quantity,
      statusSummary: statuses.map(formatEnumLabel).join(', '),
    };
  });
}

function sumItemNumbers(items: OrderItemDto[], field: 'quantity') {
  return items.reduce((total, item) => total + (item[field] ?? 0), 0);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
