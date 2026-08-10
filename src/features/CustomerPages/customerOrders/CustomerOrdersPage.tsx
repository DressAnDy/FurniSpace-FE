import {
  IconChevronRight,
  IconHome
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto, type OrderStatus } from '@/services/api/orders';
import type { PaymentDetailDto } from '@/services/api/payments';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useConfirmOrderItemDelivery,
  useCreateOrderDepositPayment,
  useOrderDetail,
  usePayments,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';
import { PaymentCollectionModal } from '@/features/payments/PaymentCollectionModal';

import './CustomerOrdersPage.css';

const orderProjectStatuses = new Set([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

export function CustomerOrdersPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activePayment, setActivePayment] = useState<PaymentDetailDto | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const orderProjects = useMemo(() => getOrderProjects(projects), [projects]);
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const remainingPaymentsQuery = usePayments(
    { orderId: selectedOrderId, paymentType: 'REMAINING_PAYMENT', status: 'PENDING' },
    { enabled: Boolean(selectedOrderId) },
  );
  const depositMutation = useCreateOrderDepositPayment();
  const confirmDeliveryMutation = useConfirmOrderItemDelivery();

  useEffect(() => {
    if (!selectedProjectId && orderProjects.length > 0) {
      setSelectedProjectId(orderProjects[0].projectId);
    }
  }, [orderProjects, selectedProjectId]);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].orderId);
      return;
    }

    if (selectedOrderId && !orders.some((item) => item.orderId === selectedOrderId)) {
      setSelectedOrderId(orders[0]?.orderId ?? '');
    }
  }, [orders, selectedOrderId]);

  async function createDepositPayment() {
    if (!order) return;

    setMessage(null);

    try {
      const payment = await depositMutation.mutateAsync({ orderId: order.orderId, note: 'Customer deposit payment.' });

      setActivePayment(payment);
      setMessage({ tone: 'success', text: 'Deposit payment is ready.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  return (
    <main className="customer-orders-page">
      <CustomerNavbar activeLabel="Orders" classPrefix="customer-orders" />

      <div className="customer-orders-main">
        <div className="customer-orders-breadcrumb">
          <Link to="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </Link>
          <IconChevronRight size={16} stroke={1.8} />
          <span>Orders</span>
        </div>

        <section className="customer-orders-heading">
          <div>
            <h1>Orders</h1>
            <p>Track confirmed orders, deposit payments, production progress, and remaining payment.</p>
          </div>
        </section>

        {message ? <section className={`customer-orders-message customer-orders-message-${message.tone}`}>{message.text}</section> : null}
        {projectsQuery.isError ? <section className="customer-orders-message customer-orders-message-error">Cannot load your projects.</section> : null}
        {ordersQuery.isError ? (
          <section className="customer-orders-message customer-orders-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section>
        ) : null}

        <section className="customer-orders-layout">
          <aside className="customer-orders-panel">
            <header>
              <h2>Projects</h2>
            </header>
            {projectsQuery.isLoading ? <p className="customer-orders-muted">Loading projects...</p> : null}
            {!projectsQuery.isLoading && orderProjects.length === 0 ? <p className="customer-orders-muted">No order is available yet.</p> : null}
            <div className="customer-orders-project-list">
              {orderProjects.map((project) => (
                <button
                  className={project.projectId === selectedProjectId ? 'is-active' : ''}
                  key={project.projectId}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.projectId);
                    setSelectedOrderId('');
                    setActivePayment(null);
                    setMessage(null);
                  }}
                >
                  <strong>{project.projectName}</strong>
                  <span>{project.projectCode}</span>
                  <em>{formatEnumLabel(project.status)}</em>
                </button>
              ))}
            </div>
          </aside>

          <section className="customer-orders-workspace">
            {order ? (
              <OrderDetailCard
                confirmingDeliveryItemId={confirmDeliveryMutation.variables ?? null}
                depositPending={depositMutation.isPending}
                order={order}
                remainingPayment={remainingPaymentsQuery.data?.items?.[0] ?? null}
                onConfirmDelivery={async (orderItemId) => {
                  setMessage(null);

                  try {
                    await confirmDeliveryMutation.mutateAsync(orderItemId);
                    setMessage({ tone: 'success', text: 'Delivery confirmed for this item.' });
                    void orderDetailQuery.refetch();
                    void ordersQuery.refetch();
                    void projectsQuery.refetch();
                  } catch (error) {
                    setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                  }
                }}
                onCreateDeposit={() => void createDepositPayment()}
                onOpenRemainingPayment={(payment) => setActivePayment(payment)}
              />
            ) : null}

            <PaymentCollectionModal
              completionDescription="Your payment has been confirmed. The order status will be refreshed automatically."
              completionTitle="Payment Successful"
              continueLabel="Back to Orders"
              payment={activePayment}
              title="Order Payment"
              onClose={() => setActivePayment(null)}
              onPaid={() => void orderDetailQuery.refetch()}
            />
          </section>
        </section>
      </div>
    </main>
  );
}

