import {
  IconCalendarCheck,
  IconCircleCheck,
  IconPackage,
  IconRefresh,
  IconSearch,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { groupDeliveryBatchItems, groupDeliveryTrackingItems } from '@/features/deliveryTracking/deliveryItemGrouping';
import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type DeliveryTrackingItemDto, type DeliveryTrackingTimelineItemDto } from '@/services/api/orders';
import { getProjectScheduleServiceResultMessage, type ProjectScheduleDto } from '@/services/api/schedules';
import {
  useOrderDeliveryTracking,
  useOrderDetail,
  useProjectDetail,
  useProjectList,
  useProjectOrders,
  useProjectScheduleList,
} from '@/services/queries';

import './SaleTracking.css';

const TRACKING_PROJECT_STATUSES = new Set([
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
  'COMPLETED',
]);

const STATUS_PRIORITY: Record<string, number> = {
  DELIVERING: 0,
  AWAITING_CUSTOMER_CONFIRMATION: 1,
  READY_FOR_DELIVERY: 2,
  DELIVERED: 3,
  COMPLETED: 4,
};

export function SaleTracking() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [search, setSearch] = useState('');
  const projectsQuery = useProjectList({ page: 1, limit: 80 });
  const trackingProjects = useMemo(
    () =>
      (projectsQuery.data?.items ?? [])
        .filter((project) => TRACKING_PROJECT_STATUSES.has(project.status))
        .filter((project) => {
          const keyword = search.trim().toLowerCase();
          if (!keyword) return true;
          return `${project.projectName} ${project.projectCode}`.toLowerCase().includes(keyword);
        })
        .sort((left, right) => (STATUS_PRIORITY[left.status] ?? 99) - (STATUS_PRIORITY[right.status] ?? 99)),
    [projectsQuery.data?.items, search],
  );
  const selectedProject = trackingProjects.find((project) => project.projectId === selectedProjectId) ?? trackingProjects[0] ?? null;
  const projectDetailQuery = useProjectDetail(selectedProjectId);
  const projectDetail = projectDetailQuery.data ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) ?? orders[0] ?? null;
  const orderDetailQuery = useOrderDetail(selectedOrder?.orderId, { enabled: Boolean(selectedOrder?.orderId) });
  const deliveryTrackingQuery = useOrderDeliveryTracking(selectedOrder?.orderId, { enabled: Boolean(selectedOrder?.orderId) });
  const deliverySchedulesQuery = useProjectScheduleList(
    selectedProjectId
      ? {
          limit: 100,
          page: 1,
          projectId: selectedProjectId,
          scheduleType: 'DELIVERY',
        }
      : undefined,
    {
      enabled: Boolean(selectedProjectId),
      fetchAll: true,
      staleTime: 60_000,
    },
  );
  const order = orderDetailQuery.data ?? null;
  const tracking = deliveryTrackingQuery.data ?? null;
  const groupedTrackingItems = useMemo(() => groupDeliveryTrackingItems(tracking?.items ?? []), [tracking?.items]);
  const deliverySchedules = deliverySchedulesQuery.data?.items ?? [];

  useEffect(() => {
    if (!selectedProjectId && trackingProjects.length > 0) {
      setSelectedProjectId(trackingProjects[0].projectId);
    }
  }, [selectedProjectId, trackingProjects]);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].orderId);
      return;
    }

    if (selectedOrderId && !orders.some((item) => item.orderId === selectedOrderId)) {
      setSelectedOrderId(orders[0]?.orderId ?? '');
    }
  }, [orders, selectedOrderId]);

  function refresh() {
    void projectsQuery.refetch();
    void projectDetailQuery.refetch();
    void ordersQuery.refetch();
    void orderDetailQuery.refetch();
    void deliveryTrackingQuery.refetch();
    void deliverySchedulesQuery.refetch();
  }

  const isRefreshing = projectsQuery.isFetching || ordersQuery.isFetching || deliveryTrackingQuery.isFetching || deliverySchedulesQuery.isFetching;

  return (
    <div className="sale-tracking-shell">
      <SaleSidebar activeLabel="Tracking" />
      <div className="sale-tracking-content">
        <SaleNavbar />
        <main className="sale-tracking-main">
          <section className="sale-tracking-heading">
            <div>
              <h2>Delivery Coordination</h2>
              <p>Sales now monitors delivery progress while Production owns delivery scheduling and batch execution.</p>
            </div>
            <button className="sale-tracking-refresh" disabled={isRefreshing} type="button" onClick={refresh}>
              <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={16} />
              Refresh
            </button>
          </section>

          {projectsQuery.isError ? <p className="sale-tracking-message sale-tracking-message-error">Cannot load delivery projects.</p> : null}
          {ordersQuery.isError ? <p className="sale-tracking-message sale-tracking-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</p> : null}
          {deliveryTrackingQuery.isError ? <p className="sale-tracking-message sale-tracking-message-error">{getOrderServiceResultMessage(deliveryTrackingQuery.error)}</p> : null}
          {deliverySchedulesQuery.isError ? <p className="sale-tracking-message sale-tracking-message-error">{getProjectScheduleServiceResultMessage(deliverySchedulesQuery.error)}</p> : null}

          <section className="sale-tracking-summary">
            <SummaryCard icon={<IconTruckDelivery size={20} />} label="Delivery Projects" tone="active" value={trackingProjects.length} />
            <SummaryCard icon={<IconPackage size={20} />} label="Remaining Qty" tone="ready" value={tracking?.summary.remainingQuantity ?? 0} />
            <SummaryCard icon={<IconCalendarCheck size={20} />} label="Upcoming" tone="neutral" value={tracking?.summary.upcomingDeliveryCount ?? 0} />
            <SummaryCard icon={<IconCircleCheck size={20} />} label="Completed Trips" tone="done" value={tracking?.summary.completedDeliveryCount ?? 0} />
          </section>

          <section className="sale-tracking-layout">
            <aside className="sale-tracking-project-panel">
              <header>
                <h3>Delivery Projects</h3>
                <p>Read-only list for Sales coordination.</p>
              </header>
              <label className="sale-tracking-search">
                <IconSearch size={16} />
                <input placeholder="Search project" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <div className="sale-tracking-project-list">
                {projectsQuery.isLoading ? <p className="sale-tracking-muted">Loading projects...</p> : null}
                {!projectsQuery.isLoading && trackingProjects.length === 0 ? <p className="sale-tracking-muted">No delivery projects found.</p> : null}
                {trackingProjects.map((project) => (
                  <button
                    className={project.projectId === selectedProject?.projectId ? 'is-active' : undefined}
                    key={project.projectId}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.projectId);
                      setSelectedOrderId('');
                    }}
                  >
                    <div className="sale-tracking-project-top">
                      <strong>{project.projectName}</strong>
                      <StatusBadge kind="project" value={project.status} />
                    </div>
                    <span>{project.projectCode}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="sale-tracking-workspace">
              {!selectedProject ? (
                <div className="sale-tracking-empty sale-tracking-empty-workspace">
                  <h3>No delivery project selected</h3>
                  <p>Projects enter this workspace after production is ready for delivery.</p>
                </div>
              ) : (
                <>
                  <article className="sale-tracking-card sale-tracking-overview-card">
                    <header>
                      <div>
                        <h3>{projectDetail?.projectName ?? selectedProject.projectName}</h3>
                        <p>{selectedOrder?.orderCode ?? 'No order'} - Production-managed delivery</p>
                      </div>
                      <StatusBadge kind="order" value={tracking?.orderStatus ?? order?.status ?? selectedProject.status} />
                    </header>
                    <div className="sale-tracking-overview-grid">
                      <Field label="Delivered" value={`${tracking?.summary.totalDeliveredQuantity ?? 0} / ${tracking?.summary.totalOrderedQuantity ?? 0}`} />
                      <Field label="Remaining" value={String(tracking?.summary.remainingQuantity ?? 0)} />
                      <Field label="Progress" value={`${tracking?.summary.deliveryProgressPercent ?? 0}%`} />
                      <Field label="Next delivery" value={tracking?.summary.nextDeliveryAt ? formatDateTime(tracking.summary.nextDeliveryAt) : 'Not scheduled'} />
                    </div>
                    <div className="sale-tracking-progress-block">
                      <div className="sale-tracking-progress-head">
                        <span>Delivery progress</span>
                        <strong>{tracking?.summary.deliveryProgressPercent ?? 0}%</strong>
                      </div>
                      <div className="sale-tracking-progress-track"><i style={{ width: `${tracking?.summary.deliveryProgressPercent ?? 0}%` }} /></div>
                      <small>Sales cannot create or execute delivery schedules in the new flow.</small>
                    </div>
                  </article>

                  <div className="sale-tracking-grid">
                    <article className="sale-tracking-card">
                      <header>
                        <h3>Delivery Schedules</h3>
                        <p>Created by Production, confirmed by Customer.</p>
                      </header>
                      <div className="sale-tracking-list">
                        {deliverySchedulesQuery.isLoading ? <p className="sale-tracking-muted">Loading schedules...</p> : null}
                        {!deliverySchedulesQuery.isLoading && deliverySchedules.length === 0 ? <p className="sale-tracking-muted">No delivery schedule yet.</p> : null}
                        {deliverySchedules.map((schedule) => <ScheduleCard key={schedule.scheduleId} schedule={schedule} />)}
                      </div>
                    </article>

                    <article className="sale-tracking-card">
                      <header>
                        <h3>Delivery Timeline</h3>
                        <p>Completed batches and upcoming confirmed schedules.</p>
                      </header>
                      <div className="sale-tracking-list">
                        {(tracking?.timeline ?? []).map((item, index) => (
                          <TimelineCard item={item} key={`${item.projectScheduleId ?? 'schedule'}-${item.deliveryId ?? index}`} />
                        ))}
                        {!deliveryTrackingQuery.isLoading && (tracking?.timeline.length ?? 0) === 0 ? <p className="sale-tracking-muted">No timeline yet.</p> : null}
                      </div>
                    </article>
                  </div>

                  <article className="sale-tracking-card">
                    <header>
                      <h3>Item Fulfillment</h3>
                      <p>Quantities are aggregated from delivery batches.</p>
                    </header>
                    <div className="sale-tracking-table-wrap sale-tracking-items-wrap">
                      <table className="sale-tracking-items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Ordered</th>
                            <th>Delivered</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryTrackingQuery.isLoading ? (
                            <tr><td colSpan={4}>Loading items...</td></tr>
                          ) : null}
                          {groupedTrackingItems.map((item) => <ItemRow item={item} key={item.orderItemIds.join('-')} />)}
                          {!deliveryTrackingQuery.isLoading && groupedTrackingItems.length === 0 ? (
                            <tr><td colSpan={4}>No delivery items are available.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, tone, value }: { icon: ReactNode; label: string; tone: 'active' | 'done' | 'neutral' | 'ready'; value: number }) {
  return (
    <article className={`sale-tracking-summary-card sale-tracking-summary-${tone}`}>
      <div className="sale-tracking-summary-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="sale-tracking-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: ProjectScheduleDto }) {
  return (
    <article className={schedule.status === 'CONFIRMED' ? 'is-confirmed' : undefined}>
      <div className="sale-tracking-schedule-top">
        <strong>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</strong>
        <StatusBadge kind="schedule" value={schedule.status} />
      </div>
      <span>{formatDateTime(schedule.scheduledStart)}{schedule.scheduledEnd ? ` -> ${formatDateTime(schedule.scheduledEnd)}` : ''}</span>
      <small>{schedule.completedAt ? `Completed ${formatDateTime(schedule.completedAt)}` : schedule.location ?? 'No location specified'}</small>
    </article>
  );
}

function TimelineCard({ item }: { item: DeliveryTrackingTimelineItemDto }) {
  const status = item.deliveryStatus ?? item.scheduleStatus ?? 'PENDING_CONFIRMATION';

  return (
    <article className={status === 'COMPLETED' ? 'is-confirmed' : undefined}>
      <div className="sale-tracking-schedule-top">
        <strong>{item.scheduledStart ? formatDateTime(item.scheduledStart) : 'Delivery schedule'}</strong>
        <StatusBadge kind="schedule" value={status} />
      </div>
      <span>{item.deliveryId ? `Batch ${item.deliveryId.slice(0, 8)}` : 'No batch yet'}</span>
      <small>{item.cancelReason ? `Cancel reason: ${formatEnumLabel(item.cancelReason)}` : getTimelineItemsText(item)}</small>
    </article>
  );
}

function ItemRow({ item }: { item: DeliveryTrackingItemDto }) {
  const status = item.status ?? (item.remainingQuantity > 0 ? 'PARTIALLY_DELIVERED' : 'READY');
  const percent = item.orderedQuantity > 0 ? Math.round((item.deliveredQuantity / item.orderedQuantity) * 100) : 0;

  return (
    <tr>
      <td className="sale-tracking-item-name">
        {item.productName ?? '-'}
        <small>{item.remainingQuantity} remaining</small>
      </td>
      <td>{item.orderedQuantity}</td>
      <td>
        <div className="sale-tracking-item-progress">
          <div className="sale-tracking-progress-track sale-tracking-progress-track-sm"><i style={{ width: `${percent}%` }} /></div>
          <span>{item.deliveredQuantity}</span>
        </div>
      </td>
      <td><StatusBadge kind="item" value={status} /></td>
    </tr>
  );
}

function StatusBadge({ kind, value }: { kind: 'item' | 'order' | 'project' | 'schedule'; value: string }) {
  return <span className={`sale-tracking-badge sale-tracking-badge-${getStatusTone(kind, value)}`}>{formatEnumLabel(value)}</span>;
}

function getStatusTone(kind: 'item' | 'order' | 'project' | 'schedule', value: string) {
  if (kind === 'schedule') {
    if (value === 'CONFIRMED') return 'success';
    if (value === 'PENDING_CONFIRMATION') return 'warn';
    if (value === 'COMPLETED') return 'success';
    if (value === 'CANCELLED') return 'muted';
  }

  if (value === 'DELIVERING' || value === 'PARTIALLY_DELIVERED') return 'active';
  if (value === 'AWAITING_CUSTOMER_CONFIRMATION' || value === 'PHYSICALLY_DELIVERED') return 'ready';
  if (value === 'READY_FOR_DELIVERY') return 'ready';
  if (value === 'DELIVERED' || value === 'COMPLETED') return 'success';
  if (value === 'CANCELLED' || value === 'UNAVAILABLE') return 'muted';

  return 'neutral';
}

function getTimelineItemsText(item: DeliveryTrackingTimelineItemDto) {
  if (!item.items?.length) return 'Waiting for Production execution';

  return groupDeliveryBatchItems(item.items)
    .map((batchItem) => `${batchItem.productName}: ${batchItem.quantity}`)
    .join(', ');
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
