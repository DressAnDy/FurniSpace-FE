import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconMessageCircle,
  IconPackage,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import {
  CustomerNavbar,
  CustomerStatusBadge,
  CustomerSummaryCard,
} from '@/features/CustomerPages/customercomponents';
import { getOrderServiceResultMessage, type OrderItemDto, type OrderItemStatus, type OrderStatus } from '@/services/api/orders';
import type { ProjectStatus } from '@/services/api/projects';
import {
  useConfirmOrderDelivery,
  useOrderDetail,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';
import {
  getProjectStatusLabel,
} from '@/features/CustomerPages/utils';

import './Tracking.css';

const trackableProjectStatuses = new Set<ProjectStatus>([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

const itemStatusLabels: Record<string, string> = {
  PENDING: 'Waiting to start',
  IN_PRODUCTION: 'In production',
  COMPLETED: 'Production completed',
  ATTENTION: 'Needs attention',
  UNAVAILABLE: 'Unavailable',
  CANCELLED: 'Cancelled',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
};

export function Tracking() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(
    () => (projectsQuery.data?.items ?? []).filter((project) => trackableProjectStatuses.has(project.status)),
    [projectsQuery.data?.items],
  );
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? projects[0] ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) ?? orders[0] ?? null;
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const confirmDeliveryMutation = useConfirmOrderDelivery();
  const productionItems = useMemo(() => order?.items ?? [], [order?.items]);
  const deliveryItemGroups = useMemo(
    () => groupOrderItemsByName(productionItems.filter((item) => (item.quantity ?? 0) > 0 && item.status !== 'UNAVAILABLE' && item.status !== 'CANCELLED')),
    [productionItems],
  );
  const attentionGroups = deliveryItemGroups.filter((group) => group.hasAttention);

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

  async function confirmDelivery() {
    if (!order) return;
    setMessage(null);

    try {
      await confirmDeliveryMutation.mutateAsync(order.orderId);
      setMessage({ tone: 'success', text: 'Delivery confirmed.' });
      void orderDetailQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  return (
    <main className="customer-workspace-page customer-tracking-page">
      <CustomerNavbar activeLabel="Tracking" classPrefix="customer-tracking" />
      <div className="customer-workspace-main">
        <section className="customer-workspace-heading">
          <div>
            <p className="customer-workspace-eyebrow">Customer Workspace</p>
            <h1>Delivery Tracking</h1>
            <p>Follow delivery progress and confirm received items from one focused place.</p>
          </div>
        </section>

        {projectsQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">Cannot load your projects.</section> : null}
        {ordersQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section> : null}
        {orderDetailQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(orderDetailQuery.error)}</section> : null}
        {message ? <section className={`customer-tracking-message customer-tracking-message-${message.tone}`}>{message.text}</section> : null}

        <article className="customer-workspace-card customer-tracking-control-panel">
          <header>
            <div>
              <h2>{order?.orderCode ?? selectedOrder?.orderCode ?? 'No active order'}</h2>
              <p>{selectedProject?.projectName ?? 'No project selected'}</p>
            </div>
            <div className="customer-tracking-controls">
              <CustomerStatusBadge label={getProjectStatusLabel(order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED')} status={order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED'} />
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
            </div>
          </header>
          <p className="customer-tracking-current-message">{getTrackingMessage(order?.status ?? selectedProject?.status)}</p>
          <div className="customer-tracking-meta-row">
            <Field label="Project code" value={selectedProject?.projectCode ?? '-'} />
            <Field label="Order status" value={formatEnumLabel(order?.status ?? selectedProject?.status ?? 'UNKNOWN')} />
            <Field label="Customer confirmed" value={order?.customerConfirmedDeliveryAt ? formatDateTime(order.customerConfirmedDeliveryAt) : 'Not yet'} />
          </div>
          <button
            className="customer-workspace-link"
            disabled={!canConfirmDeliveryOrder(order) || confirmDeliveryMutation.isPending}
            type="button"
            onClick={() => void confirmDelivery()}
          >
            {confirmDeliveryMutation.isPending ? 'Confirming...' : order?.customerConfirmedDeliveryAt ? 'Delivery confirmed' : 'Confirm Delivery'}
          </button>
        </article>

        <section className="customer-workspace-summary-grid">
          <CustomerSummaryCard icon={IconPackage} label="Item Groups" value={deliveryItemGroups.length} />
          <CustomerSummaryCard icon={IconTruckDelivery} label="Delivered" value={countItems(productionItems, 'DELIVERED')} />
          <CustomerSummaryCard icon={IconCheck} label="Ready / Done" value={countItems(productionItems, 'COMPLETED') + countItems(productionItems, 'DELIVERED')} />
          <CustomerSummaryCard icon={IconAlertTriangle} label="Need Attention" value={attentionGroups.length} />
        </section>

        <article className="customer-workspace-card customer-tracking-items-panel">
          <header>
            <div>
              <h2>Delivery Items</h2>
              <p>Items are grouped by product name so the list stays compact.</p>
            </div>
            <Link className="customer-workspace-link" to="/customer/chat"><IconMessageCircle size={16} /> Contact team</Link>
          </header>
          {orderDetailQuery.isLoading ? <p className="customer-workspace-muted">Loading order items...</p> : null}
          {!orderDetailQuery.isLoading && deliveryItemGroups.length === 0 ? <p className="customer-workspace-muted">No delivery items are available yet.</p> : null}
          <div className="customer-tracking-delivery-list">
            {deliveryItemGroups.map((group) => (
              <DeliveryItemRow
                group={group}
                key={group.key}
                orderStatus={order?.status}
              />
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

function DeliveryItemRow({
  group,
  orderStatus,
}: {
  group: OrderItemGroup;
  orderStatus?: OrderStatus | null;
}) {
  const status = getGroupStatus(group, orderStatus);

  return (
    <article className={`customer-tracking-delivery-row customer-tracking-delivery-row-${status.toLowerCase()}`}>
      <div className="customer-tracking-delivery-main">
        <strong>{group.name}</strong>
        <span>{group.quantity} item(s) total</span>
      </div>
      <div className="customer-tracking-progress">
        <span>{group.deliveredAt ? `Delivered ${formatDateTime(group.deliveredAt)}` : 'Waiting for full-order delivery'}</span>
        <div aria-hidden="true"><i style={{ width: `${status === 'DELIVERED' ? 100 : 0}%` }} /></div>
      </div>
      <CustomerStatusBadge label={itemStatusLabels[status] ?? formatEnumLabel(status)} status={status} />
      {group.hasAttention ? (
        <p className="customer-tracking-row-note">This item needs team attention before delivery can continue.</p>
      ) : null}
    </article>
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

function countItems(items: OrderItemDto[], status: OrderItemStatus) {
  return items.filter((item) => item.status === status).length;
}

function canConfirmDeliveryOrder(order: { status?: OrderStatus | null; customerConfirmedDeliveryAt?: string | null; items: OrderItemDto[] } | null) {
  if (!order || order.status !== 'DELIVERING' || order.customerConfirmedDeliveryAt) return false;

  return order.items
    .filter((item) => (item.quantity ?? 0) > 0 && item.status !== 'UNAVAILABLE' && item.status !== 'CANCELLED')
    .every((item) => item.status === 'DELIVERED');
}

type OrderItemGroup = {
  deliveredAt?: string | null;
  hasAttention: boolean;
  items: OrderItemDto[];
  key: string;
  name: string;
  quantity: number;
  statusSummary: string;
};

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
    const statuses = Array.from(new Set(groupItems.map((item) => item.status ?? 'PENDING')));
    const deliveredDates = groupItems
      .map((item) => item.deliveredAt)
      .filter((value): value is string => Boolean(value))
      .sort();

    return {
      deliveredAt: deliveredDates[deliveredDates.length - 1],
      hasAttention: groupItems.some((item) => isBlockedOrUnavailable(item.status)),
      items: groupItems,
      key,
      name: getOrderItemName(groupItems[0] ?? {}),
      quantity: sumItemNumbers(groupItems, 'quantity'),
      statusSummary: statuses.map(formatEnumLabel).join(', '),
    };
  });
}

function sumItemNumbers(items: OrderItemDto[], field: 'quantity') {
  return items.reduce((total, item) => total + (item[field] ?? 0), 0);
}

function isBlockedOrUnavailable(status?: string | null) {
  return status === 'CANCELLED' || status === 'UNAVAILABLE';
}

function getCustomerItemStatus(item: OrderItemDto, orderStatus?: OrderStatus | null) {
  if (item.status) return item.status;
  if (orderStatus === 'IN_PRODUCTION') return 'IN_PRODUCTION';
  if (orderStatus === 'READY_FOR_DELIVERY') return 'COMPLETED';
  if (orderStatus === 'DELIVERING') return 'DELIVERING';
  if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED') return 'DELIVERED';

  return 'PENDING';
}

function getGroupStatus(group: OrderItemGroup, orderStatus?: OrderStatus | null) {
  if (group.hasAttention) return 'ATTENTION';
  if (group.items.every((item) => item.status === 'DELIVERED')) return 'DELIVERED';

  const statuses = new Set(group.items.map((item) => getCustomerItemStatus(item, orderStatus)));

  if (statuses.has('IN_PRODUCTION')) return 'IN_PRODUCTION';
  if (statuses.has('COMPLETED')) return 'COMPLETED';
  if (statuses.has('DELIVERING')) return 'DELIVERING';
  if (statuses.has('DELIVERED')) return 'DELIVERED';

  return 'PENDING';
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? '-';
}

function getTrackingMessage(status?: string | null) {
  if (status === 'IN_PRODUCTION') return 'Your order is currently in production. Item statuses below show what is being worked on.';
  if (status === 'READY_FOR_DELIVERY') return 'Production is complete and the team is preparing delivery coordination.';
  if (status === 'DELIVERING') return 'Delivery is in progress. Confirm once the whole order has arrived.';
  if (status === 'DELIVERED') return 'Delivery has been completed and final payment or completion may be pending.';
  if (status === 'COMPLETED') return 'This project has been completed.';

  return 'Production tracking will appear after your order enters the production flow.';
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

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
