import {
  IconCalendarCheck,
  IconCalendarPlus,
  IconCircleCheck,
  IconPackage,
  IconRefresh,
  IconSearch,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type OrderItemDto } from '@/services/api/orders';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import {
  useCreateProjectSchedule,
  useCurrentUser,
  useOrderDetail,
  useProjectDetail,
  useProjectList,
  useProjectOrders,
  useProjectScheduleList,
  useStartOrderDelivery,
} from '@/services/queries';

import './SaleTracking.css';
import { getLocalDateTimeInputValue, validateScheduleDateRange } from '@/shared/utils/dateValidation';

const TRACKING_PROJECT_STATUSES = new Set([
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

const STATUS_PRIORITY: Record<string, number> = {
  DELIVERING: 0,
  READY_FOR_DELIVERY: 1,
  DELIVERED: 2,
  COMPLETED: 3,
};

export function SaleTracking() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    { assignedSalesId: currentUser?.accountId, page: 1, limit: 50 },
    { enabled: Boolean(currentUser?.accountId) },
  );

  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const trackingProjects = useMemo(
    () =>
      projects
        .filter((project) => TRACKING_PROJECT_STATUSES.has(project.status))
        .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return trackingProjects;
    return trackingProjects.filter(
      (project) =>
        project.projectName.toLowerCase().includes(query) ||
        project.projectCode.toLowerCase().includes(query),
    );
  }, [projectSearch, trackingProjects]);

  const summary = useMemo(() => {
    const ready = trackingProjects.filter((p) => p.status === 'READY_FOR_DELIVERY').length;
    const delivering = trackingProjects.filter((p) => p.status === 'DELIVERING').length;
    const done = trackingProjects.filter((p) => p.status === 'DELIVERED' || p.status === 'COMPLETED').length;
    return { ready, delivering, done, total: trackingProjects.length };
  }, [trackingProjects]);

  const selectedProject = trackingProjects.find((project) => project.projectId === selectedProjectId) ?? null;
  const projectDetailQuery = useProjectDetail(selectedProjectId || undefined);
  const projectDetail = projectDetailQuery.data ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const deliverySchedulesQuery = useProjectScheduleList(
    selectedProjectId
      ? { limit: 20, page: 1, projectId: selectedProjectId, scheduleType: 'DELIVERY' }
      : undefined,
  );

  const createScheduleMutation = useCreateProjectSchedule();
  const startDeliveryMutation = useStartOrderDelivery();
  const deliverySchedules = deliverySchedulesQuery.data?.items ?? [];
  const confirmedSchedule = deliverySchedules.find((s) => s.status === 'CONFIRMED') ?? null;
  const itemProgress = useMemo(() => getItemDeliveryProgress(order?.items ?? []), [order?.items]);

  const isRefreshing =
    isManualRefreshing ||
    projectsQuery.isFetching ||
    ordersQuery.isFetching ||
    orderDetailQuery.isFetching ||
    deliverySchedulesQuery.isFetching;
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);

  const startDeliveryBlockedReason = useMemo(() => {
    if (!order) return 'Select a project with an order.';
    if (order.status !== 'READY_FOR_DELIVERY') return `Order is ${formatEnumLabel(order.status ?? 'unknown')}.`;
    if (!confirmedSchedule) return 'Waiting for a confirmed delivery schedule.';
    return null;
  }, [confirmedSchedule, order]);

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

  async function handleRefresh() {
    if (isManualRefreshing) return;

    setMessage(null);
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        projectsQuery.refetch(),
        selectedProjectId ? ordersQuery.refetch() : Promise.resolve(),
        selectedOrderId ? orderDetailQuery.refetch() : Promise.resolve(),
        selectedProjectId ? deliverySchedulesQuery.refetch() : Promise.resolve(),
      ]);
      setLastRefreshAt(new Date());
    } finally {
      setIsManualRefreshing(false);
    }
  }

  async function createDeliverySchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) {
      setMessage({ tone: 'error', text: 'Select a delivery project before creating a schedule.' });
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const scheduledStart = String(formData.get('scheduledStart') ?? '').trim();
    const scheduledEnd = String(formData.get('scheduledEnd') ?? '').trim();
    const location = String(formData.get('location') ?? '').trim() || projectDetail?.projectAddress || null;

    const dateRange = validateScheduleDateRange(scheduledStart, scheduledEnd);
    if (!dateRange.ok) {
      setMessage({ tone: 'error', text: dateRange.message });
      return;
    }

    setMessage(null);
    try {
      await createScheduleMutation.mutateAsync({
        projectId: selectedProject.projectId,
        scheduleType: 'DELIVERY',
        title: String(formData.get('title') ?? '').trim() || `${selectedProject.projectName} - delivery`,
        description: String(formData.get('description') ?? '').trim() || null,
        scheduledStart: dateRange.startIso,
        scheduledEnd: dateRange.endIso,
        location,
        customerNote: null,
        internalNote: 'Created by Sales from delivery tracking.',
      });
      setMessage({ tone: 'success', text: 'Delivery schedule created and sent for customer confirmation.' });
      form.reset();
      void deliverySchedulesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    }
  }

  async function startDelivery() {
    if (!order) return;
    setMessage(null);
    try {
      await startDeliveryMutation.mutateAsync(order.orderId);
      setMessage({ tone: 'success', text: 'Delivery started.' });
      void orderDetailQuery.refetch();
      void ordersQuery.refetch();
      void projectsQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  const queryError =
    (currentUserQuery.isError && 'Cannot load current sales account.') ||
    (projectsQuery.isError && 'Cannot load assigned delivery projects.') ||
    (ordersQuery.isError && getOrderServiceResultMessage(ordersQuery.error)) ||
    (deliverySchedulesQuery.isError && getProjectScheduleServiceResultMessage(deliverySchedulesQuery.error)) ||
    null;

  return (
    <div className="sale-tracking-shell">
      <SaleSidebar activeLabel="Tracking" />
      <div className="sale-tracking-content">
        <SaleNavbar />
        <main className="sale-tracking-main">
          <section className="sale-tracking-heading">
            <div>
              <h2>Delivery Tracking</h2>
              <p>Monitor delivery schedules, order progress, and item fulfillment for assigned projects.</p>
            </div>
            <button
              className="sale-tracking-refresh"
              disabled={isRefreshing}
              type="button"
              onClick={() => void handleRefresh()}
            >
              <IconRefresh size={14} className={isRefreshing ? 'is-spinning' : undefined} />
              {isRefreshing ? 'Refreshing...' : `Refresh · ${refreshTime}`}
            </button>
          </section>

          <section className="sale-tracking-summary" aria-label="Delivery summary">
            <SummaryCard icon={IconTruckDelivery} label="In delivery" value={summary.delivering} tone="active" />
            <SummaryCard icon={IconPackage} label="Ready to ship" value={summary.ready} tone="ready" />
            <SummaryCard icon={IconCircleCheck} label="Delivered / done" value={summary.done} tone="done" />
            <SummaryCard icon={IconCalendarCheck} label="Projects tracked" value={summary.total} tone="neutral" />
          </section>

          {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
          {queryError ? <Alert tone="error">{queryError}</Alert> : null}

          <section className="sale-tracking-layout">
            <aside className="sale-tracking-project-panel">
              <header>
                <h3>Delivery Projects</h3>
                <p>{trackingProjects.length} project(s) in delivery phase</p>
              </header>

              <label className="sale-tracking-search">
                <IconSearch size={16} />
                <input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search code or name..."
                  type="search"
                />
              </label>

              {projectsQuery.isLoading ? <p className="sale-tracking-muted">Loading projects...</p> : null}
              {!projectsQuery.isLoading && filteredProjects.length === 0 ? (
                <div className="sale-tracking-empty">
                  <IconTruckDelivery size={28} stroke={1.5} />
                  <p>{projectSearch ? 'No projects match your search.' : 'No project is ready for delivery tracking.'}</p>
                </div>
              ) : null}

              <div className="sale-tracking-project-list">
                {filteredProjects.map((project) => (
                  <button
                    key={project.projectId}
                    className={project.projectId === selectedProjectId ? 'is-active' : ''}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.projectId);
                      setSelectedOrderId('');
                      setMessage(null);
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
                  <IconTruckDelivery size={36} stroke={1.5} />
                  <h3>Select a delivery project</h3>
                  <p>Choose a project from the left panel to review schedules and item progress.</p>
                </div>
              ) : (
                <>
                  <section className="sale-tracking-card sale-tracking-overview-card">
                    <header>
                      <div>
                        <h3>Delivery Overview</h3>
                        <p>
                          {selectedProject.projectCode} · {selectedProject.projectName}
                        </p>
                      </div>
                      {order?.status ? <StatusBadge kind="order" value={order.status} /> : null}
                    </header>

                    <DeliverySteps
                      hasConfirmedSchedule={Boolean(confirmedSchedule)}
                      hasSchedule={deliverySchedules.length > 0}
                      orderStatus={order?.status ?? null}
                      projectStatus={selectedProject.status}
                    />

                    {orders.length > 1 ? (
                      <div className="sale-tracking-order-tabs" role="tablist" aria-label="Project orders">
                        {orders.map((item) => (
                          <button
                            key={item.orderId}
                            className={item.orderId === selectedOrderId ? 'is-active' : ''}
                            role="tab"
                            type="button"
                            aria-selected={item.orderId === selectedOrderId}
                            onClick={() => setSelectedOrderId(item.orderId)}
                          >
                            {item.orderCode}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {order ? (
                      <>
                        <div className="sale-tracking-overview-grid">
                          <Field label="Order" value={order.orderCode} />
                          <Field label="Project address" value={projectDetail?.projectAddress ?? '-'} />
                          <Field
                            label="Schedule confirmed"
                            value={confirmedSchedule ? formatDateTime(confirmedSchedule.scheduledStart) : 'Not yet'}
                          />
                          <Field label="Remaining amount" value={formatMoney(order.remainingAmount)} />
                        </div>

                        <div className="sale-tracking-progress-block">
                          <div className="sale-tracking-progress-head">
                            <span>Item delivery progress</span>
                            <strong>
                              {itemProgress.delivered} / {itemProgress.total} units · {itemProgress.percent}%
                            </strong>
                          </div>
                          <div className="sale-tracking-progress-track">
                            <i style={{ width: `${itemProgress.percent}%` }} />
                          </div>
                          <small>
                            {itemProgress.confirmed} item(s) confirmed by customer · Production updates delivered qty
                          </small>
                        </div>
                      </>
                    ) : (
                      <p className="sale-tracking-muted">No order is available for this project.</p>
                    )}

                    <div className="sale-tracking-actions">
                      <button
                        className="sale-tracking-primary-btn"
                        disabled={Boolean(startDeliveryBlockedReason) || startDeliveryMutation.isPending}
                        type="button"
                        onClick={() => void startDelivery()}
                      >
                        <IconTruckDelivery size={16} />
                        {startDeliveryMutation.isPending ? 'Starting...' : 'Start Delivery'}
                      </button>
                      {startDeliveryBlockedReason ? (
                        <p className="sale-tracking-action-hint">{startDeliveryBlockedReason}</p>
                      ) : null}
                    </div>
                  </section>

                  <section className="sale-tracking-grid">
                    <form className="sale-tracking-card sale-tracking-form" onSubmit={createDeliverySchedule}>
                      <header>
                        <div>
                          <h3>Create Delivery Schedule</h3>
                          <p>Location defaults to project address. Customer confirms on their side.</p>
                        </div>
                      </header>
                      <label>
                        <span>Title</span>
                        <input
                          name="title"
                          placeholder={selectedProject ? `${selectedProject.projectName} - delivery` : 'Delivery schedule'}
                        />
                      </label>
                      <div className="sale-tracking-form-row">
                        <label>
                          <span>Start</span>
                          <input min={getLocalDateTimeInputValue()} name="scheduledStart" required type="datetime-local" />
                        </label>
                        <label>
                          <span>End</span>
                          <input name="scheduledEnd" type="datetime-local" />
                        </label>
                      </div>
                      <label>
                        <span>Location</span>
                        <input
                          key={projectDetail?.projectAddress ?? selectedProjectId}
                          name="location"
                          defaultValue={projectDetail?.projectAddress ?? ''}
                          placeholder={projectDetailQuery.isLoading ? 'Loading address...' : 'Delivery address'}
                        />
                      </label>
                      <label>
                        <span>Description</span>
                        <textarea name="description" placeholder="Notes for customer and internal team" rows={3} />
                      </label>
                      <button className="sale-tracking-primary-btn" disabled={createScheduleMutation.isPending} type="submit">
                        <IconCalendarPlus size={16} />
                        {createScheduleMutation.isPending ? 'Creating...' : 'Create Delivery Schedule'}
                      </button>
                    </form>

                    <section className="sale-tracking-card">
                      <header>
                        <div>
                          <h3>Delivery Schedules</h3>
                          <p>{deliverySchedules.length} schedule(s) for this project</p>
                        </div>
                      </header>
                      <div className="sale-tracking-list">
                        {deliverySchedulesQuery.isLoading ? <p className="sale-tracking-muted">Loading schedules...</p> : null}
                        {!deliverySchedulesQuery.isLoading && deliverySchedules.length === 0 ? (
                          <p className="sale-tracking-muted">No delivery schedule yet. Create one to proceed.</p>
                        ) : null}
                        {deliverySchedules.map((schedule) => (
                          <article key={schedule.scheduleId} className={schedule.status === 'CONFIRMED' ? 'is-confirmed' : ''}>
                            <div className="sale-tracking-schedule-top">
                              <strong>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</strong>
                              <StatusBadge kind="schedule" value={schedule.status} />
                            </div>
                            <span>
                              {formatDateTime(schedule.scheduledStart)}
                              {schedule.scheduledEnd ? ` → ${formatDateTime(schedule.scheduledEnd)}` : ''}
                            </span>
                            <small>{schedule.location ?? 'No location specified'}</small>
                          </article>
                        ))}
                      </div>
                    </section>
                  </section>

                  <section className="sale-tracking-card">
                    <header>
                      <div>
                        <h3>Delivery Items</h3>
                        <p>Production updates quantities · Customer confirms receipt</p>
                      </div>
                    </header>
                    <div className="sale-tracking-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Delivered</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Confirmed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetailQuery.isLoading ? (
                            <tr>
                              <td colSpan={6}>Loading order items...</td>
                            </tr>
                          ) : null}
                          {!orderDetailQuery.isLoading && !order ? (
                            <tr>
                              <td colSpan={6}>No order items to display.</td>
                            </tr>
                          ) : null}
                          {order?.items.map((item) => {
                            const qty = item.quantity ?? 0;
                            const delivered = item.deliveredQuantity ?? 0;
                            const pct = qty > 0 ? Math.min(Math.round((delivered / qty) * 100), 100) : 0;
                            return (
                              <tr key={item.orderItemId}>
                                <td className="sale-tracking-item-name">{getOrderItemName(item)}</td>
                                <td>{qty || '-'}</td>
                                <td>{delivered}</td>
                                <td>
                                  <div className="sale-tracking-item-progress">
                                    <div className="sale-tracking-progress-track sale-tracking-progress-track-sm">
                                      <i style={{ width: `${pct}%` }} />
                                    </div>
                                    <span>{pct}%</span>
                                  </div>
                                </td>
                                <td>
                                  <StatusBadge kind="item" value={item.status ?? 'PENDING'} />
                                </td>
                                <td>{item.customerConfirmedAt ? formatDateTime(item.customerConfirmedAt) : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconTruckDelivery;
  label: string;
  value: number;
  tone: 'active' | 'ready' | 'done' | 'neutral';
}) {
  return (
    <article className={`sale-tracking-summary-card sale-tracking-summary-${tone}`}>
      <div className="sale-tracking-summary-icon">
        <Icon size={20} stroke={1.8} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function DeliverySteps({
  hasSchedule,
  hasConfirmedSchedule,
  orderStatus,
  projectStatus,
}: {
  hasSchedule: boolean;
  hasConfirmedSchedule: boolean;
  orderStatus: string | null;
  projectStatus: string;
}) {
  const steps = [
    { label: 'Schedule created', done: hasSchedule },
    { label: 'Customer confirmed', done: hasConfirmedSchedule },
    {
      label: 'Delivery started',
      done: orderStatus === 'DELIVERING' || orderStatus === 'DELIVERED' || projectStatus === 'DELIVERING',
    },
    {
      label: 'Items delivered',
      done: orderStatus === 'DELIVERED' || projectStatus === 'DELIVERED' || projectStatus === 'COMPLETED',
    },
  ];

  return (
    <ol className="sale-tracking-steps">
      {steps.map((step, index) => (
        <li key={step.label} className={step.done ? 'is-done' : index === steps.findIndex((s) => !s.done) ? 'is-current' : ''}>
          <i>{step.done ? '✓' : index + 1}</i>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function StatusBadge({ kind, value }: { kind: 'project' | 'order' | 'schedule' | 'item'; value: string }) {
  const normalized = value.toUpperCase();
  const tone = getStatusTone(kind, normalized);
  return <span className={`sale-tracking-badge sale-tracking-badge-${tone}`}>{formatEnumLabel(normalized)}</span>;
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  return <section className={`sale-tracking-message sale-tracking-message-${tone}`}>{children}</section>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="sale-tracking-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getItemDeliveryProgress(items: OrderItemDto[]) {
  const total = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const delivered = items.reduce((sum, item) => sum + (item.deliveredQuantity ?? 0), 0);
  const confirmed = items.filter((item) => Boolean(item.customerConfirmedAt)).length;
  const percent = total > 0 ? Math.min(Math.round((delivered / total) * 100), 100) : 0;
  return { total, delivered, confirmed, percent };
}

function getStatusTone(kind: string, value: string) {
  if (kind === 'schedule') {
    if (value === 'CONFIRMED') return 'success';
    if (value === 'CANCELLED') return 'muted';
    return 'warn';
  }
  if (kind === 'item') {
    if (value === 'DELIVERED' || value === 'COMPLETED') return 'success';
    if (value === 'CANCELLED' || value === 'UNAVAILABLE') return 'muted';
    if (value === 'DELIVERING' || value === 'READY') return 'warn';
    return 'neutral';
  }
  if (value === 'DELIVERING') return 'active';
  if (value === 'READY_FOR_DELIVERY') return 'ready';
  if (value === 'DELIVERED' || value === 'COMPLETED') return 'success';
  return 'neutral';
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? '-';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}