function OrderDetailCard({
  confirmingDeliveryItemId,
  depositPending,
  onConfirmDelivery,
  onCreateDeposit,
  onOpenRemainingPayment,
  order,
  remainingPayment,
}: {
  confirmingDeliveryItemId: string | null;
  depositPending: boolean;
  onConfirmDelivery: (orderItemId: string) => Promise<void>;
  onCreateDeposit: () => void;
  onOpenRemainingPayment: (payment: PaymentDetailDto) => void;
  order: OrderDetailDto;
  remainingPayment: PaymentDetailDto | null;
}) {
  const orderItems = order.items;

  return (
    <section className="customer-orders-card customer-orders-detail">
      <header>
        <div>
          <h2 title={order.orderCode}>{formatOrderCode(order.orderCode)}</h2>
        </div>
        <span className={`customer-orders-status customer-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>

      <div className="customer-orders-money-grid">
        <MoneyValue label="Final Total" value={formatMoney(order.finalTotalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
      </div>

      <div className="customer-orders-actions">
        <button disabled={order.status !== 'DEPOSIT_PENDING' || depositPending} type="button" onClick={onCreateDeposit}>
          {depositPending ? 'Preparing...' : 'Pay Deposit'}
        </button>
        <button disabled={order.status !== 'FINAL_PAYMENT_PENDING' || !remainingPayment} type="button" onClick={() => remainingPayment && onOpenRemainingPayment(remainingPayment)}>
          Pay Remaining
        </button>
      </div>

      <div className="customer-orders-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Customization</th>
              <th>Gross</th>
              <th>Discount</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Delivery</th>
              <th>Confirmation</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.orderItemId}>
                <td>{getOrderItemName(item)}</td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(getCustomizationUnitAdditionalCost(item))}</td>
                <td>{formatMoney(item.grossAmount ?? item.subtotalAmount)}</td>
                <td>{formatMoney(item.discountAmount)}</td>
                <td>{formatMoney(item.taxAmount)}</td>
                <td>{formatMoney(item.totalAmount ?? item.subtotalAmount)}</td>
                <td>{formatDeliveryState(item)}</td>
                <td>
                  {canConfirmDelivery(item) ? (
                    <button
                      disabled={confirmingDeliveryItemId === item.orderItemId}
                      type="button"
                      onClick={() => void onConfirmDelivery(item.orderItemId)}
                    >
                      {confirmingDeliveryItemId === item.orderItemId ? 'Confirming...' : 'Confirm Delivery'}
                    </button>
                  ) : (
                    getDeliveryConfirmationLabel(item)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </section>
  );
}

function MoneyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? '-';
}

function getCustomizationUnitAdditionalCost(item: Pick<OrderItemDto, 'customizationUnitAdditionalCost' | 'customizationAdditionalCost'>) {
  return item.customizationUnitAdditionalCost ?? item.customizationAdditionalCost ?? null;
}

function getOrderProjects(projects: ProjectListItemDto[]) {
  return projects.filter((project) => orderProjectStatuses.has(project.status));
}

function statusClass(value?: OrderStatus | null) {
  return (value ?? 'UNKNOWN').toLowerCase().replace(/_/g, '-');
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatDeliveryState(item: OrderItemDto) {
  const delivered = item.deliveredQuantity ?? 0;
  const quantity = item.quantity ?? 0;
  const status = item.status ? formatEnumLabel(item.status) : 'Pending';

  return `${delivered}/${quantity} - ${status}`;
}

function canConfirmDelivery(item: OrderItemDto) {
  if (item.itemType !== 'PRODUCT_ITEM') return false;
  if (item.status === 'CANCELLED' || item.status === 'UNAVAILABLE') return false;
  if (item.customerConfirmedAt) return false;

  const delivered = item.deliveredQuantity ?? 0;
  const quantity = item.quantity ?? 0;

  return quantity > 0 && delivered >= quantity;
}

function getDeliveryConfirmationLabel(item: OrderItemDto) {
  if (item.itemType === 'MANUAL_ITEM') return 'Not deliverable';
  if (item.status === 'CANCELLED' || item.status === 'UNAVAILABLE') return 'Not deliverable';
  if (item.customerConfirmedAt) return 'Confirmed';

  return 'Pending delivery';
}

function formatOrderCode(value?: string | null) {
  if (!value) return '-';

  const [, suffix] = value.split('-', 2);
  return (suffix || value).slice(0, 6);
}
