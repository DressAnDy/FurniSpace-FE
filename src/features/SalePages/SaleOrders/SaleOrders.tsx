import { IconSettings } from '@tabler/icons-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto, type OrderListItemDto, type OrderStatus } from '@/services/api/orders';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useCurrentUser,
  useOrderDetail,
  useProjectList,
  useProjectOrders,
  useUpdateOrderFinancialAdjustment,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

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
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const orderProjects = useMemo(() => getOrderProjects(projects), [projects]);
  const selectedProject = orderProjects.find((project) => project.projectId === selectedProjectId) ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const financialAdjustmentMutation = useUpdateOrderFinancialAdjustment();
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

  async function updateFinancialAdjustment(input: { depositAmount: number; orderId: string }) {
    setMessage(null);

    try {
      await financialAdjustmentMutation.mutateAsync({
        additionalDiscountAmount: 0,
        adjustmentNote: null,
        depositAmount: input.depositAmount,
        orderId: input.orderId,
      });
      setMessage({ tone: 'success', text: 'Order financial adjustment updated.' });
      void ordersQuery.refetch();
      void orderDetailQuery.refetch();
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
                    onSelect={setSelectedOrderId}
                  />
                  <OrderGroup
                    emptyText="No order has paid deposit yet."
                    orders={paidDepositOrders}
                    selectedOrderId={selectedOrderId}
                    title="Deposit paid"
                    onSelect={setSelectedOrderId}
                  />
                </section>

                {order ? (
                  <OrderDetailPanel
                    isAdjusting={financialAdjustmentMutation.isPending}
                    order={order}
                    onAdjustFinancial={(input) => void updateFinancialAdjustment(input)}
                  />
                ) : null}
              </section>
            </section>
          </section>
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
            <span title={item.orderCode}>{formatOrderCode(item.orderCode)}</span>
            <strong>{formatMoney(item.originalTotalAmount)}</strong>
            <em className={`sale-orders-status sale-orders-status-${statusClass(item.status)}`}>{formatEnumLabel(item.status ?? 'UNKNOWN')}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function OrderDetailPanel({
  isAdjusting,
  onAdjustFinancial,
  order,
}: {
  isAdjusting: boolean;
  onAdjustFinancial: (input: { depositAmount: number; orderId: string }) => void;
  order: OrderDetailDto;
}) {
  const [depositAmount, setDepositAmount] = useState(() => String(order.depositAmount ?? 0));
  const orderItems = useMemo(() => aggregateDuplicateItems(order.items), [order.items]);

  useEffect(() => {
    setDepositAmount(String(order.depositAmount ?? 0));
  }, [order.depositAmount, order.orderId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdjustFinancial({
      depositAmount: normalizeMoneyInput(depositAmount),
      orderId: order.orderId,
    });
  }

  return (
    <section className="sale-orders-card sale-orders-detail">
      <header>
        <span className={`sale-orders-status sale-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>
      <div className="sale-orders-money-grid">
        <MoneyValue label="Final Total" value={formatMoney(order.finalTotalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
      </div>
      <form className="sale-orders-adjustment-form" onSubmit={handleSubmit}>
        <label>
          <span>Deposit Amount</span>
          <input inputMode="decimal" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} />
        </label>
        <button disabled={isAdjusting} type="submit">
          <IconSettings size={16} />
          {isAdjusting ? 'Updating...' : 'Update Financial'}
        </button>
      </form>
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
            {orderItems.map((item) => (
              <tr key={item.orderItemId}>
                <td>{getOrderItemName(item)}</td>
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

function getOrderProjects(projects: ProjectListItemDto[]) {
  return projects.filter((project) => orderProjectStatuses.has(project.status));
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

function formatOrderCode(value?: string | null) {
  if (!value) return '-';

  const [, suffix] = value.split('-', 2);
  return (suffix || value).slice(0, 6);
}

function normalizeMoneyInput(value: string) {
  const parsed = Number(value.trim().replace(/\./g, '').replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : 0;
}
