import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { IconArrowLeft, IconCalendarPlus, IconClipboardCheck, IconNotes, IconPackage, IconTruckDelivery } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate } from '@/features/ProductionPages/utils';
import { OperationalDelayPanel } from '@/features/operationalDelayReports/OperationalDelayPanel';
import { ProductIssuePanel } from '@/features/productIssues/ProductIssuePanel';
import {
  getRemainingQuantity,
  groupOrderItemsForDelivery,
  splitDeliveryQuantityAcrossOrderItems,
} from '@/features/deliveryTracking/deliveryItemGrouping';
import { getOrderServiceResultMessage, type DeliveryBatchDto, type OrderItemDto } from '@/services/api/orders';
import { getProjectScheduleServiceResultMessage, type ProjectScheduleDto } from '@/services/api/schedules';
import {
  useCompleteOrderDeliveryBatch,
  useCreateOrderDeliveryBatch,
  useCreateProjectSchedule,
  useDeleteProjectSchedule,
  useUpdateProjectSchedule,
  useOrderDeliveries,
  useOrderDeliveryTracking,
  useOrderDetail,
  useProductionRequests,
  useProjectScheduleList,
} from '@/services/queries';
import { getScheduleDateRangePayload } from '@/shared/utils/dateValidation';

type BatchQuantityDraft = Record<string, string>;
type ScheduleRescheduleDraft = {
  customerNote: string;
  end: string;
  location: string;
  start: string;
};
type ReadyRequestTab = 'pending' | 'delivered';

const MIN_REQUEST_PAGE_SIZE = 1;
const MAX_REQUEST_PAGE_SIZE = 100;
const DEFAULT_REQUEST_PAGE_SIZE = 4;

