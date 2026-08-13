import { IconCircleCheck, IconSettings, IconUserPlus } from '@tabler/icons-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto } from '@/services/api/orders';
import { getProductionServiceResultMessage } from '@/services/api/production';
import { getProjectServiceResultMessage, type ProjectListItemDto } from '@/services/api/projects';
import {
  useAvailableProductionStaff,
  useCompleteOrder,
  useCreateOrderDepositPayment,
  useCreateOrderRemainingPayment,
  useCreateProductionRequest,
  useCurrentUser,
  useOrderDetail,
  usePrepareOrderFinalPayment,
  useProjectList,
  useProjectOrders,
  useReopenProjectProposal,
} from '@/services/queries';
import { getLocalDateInputValue, getMinimumEndDateInputValue, validateOptionalFutureDateRange } from '@/shared/utils/dateValidation';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './SaleOrders.css';

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
  const productionStaffQuery = useAvailableProductionStaff({ projectId: selectedProjectId }, { enabled: Boolean(selectedProjectId) });
  const createProductionRequestMutation = useCreateProductionRequest();
  const createDepositPaymentMutation = useCreateOrderDepositPayment();
  const reopenProposalMutation = useReopenProjectProposal();
  const prepareFinalPaymentMutation = usePrepareOrderFinalPayment();
  const remainingPaymentMutation = useCreateOrderRemainingPayment();
  const completeOrderMutation = useCompleteOrder();

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
                {order ? (
                  <OrderDetailPanel
                    isCompleting={completeOrderMutation.isPending}
                    isCreatingDepositPayment={createDepositPaymentMutation.isPending}
                    isCreatingProduction={createProductionRequestMutation.isPending}
                    isCreatingRemainingPayment={remainingPaymentMutation.isPending}
                    isPreparingFinalPayment={prepareFinalPaymentMutation.isPending}
                    isReopeningProposal={reopenProposalMutation.isPending}
                    order={order}
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
                    onReopenProposal={async () => {
                      setMessage(null);
                      try {
                        await reopenProposalMutation.mutateAsync(order.projectId);
                        setSelectedOrderId('');
                        setMessage({ tone: 'success', text: 'Project reopened to proposal consulting.' });
                        void projectsQuery.refetch();
                        void ordersQuery.refetch();
                      } catch (error) {
                        setMessage({ tone: 'error', text: getProjectServiceResultMessage(error) });
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
  isReopeningProposal,
  onCompleteOrder,
  onCreateDepositPayment,
  onCreateProduction,
  onPrepareAndCreateRemainingPayment,
  onReopenProposal,
  order,
  productionStaff,
}: {
  isCompleting: boolean;
  isCreatingDepositPayment: boolean;
  isCreatingProduction: boolean;
  isCreatingRemainingPayment: boolean;
  isPreparingFinalPayment: boolean;
  isReopeningProposal: boolean;
  onCompleteOrder: () => void;
  onCreateDepositPayment: () => void;
  onCreateProduction: (input: { assignedTo?: string | null; priority: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'; estimatedStartDate?: string | null; estimatedCompletionDate?: string | null; note?: string | null }) => void;
  onPrepareAndCreateRemainingPayment: () => void;
  onReopenProposal: () => void;
  order: OrderDetailDto;
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
            <button className="is-secondary" disabled={isReopeningProposal} type="button" onClick={onReopenProposal}>
              {isReopeningProposal ? 'Reopening...' : 'Reopen Proposal'}
            </button>
          </div>
        </div>
      ) : null}
      {order.status === 'DEPOSIT_PAID' ? (
        <form
          className="sale-orders-flow-panel"
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
            <h3>Production Assignment</h3>
          </header>
          <div className="sale-orders-form-grid">
            <label>
              <span>Staff</span>
              <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                <option value="">Unassigned</option>
                {productionStaff.map((staff) => (
                  <option key={staff.accountId} value={staff.accountId}>{staff.fullName} - {staff.activeRequestCount} active</option>
                ))}
              </select>
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
          <button disabled={isCreatingProduction} type="submit">
            <IconUserPlus size={16} />
            {isCreatingProduction ? 'Assigning...' : 'Create Production Request'}
          </button>
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
  const incompleteDeliveryItem = order.items.find((item) => isDeliverableOrderItem(item) && (item.deliveredQuantity ?? 0) < (item.quantity ?? 0));

  if (incompleteDeliveryItem) {
    return `${getOrderItemName(incompleteDeliveryItem)} is not fully delivered yet.`;
  }

  const unconfirmedDeliveryItem = order.items.find((item) => isDeliverableOrderItem(item) && !item.customerConfirmedAt);

  if (unconfirmedDeliveryItem) {
    return `${getOrderItemName(unconfirmedDeliveryItem)} is waiting for customer delivery confirmation.`;
  }

  return null;
}

function isDeliverableOrderItem(item: OrderItemDto) {
  return (item.quantity ?? 0) > 0 && item.status !== 'CANCELLED' && item.status !== 'UNAVAILABLE';
}
