import { useMemo, useState } from 'react';
import { IconCreditCard, IconEye } from '@tabler/icons-react';

import { PaymentCollectionModal } from '@/features/payments';
import { getOrderServiceResultMessage, type OrderListItemDto, type OrderStatus } from '@/services/api/orders';
import type { PaymentDetailDto } from '@/services/api/payments';
import {
  useCreateOrderDepositPayment,
  useCreateOrderRemainingPayment,
  useOrderDetail,
  useProjectOrders,
} from '@/services/queries';

type OrdersTabProps = {
  projectId: string;
};

export function OrdersTab({ projectId }: OrdersTabProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentDetailDto | null>(null);
  const [message, setMessage] = useState('');
  const ordersQuery = useProjectOrders(projectId);
  const selectedOrderQuery = useOrderDetail(selectedOrderId ?? undefined, { enabled: Boolean(selectedOrderId) });
  const createDepositPaymentMutation = useCreateOrderDepositPayment();
  const createRemainingPaymentMutation = useCreateOrderRemainingPayment();
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const selectedOrder = selectedOrderQuery.data;

  async function handleCreatePayment(order: OrderListItemDto) {
    setSelectedOrderId(order.orderId);
    setMessage('');

    try {
      const result =
        order.status === 'DEPOSIT_PENDING'
          ? await createDepositPaymentMutation.mutateAsync({
              orderId: order.orderId,
              note: 'Deposit payment created from sales order tab.',
            })
          : await createRemainingPaymentMutation.mutateAsync({
              orderId: order.orderId,
              note: 'Remaining payment created from sales order tab.',
            });

      setPayment(result);
    } catch (error) {
      setMessage(getOrderServiceResultMessage(error));
    }
  }

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
                    <strong>{order.orderCode}</strong>
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
                  {canCreatePayment(order.status) ? (
                    <button
                      type="button"
                      disabled={createDepositPaymentMutation.isPending || createRemainingPaymentMutation.isPending}
                      onClick={() => void handleCreatePayment(order)}
                    >
                      <IconCreditCard size={16} />
                      <span>{getPaymentActionLabel(order.status)}</span>
                    </button>
                  ) : null}
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
                    <h4>{selectedOrder.orderCode}</h4>
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
                  {selectedOrder.items.map((item) => (
                    <article key={item.orderItemId}>
                      <div>
                        <strong>{item.itemName ?? item.productNameSnapshot ?? 'Order item'}</strong>
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

      {message ? <p className="project-detail-form-message project-detail-form-message-error">{message}</p> : null}

      <PaymentCollectionModal
        payment={payment}
        title={payment?.paymentType === 'DEPOSIT' ? 'Collect Deposit' : 'Collect Remaining Payment'}
        onClose={() => setPayment(null)}
        onPaid={() => {
          void ordersQuery.refetch();
          void selectedOrderQuery.refetch();
        }}
      />
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

function canCreatePayment(status?: OrderStatus | null) {
  return status === 'DEPOSIT_PENDING' || status === 'FINAL_PAYMENT_PENDING';
}

function getPaymentActionLabel(status?: OrderStatus | null) {
  if (status === 'DEPOSIT_PENDING') return 'Pay Deposit';
  if (status === 'FINAL_PAYMENT_PENDING') return 'Pay Remaining';

  return 'Collect Payment';
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