export function ReadyForDelivery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId') ?? '';
  const [selectedProductionRequestId, setSelectedProductionRequestId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [quantityDraft, setQuantityDraft] = useState<BatchQuantityDraft>({});
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(DEFAULT_REQUEST_PAGE_SIZE);
  const [requestTab, setRequestTab] = useState<ReadyRequestTab>('pending');
  const [isDeliveryDetailOpen, setIsDeliveryDetailOpen] = useState(false);
  const [scheduleStartInput, setScheduleStartInput] = useState(getNowDateTimeLocalInputValue());
  const [scheduleEndInput, setScheduleEndInput] = useState('');
  const [scheduleLocationInput, setScheduleLocationInput] = useState('');
  const [hasEditedScheduleLocation, setHasEditedScheduleLocation] = useState(false);
  const [reschedulingScheduleId, setReschedulingScheduleId] = useState('');
  const [rescheduleDraft, setRescheduleDraft] = useState<ScheduleRescheduleDraft>({ customerNote: '', end: '', location: '', start: '' });
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const readyRequestsQuery = useProductionRequests({ status: 'COMPLETED' });
  const readyRequests = useMemo(() => readyRequestsQuery.data?.items ?? [], [readyRequestsQuery.data?.items]);
  const selectedRequest = readyRequests.find((request) => request.productionRequestId === selectedProductionRequestId) ?? null;
  const pendingReadyRequests = useMemo(() => readyRequests.filter((request) => !isDeliveredProductionRequest(request)), [readyRequests]);
  const deliveredReadyRequests = useMemo(() => readyRequests.filter(isDeliveredProductionRequest), [readyRequests]);
  const visibleReadyRequests = requestTab === 'delivered' ? deliveredReadyRequests : pendingReadyRequests;
  const requestPageCount = Math.max(Math.ceil(visibleReadyRequests.length / requestPageSize) || 1, 1);
  const pagedReadyRequests = useMemo(
    () => visibleReadyRequests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize),
    [requestPage, requestPageSize, visibleReadyRequests],
  );

  const orderDetailQuery = useOrderDetail(selectedRequest?.orderId, { enabled: Boolean(selectedRequest?.orderId) });
  const order = orderDetailQuery.data ?? null;
  const deliveryTrackingQuery = useOrderDeliveryTracking(order?.orderId, { enabled: Boolean(order?.orderId) });
  const deliveriesQuery = useOrderDeliveries(order?.orderId, { enabled: Boolean(order?.orderId) });
  const deliverySchedulesQuery = useProjectScheduleList(
    selectedRequest
      ? {
          limit: 100,
          page: 1,
          projectId: selectedRequest.projectId,
          scheduleType: 'DELIVERY',
        }
      : undefined,
    {
      enabled: Boolean(selectedRequest?.projectId),
      fetchAll: true,
      staleTime: 60_000,
    },
  );

  const createScheduleMutation = useCreateProjectSchedule();
  const updateScheduleMutation = useUpdateProjectSchedule();
  const deleteScheduleMutation = useDeleteProjectSchedule();
  const createBatchMutation = useCreateOrderDeliveryBatch();
  const completeBatchMutation = useCompleteOrderDeliveryBatch();
  const deliverySchedules = useMemo(() => deliverySchedulesQuery.data?.items ?? [], [deliverySchedulesQuery.data?.items]);
  const deliveries = useMemo(() => deliveriesQuery.data?.items ?? [], [deliveriesQuery.data?.items]);
  const deliveriesByScheduleId = useMemo(() => {
    const map = new Map<string, DeliveryBatchDto[]>();

    deliveries.forEach((delivery) => {
      if (!delivery.projectScheduleId) {
        return;
      }

      const current = map.get(delivery.projectScheduleId) ?? [];
      current.push(delivery);
      map.set(delivery.projectScheduleId, current);
    });

    return map;
  }, [deliveries]);
  const usedScheduleIds = useMemo(() => new Set(deliveries.map((delivery) => delivery.projectScheduleId).filter(Boolean)), [deliveries]);
  const selectedSchedule = deliverySchedules.find((schedule) => getScheduleKey(schedule) === selectedScheduleId) ?? null;
  const selectedScheduleBatches = selectedScheduleId ? deliveriesByScheduleId.get(selectedScheduleId) ?? [] : [];
  const selectedScheduleBatch = selectedScheduleBatches[0] ?? null;
  const trackingItemsById = useMemo(
    () => new Map((deliveryTrackingQuery.data?.items ?? []).map((item) => [item.orderItemId, item])),
    [deliveryTrackingQuery.data?.items],
  );
  const deliverableItems = useMemo(
    () =>
      (order?.items ?? [])
        .map((item) => {
          const trackingItem = trackingItemsById.get(item.orderItemId);

          if (!trackingItem) {
            return item;
          }

          return {
            ...item,
            deliveredQuantity: trackingItem.deliveredQuantity,
            remainingDeliveryQuantity: trackingItem.remainingQuantity,
            status: trackingItem.status ?? item.status,
          } satisfies OrderItemDto;
        })
        .filter((item) => (item.quantity ?? 0) > 0 && item.status !== 'UNAVAILABLE' && item.status !== 'CANCELLED'),
    [order?.items, trackingItemsById],
  );
  const deliverableItemGroups = useMemo(() => groupOrderItemsForDelivery(deliverableItems).filter((group) => group.remainingQuantity > 0), [deliverableItems]);
  const hasRemainingQuantity = deliverableItemGroups.some((group) => group.remainingQuantity > 0);
  const trackingSummary = deliveryTrackingQuery.data?.summary;
  const deliveryDetails = deliveryTrackingQuery.data?.deliveryDetails ?? {
    deliveryAddress: order?.deliveryAddress,
    deliveryNote: order?.deliveryNote,
    receiverName: order?.receiverName,
    receiverPhone: order?.receiverPhone,
  };
  const isSelectedDeliveryCompleted = Boolean(
    selectedRequest && (
      isDeliveredProductionRequest(selectedRequest)
      || isDeliveryCompleteStatus(order?.status)
      || isDeliveryCompleteStatus(deliveryTrackingQuery.data?.orderStatus)
    ),
  );
  const canManageDelivery = !isSelectedDeliveryCompleted;

  useEffect(() => {
    setRequestPage((currentPage) => Math.min(currentPage, requestPageCount));
  }, [requestPageCount]);

  useEffect(() => {
    setRequestPage(1);
  }, [requestTab, requestPageSize]);

  useEffect(() => {
    if (!orderIdFromUrl || readyRequests.length === 0) {
      return;
    }

    const matchedRequest =
      readyRequests.find((request) => request.orderId === orderIdFromUrl)
      ?? readyRequests.find((request) => request.productionRequestId === orderIdFromUrl);

    if (!matchedRequest) {
      return;
    }

    setSelectedProductionRequestId(matchedRequest.productionRequestId);
    setRequestTab(isDeliveredProductionRequest(matchedRequest) ? 'delivered' : 'pending');
    setSearchParams({}, { replace: true });
  }, [orderIdFromUrl, readyRequests, setSearchParams]);

  useEffect(() => {
    setSelectedScheduleId('');
    setBatchNote('');
    setQuantityDraft({});
    setMessage(null);
    setScheduleLocationInput('');
    setHasEditedScheduleLocation(false);
    setReschedulingScheduleId('');
    setRescheduleDraft({ customerNote: '', end: '', location: '', start: '' });
    setIsDeliveryDetailOpen(false);
  }, [selectedRequest?.productionRequestId]);

  useEffect(() => {
    if (!selectedRequest || hasEditedScheduleLocation) {
      return;
    }

    setScheduleLocationInput(deliveryDetails.deliveryAddress ?? '');
  }, [deliveryDetails.deliveryAddress, hasEditedScheduleLocation, selectedRequest]);

  useEffect(() => {
    if (selectedScheduleId && !deliverySchedules.some((schedule) => getScheduleKey(schedule) === selectedScheduleId)) {
      setSelectedScheduleId('');
    }
  }, [deliverySchedules, selectedScheduleId]);

  useEffect(() => {
    setQuantityDraft((current) => {
      const next: BatchQuantityDraft = {};

      deliverableItemGroups.forEach((group) => {
        const remaining = group.remainingQuantity;

        if (remaining > 0) {
          next[group.groupId] = current[group.groupId] ?? '';
        }
      });

      return next;
    });
  }, [deliverableItemGroups]);

  async function createDeliverySchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequest || !order) {
      setMessage({ tone: 'error', text: 'Select a completed production request before planning delivery.' });
      return;
    }

    if (isSelectedDeliveryCompleted) {
      setMessage({ tone: 'error', text: 'This project is already completed. Delivery schedule creation is no longer available.' });
      return;
    }

    const assignedStaffId = selectedRequest.assignedTo;
    const dateRange = getScheduleDateRangePayload(scheduleStartInput, scheduleEndInput);
    const scheduleLocation = scheduleLocationInput.trim();

    if (!assignedStaffId) {
      setMessage({ tone: 'error', text: 'Production staff is required for delivery scheduling.' });
      return;
    }

    try {
      const schedule = await createScheduleMutation.mutateAsync({
        assignedStaffId,
        customerNote: 'Please confirm this delivery schedule.',
        description: `Delivery schedule for ${order.orderCode}.`,
        internalNote: 'Created by Production after production request completion.',
        location: scheduleLocation,
        projectId: selectedRequest.projectId,
        scheduleType: 'DELIVERY',
        scheduledEnd: dateRange.endIso,
        scheduledStart: dateRange.startIso,
        title: `${selectedRequest.projectName} - delivery`,
      });

      setSelectedScheduleId(getScheduleKey(schedule));
      setScheduleStartInput(getNowDateTimeLocalInputValue());
      setScheduleEndInput('');
      setScheduleLocationInput(deliveryDetails.deliveryAddress ?? '');
      setHasEditedScheduleLocation(false);
      setMessage({ tone: 'success', text: 'Delivery schedule created and sent for customer confirmation.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    }
  }

  async function createDeliveryBatch() {
    if (!order || !selectedSchedule || !canManageDelivery) return;

    const invalidQuantityDraft = deliverableItemGroups.find((group) => {
      const value = quantityDraft[group.groupId]?.trim();

      return Boolean(value) && !isValidBatchQuantityInput(value);
    });

    if (invalidQuantityDraft) {
      setMessage({ tone: 'error', text: 'Batch quantity must contain digits only.' });
      return;
    }

    const invalidGroup = deliverableItemGroups.find((group) => {
      const quantity = Number(quantityDraft[group.groupId] ?? 0);
      return Number.isFinite(quantity) && quantity > group.remainingQuantity;
    });

    if (invalidGroup) {
      setMessage({ tone: 'error', text: 'Delivery quantity cannot exceed remaining quantity.' });
      return;
    }

    const items = deliverableItemGroups.flatMap((group) => {
      const quantity = Number(quantityDraft[group.groupId] ?? 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return [];
      }

      return splitDeliveryQuantityAcrossOrderItems(group, quantity);
    });

    if (items.length === 0) {
      setMessage({ tone: 'error', text: 'Enter at least one delivery quantity.' });
      return;
    }

    const invalidItem = items.find((item) => {
      const source = deliverableItems.find((orderItem) => orderItem.orderItemId === item.orderItemId);
      return !source || item.quantity > getRemainingQuantity(source);
    });

    if (invalidItem) {
      setMessage({ tone: 'error', text: 'Delivery quantity cannot exceed remaining quantity.' });
      return;
    }

    try {
      await createBatchMutation.mutateAsync({
        items,
        note: batchNote,
        orderId: order.orderId,
        projectScheduleId: getScheduleKey(selectedSchedule),
      });
      setBatchNote('');
      setQuantityDraft({});
      setMessage({ tone: 'success', text: 'Delivery batch started for the selected schedule.' });
      void orderDetailQuery.refetch();
      void deliveryTrackingQuery.refetch();
      void deliveriesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  async function completeDeliveryBatch(delivery: DeliveryBatchDto) {
    if (!order || !canManageDelivery) return;

    try {
      await completeBatchMutation.mutateAsync({ deliveryId: delivery.deliveryId, orderId: order.orderId });
      setMessage({ tone: 'success', text: 'Delivery batch completed. Linked schedule will sync to completed.' });
      void orderDetailQuery.refetch();
      void deliveryTrackingQuery.refetch();
      void deliveriesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
    }
  }

  function openRescheduleEditor(schedule: ProjectScheduleDto) {
    setReschedulingScheduleId(getScheduleKey(schedule));
    setRescheduleDraft({
      customerNote: schedule.customerNote ?? '',
      end: schedule.scheduledEnd ? toDateTimeLocalInputValue(schedule.scheduledEnd) : '',
      location: schedule.location ?? deliveryDetails.deliveryAddress ?? '',
      start: toDateTimeLocalInputValue(schedule.scheduledStart),
    });
  }

  async function rescheduleDeliverySchedule(event: FormEvent<HTMLFormElement>, schedule: ProjectScheduleDto) {
    event.preventDefault();

    const assignedStaffId = schedule.assignedStaffId ?? selectedRequest?.assignedTo ?? null;
    const dateRange = getScheduleDateRangePayload(rescheduleDraft.start, rescheduleDraft.end);
    const location = rescheduleDraft.location.trim();

    if (!assignedStaffId) {
      setMessage({ tone: 'error', text: 'Production staff is required for delivery scheduling.' });
      return;
    }

    try {
      const updatedSchedule = await updateScheduleMutation.mutateAsync({
        assignedStaffId,
        customerNote: rescheduleDraft.customerNote || 'Please confirm this updated delivery schedule.',
        description: schedule.description,
        internalNote: schedule.internalNote,
        location,
        scheduleId: schedule.scheduleId,
        scheduledEnd: dateRange.endIso,
        scheduledStart: dateRange.startIso,
        title: schedule.title,
      });

      setSelectedScheduleId(getScheduleKey(updatedSchedule));
      setReschedulingScheduleId('');
      setMessage({ tone: 'success', text: 'Delivery schedule updated. Customer may need to confirm the new time again.' });
      void deliverySchedulesQuery.refetch();
      void deliveryTrackingQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    }
  }

  async function deleteDeliverySchedule(schedule: ProjectScheduleDto) {
    const scheduleKey = getScheduleKey(schedule);
    const confirmed = window.confirm(`Delete ${schedule.title ?? 'delivery schedule'}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteScheduleMutation.mutateAsync(schedule.scheduleId);
      if (selectedScheduleId === scheduleKey) {
        setSelectedScheduleId('');
      }
      if (reschedulingScheduleId === scheduleKey) {
        setReschedulingScheduleId('');
      }
      setMessage({ tone: 'success', text: 'Delivery schedule deleted successfully.' });
      void deliverySchedulesQuery.refetch();
      void deliveryTrackingQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    }
  }

  function updateBatchQuantityDraft(groupId: string, value: string) {
    const nextValue = value.replace(/\D/g, '');

    setQuantityDraft((current) => ({ ...current, [groupId]: nextValue }));
    setMessage(null);
  }

  function renderScheduleCard(schedule: ProjectScheduleDto) {
    const scheduleKey = getScheduleKey(schedule);
    const linkedBatches = deliveriesByScheduleId.get(scheduleKey) ?? [];
    const linkedBatch = linkedBatches[0] ?? null;
    const canSelect = canUseScheduleForBatch(schedule, usedScheduleIds);
    const isRescheduling = reschedulingScheduleId === scheduleKey;
    const isCustomerConfirmedSchedule = isConfirmedDeliverySchedule(schedule);
    const canReschedule = canManageDelivery && !isCustomerConfirmedSchedule && !linkedBatch && !isCompletedSchedule(schedule) && !isCancelledSchedule(schedule);
    const canDelete = canManageDelivery && !isCustomerConfirmedSchedule && !linkedBatch && !isCompletedSchedule(schedule);

    return (
      <article
        className={`production-workspace-queue-card ${scheduleKey === selectedScheduleId ? 'is-active' : ''}`}
        key={scheduleKey}
      >
        <button
          className="production-ready-schedule-select"
          type="button"
          onClick={() => setSelectedScheduleId(scheduleKey)}
        >
          <strong>
            {schedule.title ?? 'Delivery schedule'}
            <span>{formatEnumLabel(schedule.status)}</span>
          </strong>
          <p>{formatDateTime(schedule.scheduledStart)}{schedule.scheduledEnd ? ` -> ${formatDateTime(schedule.scheduledEnd)}` : ''}</p>
          <small>{linkedBatches.length > 0 ? `${linkedBatches.length} batch(es) - ${formatEnumLabel(linkedBatch?.status ?? 'COMPLETED')}` : canSelect ? 'Ready for batch' : 'Waiting for confirmation or already used'}</small>
        </button>
        <div className="production-ready-schedule-actions">
          {canReschedule ? (
            <button
              className="is-secondary"
              disabled={updateScheduleMutation.isPending || deleteScheduleMutation.isPending}
              type="button"
              onClick={() => {
                if (isRescheduling) {
                  setReschedulingScheduleId('');
                } else {
                  openRescheduleEditor(schedule);
                }
              }}
            >
              {isRescheduling ? 'Close' : 'Reschedule'}
            </button>
          ) : null}
          {canDelete ? (
            <button
              className="is-danger"
              disabled={deleteScheduleMutation.isPending}
              type="button"
              onClick={() => void deleteDeliverySchedule(schedule)}
            >
              {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          ) : null}
        </div>
        {isRescheduling && canReschedule ? (
          <form className="production-ready-reschedule-form" onSubmit={(event) => void rescheduleDeliverySchedule(event, schedule)}>
            <div className="production-workspace-form-grid">
              <label>
                <span>New start</span>
                <input
                  className="production-workspace-input"
                  type="datetime-local"
                  value={rescheduleDraft.start}
                  onChange={(event) => setRescheduleDraft((current) => ({ ...current, start: event.target.value }))}
                />
              </label>
              <label>
                <span>New end</span>
                <input
                  className="production-workspace-input"
                  type="datetime-local"
                  value={rescheduleDraft.end}
                  onChange={(event) => setRescheduleDraft((current) => ({ ...current, end: event.target.value }))}
                />
              </label>
            </div>
            <label>
              <span>Location</span>
              <input
                className="production-workspace-input"
                value={rescheduleDraft.location}
                onChange={(event) => setRescheduleDraft((current) => ({ ...current, location: event.target.value }))}
              />
            </label>
            <label>
              <span>Customer note</span>
              <textarea
                className="production-workspace-textarea"
                value={rescheduleDraft.customerNote}
                onChange={(event) => setRescheduleDraft((current) => ({ ...current, customerNote: event.target.value }))}
              />
            </label>
            <div className="production-workspace-row-actions">
              <button disabled={updateScheduleMutation.isPending} type="submit">
                {updateScheduleMutation.isPending ? 'Saving...' : 'Save Reschedule'}
              </button>
              <button className="is-secondary" disabled={updateScheduleMutation.isPending} type="button" onClick={() => setReschedulingScheduleId('')}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        {scheduleKey === selectedScheduleId && linkedBatches.length > 0 ? (
          <DeliveryBatchDetailList deliveries={linkedBatches} />
        ) : null}
      </article>
    );
  }

  return (
    <ProductionLayout activeLabel="Ready for Delivery" searchPlaceholder="Search ready production requests...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Ready for Delivery</h2>
            <p>Plan multiple delivery schedules, deliver partial quantities by batch, and let completed batches sync schedules automatically.</p>
          </div>
        </section>

        {readyRequestsQuery.isError ? <section className="production-workspace-message production-workspace-message-error">Cannot load completed production requests.</section> : null}
        {orderDetailQuery.isError ? <section className="production-workspace-message production-workspace-message-error">{getOrderServiceResultMessage(orderDetailQuery.error)}</section> : null}
        {deliverySchedulesQuery.isError ? <section className="production-workspace-message production-workspace-message-error">{getProjectScheduleServiceResultMessage(deliverySchedulesQuery.error)}</section> : null}
        {deliveryTrackingQuery.isError ? <section className="production-workspace-message production-workspace-message-error">{getOrderServiceResultMessage(deliveryTrackingQuery.error)}</section> : null}

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconTruckDelivery} label="Ready Requests" value={readyRequests.length} />
          <ProductionSummaryCard icon={IconPackage} label="Remaining Qty" value={trackingSummary?.remainingQuantity ?? sumRemainingQuantity(deliverableItems)} />
          <ProductionSummaryCard icon={IconNotes} label="Upcoming Schedules" value={trackingSummary?.upcomingDeliveryCount ?? deliverySchedules.filter(isConfirmedDeliverySchedule).length} />
          <ProductionSummaryCard icon={IconClipboardCheck} label="Completed Batches" value={trackingSummary?.completedDeliveryCount ?? deliveries.filter(isCompletedDeliveryBatch).length} />
        </section>

        <section className="production-workspace-grid production-ready-layout">
          <article className="production-workspace-card production-ready-request-card">
            <header>
              <div>
                <h3>Delivery Order Queue</h3>
              </div>
              <div className="production-ready-request-tabs" role="tablist" aria-label="Delivery order queue">
                <button
                  className={requestTab === 'pending' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={requestTab === 'pending'}
                  onClick={() => setRequestTab('pending')}
                >
                  Not Delivered
                  <span>{pendingReadyRequests.length}</span>
                </button>
                <button
                  className={requestTab === 'delivered' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={requestTab === 'delivered'}
                  onClick={() => setRequestTab('delivered')}
                >
                  Delivered
                  <span>{deliveredReadyRequests.length}</span>
                </button>
              </div>
            </header>
            <div className="production-workspace-list">
              {readyRequestsQuery.isLoading ? <p className="production-workspace-muted">Loading completed requests...</p> : null}
              {!readyRequestsQuery.isLoading && readyRequests.length === 0 ? <p className="production-workspace-muted">No completed production request is ready for delivery yet.</p> : null}
              {!readyRequestsQuery.isLoading && readyRequests.length > 0 && visibleReadyRequests.length === 0 ? (
                <p className="production-workspace-muted">No order in this delivery tab yet.</p>
              ) : null}
              {pagedReadyRequests.map((request) => (
                <article
                  className={`production-workspace-queue-card ${request.productionRequestId === selectedProductionRequestId ? 'is-active' : ''}`}
                  key={request.productionRequestId}
                >
                  <button
                    className="production-ready-request-select"
                    type="button"
                    onClick={() => setSelectedProductionRequestId(request.productionRequestId)}
                  >
                    <strong>
                      {request.projectName}
                      <span>{request.productionCode}</span>
                    </strong>
                    <p>{request.orderCode}</p>
                  </button>
                  <div className="production-ready-request-footer">
                    <small>
                      {request.productionItemCount ?? 0} item(s) - completed {formatDate(request.updatedAt)}
                    </small>
                    <button
                      className="production-ready-request-detail-button"
                      type="button"
                      onClick={() => {
                        setSelectedProductionRequestId(request.productionRequestId);
                        setIsDeliveryDetailOpen(true);
                        setSelectedScheduleId('');
                      }}
                    >
                      Detail
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!readyRequestsQuery.isLoading ? (
              <ReadyDeliveryQueuePager
                page={requestPage}
                pageSize={requestPageSize}
                totalItems={visibleReadyRequests.length}
                totalPages={requestPageCount}
                onChange={setRequestPage}
                onPageSizeChange={(nextSize) => {
                  setRequestPageSize(nextSize);
                  setRequestPage(1);
                }}
              />
            ) : null}
          </article>
          <div className="production-workspace-page production-ready-control-column">
            {message ? <section className={`production-workspace-message production-workspace-message-${message.tone}`}>{message.text}</section> : null}
            {!selectedRequest ? (
              <article className="production-workspace-card production-ready-empty-state">
                <header>
                  <div>
                    <h3>Create Delivery Schedule</h3>
                    <p>Select an order from the queue to create delivery schedules and execute batches.</p>
                  </div>
                </header>
              </article>
            ) : !isDeliveryDetailOpen ? (
              <article className="production-workspace-card production-ready-schedule-panel">
                <header>
                  <div>
                    <h3>
                      {canManageDelivery ? <IconCalendarPlus size={18} /> : null}
                      {canManageDelivery ? 'Create Delivery Schedule' : 'Delivery Summary'}
                    </h3>
                    <p>{selectedRequest.projectName}</p>
                  </div>
                  {order?.status ? <ProductionStatusBadge label={formatEnumLabel(order.status)} status={order.status} /> : null}
                </header>

                {order ? (
                  <div className="production-workspace-detail-grid production-ready-compact-grid">
                    <Field label="Order" value={order.orderCode} />
                    <Field label="Remaining" value={`${trackingSummary?.remainingQuantity ?? sumRemainingQuantity(deliverableItems)} item(s)`} />
                    <Field label="Next delivery" value={trackingSummary?.nextDeliveryAt ? formatDateTime(trackingSummary.nextDeliveryAt) : 'Not scheduled'} />
                  </div>
                ) : null}

                {order ? (
                  <DeliveryDetailsSummary
                    deliveryAddress={deliveryDetails.deliveryAddress ?? null}
                    deliveryNote={deliveryDetails.deliveryNote ?? null}
                    receiverName={deliveryDetails.receiverName ?? null}
                    receiverPhone={deliveryDetails.receiverPhone ?? null}
                  />
                ) : null}

                {canManageDelivery ? (
                  <form className="production-workspace-form production-ready-deliverable-section" onSubmit={(event) => void createDeliverySchedule(event)}>
                    <div className="production-workspace-form-grid">
                      <label>
                        <span>Start</span>
                        <input className="production-workspace-input" type="datetime-local" value={scheduleStartInput} onChange={(event) => setScheduleStartInput(event.target.value)} />
                      </label>
                      <label>
                        <span>End</span>
                        <input className="production-workspace-input" type="datetime-local" value={scheduleEndInput} onChange={(event) => setScheduleEndInput(event.target.value)} />
                      </label>
                    </div>
                    <label>
                      <span>Location</span>
                      <input
                        className="production-workspace-input"
                        placeholder="Delivery location"
                        value={scheduleLocationInput}
                        onChange={(event) => {
                          setScheduleLocationInput(event.target.value);
                          setHasEditedScheduleLocation(true);
                        }}
                      />
                    </label>
                    <div className="production-workspace-row-actions">
                      <button disabled={!order || !hasRemainingQuantity || createScheduleMutation.isPending} type="submit">
                        {createScheduleMutation.isPending ? 'Creating...' : 'Create Delivery Schedule'}
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            ) : (
              <>
                <article className="production-workspace-card production-ready-schedule-panel">
                  <header>
                    <div>
                      <h3>Delivery Details</h3>
                    </div>
                    {order?.status ? <ProductionStatusBadge label={formatEnumLabel(order.status)} status={order.status} /> : null}
                  </header>

                  {order ? (
                    <div className="production-workspace-detail-grid production-ready-compact-grid">
                      <Field label="Project" value={selectedRequest.projectName} />
                      <Field label="Order" value={order.orderCode} />
                      <Field label="Remaining" value={`${trackingSummary?.remainingQuantity ?? sumRemainingQuantity(deliverableItems)} item(s)`} />
                      <Field label="Next delivery" value={trackingSummary?.nextDeliveryAt ? formatDateTime(trackingSummary.nextDeliveryAt) : 'Not scheduled'} />
                    </div>
                  ) : null}

                  {order ? (
                    <DeliveryDetailsSummary
                      deliveryAddress={deliveryDetails.deliveryAddress ?? null}
                      deliveryNote={deliveryDetails.deliveryNote ?? null}
                      receiverName={deliveryDetails.receiverName ?? null}
                      receiverPhone={deliveryDetails.receiverPhone ?? null}
                    />
                  ) : null}
                </article>

                <article className="production-workspace-card production-ready-schedules-panel">
                  <header>
                    <div>
                      <h3>Schedules & Batches</h3>
                    </div>
                    {canManageDelivery ? (
                      <button
                        className="production-workspace-button production-workspace-button-secondary"
                        type="button"
                        onClick={() => {
                          setIsDeliveryDetailOpen(false);
                          setSelectedScheduleId('');
                        }}
                      >
                        <IconArrowLeft size={16} />
                        Back
                      </button>
                    ) : null}
                  </header>
                  <div className="production-workspace-list production-ready-schedule-list">
                    {deliverySchedulesQuery.isLoading ? <p className="production-workspace-muted">Loading delivery schedules...</p> : null}
                    {!deliverySchedulesQuery.isLoading && deliverySchedules.length === 0 ? <p className="production-workspace-muted">No delivery schedule yet.</p> : null}
                    {deliverySchedules.map(renderScheduleCard)}
                  </div>
                </article>

                {canManageDelivery ? (
                  <article className="production-workspace-card">
              <header>
                <div>
                  <h3>Execute Batch</h3>
                  <p>Enter only the quantities delivered in this schedule.</p>
                </div>
                <div className="production-ready-plan-actions">
                  {selectedSchedule ? <ProductionStatusBadge label={formatEnumLabel(selectedSchedule.status)} status={selectedSchedule.status} /> : null}
                </div>
              </header>
              {selectedScheduleBatch ? (
                <div className="production-workspace-row-actions">
                  <Field label="Linked batch" value={formatEnumLabel(selectedScheduleBatch.status)} />
                  {isInProgressDeliveryBatch(selectedScheduleBatch) ? (
                    <button disabled={completeBatchMutation.isPending} type="button" onClick={() => void completeDeliveryBatch(selectedScheduleBatch)}>
                      {completeBatchMutation.isPending ? 'Completing...' : 'Complete Batch'}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {!selectedSchedule ? <p className="production-workspace-muted">Select a confirmed unused delivery schedule first.</p> : null}
              {selectedSchedule && !canUseScheduleForBatch(selectedSchedule, usedScheduleIds) && !selectedScheduleBatch ? (
                <p className="production-workspace-muted">This schedule cannot start a batch yet.</p>
              ) : null}
              {selectedSchedule && canUseScheduleForBatch(selectedSchedule, usedScheduleIds) ? (
                <>
                  <div className="production-workspace-table-wrap production-ready-items-wrap production-ready-deliverable-section">
                    <table className="production-workspace-table production-ready-items-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Ordered</th>
                          <th>Delivered</th>
                          <th>This Batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliverableItemGroups.map((group) => {
                          return (
                            <tr key={group.groupId}>
                              <td>
                                <strong>{group.productName}</strong>
                                <small>{group.sourceItems.length > 1 ? `${group.sourceItems.length} matching line(s) - ` : ''}{formatEnumLabel(group.status ?? 'PENDING')}</small>
                              </td>
                              <td>{group.orderedQuantity}</td>
                              <td>{group.deliveredQuantity} / {group.orderedQuantity}</td>
                              <td>
                                <input
                                  className="production-workspace-quantity-input"
                                  disabled={group.remainingQuantity <= 0 || createBatchMutation.isPending}
                                  inputMode="numeric"
                                  max={group.remainingQuantity}
                                  min={0}
                                  pattern="[0-9]*"
                                  type="text"
                                  value={quantityDraft[group.groupId] ?? ''}
                                  onChange={(event) => updateBatchQuantityDraft(group.groupId, event.target.value)}
                                  onKeyDown={blockInvalidBatchQuantityKey}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <label className="production-workspace-form production-ready-deliverable-section production-ready-batch-note">
                    <span>Batch note</span>
                    <textarea className="production-workspace-textarea" value={batchNote} onChange={(event) => setBatchNote(event.target.value)} />
                  </label>
                  <div className="production-workspace-row-actions production-ready-batch-actions">
                    <button disabled={createBatchMutation.isPending || !hasRemainingQuantity} type="button" onClick={() => void createDeliveryBatch()}>
                      {createBatchMutation.isPending ? 'Starting...' : 'Start Batch'}
                    </button>
                  </div>
                </>
              ) : null}
                  </article>
                ) : null}
              </>
            )}
          </div>
        </section>
        {selectedRequest ? (
          <>
            <OperationalDelayPanel
              allowedPhases={['DELIVERY']}
              defaultPhase="DELIVERY"
              deliveryId={selectedScheduleBatch?.deliveryId}
              orderId={order?.orderId ?? selectedRequest.orderId}
              projectId={selectedRequest.projectId}
              title="Delivery delay history"
            />
            <ProductIssuePanel
              orderId={order?.orderId ?? selectedRequest.orderId}
              projectId={selectedRequest.projectId}
              title="Customer product issues"
            />
          </>
        ) : null}
      </div>
    </ProductionLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="production-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DeliveryDetailsSummary({
  deliveryAddress,
  deliveryNote,
  receiverName,
  receiverPhone,
}: {
  deliveryAddress?: string | null;
  deliveryNote?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
}) {
  return (
    <section className="production-ready-delivery-details">
      <header>
        <h4>Locked Delivery Details</h4>
      </header>
      <div className="production-workspace-detail-grid production-ready-compact-grid">
        <Field label="Address" value={deliveryAddress || 'Not provided'} />
        <Field label="Receiver" value={receiverName || 'Not provided'} />
        <Field label="Phone" value={receiverPhone || 'Not provided'} />
        <Field label="Note" value={deliveryNote || '-'} />
      </div>
    </section>
  );
}

function DeliveryBatchDetailList({ deliveries }: { deliveries: DeliveryBatchDto[] }) {
  return (
    <div className="production-ready-batch-detail-list">
      {deliveries.map((delivery) => (
        <section className="production-ready-batch-detail" key={delivery.deliveryId}>
          <header>
            <div>
              <strong>{getDeliveryBatchLabel(delivery)}</strong>
              <span>{formatEnumLabel(delivery.status)}</span>
            </div>
            <small>{formatBatchTimeRange(delivery)}</small>
          </header>

          {delivery.note ? <p>{delivery.note}</p> : null}

          <div className="production-ready-batch-item-list">
            {delivery.items.length > 0 ? (
              delivery.items.map((item) => (
                <div className="production-ready-batch-item" key={item.deliveryItemId ?? `${delivery.deliveryId}-${item.orderItemId}`}>
                  <span>{getDeliveryBatchItemName(item)}</span>
                  <strong>{getDeliveryBatchItemQuantity(item)}</strong>
                </div>
              ))
            ) : (
              <span className="production-workspace-muted">No delivered items recorded for this batch.</span>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function canUseScheduleForBatch(schedule: ProjectScheduleDto, usedScheduleIds: Set<string | null | undefined>) {
  if (!isConfirmedDeliverySchedule(schedule)) return false;
  if (usedScheduleIds.has(getScheduleKey(schedule))) return false;

  return true;
}

function isConfirmedDeliverySchedule(schedule: ProjectScheduleDto) {
  const status = normalizeWorkflowStatus(schedule.status);

  return status === 'CONFIRMED' || status === 'DELIVERY_CONFIRMED' || status === 'CUSTOMER_CONFIRMED' || status === 'CONFIRMED_DELIVERY';
}

function blockInvalidBatchQuantityKey(event: KeyboardEvent<HTMLInputElement>) {
  if (
    event.ctrlKey
    || event.metaKey
    || event.altKey
    || ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'].includes(event.key)
  ) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

function isValidBatchQuantityInput(value: string) {
  return /^\d+$/.test(value);
}

function isInProgressDeliveryBatch(delivery: DeliveryBatchDto) {
  const status = normalizeWorkflowStatus(delivery.status);

  return status === 'IN_PROGRESS' || status === 'DELIVERY_IN_PROGRESS';
}

function isCompletedDeliveryBatch(delivery: DeliveryBatchDto) {
  const status = normalizeWorkflowStatus(delivery.status);

  return status === 'COMPLETED' || status === 'DELIVERY_COMPLETED';
}

function isCompletedSchedule(schedule: ProjectScheduleDto) {
  return normalizeWorkflowStatus(schedule.status) === 'COMPLETED' || normalizeWorkflowStatus(schedule.status) === 'DELIVERY_COMPLETED';
}

function isCancelledSchedule(schedule: ProjectScheduleDto) {
  return normalizeWorkflowStatus(schedule.status) === 'CANCELLED' || normalizeWorkflowStatus(schedule.status) === 'DELIVERY_CANCELLED';
}

function normalizeWorkflowStatus(value?: string | null) {
  return (value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function isDeliveredProductionRequest(request: unknown) {
  const record = request as Record<string, unknown>;
  const deliveredAtFields = ['deliveredAt', 'deliveryCompletedAt', 'customerConfirmedDeliveryAt', 'completedDeliveryAt'];

  if (deliveredAtFields.some((field) => typeof record[field] === 'string' && Boolean(record[field]))) {
    return true;
  }

  const status = normalizeWorkflowStatus(
    getStringRecordValue(record, 'orderStatus')
      ?? getStringRecordValue(record, 'deliveryStatus')
      ?? getStringRecordValue(record, 'projectStatus')
      ?? getStringRecordValue(record, 'relatedProjectStatus'),
  );

  return ['DELIVERED', 'COMPLETED', 'ORDER_DELIVERED', 'DELIVERY_COMPLETED', 'CUSTOMER_CONFIRMED_DELIVERY'].includes(status);
}

function isDeliveryCompleteStatus(status?: string | null) {
  return ['DELIVERED', 'COMPLETED', 'ORDER_DELIVERED', 'DELIVERY_COMPLETED', 'CUSTOMER_CONFIRMED_DELIVERY'].includes(normalizeWorkflowStatus(status));
}

function getStringRecordValue(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === 'string' ? value : null;
}

function getScheduleKey(schedule: ProjectScheduleDto) {
  return schedule.projectScheduleId ?? schedule.scheduleId;
}

function getDeliveryBatchLabel(delivery: DeliveryBatchDto) {
  return `Batch ${delivery.deliveryId.slice(0, 8)}`;
}

function getDeliveryBatchItemName(item: DeliveryBatchDto['items'][number]) {
  return item.productName?.trim()
    || item.productNameSnapshot?.trim()
    || item.itemName?.trim()
    || item.orderItemId;
}

function getDeliveryBatchItemQuantity(item: DeliveryBatchDto['items'][number]) {
  return item.quantity ?? item.batchQuantity ?? item.deliveredQuantity ?? 0;
}

function formatBatchTimeRange(delivery: DeliveryBatchDto) {
  const startedAt = delivery.schedule?.scheduledStart ?? delivery.createdAt;
  const endedAt = delivery.completedAt ?? delivery.schedule?.completedAt ?? delivery.schedule?.scheduledEnd;

  return [
    startedAt ? `Start ${formatDateTime(startedAt)}` : null,
    endedAt ? `Done ${formatDateTime(endedAt)}` : null,
  ].filter(Boolean).join(' | ') || 'No timing recorded';
}

function ReadyDeliveryQueuePager({
  page,
  pageSize,
  totalPages,
  totalItems,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  function commitPage() {
    const parsed = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }

    const next = Math.min(Math.max(parsed, 1), safeTotalPages);
    setPageDraft(String(next));
    if (next !== page) onChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(pageSize));
      return;
    }

    const next = Math.min(Math.max(parsed, MIN_REQUEST_PAGE_SIZE), MAX_REQUEST_PAGE_SIZE);
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <div className="admin-financial-pager production-ready-queue-pager">
      <div className="admin-financial-pager-meta">
        <label className="admin-financial-pager-field">
          <span>Rows / page</span>
          <input
            aria-label="Rows per page"
            inputMode="numeric"
            max={MAX_REQUEST_PAGE_SIZE}
            min={MIN_REQUEST_PAGE_SIZE}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <label className="admin-financial-pager-field">
          <span>Page</span>
          <input
            aria-label="Page"
            inputMode="numeric"
            max={safeTotalPages}
            min={1}
            type="number"
            value={pageDraft}
            onBlur={commitPage}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="admin-financial-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="admin-financial-pager-total">{totalItems} total</span>
      </div>
      <div className="admin-financial-pager-nav">
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button disabled={page >= safeTotalPages} type="button" onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function sumRemainingQuantity(items: OrderItemDto[]) {
  return items.reduce((total, item) => total + getRemainingQuantity(item), 0);
}

function getNowDateTimeLocalInputValue() {
  const now = new Date();
  now.setSeconds(0, 0);

  return toDateTimeLocalInputValue(now.toISOString());
}

function toDateTimeLocalInputValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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
