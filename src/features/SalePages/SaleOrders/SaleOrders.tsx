import { IconCreditCard, IconCurrencyDollar, IconPackage, IconReceipt } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderListItemDto, type OrderStatus } from '@/services/api/orders';
import type { PaymentDetailDto } from '@/services/api/payments';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useCreateOrderDepositPayment,
  useCreateOrderRemainingPayment,
  useCurrentUser,
  useOrderDetail,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';
import { PaymentCollectionPanel } from '@/shared/components/PaymentCollectionPanel';

import './SaleOrders.css';

const orderProjectStatuses = new Set([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

export function SaleOrders() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activePayment, setActivePayment] = useState<PaymentDetailDto | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(currentUser?.accountId) },
  );
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
  const unpaidDepositOrders = useMemo(() => orders.filter((item) => isDepositUnpaidStatus(item.status)), [orders]);
  const paidDepositOrders = useMemo(() => orders.filter((item) => isDepositPaidStatus(item.status)), [orders]);

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
          ? await depositMutation.mutateAsync({ orderId: order.orderId, note: 'Sales created deposit payment.' })
          : await remainingMutation.mutateAsync({ orderId: order.orderId, note: 'Sales created remaining payment.' });

      setActivePayment(payment);
      setMessage({ tone: 'success', text: kind === 'deposit' ? 'Deposit payment is ready.' : 'Remaining payment is ready.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  return (
    <div className="sale-orders-shell">
      <SaleSidebar activeLabel="Orders" />
      <div className="sale-orders-content">
        <SaleNavbar />
        <main className="sale-orders-main">
          <section className="sale-orders-heading">
            <div>
              <h2>Orders</h2>
              <p>Manage confirmed orders, deposit payments, and final payment collection by assigned project.</p>
            </div>
          </section>

          {message ? <section className={`sale-orders-message sale-orders-message-${message.tone}`}>{message.text}</section> : null}
          {currentUserQuery.isError ? <section className="sale-orders-message sale-orders-message-error">Cannot load current sales account.</section> : null}
          {projectsQuery.isError ? <section className="sale-orders-message sale-orders-message-error">Cannot load assigned projects.</section> : null}
          {ordersQuery.isError ? <section className="sale-orders-message sale-orders-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section> : null}

          <section className="sale-orders-layout">
            <aside className="sale-orders-project-panel">
              <header>
                <h3>Projects</h3>
                <p>Select a confirmed project to manage its orders.</p>
              </header>
              {projectsQuery.isLoading ? <p className="sale-orders-muted">Loading projects...</p> : null}
              {!projectsQuery.isLoading && orderProjects.length === 0 ? <p className="sale-orders-muted">No order project is available.</p> : null}
              <div className="sale-orders-project-list">
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

            <section className="sale-orders-workspace">
              <section className="sale-orders-toolbar">
                <div>
                  <span>Selected Project</span>
                  <strong>{selectedProject ? `${selectedProject.projectCode} - ${formatEnumLabel(selectedProject.status)}` : 'No project selected'}</strong>
                </div>
              </section>

              <section className="sale-orders-metrics">
                <MetricCard icon={IconReceipt} label="Orders" value={String(metrics.total)} />
                <MetricCard icon={IconCreditCard} label="Deposit Due" value={formatMoney(metrics.depositDue)} />
                <MetricCard icon={IconCurrencyDollar} label="Remaining" value={formatMoney(metrics.remaining)} />
                <MetricCard icon={IconPackage} label="Active" value={String(metrics.active)} />
              </section>

              <section className="sale-orders-grid">
                <section className="sale-orders-card">
                  <header>
                    <h3>Project Orders</h3>
                    <p>Orders are grouped by deposit payment status.</p>
                  </header>
                  {ordersQuery.isLoading ? <p className="sale-orders-muted">Loading orders...</p> : null}
                  {!ordersQuery.isLoading && selectedProjectId && orders.length === 0 ? <p className="sale-orders-muted">No order found for this project.</p> : null}
                  <OrderGroup
                    emptyText="No order is waiting for deposit."
                    orders={unpaidDepositOrders}
                    selectedOrderId={selectedOrderId}
                    title="Deposit unpaid"
                    onSelect={(orderId) => {
                      setSelectedOrderId(orderId);
                      setActivePayment(null);
                    }}
                  />
                  <OrderGroup
                    emptyText="No order has paid deposit yet."
                    orders={paidDepositOrders}
                    selectedOrderId={selectedOrderId}
                    title="Deposit paid"
                    onSelect={(orderId) => {
                      setSelectedOrderId(orderId);
                      setActivePayment(null);
                    }}
                  />
                </section>

                {order ? (
                  <OrderDetailPanel
                    depositPending={depositMutation.isPending}
                    order={order}
                    remainingPending={remainingMutation.isPending}
                    onCreateDeposit={() => void createPayment('deposit')}
                    onCreateRemaining={() => void createPayment('remaining')}
                  />
                ) : null}
              </section>
            </section>
          </section>

          <PaymentCollectionPanel payment={activePayment} returnPath="/sales/orders" onPaid={() => void orderDetailQuery.refetch()} />
        </main>
      </div>
    </div>
  );
}

function OrderGroup({
  emptyText,
  onSelect,
  orders,
  selectedOrderId,
  title,
}: {
  emptyText: string;
  onSelect: (orderId: string) => void;
  orders: OrderListItemDto[];
  selectedOrderId: string;
  title: string;
}) {
  return (
    <section className="sale-orders-order-group">
      <div>
        <strong>{title}</strong>
        <span>{orders.length}</span>
      </div>
      {orders.length === 0 ? <p className="sale-orders-muted">{emptyText}</p> : null}
      <div className="sale-orders-list">
        {orders.map((item) => (
          <button
            className={item.orderId === selectedOrderId ? 'is-active' : ''}
            key={item.orderId}
            type="button"
            onClick={() => onSelect(item.orderId)}
          >
            <span>{item.orderCode}</span>
            <strong>{formatMoney(item.originalTotalAmount)}</strong>
            <em className={`sale-orders-status sale-orders-status-${statusClass(item.status)}`}>{formatEnumLabel(item.status ?? 'UNKNOWN')}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function OrderDetailPanel({
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
    <section className="sale-orders-card sale-orders-detail">
      <header>
        <div>
          <h3>{order.orderCode}</h3>
          <p>Quotation {order.quotationId}</p>
        </div>
        <span className={`sale-orders-status sale-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>
      <div className="sale-orders-money-grid">
        <MoneyValue label="Final Total" value={formatMoney(order.finalTotalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
      </div>
      <div className="sale-orders-actions">
        <button disabled={order.status !== 'DEPOSIT_PENDING' || depositPending} type="button" onClick={onCreateDeposit}>
          {depositPending ? 'Preparing...' : 'Create Deposit Payment'}
        </button>
        <button disabled={order.status !== 'FINAL_PAYMENT_PENDING' || remainingPending} type="button" onClick={onCreateRemaining}>
          {remainingPending ? 'Preparing...' : 'Create Remaining Payment'}
        </button>
      </div>
      <div className="sale-orders-table-scroll">
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
      <Icon size={26} />
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

function isDepositUnpaidStatus(status?: OrderStatus | null) {
  return status === 'CREATED' || status === 'DEPOSIT_PENDING';
}

function isDepositPaidStatus(status?: OrderStatus | null) {
  return Boolean(status) && !isDepositUnpaidStatus(status) && status !== 'CANCELLED';
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
