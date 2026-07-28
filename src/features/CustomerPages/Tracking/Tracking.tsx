import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCheck,
  IconClipboardText,
  IconCreditCard,
  IconMessageCircle,
  IconPackage,
  IconReceipt,
  IconTool,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import {
  CustomerNavbar,
  CustomerStatusBadge,
  CustomerSummaryCard,
  CustomerTimeline,
} from '@/features/CustomerPages/customercomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto, type OrderItemStatus, type OrderStatus } from '@/services/api/orders';
import type { PaymentDto } from '@/services/api/payments';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
import {
  useOrderDetail,
  usePayments,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';
import {
  formatCustomerDate,
  formatCustomerMoney,
  getProjectStatusLabel,
  paymentStatusLabels,
  paymentTypeLabels,
} from '@/features/CustomerPages/utils';

import './Tracking.css';

const trackableProjectStatuses = new Set<ProjectStatus>([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

const itemStatusLabels: Record<string, string> = {
  PENDING: 'Waiting to start',
  IN_PRODUCTION: 'In production',
  COMPLETED: 'Production completed',
  BLOCKED: 'Blocked',
  UNAVAILABLE: 'Unavailable',
  CANCELLED: 'Cancelled',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
};

export function Tracking() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(
    () => (projectsQuery.data?.items ?? []).filter((project) => trackableProjectStatuses.has(project.status)),
    [projectsQuery.data?.items],
  );
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? projects[0] ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = ordersQuery.data?.items ?? [];
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) ?? orders[0] ?? null;
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const paymentsQuery = usePayments(
    selectedOrderId ? { orderId: selectedOrderId, paymentType: 'REMAINING_PAYMENT', status: 'PENDING' } : undefined,
    { enabled: Boolean(selectedOrderId) },
  );
  const pendingPayment = paymentsQuery.data?.items?.[0] ?? null;
  const productionItems = order?.items ?? [];
  const blockedOrCancelledItems = productionItems.filter((item) => isBlockedOrUnavailable(item.status));

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].projectId);
    }
  }, [projects, selectedProjectId]);

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
    <main className="customer-workspace-page customer-tracking-page">
      <CustomerNavbar activeLabel="Tracking" classPrefix="customer-tracking" />
      <div className="customer-workspace-main">
        <section className="customer-workspace-heading">
          <div>
            <p className="customer-workspace-eyebrow">Customer Workspace</p>
            <h1>Project Tracking</h1>
            <p>Track the current production, delivery, and payment state of your confirmed order items.</p>
          </div>
        </section>

        {projectsQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">Cannot load your projects.</section> : null}
        {ordersQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section> : null}
        {orderDetailQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(orderDetailQuery.error)}</section> : null}

        <section className="customer-workspace-grid">
          <article className="customer-workspace-card">
            <header>
              <div>
                <h2>Active Project / Current Order</h2>
                <p>Switch between confirmed projects and follow the current production-facing order state.</p>
              </div>
              <select
                className="customer-tracking-selector"
                value={selectedProjectId}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  setSelectedOrderId('');
                }}
              >
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>{project.projectName}</option>
                ))}
              </select>
            </header>
            {selectedProject && order ? <ProjectSummary order={order} project={selectedProject} /> : <p className="customer-workspace-muted">No production tracking is available yet.</p>}
          </article>

          <article className="customer-tracking-status-banner">
            <CustomerStatusBadge label={getProjectStatusLabel(order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED')} status={order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED'} />
            <h2>{order?.orderCode ?? selectedOrder?.orderCode ?? 'No active order'}</h2>
            <p>{getTrackingMessage(order?.status ?? selectedProject?.status)}</p>
            <strong>Current state: {formatEnumLabel(order?.status ?? selectedProject?.status ?? 'UNKNOWN')}</strong>
            <Link className="customer-workspace-button" to="/customer/chat">Contact Team</Link>
          </article>
        </section>

        <section className="customer-workspace-summary-grid">
          <CustomerSummaryCard icon={IconPackage} label="Total Items" value={productionItems.length} />
          <CustomerSummaryCard icon={IconTool} label="In Production" value={countItems(productionItems, 'IN_PRODUCTION')} />
          <CustomerSummaryCard icon={IconCheck} label="Completed" value={countItems(productionItems, 'COMPLETED') + countItems(productionItems, 'DELIVERED')} />
          <CustomerSummaryCard icon={IconAlertTriangle} label="Blocked / Unavailable" value={blockedOrCancelledItems.length} />
        </section>

        {blockedOrCancelledItems.length > 0 ? (
          <article className="customer-tracking-warning-panel">
            <header>
              <IconAlertTriangle size={22} />
              <div>
                <h2>Item Attention Needed</h2>
                <p>The team is reviewing these item-level production issues and will coordinate next steps if an adjustment is needed.</p>
              </div>
              <Link className="customer-workspace-link" to="/customer/chat">Contact Team</Link>
            </header>
            <div className="customer-workspace-list">
              {blockedOrCancelledItems.map((item) => (
                <ItemWarning item={item} key={item.orderItemId} />
              ))}
            </div>
          </article>
        ) : null}

        <article className="customer-workspace-card">
          <header>
            <div>
              <h2>Production Items Tracking</h2>
              <p>Each physical item shows its latest status from the order and production flow.</p>
            </div>
          </header>
          {orderDetailQuery.isLoading ? <p className="customer-workspace-muted">Loading order items...</p> : null}
          {!orderDetailQuery.isLoading && productionItems.length === 0 ? <p className="customer-workspace-muted">No order items are available yet.</p> : null}
          <div className="customer-tracking-item-grid">
            {productionItems.map((item) => (
              <ProductionItemCard item={item} key={item.orderItemId} orderStatus={order?.status} />
            ))}
          </div>
        </article>

        <section className="customer-workspace-grid">
          <article className="customer-workspace-card">
            <header>
              <div>
                <h2>Delivery Readiness</h2>
                <p>Delivery starts after production is complete and a delivery schedule is confirmed.</p>
              </div>
            </header>
            <div className="customer-workspace-field-grid">
              <Field label="Current order" value={order?.orderCode ?? '-'} />
              <Field label="Completed items" value={`${countItems(productionItems, 'COMPLETED') + countItems(productionItems, 'DELIVERED')} item(s)`} />
              <Field label="Delivered items" value={`${countItems(productionItems, 'DELIVERED')} item(s)`} />
              <Field label="Remaining amount" value={formatCustomerMoney(order?.remainingAmount)} />
            </div>
          </article>

          <article className="customer-workspace-card">
            <header>
              <div>
                <h2>Related Information</h2>
                <p>Production-oriented records connected to this order.</p>
              </div>
            </header>
            <div className="customer-tracking-related-grid">
              <RelatedCard icon={IconReceipt} title="Current Order" summary={order?.orderCode ?? '-'} status={order?.status ?? 'ORDER_CONFIRMED'} path="/customer/orders" />
              <RelatedCard icon={IconClipboardText} title="Production State" summary={formatEnumLabel(order?.status ?? selectedProject?.status ?? 'UNKNOWN')} status={order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED'} path="/customer/tracking" />
              <RelatedCard
                icon={IconCreditCard}
                title="Pending Payment"
                summary={pendingPayment ? `${paymentTypeLabels[pendingPayment.paymentType ?? 'OTHER']} - ${formatPaymentAmount(pendingPayment)}` : 'No pending payment'}
                status={pendingPayment?.status ?? 'PAID'}
                path="/customer/orders"
              />
              <RelatedCard icon={IconCalendarEvent} title="Schedules" summary="Delivery appointments and confirmations" status="READY_FOR_DELIVERY" path="/customer/schedules" />
              <RelatedCard icon={IconMessageCircle} title="Project Chat" summary="Message Sales or support" status="IN_PRODUCTION" path="/customer/chat" />
            </div>
          </article>
        </section>

        {selectedProject ? (
          <article className="customer-workspace-card customer-tracking-project-overview">
            <header>
              <div>
                <h2>Project Status Overview</h2>
                <p>High-level project status remains secondary to item-level production tracking.</p>
              </div>
            </header>
            <CustomerTimeline status={selectedProject.status} />
          </article>
        ) : null}
      </div>
    </main>
  );
}

