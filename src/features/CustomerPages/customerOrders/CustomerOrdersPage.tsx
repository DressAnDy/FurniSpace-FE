import {
  IconChevronLeft,
  IconChevronRight,
  IconHome,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto, type OrderStatus } from '@/services/api/orders';
import type { PaymentDetailDto } from '@/services/api/payments';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useConfirmOrderDelivery,
  useOrderDetail,
  usePayments,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';
import { aggregateDuplicateItems, getItemAggregateKey } from '@/shared/utils/itemAggregation';
import { PaymentCollectionModal } from '@/features/payments/PaymentCollectionModal';

import './CustomerOrdersPage.css';

type GroupedOrderItem = OrderItemDto & {
  sourceItems: OrderItemDto[];
};

const PROJECT_PAGE_SIZE = 4;

const orderProjectStatuses = new Set([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

export function CustomerOrdersPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [activePayment, setActivePayment] = useState<PaymentDetailDto | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const orderProjects = useMemo(() => getOrderProjects(projects), [projects]);
  const totalProjectPages = Math.max(1, Math.ceil(orderProjects.length / PROJECT_PAGE_SIZE));
  const pagedOrderProjects = useMemo(() => {
    const start = (projectPage - 1) * PROJECT_PAGE_SIZE;

    return orderProjects.slice(start, start + PROJECT_PAGE_SIZE);
  }, [orderProjects, projectPage]);
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const remainingPaymentsQuery = usePayments(
    { orderId: selectedOrderId, paymentType: 'REMAINING_PAYMENT', status: 'PENDING' },
    { enabled: Boolean(selectedOrderId) },
  );
  const confirmDeliveryMutation = useConfirmOrderDelivery();

  useEffect(() => {
    if (!selectedProjectId && orderProjects.length > 0) {
      setSelectedProjectId(orderProjects[0].projectId);
      setProjectPage(1);
    }
  }, [orderProjects, selectedProjectId]);

  useEffect(() => {
    if (projectPage > totalProjectPages) {
      setProjectPage(totalProjectPages);
    }
  }, [projectPage, totalProjectPages]);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].orderId);
      return;
    }

    if (selectedOrderId && !orders.some((item) => item.orderId === selectedOrderId)) {
      setSelectedOrderId(orders[0]?.orderId ?? '');
    }
  }, [orders, selectedOrderId]);

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
              {pagedOrderProjects.map((project) => (
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
            {orderProjects.length > PROJECT_PAGE_SIZE ? (
              <footer className="customer-orders-panel-pagination">
                <p>
                  Page <strong>{projectPage}</strong> / {totalProjectPages}
                </p>
                <div>
                  <button
                    aria-label="Previous projects page"
                    disabled={projectPage <= 1}
                    type="button"
                    onClick={() => setProjectPage((current) => Math.max(1, current - 1))}
                  >
                    <IconChevronLeft size={16} stroke={1.8} />
                  </button>
                  <button
                    aria-label="Next projects page"
                    disabled={projectPage >= totalProjectPages}
                    type="button"
                    onClick={() => setProjectPage((current) => Math.min(totalProjectPages, current + 1))}
                  >
                    <IconChevronRight size={16} stroke={1.8} />
                  </button>
                </div>
              </footer>
            ) : null}
          </aside>

          <section className="customer-orders-workspace">
            {order ? (
              <OrderDetailCard
                confirmDeliveryPending={confirmDeliveryMutation.isPending}
                order={order}
                remainingPayment={remainingPaymentsQuery.data?.items?.[0] ?? null}
                onConfirmDelivery={async () => {
                  setMessage(null);

                  try {
                    await confirmDeliveryMutation.mutateAsync(order.orderId);
                    setMessage({ tone: 'success', text: 'Delivery confirmed.' });
                    void orderDetailQuery.refetch();
                    void ordersQuery.refetch();
                    void projectsQuery.refetch();
                  } catch (error) {
                    setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                  }
                }}
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
  confirmDeliveryPending,
  onConfirmDelivery,
  onOpenRemainingPayment,
  order,
  remainingPayment,
}: {
  confirmDeliveryPending: boolean;
  onConfirmDelivery: () => Promise<void>;
  onOpenRemainingPayment: (payment: PaymentDetailDto) => void;
  order: OrderDetailDto;
  remainingPayment: PaymentDetailDto | null;
}) {
  const orderItems = useMemo(() => aggregateOrderItems(order.items), [order.items]);

  return (
    <section className="customer-orders-card customer-orders-detail">
      <header>
        <span className={`customer-orders-status customer-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>

      <div className="customer-orders-money-grid">
        <MoneyValue label="Original Total" value={formatMoney(order.originalTotalAmount)} />
        <MoneyValue label={`VAT ${formatPercentRate(order.vatRate)}`} value={formatMoney(order.vatAmount)} />
        <MoneyValue label="Final Total" value={formatMoney(order.finalTotalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
      </div>

      <div className="customer-orders-actions">
        <button disabled={order.status !== 'FINAL_PAYMENT_PENDING' || !remainingPayment} type="button" onClick={() => remainingPayment && onOpenRemainingPayment(remainingPayment)}>
          Pay Remaining
        </button>
        <button disabled={!canConfirmOrderDelivery(order) || confirmDeliveryPending} type="button" onClick={() => void onConfirmDelivery()}>
          {confirmDeliveryPending ? 'Confirming...' : order.customerConfirmedDeliveryAt ? 'Delivery Confirmed' : 'Confirm Delivery'}
        </button>
      </div>

      <div className="customer-orders-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Discount</th>
              <th>Pre-VAT Subtotal</th>
              <th>Delivery</th>
              <th>Confirmation</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => {
              return (
              <tr key={item.sourceItems.map((sourceItem) => sourceItem.orderItemId).join('-')}>
                <td>{getOrderItemName(item)}</td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(item.discountAmount)}</td>
                <td>{formatMoney(item.subtotalAmount)}</td>
                <td>{formatGroupedDeliveryState(item)}</td>
                <td>
                  {confirmDeliveryPending ? 'Confirming...' : getOrderDeliveryConfirmationLabel(order)}
                </td>
              </tr>
            );
            })}
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

function aggregateOrderItems(items: OrderItemDto[]): GroupedOrderItem[] {
  const groupedItems = new Map<string, GroupedOrderItem>();
  const aggregateItems = aggregateDuplicateItems(items);

  for (const item of aggregateItems) {
    groupedItems.set(getItemAggregateKey(item), { ...item, sourceItems: [] });
  }

  for (const item of items) {
    groupedItems.get(getItemAggregateKey(item))?.sourceItems.push(item);
  }

  return Array.from(groupedItems.values());
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

function formatPercentRate(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

function formatGroupedDeliveryState(item: GroupedOrderItem) {
  const quantity = item.quantity ?? 0;
  const statuses = Array.from(new Set(item.sourceItems.map((sourceItem) => sourceItem.status ?? 'PENDING')));
  const status = statuses.length === 1 ? formatEnumLabel(statuses[0]) : 'Mixed';

  const deliveredDates = item.sourceItems
    .map((sourceItem) => sourceItem.deliveredAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestDeliveredAt = deliveredDates[deliveredDates.length - 1];

  return `${quantity || '-'} item(s) - ${status}${latestDeliveredAt ? ` - ${formatDateTime(latestDeliveredAt)}` : ''}`;
}

function canConfirmOrderDelivery(order: OrderDetailDto) {
  if (order.status !== 'DELIVERING' || order.customerConfirmedDeliveryAt) return false;

  return order.items
    .filter((item) => (item.quantity ?? 0) > 0 && item.status !== 'CANCELLED' && item.status !== 'UNAVAILABLE')
    .every((item) => item.status === 'DELIVERED');
}

function getOrderDeliveryConfirmationLabel(order: OrderDetailDto) {
  if (order.customerConfirmedDeliveryAt) return `Confirmed ${formatDateTime(order.customerConfirmedDeliveryAt)}`;
  if (order.status === 'DELIVERING') return 'Waiting for full-order confirmation';
  if (order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING' || order.status === 'COMPLETED') return 'Confirmed';

  return 'Pending delivery';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
