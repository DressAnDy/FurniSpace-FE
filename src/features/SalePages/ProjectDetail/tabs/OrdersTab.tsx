import { useMemo, useState } from 'react';
import { IconEye } from '@tabler/icons-react';

import { getOrderServiceResultMessage, type OrderItemDto, type OrderStatus } from '@/services/api/orders';
import { useOrderDetail, useProjectOrders } from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

type OrdersTabProps = {
  projectId: string;
};

export function OrdersTab({ projectId }: OrdersTabProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const ordersQuery = useProjectOrders(projectId);
  const selectedOrderQuery = useOrderDetail(selectedOrderId ?? undefined, { enabled: Boolean(selectedOrderId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const selectedOrder = selectedOrderQuery.data;
  const selectedOrderItems = useMemo(() => aggregateDuplicateItems(selectedOrder?.items ?? []), [selectedOrder?.items]);

  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-orders-card">
      <header className="project-detail-card-toolbar">
        <div>
          <h3>Orders</h3>
          <p>Orders are created after the customer accepts a quotation.</p>
        </div>
        <span className="project-detail-small-badge">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
      </header>

      {ordersQuery.isLoading ? <p className="project-detail-muted">Loading orders...</p> : null}
      {ordersQuery.isError ? (
        <p className="project-detail-form-message project-detail-form-message-error">
          {getOrderServiceResultMessage(ordersQuery.error)}
        </p>
      ) : null}
      {!ordersQuery.isLoading && orders.length === 0 ? (
        <p className="project-detail-api-note">No order has been created for this project yet. The backend creates it when a quotation is accepted.</p>
      ) : null}

      {orders.length > 0 ? (
        <div className="project-detail-orders-layout">
          <div className="project-detail-orders-list">
            {orders.map((order) => (
              <article
                key={order.orderId}
                className={selectedOrderId === order.orderId ? 'project-detail-order-row project-detail-order-row-active' : 'project-detail-order-row'}
              >
                <div className="project-detail-order-main">
                  <div>
                    <strong title={order.orderCode}>{formatOrderCode(order.orderCode)}</strong>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="project-detail-order-money-grid">
                  <OrderMoney label="Total" value={order.originalTotalAmount} />
                  <OrderMoney label="Deposit" value={order.depositAmount} />
                  <OrderMoney label="Paid" value={order.paidAmount} />
                  <OrderMoney label="Remaining" value={order.remainingAmount} />
                </div>
                <div className="project-detail-order-actions">
                  <button type="button" onClick={() => setSelectedOrderId(order.orderId)}>
                    <IconEye size={16} />
                    <span>View</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="project-detail-order-detail-panel">
            {!selectedOrderId ? <p className="project-detail-muted">Select an order to see item detail.</p> : null}
            {selectedOrderQuery.isLoading ? <p className="project-detail-muted">Loading order detail...</p> : null}
            {selectedOrderQuery.isError ? (
              <p className="project-detail-form-message project-detail-form-message-error">
                {getOrderServiceResultMessage(selectedOrderQuery.error)}
              </p>
            ) : null}
            {selectedOrder ? (
              <>
                <div className="project-detail-order-detail-header">
                  <div>
                    <h4 title={selectedOrder.orderCode}>{formatOrderCode(selectedOrder.orderCode)}</h4>
                    <p>Quotation {selectedOrder.quotationId}</p>
                  </div>
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
                <div className="project-detail-order-detail-summary">
                  <OrderMoney label="Final total" value={selectedOrder.finalTotalAmount} />
                  <OrderMoney label="Deposit" value={selectedOrder.depositAmount} />
                  <OrderMoney label="Paid" value={selectedOrder.paidAmount} />
                  <OrderMoney label="Remaining" value={selectedOrder.remainingAmount} />
                </div>
                <div className="project-detail-order-items">
                  {selectedOrderItems.map((item) => (
                    <article key={item.orderItemId}>
                      <div>
                        <strong>{getOrderItemName(item)}</strong>
                        <span>{formatStatusLabel(item.itemType)}{item.isCustomized ? ' - Customized' : ''}</span>
                      </div>
                      <div>
                        <strong>{formatMoney(item.subtotalAmount)}</strong>
                        <span>{item.quantity ?? 0} x {formatMoney(item.unitPrice)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function OrderMoney({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="project-detail-order-money">
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
    </div>
  );
}

function OrderStatusBadge({ status }: { status?: OrderStatus | null }) {
  return <span className={`project-detail-order-status project-detail-order-status-${(status ?? 'CREATED').toLowerCase()}`}>{formatStatusLabel(status)}</span>;
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? 'Order item';
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatStatusLabel(value?: string | null) {
  if (!value) return '-';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatOrderCode(value?: string | null) {
  if (!value) return '-';

  const [, suffix] = value.split('-', 2);
  return (suffix || value).slice(0, 6);
}