function ProjectSummary({ order, project }: { order: OrderDetailDto; project: ProjectListItemDto }) {
  return (
    <div className="customer-workspace-field-grid">
      <Field label="Project name" value={project.projectName} />
      <Field label="Project code" value={project.projectCode} />
      <Field label="Current order" value={order.orderCode} />
      <Field label="Business type" value={project.businessType} />
      <div className="customer-workspace-field">
        <span>Project status</span>
        <strong><CustomerStatusBadge label={getProjectStatusLabel(project.status)} status={project.status} /></strong>
      </div>
      <div className="customer-workspace-field">
        <span>Order status</span>
        <strong><CustomerStatusBadge label={formatEnumLabel(order.status ?? 'UNKNOWN')} status={order.status ?? 'UNKNOWN'} /></strong>
      </div>
    </div>
  );
}

function ProductionItemCard({ item, orderStatus }: { item: OrderItemDto; orderStatus?: OrderStatus | null }) {
  const status = getCustomerItemStatus(item, orderStatus);

  return (
    <article className={`customer-tracking-item-card customer-tracking-item-card-${status.toLowerCase()}`}>
      <header>
        <div>
          <span>{item.orderItemId}</span>
          <h3>{getOrderItemName(item)}</h3>
          <p>{item.itemType ? formatEnumLabel(item.itemType) : '-'}</p>
        </div>
        <CustomerStatusBadge label={itemStatusLabels[status] ?? formatEnumLabel(status)} status={status} />
      </header>
      <div className="customer-workspace-field-grid">
        <Field label="Quantity" value={String(item.quantity ?? '-')} />
        <Field label="Production state" value={itemStatusLabels[status] ?? formatEnumLabel(status)} />
        <Field label="Delivered" value={`${item.deliveredQuantity ?? 0}/${item.quantity ?? 0}`} />
        <Field label="Confirmed at" value={formatCustomerDate(item.customerConfirmedAt)} />
        <Field label="Delivery note" value={item.deliveryNote ?? '-'} />
        <Field label="Subtotal" value={formatCustomerMoney(item.subtotalAmount)} />
      </div>
      {isBlockedOrUnavailable(status) ? <ItemWarning item={item} /> : null}
    </article>
  );
}

