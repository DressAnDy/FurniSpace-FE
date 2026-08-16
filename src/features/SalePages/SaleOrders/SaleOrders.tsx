import { IconCircleCheck, IconSettings, IconUserPlus } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto } from '@/services/api/orders';
import { getProductionServiceResultMessage } from '@/services/api/production';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useAvailableProductionStaff,
  useCompleteOrder,
  useCreateOrderDepositPayment,
  useCreateOrderRemainingPayment,
  useCreateProductionRequest,
  useCurrentUser,
  useOrderDetail,
  usePrepareOrderFinalPayment,
  useProjectDetail,
  useProjectList,
  useProjectOrders,
} from '@/services/queries';
import { getLocalDateInputValue, getMinimumEndDateInputValue, validateOptionalFutureDateRange } from '@/shared/utils/dateValidation';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './SaleOrders.css';

const PROJECT_PAGE_SIZE = 4;

const orderProjectStatuses = new Set([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

export function SaleOrders() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [projectPage, setProjectPage] = useState(1);
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
  const projectTotalPages = Math.max(1, Math.ceil(orderProjects.length / PROJECT_PAGE_SIZE));
  const currentProjectPage = Math.min(projectPage, projectTotalPages);
  const pagedOrderProjects = useMemo(
    () => orderProjects.slice((currentProjectPage - 1) * PROJECT_PAGE_SIZE, currentProjectPage * PROJECT_PAGE_SIZE),
    [currentProjectPage, orderProjects],
  );
  const selectedProject = orderProjects.find((project) => project.projectId === selectedProjectId) ?? null;
  const projectDetailQuery = useProjectDetail(selectedProjectId || undefined);
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = orderDetailQuery.data ?? null;
  const productionStaffQuery = useAvailableProductionStaff({ projectId: selectedProjectId }, { enabled: Boolean(selectedProjectId) });
  const createProductionRequestMutation = useCreateProductionRequest();
  const createDepositPaymentMutation = useCreateOrderDepositPayment();
  const prepareFinalPaymentMutation = usePrepareOrderFinalPayment();
  const remainingPaymentMutation = useCreateOrderRemainingPayment();
  const completeOrderMutation = useCompleteOrder();

  useEffect(() => {
    if (!selectedProjectId && orderProjects.length > 0) {
      setSelectedProjectId(orderProjects[0].projectId);
    }
  }, [orderProjects, selectedProjectId]);

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
                {pagedOrderProjects.map((project) => (
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
              {orderProjects.length > 0 ? (
                <div className="sale-orders-project-pagination">
                  <button
                    type="button"
                    disabled={currentProjectPage <= 1}
                    onClick={() => setProjectPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentProjectPage} / {projectTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentProjectPage >= projectTotalPages}
                    onClick={() => setProjectPage((current) => Math.min(projectTotalPages, current + 1))}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </aside>

            <section className="sale-orders-workspace">
              <section className="sale-orders-toolbar">
                <div>
                  <span>Selected Project</span>
                  <strong>{selectedProject ? `${selectedProject.projectCode} - ${formatEnumLabel(selectedProject.status)}` : 'No project selected'}</strong>
                </div>
              </section>

              <section className="sale-orders-grid">
                {order ? (
                  <OrderDetailPanel
                    isCompleting={completeOrderMutation.isPending}
                    isCreatingDepositPayment={createDepositPaymentMutation.isPending}
                    isCreatingProduction={createProductionRequestMutation.isPending}
                    isCreatingRemainingPayment={remainingPaymentMutation.isPending}
                    isPreparingFinalPayment={prepareFinalPaymentMutation.isPending}
                    order={order}
                    projectTargetCompletionDate={projectDetailQuery.data?.targetCompletionDate ?? null}
                    productionStaff={productionStaffQuery.data ?? []}
                    onCompleteOrder={async () => {
                      setMessage(null);
                      try {
                        const result = await completeOrderMutation.mutateAsync(order.orderId);
                        setMessage({ tone: 'success', text: 'Order and project completed.' });
                        void ordersQuery.refetch();
                        void orderDetailQuery.refetch();
                        void projectsQuery.refetch();

                        if (result.orderStatus !== 'COMPLETED') {
                          setMessage({ tone: 'success', text: `Complete action finished. Current order status: ${formatEnumLabel(result.orderStatus)}.` });
                        }
                      } catch (error) {
                        setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                      }
                    }}
                    onCreateDepositPayment={async () => {
                      setMessage(null);
                      try {
                        await createDepositPaymentMutation.mutateAsync({ orderId: order.orderId, note: 'Sales-created deposit payment.' });
                        setMessage({ tone: 'success', text: 'Deposit payment created or reused.' });
                        void ordersQuery.refetch();
                        void orderDetailQuery.refetch();
                      } catch (error) {
                        setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                      }
                    }}
                    onCreateProduction={async (input) => {
                      setMessage(null);
                      try {
                        await createProductionRequestMutation.mutateAsync({ ...input, orderId: order.orderId });
                        setMessage({ tone: 'success', text: 'Production request created and assigned.' });
                        void ordersQuery.refetch();
                        void orderDetailQuery.refetch();
                      } catch (error) {
                        setMessage({ tone: 'error', text: getProductionServiceResultMessage(error) });
                      }
                    }}
                    onPrepareAndCreateRemainingPayment={async () => {
                      setMessage(null);
                      try {
                        if (order.status === 'FINAL_PAYMENT_PENDING') {
                          await remainingPaymentMutation.mutateAsync({ orderId: order.orderId, note: 'Remaining payment for completed delivery.' });
                          setMessage({ tone: 'success', text: 'Remaining payment created.' });
                          void orderDetailQuery.refetch();
                          return;
                        }

                        const result = await prepareFinalPaymentMutation.mutateAsync(order.orderId);

                        if (result.requiresRemainingPayment) {
                          await remainingPaymentMutation.mutateAsync({ orderId: order.orderId, note: 'Remaining payment for completed delivery.' });
                          setMessage({ tone: 'success', text: 'Final payment prepared and remaining payment created.' });
                        } else {
                          setMessage({ tone: 'success', text: 'No remaining payment is required. Order is ready to complete.' });
                        }

                        void orderDetailQuery.refetch();
                      } catch (error) {
                        setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                      }
                    }}
                  />
                ) : ordersQuery.isLoading ? (
                  <p className="sale-orders-muted">Loading orders...</p>
                ) : selectedProjectId ? (
                  <p className="sale-orders-muted">No order found for this project.</p>
                ) : null}
              </section>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function OrderDetailPanel({
  isCompleting,
  isCreatingDepositPayment,
  isCreatingProduction,
  isCreatingRemainingPayment,
  isPreparingFinalPayment,
  onCompleteOrder,
  onCreateDepositPayment,
  onCreateProduction,
  onPrepareAndCreateRemainingPayment,
  order,
  projectTargetCompletionDate,
  productionStaff,
}: {
  isCompleting: boolean;
  isCreatingDepositPayment: boolean;
  isCreatingProduction: boolean;
  isCreatingRemainingPayment: boolean;
  isPreparingFinalPayment: boolean;
  onCompleteOrder: () => void;
  onCreateDepositPayment: () => void;
  onCreateProduction: (input: { assignedTo?: string | null; priority: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'; estimatedStartDate?: string | null; estimatedCompletionDate?: string | null; note?: string | null }) => void;
  onPrepareAndCreateRemainingPayment: () => void;
  order: OrderDetailDto;
  projectTargetCompletionDate?: string | null;
  productionStaff: Array<{ accountId: string; fullName: string; activeRequestCount: number; isAvailable: boolean }>;
}) {
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');
  const [productionDateMessage, setProductionDateMessage] = useState('');
  const orderItems = useMemo(
    () => aggregateDuplicateItems([...order.items].sort((first, second) => getOrderItemName(first).localeCompare(getOrderItemName(second)))),
    [order.items],
  );
  const canCompleteOrder = order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING';
  const isOrderCompleted = order.status === 'COMPLETED';
  const canPrepareOrCreateRemainingPayment = order.status === 'DELIVERED'
    || (order.status === 'FINAL_PAYMENT_PENDING' && (order.remainingAmount ?? 0) > 0);
  const completeOrderBlocker = getCompleteOrderBlocker(order);

  useEffect(() => {
    setAssignedTo((current) => current || productionStaff.find((staff) => staff.isAvailable)?.accountId || productionStaff[0]?.accountId || '');
  }, [productionStaff]);

  const selectedProductionStaff = productionStaff.find((staff) => staff.accountId === assignedTo) ?? null;

  return (
    <section className="sale-orders-detail">
      <header>
        <span className={`sale-orders-status sale-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>
      <div className="sale-orders-money-grid">
        <MoneyValue label="Original Total" value={formatMoney(order.originalTotalAmount)} />
        <MoneyValue label={`VAT ${formatPercentRate(order.vatRate)}`} value={formatMoney(order.vatAmount)} />
        <MoneyValue label="Final Total" value={formatMoney(order.finalTotalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
      </div>
      {order.status === 'CREATED' || order.status === 'DEPOSIT_PENDING' ? (
        <div className="sale-orders-flow-panel">
          <header>
            <div>
              <h3>Deposit Payment</h3>
              <p>Deposit amount is copied from the accepted quotation. Change it on quotation before acceptance, not on the order.</p>
            </div>
          </header>
          <div className="sale-orders-actions">
            <button disabled={isCreatingDepositPayment} type="button" onClick={onCreateDepositPayment}>
              <IconSettings size={16} />
              {isCreatingDepositPayment ? 'Preparing...' : order.status === 'CREATED' ? 'Create Deposit Payment' : 'Reuse Deposit Payment'}
            </button>
          </div>
        </div>
      ) : null}
      {order.status === 'DEPOSIT_PAID' ? (
        <form
          className="sale-orders-flow-panel sale-orders-flow-panel-production"
          onSubmit={(event) => {
            event.preventDefault();
            setProductionDateMessage('');
            const dateRange = validateOptionalFutureDateRange(estimatedStartDate, estimatedCompletionDate, {
              startLabel: 'Estimated start date',
              endLabel: 'Estimated completion date',
            });
            if (!dateRange.ok) {
              setProductionDateMessage(dateRange.message);
              return;
            }
            if (projectTargetCompletionDate && isDateRangeAfterTarget(dateRange.start, dateRange.end, projectTargetCompletionDate)) {
              setProductionDateMessage('Production dates cannot be after project target completion date.');
              return;
            }
            onCreateProduction({
              assignedTo: assignedTo || null,
              estimatedCompletionDate: dateRange.end,
              estimatedStartDate: dateRange.start,
              note: 'Created from Sales order flow.',
              priority,
            });
          }}
        >
          <header>
            <div>
              <h3>Production Assignment</h3>
              <p>Choose a staff member, priority, and estimated schedule, then create the production request.</p>
            </div>
          </header>
          <div className="sale-orders-form-grid sale-orders-form-grid-production">
            <label>
              <span>Staff</span>
              <select
                title={selectedProductionStaff?.fullName ?? 'Unassigned'}
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
              >
                <option value="">Unassigned</option>
                {productionStaff.map((staff) => (
                  <option key={staff.accountId} value={staff.accountId}>{staff.fullName}</option>
                ))}
              </select>
              {selectedProductionStaff ? (
                <em className="sale-orders-staff-meta">
                  {selectedProductionStaff.activeRequestCount} active
                  {!selectedProductionStaff.isAvailable ? ' · unavailable' : ''}
                </em>
              ) : (
                <em className="sale-orders-staff-meta">No staff selected</em>
              )}
            </label>
            <label>
              <span>Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label>
              <span>Start</span>
              <input
                max={projectTargetCompletionDate ?? undefined}
                min={getLocalDateInputValue()}
                type="date"
                value={estimatedStartDate}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  const minimumCompletionDate = getMinimumEndDateInputValue(nextStart);
                  setEstimatedStartDate(nextStart);
                  setEstimatedCompletionDate((current) => current && minimumCompletionDate && current < minimumCompletionDate ? '' : current);
                  setProductionDateMessage('');
                }}
              />
            </label>
            <label>
              <span>Complete</span>
              <input
                disabled={!estimatedStartDate}
                max={projectTargetCompletionDate ?? undefined}
                min={getMinimumEndDateInputValue(estimatedStartDate) || getLocalDateInputValue()}
                type="date"
                value={estimatedCompletionDate}
                onChange={(event) => {
                  const nextCompletionDate = event.target.value;
                  const minimumCompletionDate = getMinimumEndDateInputValue(estimatedStartDate);
                  setEstimatedCompletionDate(nextCompletionDate && minimumCompletionDate && nextCompletionDate < minimumCompletionDate ? '' : nextCompletionDate);
                  setProductionDateMessage('');
                }}
              />
            </label>
          </div>
          {productionDateMessage ? <p className="sale-orders-action-note">{productionDateMessage}</p> : null}
          <div className="sale-orders-production-actions">
            <button disabled={isCreatingProduction} type="submit">
              <IconUserPlus size={16} />
              {isCreatingProduction ? 'Assigning...' : 'Create Production Request'}
            </button>
          </div>
        </form>
      ) : null}
      {order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING' || order.status === 'COMPLETED' ? (
        <div className="sale-orders-flow-panel">
          <header>
            <div>
              <h3>Final Payment</h3>
              <p>Prepare final payment phase and create/reuse the remaining payment when the backend reports a balance.</p>
            </div>
          </header>
          <div className="sale-orders-actions">
            <button
              disabled={isOrderCompleted || !canPrepareOrCreateRemainingPayment || isPreparingFinalPayment || isCreatingRemainingPayment}
              type="button"
              onClick={onPrepareAndCreateRemainingPayment}
            >
              <IconSettings size={16} />
              {isPreparingFinalPayment || isCreatingRemainingPayment
                ? 'Processing...'
                : order.status === 'FINAL_PAYMENT_PENDING'
                  ? 'Create Remaining Payment'
                  : 'Prepare & Create Remaining Payment'}
            </button>
            <button disabled={isOrderCompleted || !canCompleteOrder || Boolean(completeOrderBlocker) || isCompleting} type="button" onClick={onCompleteOrder}>
              <IconCircleCheck size={16} />
              {isOrderCompleted ? 'Completed' : isCompleting ? 'Completing...' : 'Complete Order'}
            </button>
          </div>
          {completeOrderBlocker ? <p className="sale-orders-action-note">{completeOrderBlocker}</p> : null}
        </div>
      ) : null}
      <div className="sale-orders-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Discount</th>
              <th>Pre-VAT Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.orderItemId}>
                <td>{getOrderItemName(item)}</td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatMoney(item.unitPrice)}</td>
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

function statusClass(value?: string | null) {
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

function formatPercentRate(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

function getCompleteOrderBlocker(order: OrderDetailDto) {
  if (order.status === 'COMPLETED') return 'This order has already been completed.';
  if (order.status !== 'DELIVERED' && order.status !== 'FINAL_PAYMENT_PENDING') return null;
  if ((order.remainingAmount ?? 0) > 0) return 'Order detail still shows a remaining balance. Backend will validate payment before completing.';
  if (!order.customerConfirmedDeliveryAt) return 'Order is waiting for customer delivery confirmation.';

  return null;
}

function isDateRangeAfterTarget(startDate: string | null, endDate: string | null, targetCompletionDate: string) {
  return Boolean((startDate && startDate > targetCompletionDate) || (endDate && endDate > targetCompletionDate));
}
