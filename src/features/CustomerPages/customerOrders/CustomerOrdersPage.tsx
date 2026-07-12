import {
  IconChevronRight,
  IconCreditCard,
  IconCurrencyDollar,
  IconHome,
  IconPackage,
  IconReceipt,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderListItemDto, type OrderStatus } from '@/services/api/orders';
import type { PaymentDetailDto } from '@/services/api/payments';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useCreateOrderDepositPayment,
  useCreateOrderRemainingPayment,
  useOrderDetail,
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
  const projects = projectsQuery.data?.items ?? [];
  const orderProjects = useMemo(() => getOrderProjects(projects), [projects]);
  const selectedProject = orderProjects.find((project) => project.projectId === selectedProjectId) ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = ordersQuery.data?.items ?? [];
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const depositMutation = useCreateOrderDepositPayment();
  const remainingMutation = useCreateOrderRemainingPayment();
  const metrics = getOrderMetrics(orders);

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

  async function createPayment(kind: 'deposit' | 'remaining') {
    if (!order) return;

    setMessage(null);

    try {
      const payment =
        kind === 'deposit'
          ? await depositMutation.mutateAsync({ orderId: order.orderId, note: 'Customer deposit payment.' })
          : await remainingMutation.mutateAsync({ orderId: order.orderId, note: 'Customer remaining payment.' });

      setActivePayment(payment);
      setMessage({ tone: 'success', text: kind === 'deposit' ? 'Deposit payment is ready.' : 'Remaining payment is ready.' });
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
            <div className="customer-orders-metrics">
              <MetricCard icon={IconReceipt} label="Orders" value={String(metrics.total)} />
              <MetricCard icon={IconCreditCard} label="Deposit Due" value={formatMoney(metrics.depositDue)} />
              <MetricCard icon={IconCurrencyDollar} label="Remaining" value={formatMoney(metrics.remaining)} />
              <MetricCard icon={IconPackage} label="Active" value={String(metrics.active)} />
            </div>

            <section className="customer-orders-card">
              <header>
                <div>
                  <h2>{selectedProject ? selectedProject.projectName : 'Select a project'}</h2>
                  <p>{selectedProject ? `${selectedProject.projectCode} - ${formatEnumLabel(selectedProject.status)}` : 'Choose a project to view orders.'}</p>
                </div>
              </header>
              {ordersQuery.isLoading ? <p className="customer-orders-muted">Loading orders...</p> : null}
              {!ordersQuery.isLoading && selectedProjectId && orders.length === 0 ? <p className="customer-orders-muted">No order found for this project.</p> : null}
              <div className="customer-orders-order-list">
                {orders.map((item) => (
                  <button
                    className={item.orderId === selectedOrderId ? 'is-active' : ''}
                    key={item.orderId}
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(item.orderId);
                      setActivePayment(null);
                    }}
                  >
                    <span>{item.orderCode}</span>
                    <strong>{formatMoney(item.originalTotalAmount)}</strong>
                    <em className={`customer-orders-status customer-orders-status-${statusClass(item.status)}`}>{formatEnumLabel(item.status ?? 'UNKNOWN')}</em>
                  </button>
                ))}
              </div>
            </section>

            {order ? (
              <OrderDetailCard
                depositPending={depositMutation.isPending}
                order={order}
                remainingPending={remainingMutation.isPending}
                onCreateDeposit={() => void createPayment('deposit')}
                onCreateRemaining={() => void createPayment('remaining')}
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
  depositPending,
  onCreateDeposit,
  onCreateRemaining,
  order,
  remainingPending,
}: {
  depositPending: boolean;
  onCreateDeposit: () => void;
  onCreateRemaining: () => void;
  order: OrderDetailDto;
  remainingPending: boolean;
}) {
  return (
    <section className="customer-orders-card customer-orders-detail">
      <header>
        <div>
          <h2>{order.orderCode}</h2>
          <p>Quotation {order.quotationId}</p>
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
        <button disabled={order.status !== 'FINAL_PAYMENT_PENDING' || remainingPending} type="button" onClick={onCreateRemaining}>
          {remainingPending ? 'Preparing...' : 'Pay Remaining'}
        </button>
      </div>

      <div className="customer-orders-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Customization</th>
              <th>Discount</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.orderItemId}>
                <td>{item.itemName ?? item.productNameSnapshot ?? '-'}</td>
                <td>{formatEnumLabel(item.itemType ?? 'UNKNOWN')}</td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(item.customizationAdditionalCost)}</td>
                <td>{formatMoney(item.discountAmount)}</td>
                <td>{formatMoney(item.subtotalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof IconReceipt; label: string; value: string }) {
  return (
    <article>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={24} stroke={1.8} />
    </article>
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

function getOrderProjects(projects: ProjectListItemDto[]) {
  return projects.filter((project) => orderProjectStatuses.has(project.status));
}

function getOrderMetrics(orders: OrderListItemDto[]) {
  return {
    active: orders.filter((order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED').length,
    depositDue: orders.reduce((sum, order) => sum + (order.status === 'DEPOSIT_PENDING' ? order.depositAmount ?? 0 : 0), 0),
    remaining: orders.reduce((sum, order) => sum + (order.remainingAmount ?? 0), 0),
    total: orders.length,
  };
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