function ItemWarning({ item }: { item: OrderItemDto }) {
  const status = item.status ?? 'BLOCKED';

  if (status === 'CANCELLED' || status === 'UNAVAILABLE') {
    return (
      <div className="customer-tracking-item-warning customer-tracking-item-warning-danger">
        <strong>This item is unavailable.</strong>
        <p>Sales will coordinate an adjustment or alternative option if this affects your final order.</p>
      </div>
    );
  }

  return (
    <div className="customer-tracking-item-warning">
      <strong>Production issue reported.</strong>
      <p>The team is resolving this item and will contact you if action is required.</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RelatedCard({ icon: IconComponent, path, status, summary, title }: { icon: typeof IconClipboardText; path: string; status: string; summary: string; title: string }) {
  return (
    <Link className="customer-tracking-related-card" to={path}>
      <IconComponent size={22} />
      <strong>{title}</strong>
      <p>{summary}</p>
      <CustomerStatusBadge label={paymentStatusLabels[status as keyof typeof paymentStatusLabels] ?? getProjectStatusLabel(status)} status={status} />
    </Link>
  );
}

function countItems(items: OrderItemDto[], status: OrderItemStatus) {
  return items.filter((item) => item.status === status).length;
}

function isBlockedOrUnavailable(status?: string | null) {
  return status === 'BLOCKED' || status === 'CANCELLED' || status === 'UNAVAILABLE';
}

function getCustomerItemStatus(item: OrderItemDto, orderStatus?: OrderStatus | null) {
  if (item.status) return item.status;
  if (orderStatus === 'IN_PRODUCTION') return 'IN_PRODUCTION';
  if (orderStatus === 'READY_FOR_DELIVERY') return 'COMPLETED';
  if (orderStatus === 'DELIVERING') return 'DELIVERING';
  if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED') return 'DELIVERED';

  return 'PENDING';
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? '-';
}

function getTrackingMessage(status?: string | null) {
  if (status === 'IN_PRODUCTION') return 'Your order is currently in production. Item statuses below show what is being worked on.';
  if (status === 'PRODUCTION_BLOCKED') return 'One or more items needs production attention. The team will coordinate next steps.';
  if (status === 'READY_FOR_DELIVERY') return 'Production is complete and the team is preparing delivery coordination.';
  if (status === 'DELIVERING') return 'Delivery is in progress. Items can be confirmed once fully delivered.';
  if (status === 'DELIVERED') return 'Delivery has been completed and final payment or completion may be pending.';
  if (status === 'COMPLETED') return 'This project has been completed.';

  return 'Production tracking will appear after your order enters the production flow.';
}

function formatPaymentAmount(payment: PaymentDto) {
  return `${new Intl.NumberFormat('vi-VN').format(payment.amount)} ${payment.currency}`;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
