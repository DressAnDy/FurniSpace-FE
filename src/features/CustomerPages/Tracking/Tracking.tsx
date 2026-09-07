import { useEffect, useMemo, useState } from 'react';
import {
  IconCheck,
  IconMessageCircle,
  IconPackage,
  IconSearch,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useLang, type Lang } from '@/app/providers/useLang';
import {
  CustomerNavbar,
  CustomerStatusBadge,
  CustomerSummaryCard,
  customerCopy,
  type CustomerCopy,
} from '@/features/CustomerPages/customercomponents';
import { formatCustomerDateTime, getCustomerProjectStatusLabel } from '@/features/CustomerPages/utils';
import { groupDeliveryBatchItems, groupDeliveryTrackingItems } from '@/features/deliveryTracking/deliveryItemGrouping';
import {
  getOrderServiceResultMessage,
  type DeliveryTrackingItemDto,
  type DeliveryTrackingTimelineItemDto,
  type OrderStatus,
} from '@/services/api/orders';
import type { ProjectStatus } from '@/services/api/projects';
import {
  useConfirmOrderDelivery,
  useOrderDeliveryTracking,
  useOrderDetail,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';

import './Tracking.css';

const trackableProjectStatuses = new Set<ProjectStatus>([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
  'COMPLETED',
]);

const PROJECTS_PER_PAGE = 6;

export function Tracking() {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const projects = useMemo(
    () => (projectsQuery.data?.items ?? []).filter((project) => trackableProjectStatuses.has(project.status)),
    [projectsQuery.data?.items],
  );
  const filteredProjects = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();

    if (!keyword) return projects;

    return projects.filter((project) =>
      `${project.projectName} ${project.projectCode} ${project.businessType}`.toLowerCase().includes(keyword),
    );
  }, [projectSearch, projects]);
  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE));
  const pagedProjects = useMemo(
    () => filteredProjects.slice((projectPage - 1) * PROJECTS_PER_PAGE, projectPage * PROJECTS_PER_PAGE),
    [filteredProjects, projectPage],
  );
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? filteredProjects[0] ?? projects[0] ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) ?? orders[0] ?? null;
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const deliveryTrackingQuery = useOrderDeliveryTracking(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const tracking = deliveryTrackingQuery.data ?? null;
  const groupedTrackingItems = useMemo(() => groupDeliveryTrackingItems(tracking?.items ?? []), [tracking?.items]);
  const confirmDeliveryMutation = useConfirmOrderDelivery();
  const canFinalConfirm = canConfirmFinalDelivery(tracking?.orderStatus ?? order?.status, tracking?.customerConfirmedDeliveryAt ?? order?.customerConfirmedDeliveryAt);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0].projectId);
      return;
    }

    if (selectedProjectId && !projects.some((project) => project.projectId === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0]?.projectId ?? '');
      setSelectedOrderId('');
    }
  }, [filteredProjects, projects, selectedProjectId]);

  useEffect(() => {
    if (projectPage > projectTotalPages) {
      setProjectPage(projectTotalPages);
    }
  }, [projectPage, projectTotalPages]);

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
    if (!selectedOrderId) return;
    setMessage(null);

    try {
      await confirmDeliveryMutation.mutateAsync(selectedOrderId);
      setMessage({ tone: 'success', text: t.orders.deliveryConfirmedToast });
      void orderDetailQuery.refetch();
      void deliveryTrackingQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  return (
    <main className="customer-workspace-page customer-tracking-page">
      <CustomerNavbar activeKey="tracking" classPrefix="customer-tracking" />
      <div className="customer-workspace-main">
        <section className="customer-workspace-heading">
          <div>
            <h1>{t.tracking.title}</h1>
          </div>
        </section>

        {projectsQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">Cannot load your projects.</section> : null}
        {ordersQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section> : null}
        {orderDetailQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(orderDetailQuery.error)}</section> : null}
        {deliveryTrackingQuery.isError ? <section className="customer-tracking-message customer-tracking-message-error">{getOrderServiceResultMessage(deliveryTrackingQuery.error)}</section> : null}
        {message ? <section className={`customer-tracking-message customer-tracking-message-${message.tone}`}>{message.text}</section> : null}

        <section className="customer-tracking-layout">
          <aside className="customer-workspace-card customer-tracking-project-sidebar">
            <header>
              <h2>{t.tracking.projects}</h2>
              <span>{t.tracking.found(filteredProjects.length)}</span>
            </header>
            <label className="customer-tracking-search">
              <IconSearch size={16} />
              <input
                placeholder={t.tracking.searchProject}
                value={projectSearch}
                onChange={(event) => {
                  setProjectSearch(event.target.value);
                  setProjectPage(1);
                }}
              />
            </label>
            <div className="customer-tracking-project-list">
              {projectsQuery.isLoading ? <p className="customer-workspace-muted">{t.common.loading}</p> : null}
              {!projectsQuery.isLoading && filteredProjects.length === 0 ? <p className="customer-workspace-muted">No projects found.</p> : null}
              {pagedProjects.map((project) => (
                <button
                  className={project.projectId === selectedProject?.projectId ? 'is-active' : undefined}
                  key={project.projectId}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.projectId);
                    setSelectedOrderId('');
                  }}
                >
                  <strong>{project.projectName}</strong>
                  <span>{project.projectCode}</span>
                  <CustomerStatusBadge label={getCustomerTrackingStatusLabel(project.status, lang, t)} status={project.status} />
                </button>
              ))}
            </div>
            {projectTotalPages > 1 ? (
              <div className="customer-tracking-project-pagination">
                <button disabled={projectPage <= 1} type="button" onClick={() => setProjectPage((current) => Math.max(1, current - 1))}>
                  {t.common.previous}
                </button>
                <span>{projectPage} / {projectTotalPages}</span>
                <button disabled={projectPage >= projectTotalPages} type="button" onClick={() => setProjectPage((current) => Math.min(projectTotalPages, current + 1))}>
                  {t.common.next}
                </button>
              </div>
            ) : null}
          </aside>

          <section className="customer-tracking-content">
            <article className="customer-workspace-card customer-tracking-control-panel">
              <header>
                <div>
                  <h2>{order?.orderCode ?? selectedOrder?.orderCode ?? t.tracking.noActiveOrder}</h2>
                  <p>{selectedProject?.projectName ?? t.tracking.noProjectSelected}</p>
                </div>
                <div className="customer-tracking-controls">
                  <CustomerStatusBadge label={getCustomerTrackingStatusLabel(tracking?.orderStatus ?? order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED', lang, t)} status={tracking?.orderStatus ?? order?.status ?? selectedProject?.status ?? 'ORDER_CONFIRMED'} />
                </div>
              </header>
              <p className="customer-tracking-current-message">{getTrackingMessage(tracking?.orderStatus ?? order?.status ?? selectedProject?.status, t)}</p>
              <div className="customer-tracking-meta-row">
                <Field label={t.tracking.projectCode} value={selectedProject?.projectCode ?? '-'} />
                <Field label={t.tracking.progress} value={`${tracking?.summary.deliveryProgressPercent ?? 0}%`} />
                <Field label={t.tracking.nextDelivery} value={tracking?.summary.nextDeliveryAt ? formatCustomerDateTime(tracking.summary.nextDeliveryAt, lang) : t.tracking.notScheduled} />
              </div>
              {canFinalConfirm ? (
                <button
                  className="customer-workspace-link"
                  disabled={confirmDeliveryMutation.isPending}
                  type="button"
                  onClick={() => void confirmDelivery()}
                >
                  {confirmDeliveryMutation.isPending ? t.common.confirming : t.tracking.confirmFinalDelivery}
                </button>
              ) : null}
            </article>

            <section className="customer-workspace-summary-grid">
              <CustomerSummaryCard icon={IconPackage} label={t.tracking.orderedQty} value={tracking?.summary.totalOrderedQuantity ?? 0} />
              <CustomerSummaryCard icon={IconTruckDelivery} label={t.tracking.deliveredQty} value={tracking?.summary.totalDeliveredQuantity ?? 0} />
              <CustomerSummaryCard icon={IconCheck} label={t.tracking.completedTrips} value={tracking?.summary.completedDeliveryCount ?? 0} />
              <CustomerSummaryCard icon={IconPackage} label={t.tracking.remainingQty} value={tracking?.summary.remainingQuantity ?? 0} />
            </section>

            <article className="customer-workspace-card customer-tracking-items-panel">
              <header>
                <div>
                  <h2>{t.tracking.deliveryItems}</h2>
                </div>
                <Link className="customer-workspace-link" to="/customer/chat"><IconMessageCircle size={16} /> {t.tracking.contactTeam}</Link>
              </header>
              {deliveryTrackingQuery.isLoading ? <p className="customer-workspace-muted">{t.common.loading}</p> : null}
              {!deliveryTrackingQuery.isLoading && groupedTrackingItems.length === 0 ? <p className="customer-workspace-muted">No delivery items are available yet.</p> : null}
              <div className="customer-tracking-delivery-list">
                {groupedTrackingItems.map((item) => <DeliveryItemRow item={item} key={item.orderItemIds.join('-')} />)}
              </div>
            </article>

            <article className="customer-workspace-card customer-tracking-items-panel">
              <header>
                <div>
                  <h2>{t.tracking.deliveryTimeline}</h2>
                </div>
              </header>
              <div className="customer-tracking-delivery-list">
                {(tracking?.timeline ?? []).map((timelineItem, index) => (
                  <TimelineRow item={timelineItem} key={`${timelineItem.projectScheduleId ?? 'schedule'}-${timelineItem.deliveryId ?? index}`} />
                ))}
              </div>
              {!deliveryTrackingQuery.isLoading && (tracking?.timeline.length ?? 0) === 0 ? <p className="customer-workspace-muted">No delivery timeline yet.</p> : null}
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}

function DeliveryItemRow({ item }: { item: DeliveryTrackingItemDto }) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const status = item.status ?? (item.remainingQuantity > 0 ? 'PARTIALLY_DELIVERED' : 'READY');
  const deliveredPercent = item.orderedQuantity > 0
    ? Math.min(100, Math.round((item.deliveredQuantity / item.orderedQuantity) * 100))
    : 0;

  return (
    <article className={`customer-tracking-delivery-row customer-tracking-delivery-row-${status.toLowerCase()}`}>
      <div className="customer-tracking-delivery-main">
        <strong>{item.productName ?? '-'}</strong>
        <span>{item.orderedQuantity} {t.tracking.ordered}</span>
      </div>
      <div className="customer-tracking-progress">
        <span>{item.deliveredQuantity} {t.tracking.deliveredLabel} / {item.remainingQuantity} {t.tracking.remaining}</span>
        <div aria-hidden="true"><i style={{ width: `${deliveredPercent}%` }} /></div>
      </div>
      <CustomerStatusBadge label={getItemStatusLabel(status, t)} status={status} />
    </article>
  );
}

