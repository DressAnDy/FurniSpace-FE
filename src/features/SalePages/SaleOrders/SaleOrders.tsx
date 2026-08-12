import { IconCircleCheck, IconSettings, IconUserPlus } from '@tabler/icons-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import type { ProductionItem } from '@/features/ProductionPages/types';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto, type OrderStatus } from '@/services/api/orders';
import { getProductionServiceResultMessage, type ProductionRequestQueueItemDto } from '@/services/api/production';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useAvailableProductionStaff,
  useCompleteOrder,
  useCreateOrderAdjustment,
  useCreateOrderRemainingPayment,
  useCreateProductionRequest,
  useCurrentUser,
  useOrderDetail,
  usePrepareOrderFinalPayment,
  useProductionRequestDetail,
  useProductionRequests,
  useProjectList,
  useProjectOrders,
  useUpdateOrderFinancialAdjustment,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';
import { getLocalDateInputValue, validateOptionalFutureDateRange } from '@/shared/utils/dateValidation';

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

type SalesProductionTrackingRequest = ProductionRequestQueueItemDto & {
  items?: ProductionItem[];
};

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
  const productionRequestsQuery = useProductionRequests(undefined);
  const currentProductionRequest = useMemo(
    () => productionRequestsQuery.data?.items.find((request) => request.orderId === selectedOrderId) ?? null,
    [productionRequestsQuery.data?.items, selectedOrderId],
  );
  const productionRequestDetailQuery = useProductionRequestDetail(currentProductionRequest?.productionRequestId);
  const productionStaffQuery = useAvailableProductionStaff({ projectId: selectedProjectId }, { enabled: Boolean(selectedProjectId) });
  const createProductionRequestMutation = useCreateProductionRequest();
  const createAdjustmentMutation = useCreateOrderAdjustment();
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
                {order ? (
                  <OrderDetailPanel
                    isCompleting={completeOrderMutation.isPending}
                    isCreatingAdjustment={createAdjustmentMutation.isPending}
                    isCreatingProduction={createProductionRequestMutation.isPending}
                    isCreatingRemainingPayment={remainingPaymentMutation.isPending}
                    isPreparingFinalPayment={prepareFinalPaymentMutation.isPending}
                    isAdjusting={financialAdjustmentMutation.isPending}
                    order={order}
                    productionRequest={productionRequestDetailQuery.data ?? currentProductionRequest}
                    productionStaff={productionStaffQuery.data ?? []}
                    onAdjustFinancial={(input) => void updateFinancialAdjustment(input)}
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
                    onCreateAdjustment={async (reason) => {
                      setMessage(null);
                      try {
                        await createAdjustmentMutation.mutateAsync({ orderId: order.orderId, reason });
                        setMessage({ tone: 'success', text: 'Adjustment draft created.' });
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
  isCreatingAdjustment,
  isCreatingProduction,
  isCreatingRemainingPayment,
  isPreparingFinalPayment,
  isAdjusting,
  onAdjustFinancial,
  onCompleteOrder,
  onCreateAdjustment,
  onCreateProduction,
  onPrepareAndCreateRemainingPayment,
  order,
  productionRequest,
  productionStaff,
}: {
  isCompleting: boolean;
  isCreatingAdjustment: boolean;
  isCreatingProduction: boolean;
  isCreatingRemainingPayment: boolean;
  isPreparingFinalPayment: boolean;
  isAdjusting: boolean;
  onAdjustFinancial: (input: { depositAmount: number; orderId: string }) => void;
  onCompleteOrder: () => void;
  onCreateAdjustment: (reason: string) => void;
  onCreateProduction: (input: { assignedTo?: string | null; priority: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'; estimatedStartDate?: string | null; estimatedCompletionDate?: string | null; note?: string | null }) => void;
  onPrepareAndCreateRemainingPayment: () => void;
  order: OrderDetailDto;
  productionRequest: SalesProductionTrackingRequest | null | undefined;
  productionStaff: Array<{ accountId: string; fullName: string; activeRequestCount: number; isAvailable: boolean }>;
}) {
  const [depositAmount, setDepositAmount] = useState(() => String(order.depositAmount ?? 0));
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');
  const [productionDateMessage, setProductionDateMessage] = useState('');
  const orderItems = useMemo(() => aggregateDuplicateItems(order.items), [order.items]);
  const hasCancelledItems = order.items.some((item) => item.status === 'CANCELLED' || item.status === 'UNAVAILABLE');
  const canCompleteOrder = order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING';
  const isOrderCompleted = order.status === 'COMPLETED';
  const canPrepareOrCreateRemainingPayment = order.status === 'DELIVERED'
    || (order.status === 'FINAL_PAYMENT_PENDING' && (order.remainingAmount ?? 0) > 0);
  const completeOrderBlocker = getCompleteOrderBlocker(order);

  useEffect(() => {
    setDepositAmount(String(order.depositAmount ?? 0));
  }, [order.depositAmount, order.orderId]);

  useEffect(() => {
    setAssignedTo((current) => current || productionStaff.find((staff) => staff.isAvailable)?.accountId || productionStaff[0]?.accountId || '');
  }, [productionStaff]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdjustFinancial({
      depositAmount: normalizeMoneyInput(depositAmount),
      orderId: order.orderId,
    });
  }

  return (
    <section className="sale-orders-detail">
      <header>
        <span className={`sale-orders-status sale-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>
      <div className="sale-orders-money-grid">
        <MoneyValue label="Final Total" value={formatMoney(order.finalTotalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
      </div>
      {order.status === 'DEPOSIT_PENDING' ? (
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
      ) : null}
      <ProductionTrackingPanel order={order} productionRequest={productionRequest} />
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
              <input min={getLocalDateInputValue()} type="date" value={estimatedStartDate} onChange={(event) => setEstimatedStartDate(event.target.value)} />
            </label>
            <label>
              <span>Complete</span>
              <input min={estimatedStartDate || getLocalDateInputValue()} type="date" value={estimatedCompletionDate} onChange={(event) => setEstimatedCompletionDate(event.target.value)} />
            </label>
          </div>
          {productionDateMessage ? <p className="sale-orders-action-note">{productionDateMessage}</p> : null}
          <button disabled={isCreatingProduction} type="submit">
            <IconUserPlus size={16} />
            {isCreatingProduction ? 'Assigning...' : 'Create Production Request'}
          </button>
        </form>
      ) : null}
      {order.status === 'IN_PRODUCTION' && hasCancelledItems ? (
        <div className="sale-orders-flow-panel">
          <header>
            <h3>Adjustment</h3>
          </header>
          <button disabled={isCreatingAdjustment} type="button" onClick={() => onCreateAdjustment('Production item unavailable.')}>
            <IconSettings size={16} />
            {isCreatingAdjustment ? 'Creating...' : 'Create Adjustment Draft'}
          </button>
        </div>
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
            <button disabled={isOrderCompleted || !canCompleteOrder || isCompleting} type="button" onClick={onCompleteOrder}>
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
              <th>Type</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Customization</th>
              <th>Gross</th>
              <th>Discount</th>
              <th>Taxable</th>
              <th>Tax %</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.orderItemId}>
                <td>{getOrderItemName(item)}</td>
                <td>{formatEnumLabel(item.itemType ?? 'UNKNOWN')}</td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(getCustomizationUnitAdditionalCost(item))}</td>
                <td>{formatMoney(item.grossAmount ?? item.subtotalAmount)}</td>
                <td>{formatMoney(item.discountAmount)}</td>
                <td>{formatMoney(item.taxableAmount)}</td>
                <td>{formatPercent(item.taxRate)}</td>
                <td>{formatMoney(item.taxAmount)}</td>
                <td>{formatMoney(item.totalAmount ?? item.subtotalAmount)}</td>
                <td>{formatDeliveryState(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductionTrackingPanel({
  order,
  productionRequest,
}: {
  order: OrderDetailDto;
  productionRequest: SalesProductionTrackingRequest | null | undefined;
}) {
  const orderItems = useMemo(() => aggregateDuplicateItems(order.items), [order.items]);

  return (
    <section className="sale-orders-flow-panel sale-orders-production-tracking">
      <header>
        <div>
          <h3>Production Tracking</h3>
          <p>Read-only current production state for this order.</p>
        </div>
        <span className={`sale-orders-status sale-orders-status-${statusClass(productionRequest?.status ?? order.status)}`}>
          {formatEnumLabel(productionRequest?.status ?? order.status ?? 'UNKNOWN')}
        </span>
      </header>
      <div className="sale-orders-tracking-grid">
        <MoneyValue label="Production Request" value={productionRequest?.productionCode ?? 'Not created'} />
        <MoneyValue label="Assigned To" value={productionRequest?.assignedToName ?? '-'} />
        <MoneyValue label="Estimated Completion" value={formatDate(productionRequest?.estimatedCompletionDate)} />
        <MoneyValue label="Current Order State" value={formatEnumLabel(order.status ?? 'UNKNOWN')} />
      </div>
      {productionRequest?.items?.length ? (
        <div className="sale-orders-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Production Item</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Started</th>
                <th>Completed</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {productionRequest.items.map((item) => (
                <tr key={item.productionItemId}>
                  <td>{item.productNameSnapshot}</td>
                  <td>{item.quantity}</td>
                  <td>{formatEnumLabel(item.status)}</td>
                  <td>{formatDate(item.startedAt)}</td>
                  <td>{formatDate(item.completedAt)}</td>
                  <td>{item.productionNote ?? item.materialNote ?? item.cancellationReason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sale-orders-delivery-list">
          {orderItems.map((item) => (
            <div key={item.orderItemId}>
              <span>{getOrderItemName(item)}: {formatEnumLabel(getOrderItemTrackingStatus(item, order.status))}</span>
              <small>{formatDeliveryState(item)}</small>
            </div>
          ))}
        </div>
      )}
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

function getCustomizationUnitAdditionalCost(item: Pick<OrderItemDto, 'customizationUnitAdditionalCost' | 'customizationAdditionalCost'>) {
  return item.customizationUnitAdditionalCost ?? item.customizationAdditionalCost ?? null;
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

function formatPercent(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)}%`;
}

function getOrderItemTrackingStatus(item: OrderItemDto, orderStatus?: OrderStatus | null) {
  if (item.status) return item.status;
  if (orderStatus === 'IN_PRODUCTION') return 'IN_PRODUCTION';
  if (orderStatus === 'READY_FOR_DELIVERY') return 'COMPLETED';
  if (orderStatus === 'DELIVERING') return 'DELIVERING';
  if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED') return 'DELIVERED';

  return 'PENDING';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDeliveryState(item: OrderItemDto) {
  const delivered = item.deliveredQuantity ?? 0;
  const quantity = item.quantity ?? 0;
  const status = item.status ? formatEnumLabel(item.status) : 'Pending';

  return `${delivered}/${quantity} - ${status}`;
}

function getCompleteOrderBlocker(order: OrderDetailDto) {
  if (order.status === 'COMPLETED') return 'This order has already been completed.';
  if (order.status !== 'DELIVERED' && order.status !== 'FINAL_PAYMENT_PENDING') return null;
  if ((order.remainingAmount ?? 0) > 0) return 'Order detail still shows a remaining balance. Backend will validate payment before completing.';

  return null;
}

function normalizeMoneyInput(value: string) {
  const parsed = Number(value.trim().replace(/\./g, '').replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : 0;
}
