import { IconCalendarPlus, IconTruckDelivery } from '@tabler/icons-react';
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

const trackingProjectStatuses = new Set([
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

export function SaleTracking() {
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
  const trackingProjects = useMemo(() => projects.filter((project) => trackingProjectStatuses.has(project.status)), [projects]);
  const selectedProject = trackingProjects.find((project) => project.projectId === selectedProjectId) ?? null;
  const projectDetailQuery = useProjectDetail(selectedProjectId || undefined);
  const projectDetail = projectDetailQuery.data ?? null;
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const deliverySchedulesQuery = useProjectScheduleList(
    selectedProjectId
      ? {
          limit: 20,
          page: 1,
          projectId: selectedProjectId,
          scheduleType: 'DELIVERY',
        }
      : undefined,
  );
  const createScheduleMutation = useCreateProjectSchedule();
  const startDeliveryMutation = useStartOrderDelivery();
  const deliverySchedules = deliverySchedulesQuery.data?.items ?? [];
  const confirmedDeliverySchedule = deliverySchedules.some((schedule) => schedule.status === 'CONFIRMED');

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

    if (!scheduledStart) {
      setMessage({ tone: 'error', text: 'Please choose a delivery start time.' });
      return;
    }

    if (scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      setMessage({ tone: 'error', text: 'Delivery end time must be after the start time.' });
      return;
    }

    setMessage(null);

    try {
      await createScheduleMutation.mutateAsync({
        projectId: selectedProject.projectId,
        scheduleType: 'DELIVERY',
        title: String(formData.get('title') ?? '').trim() || `${selectedProject.projectName} - delivery`,
        description: String(formData.get('description') ?? '').trim() || null,
        scheduledStart: toIsoString(scheduledStart),
        scheduledEnd: scheduledEnd ? toIsoString(scheduledEnd) : null,
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
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  return (
    <div className="sale-tracking-shell">
      <SaleSidebar activeLabel="Tracking" />
      <div className="sale-tracking-content">
        <SaleNavbar />
        <main className="sale-tracking-main">
          <section className="sale-tracking-heading">
            <div>
              <h2>Delivery Tracking</h2>
              <p>Track delivery schedules, order state, and item delivery progress for assigned projects.</p>
            </div>
          </section>

          {message ? <section className={`sale-tracking-message sale-tracking-message-${message.tone}`}>{message.text}</section> : null}
          {currentUserQuery.isError ? <section className="sale-tracking-message sale-tracking-message-error">Cannot load current sales account.</section> : null}
          {projectsQuery.isError ? <section className="sale-tracking-message sale-tracking-message-error">Cannot load assigned delivery projects.</section> : null}
          {ordersQuery.isError ? <section className="sale-tracking-message sale-tracking-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section> : null}
          {deliverySchedulesQuery.isError ? <section className="sale-tracking-message sale-tracking-message-error">{getProjectScheduleServiceResultMessage(deliverySchedulesQuery.error)}</section> : null}

          <section className="sale-tracking-layout">
            <aside className="sale-tracking-project-panel">
              <header>
                <h3>Delivery Projects</h3>
                <p>Projects ready for delivery or already in delivery.</p>
              </header>
              {projectsQuery.isLoading ? <p className="sale-tracking-muted">Loading projects...</p> : null}
              {!projectsQuery.isLoading && trackingProjects.length === 0 ? <p className="sale-tracking-muted">No project is ready for delivery tracking.</p> : null}
              <div className="sale-tracking-project-list">
                {trackingProjects.map((project) => (
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

            <section className="sale-tracking-workspace">
              <section className="sale-tracking-card">
                <header>
                  <div>
                    <h3>Delivery Overview</h3>
                    <p>{selectedProject ? `${selectedProject.projectCode} - ${selectedProject.projectName}` : 'Select a project to review delivery.'}</p>
                  </div>
                  <span>{order?.status ? formatEnumLabel(order.status) : '-'}</span>
                </header>
                {selectedProject && order ? (
                  <div className="sale-tracking-overview-grid">
                    <Field label="Order" value={order.orderCode} />
                    <Field label="Project Address" value={projectDetail?.projectAddress ?? '-'} />
                    <Field label="Delivery Schedule Confirmed" value={confirmedDeliverySchedule ? 'Yes' : 'No'} />
                    <Field label="Remaining Amount" value={formatMoney(order.remainingAmount)} />
                  </div>
                ) : (
                  <p className="sale-tracking-muted">No order is available for this project.</p>
                )}
                <div className="sale-tracking-actions">
                  <button
                    disabled={!order || order.status !== 'READY_FOR_DELIVERY' || !confirmedDeliverySchedule || startDeliveryMutation.isPending}
                    type="button"
                    onClick={() => void startDelivery()}
                  >
                    <IconTruckDelivery size={16} />
                    {startDeliveryMutation.isPending ? 'Starting...' : 'Start Delivery'}
                  </button>
                </div>
              </section>

              <section className="sale-tracking-grid">
                <form className="sale-tracking-card sale-tracking-form" onSubmit={createDeliverySchedule}>
                  <header>
                    <div>
                      <h3>Create Delivery Schedule</h3>
                      <p>Location defaults to the project address and can be adjusted before sending.</p>
                    </div>
                  </header>
                  <label>
                    <span>Title</span>
                    <input name="title" placeholder={selectedProject ? `${selectedProject.projectName} - delivery` : 'Delivery schedule'} />
                  </label>
                  <div>
                    <label>
                      <span>Start</span>
                      <input name="scheduledStart" required type="datetime-local" />
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
                      placeholder={projectDetailQuery.isLoading ? 'Loading project address...' : 'Delivery address'}
                    />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea name="description" placeholder="Delivery notes for customer and team" />
                  </label>
                  <button disabled={!selectedProject || createScheduleMutation.isPending} type="submit">
                    <IconCalendarPlus size={16} />
                    {createScheduleMutation.isPending ? 'Creating...' : 'Create Delivery Schedule'}
                  </button>
                </form>

                <section className="sale-tracking-card">
                  <header>
                    <div>
                      <h3>Delivery Schedules</h3>
                      <p>Customer confirmation remains on the customer side.</p>
                    </div>
                  </header>
                  <div className="sale-tracking-list">
                    {deliverySchedulesQuery.isLoading ? <p className="sale-tracking-muted">Loading delivery schedules...</p> : null}
                    {!deliverySchedulesQuery.isLoading && deliverySchedules.length === 0 ? <p className="sale-tracking-muted">No delivery schedule has been created.</p> : null}
                    {deliverySchedules.map((schedule) => (
                      <article key={schedule.scheduleId}>
                        <strong>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</strong>
                        <span>{formatDateTime(schedule.scheduledStart)}{schedule.scheduledEnd ? ` - ${formatDateTime(schedule.scheduledEnd)}` : ''}</span>
                        <small>{schedule.location ?? '-'} - {formatEnumLabel(schedule.status)}</small>
                      </article>
                    ))}
                  </div>
                </section>
              </section>

              <section className="sale-tracking-card">
                <header>
                  <div>
                    <h3>Delivery Items</h3>
                    <p>Delivered quantity is updated by Production. Sales can monitor progress here.</p>
                  </div>
                </header>
                <div className="sale-tracking-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Delivered</th>
                        <th>Status</th>
                        <th>Customer Confirmed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetailQuery.isLoading ? <tr><td colSpan={6}>Loading order items...</td></tr> : null}
                      {!orderDetailQuery.isLoading && !order ? <tr><td colSpan={6}>Select a project with an order to view delivery items.</td></tr> : null}
                      {order?.items.map((item) => (
                        <tr key={item.orderItemId}>
                          <td>{getOrderItemName(item)}</td>
                          <td>{formatEnumLabel(item.itemType ?? 'UNKNOWN')}</td>
                          <td>{item.quantity ?? '-'}</td>
                          <td>{item.deliveredQuantity ?? 0}</td>
                          <td>{formatEnumLabel(item.status ?? 'PENDING')}</td>
                          <td>{item.customerConfirmedAt ? formatDateTime(item.customerConfirmedAt) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
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

function toIsoString(value: string) {
  return new Date(value).toISOString();
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}