function TimelineRow({ item }: { item: DeliveryTrackingTimelineItemDto }) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const status = item.deliveryStatus ?? item.scheduleStatus ?? 'PENDING_CONFIRMATION';
  const batchItems = groupDeliveryBatchItems(item.items ?? []);
  const progressPercent = getTimelineProgressPercent(item);

  return (
    <article className={`customer-tracking-timeline-row customer-tracking-delivery-row-${status.toLowerCase()}`}>
      <div className="customer-tracking-timeline-header">
        <div className="customer-tracking-delivery-main">
          <strong>{item.scheduledStart ? formatCustomerDateTime(item.scheduledStart, lang) : t.tracking.deliverySchedule}</strong>
          <span>{getTimelineScheduleMeta(item, lang, t)}</span>
        </div>
        <CustomerStatusBadge label={formatEnumLabel(status)} status={status} />
      </div>
      <div className="customer-tracking-progress">
        <span>{getTimelineSummary(item, t)}</span>
        <div aria-hidden="true"><i style={{ width: `${progressPercent}%` }} /></div>
      </div>
      {item.location ? <p className="customer-tracking-row-note">{t.tracking.location}: {item.location}</p> : null}
      {item.customerNote ? <p className="customer-tracking-row-note">{t.tracking.note}: {item.customerNote}</p> : null}
      {item.cancelReason ? <p className="customer-tracking-row-note">{t.tracking.cancelled}: {formatEnumLabel(item.cancelReason)}</p> : null}
      <div className="customer-tracking-timeline-items">
        <span className="customer-tracking-timeline-items-title">{t.tracking.productsInDelivery}</span>
        {batchItems.length > 0 ? (
          <ul>
            {batchItems.map((batchItem) => (
              <li key={batchItem.groupId}>
                <span>{batchItem.productName}</span>
                <strong>{batchItem.quantity}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="customer-workspace-muted">{t.tracking.noProductsInSchedule}</p>
        )}
      </div>
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

function canConfirmFinalDelivery(
  orderStatus: OrderStatus | null | undefined,
  customerConfirmedDeliveryAt?: string | null,
) {
  return orderStatus === 'AWAITING_CUSTOMER_CONFIRMATION' && !customerConfirmedDeliveryAt;
}

function getItemStatusLabel(status: string, t: CustomerCopy) {
  const labels: Record<string, string> = {
    PENDING: t.tracking.waiting,
    PARTIALLY_DELIVERED: t.tracking.partial,
    PHYSICALLY_DELIVERED: t.tracking.delivered,
    DELIVERED: t.tracking.delivered,
    UNAVAILABLE: t.tracking.unavailable,
    CANCELLED: t.tracking.cancelled,
  };

  return labels[status] ?? formatEnumLabel(status);
}

function getTimelineSummary(item: DeliveryTrackingTimelineItemDto, t: CustomerCopy) {
  if (item.cancelReason) return formatEnumLabel(item.cancelReason);
  const batchItems = groupDeliveryBatchItems(item.items ?? []);

  if (batchItems.length === 0) return item.deliveryId ? t.tracking.batchCreated : t.tracking.batchNotCreated;

  const totalQuantity = batchItems.reduce((total, batchItem) => total + batchItem.quantity, 0);

  return t.tracking.productsScheduled(batchItems.length, totalQuantity);
}

function getTimelineScheduleMeta(item: DeliveryTrackingTimelineItemDto, lang: Lang, t: CustomerCopy) {
  if (item.completedAt) return `${t.tracking.completed} ${formatCustomerDateTime(item.completedAt, lang)}`;
  if (item.scheduledEnd) return `${t.tracking.ends} ${formatCustomerDateTime(item.scheduledEnd, lang)}`;
  if (item.deliveryId) return t.tracking.batchInProgress;

  return t.tracking.awaiting;
}

function getTimelineProgressPercent(item: DeliveryTrackingTimelineItemDto) {
  if (item.deliveryStatus === 'COMPLETED' || item.scheduleStatus === 'COMPLETED') return 100;
  if (item.deliveryStatus === 'IN_PROGRESS') return 65;
  if (item.deliveryId) return 50;
  if (item.scheduleStatus === 'CONFIRMED') return 30;
  if (item.scheduleStatus === 'CANCELLED') return 0;

  return 15;
}

function getTrackingMessage(status: string | null | undefined, t: CustomerCopy) {
  if (status === 'IN_PRODUCTION') return t.tracking.statusInProduction;
  if (status === 'READY_FOR_DELIVERY') return t.tracking.statusReadyForDelivery;
  if (status === 'DELIVERING') return t.tracking.statusDelivering;
  if (status === 'AWAITING_CUSTOMER_CONFIRMATION') return t.tracking.statusAwaitingConfirmation;
  if (status === 'DELIVERED') return t.tracking.statusDelivered;
  if (status === 'COMPLETED') return t.tracking.statusCompleted;

  return t.tracking.statusDefault;
}

function getCustomerTrackingStatusLabel(status: string, lang: Lang, t: CustomerCopy) {
  if (status === 'AWAITING_CUSTOMER_CONFIRMATION' || status === 'PHYSICALLY_DELIVERED') {
    return t.tracking.delivered;
  }

  return getCustomerProjectStatusLabel(status, lang);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
