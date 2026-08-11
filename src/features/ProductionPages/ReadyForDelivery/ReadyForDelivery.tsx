import { useEffect, useMemo, useState } from 'react';
import { IconClipboardCheck, IconNotes, IconPackage, IconTruckDelivery } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';
import { getOrderServiceResultMessage, type OrderItemDto } from '@/services/api/orders';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import {
  useOrderDetail,
  useProductionRequests,
  useProjectScheduleList,
  useStartOrderDelivery,
  useUpdateOrderItemDeliveredQuantity,
} from '@/services/queries';

export function ReadyForDelivery() {
  const [selectedProductionRequestId, setSelectedProductionRequestId] = useState('');
  const [deliveredQuantityInputs, setDeliveredQuantityInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const readyRequestsQuery = useProductionRequests({ status: 'COMPLETED' });
  const readyRequests = useMemo(() => readyRequestsQuery.data?.items ?? [], [readyRequestsQuery.data?.items]);
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
  const deliveredQuantityMutation = useUpdateOrderItemDeliveredQuantity();
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

  async function startDelivery() {
    if (!order) return;
    setMessage(null);

    try {
      await startDeliveryMutation.mutateAsync(order.orderId);
      setMessage({ tone: 'success', text: 'Delivery started. You can now update delivered quantity.' });
      void orderDetailQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  async function updateDeliveredQuantityGroup(group: OrderItemGroup, increment: number) {
    setMessage(null);

    if (!Number.isFinite(increment) || increment <= 0) {
      setMessage({ tone: 'error', text: 'Delivered quantity must be greater than 0.' });
      return;
    }

    if (increment > group.remainingQuantity) {
      setMessage({ tone: 'error', text: 'Delivered quantity cannot exceed remaining quantity.' });
      return;
    }

    try {
      let remainingIncrement = increment;

      for (const item of group.items) {
        if (remainingIncrement <= 0) break;

        const itemRemainingQuantity = Math.max((item.quantity ?? 0) - (item.deliveredQuantity ?? 0), 0);

        if (itemRemainingQuantity <= 0) continue;

        const itemIncrement = Math.min(itemRemainingQuantity, remainingIncrement);

        await deliveredQuantityMutation.mutateAsync({
          deliveredQuantityIncrement: itemIncrement,
          deliveryNote: 'Delivered by production staff.',
          orderItemId: item.orderItemId,
        });

        remainingIncrement -= itemIncrement;
      }

      setMessage({ tone: 'success', text: 'Delivered quantity updated.' });
      setDeliveredQuantityInputs((current) => ({ ...current, [group.key]: '' }));
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
            <p>Review completed production requests, start delivery when schedule is confirmed, and update delivered quantity per order item.</p>
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

        <section className="production-workspace-grid">
          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Completed Production Requests</h3>
                <p>Select the completed production request tied to a delivery-ready order.</p>
              </div>
            </header>
            <div className="production-workspace-list">
              {readyRequestsQuery.isLoading ? <p className="production-workspace-muted">Loading completed requests...</p> : null}
              {!readyRequestsQuery.isLoading && readyRequests.length === 0 ? <p className="production-workspace-muted">No completed production request is ready for delivery yet.</p> : null}
              {readyRequests.map((request) => (
                <button
                  className={`production-workspace-queue-card ${request.productionRequestId === selectedRequest?.productionRequestId ? 'is-active' : ''}`}
                  key={request.productionRequestId}
                  type="button"
                  onClick={() => {
                    setSelectedProductionRequestId(request.productionRequestId);
                    setMessage(null);
                  }}
                >
                  <strong>{request.productionCode}</strong>
                  <p>{request.projectName} - {request.orderCode}</p>
                  <small>{request.productionItemCount ?? 0} item(s) - completed {formatDate(request.updatedAt)}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Delivery Control</h3>
                <p>Start delivery only after a confirmed delivery schedule exists.</p>
              </div>
              {selectedRequest ? <ProductionStatusBadge label={getProductionRequestStatusLabel(selectedRequest.status)} status={selectedRequest.status} /> : null}
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
              <button
                disabled={!order || order.status !== 'READY_FOR_DELIVERY' || !confirmedDeliverySchedule || startDeliveryMutation.isPending}
                type="button"
                onClick={() => void startDelivery()}
              >
                Start Delivery
              </button>
              {selectedRequest ? <Link className="is-secondary" to={`/production/requests/${selectedRequest.productionRequestId}`}>View Production Detail</Link> : null}
            </div>
          </article>
        </section>

        <article className="production-workspace-card">
          <header>
            <div>
              <h3>Update Delivered Quantity</h3>
              <p>Available when the order is DELIVERING. Customer confirms each item after full quantity is delivered.</p>
            </div>
          </header>
          <div className="production-workspace-table-wrap">
            <table className="production-workspace-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Ordered</th>
                  <th>Delivered</th>
                  <th>Status</th>
                  <th>Last Delivered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orderDetailQuery.isLoading ? (
                  <tr>
                    <td colSpan={6}>Loading order items...</td>
                  </tr>
                ) : null}
                {!orderDetailQuery.isLoading && deliverableItemGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No deliverable product item is available.</td>
                  </tr>
                ) : null}
                {deliverableItemGroups.map((group) => (
                  <tr key={group.key}>
                    <td>{group.name}</td>
                    <td>{group.quantity}</td>
                    <td>{group.deliveredQuantity}</td>
                    <td>{group.statusSummary}</td>
                    <td>{formatDate(group.lastDeliveredAt)}</td>
                    <td>
                      <div className="production-workspace-row-actions">
                        <input
                          className="production-workspace-quantity-input"
                          disabled={order?.status !== 'DELIVERING' || group.remainingQuantity <= 0}
                          inputMode="numeric"
                          min="1"
                          max={group.remainingQuantity}
                          placeholder={`Max ${group.remainingQuantity}`}
                          type="number"
                          value={deliveredQuantityInputs[group.key] ?? ''}
                          onChange={(event) => setDeliveredQuantityInputs((current) => ({ ...current, [group.key]: event.target.value }))}
                        />
                        <button
                          disabled={
                            order?.status !== 'DELIVERING'
                            || deliveredQuantityMutation.isPending
                            || group.remainingQuantity <= 0
                          }
                          type="button"
                          onClick={() => void updateDeliveredQuantityGroup(group, normalizePositiveInteger(deliveredQuantityInputs[group.key]))}
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </ProductionLayout>
  );
}

type OrderItemGroup = {
  deliveredQuantity: number;
  items: OrderItemDto[];
  key: string;
  lastDeliveredAt?: string | null;
  name: string;
  quantity: number;
  remainingQuantity: number;
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
    const deliveredQuantity = sumItemNumbers(groupItems, 'deliveredQuantity');
    const deliveredDates = groupItems
      .map((item) => item.lastDeliveredAt)
      .filter((value): value is string => Boolean(value))
      .sort();
    const latestDeliveredAt = deliveredDates[deliveredDates.length - 1];
    const statuses = Array.from(new Set(groupItems.map((item) => item.status ?? 'PENDING')));

    return {
      deliveredQuantity,
      items: groupItems,
      key,
      lastDeliveredAt: latestDeliveredAt,
      name: getOrderItemName(groupItems[0] ?? {}),
      quantity,
      remainingQuantity: Math.max(quantity - deliveredQuantity, 0),
      statusSummary: statuses.map(formatEnumLabel).join(', '),
    };
  });
}

function sumItemNumbers(items: OrderItemDto[], field: 'deliveredQuantity' | 'quantity') {
  return items.reduce((total, item) => total + (item[field] ?? 0), 0);
}

function normalizePositiveInteger(value?: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
