import { IconCircleCheck, IconSettings, IconUserPlus } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { useLang } from '@/app/providers/useLang';
import { SaleNavbar, SaleSidebar, saleCopy } from '@/features/SalePages/salecomponents';
import { getOrderServiceResultMessage, type OrderDetailDto, type OrderItemDto } from '@/services/api/orders';
import { getProductionServiceResultMessage } from '@/services/api/production';
import { getProjectServiceResultMessage, type ProjectListItemDto } from '@/services/api/projects';
import {
  useAvailableProductionStaff,
  useCompleteOrder,
  useCreateOrderDepositPayment,
  useCreateProductionRequest,
  useCurrentUser,
  useOrderDetail,
  useProjectPhaseDeadlines,
  useProjectDetail,
  useProjectList,
  useProjectOrders,
  useUpdateProductionDeadline,
} from '@/services/queries';
import { getDefaultPaymentExpiredAt } from '@/shared/utils/dateValidation';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './SaleOrders.css';

const PROJECT_PAGE_SIZE = 4;

const orderProjectStatuses = new Set([
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
  'COMPLETED',
]);

export function SaleOrders() {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const o = t.orders;
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
  const phaseDeadlinesQuery = useProjectPhaseDeadlines(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const productionDeadline = useMemo(
    () => getProductionDeadlineDate(phaseDeadlinesQuery.data?.deadlines),
    [phaseDeadlinesQuery.data?.deadlines],
  );
  const productionStaffQuery = useAvailableProductionStaff({ projectId: selectedProjectId }, { enabled: Boolean(selectedProjectId) });
  const createProductionRequestMutation = useCreateProductionRequest();
  const createDepositPaymentMutation = useCreateOrderDepositPayment();
  const completeOrderMutation = useCompleteOrder();
  const updateProductionDeadlineMutation = useUpdateProductionDeadline();

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
      <SaleSidebar activeKey="orders" />
      <div className="sale-orders-content">
        <SaleNavbar />
        <main className="sale-orders-main">
          <section className="sale-orders-heading">
            <div>
              <h2>{o.title}</h2>
              <p>{o.subtitle}</p>
            </div>
          </section>

          {message ? <section className={`sale-orders-message sale-orders-message-${message.tone}`}>{message.text}</section> : null}
          {currentUserQuery.isError ? <section className="sale-orders-message sale-orders-message-error">Cannot load current sales account.</section> : null}
          {projectsQuery.isError ? <section className="sale-orders-message sale-orders-message-error">Cannot load assigned projects.</section> : null}
          {ordersQuery.isError ? <section className="sale-orders-message sale-orders-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section> : null}

          <section className="sale-orders-layout">
            <aside className="sale-orders-project-panel">
              <header>
                <h3>{o.selectedProject}</h3>
                <p>{o.subtitle}</p>
              </header>
              {projectsQuery.isLoading ? <p className="sale-orders-muted">{t.common.loading}</p> : null}
              {!projectsQuery.isLoading && orderProjects.length === 0 ? <p className="sale-orders-muted">{o.emptyProjects}</p> : null}
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
                    {t.common.previous}
                  </button>
                  <span>
                    {t.common.page} {currentProjectPage} / {projectTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentProjectPage >= projectTotalPages}
                    onClick={() => setProjectPage((current) => Math.min(projectTotalPages, current + 1))}
                  >
                    {t.common.next}
                  </button>
                </div>
              ) : null}
            </aside>

            <section className="sale-orders-workspace">
              <section className="sale-orders-toolbar">
                <div>
                  <span>{o.selectedProject}</span>
                  <strong>{selectedProject ? `${selectedProject.projectCode} - ${formatEnumLabel(selectedProject.status)}` : o.emptyProjects}</strong>
                </div>
              </section>

              <section className="sale-orders-grid">
                {order ? (
                  <OrderDetailPanel
                    copy={o}
                    isCompleting={completeOrderMutation.isPending}
                    isCreatingDepositPayment={createDepositPaymentMutation.isPending}
                    isCreatingProduction={createProductionRequestMutation.isPending}
                    isLoadingProductionDeadline={phaseDeadlinesQuery.isLoading}
                    isSavingProductionDeadline={updateProductionDeadlineMutation.isPending}
                    order={order}
                    projectTargetCompletionDate={projectDetailQuery.data?.targetCompletionDate ?? null}
                    productionDeadline={productionDeadline}
                    productionStaff={productionStaffQuery.data ?? []}
                    onCompleteOrder={async () => {
                      setMessage(null);
                      try {
                        const result = await completeOrderMutation.mutateAsync(order.orderId);
                        setMessage({ tone: 'success', text: 'Order completed. Open the project detail to complete the project separately.' });
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
                        await createDepositPaymentMutation.mutateAsync({
                          orderId: order.orderId,
                          expiredAt: getDefaultPaymentExpiredAt(),
                          note: 'Sales-created deposit payment.',
                        });
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
                        const { productionDeadline: nextProductionDeadline, ...productionRequestInput } = input;

                        await updateProductionDeadlineMutation.mutateAsync({
                          projectId: order.projectId,
                          productionDeadline: nextProductionDeadline,
                        });
                        await createProductionRequestMutation.mutateAsync({ ...productionRequestInput, orderId: order.orderId });
                        setMessage({ tone: 'success', text: 'Production request created and assigned.' });
                        void phaseDeadlinesQuery.refetch();
                        void projectDetailQuery.refetch();
                        void ordersQuery.refetch();
                        void orderDetailQuery.refetch();
                      } catch (error) {
                        const projectErrorMessage = getProjectServiceResultMessage(error);
                        const productionErrorMessage = getProductionServiceResultMessage(error);

                        setMessage({ tone: 'error', text: projectErrorMessage || productionErrorMessage });
                      }
                    }}
                  />
                ) : ordersQuery.isLoading ? (
                  <p className="sale-orders-muted">{t.common.loading}</p>
                ) : selectedProjectId ? (
                  <p className="sale-orders-muted">{o.emptyOrder}</p>
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
  copy,
  isCompleting,
  isCreatingDepositPayment,
  isCreatingProduction,
  isLoadingProductionDeadline,
  isSavingProductionDeadline,
  onCompleteOrder,
  onCreateDepositPayment,
  onCreateProduction,
  order,
  projectTargetCompletionDate,
  productionDeadline,
  productionStaff,
}: {
  copy: (typeof saleCopy)['en']['orders'];
  isCompleting: boolean;
  isCreatingDepositPayment: boolean;
  isCreatingProduction: boolean;
  isLoadingProductionDeadline: boolean;
  isSavingProductionDeadline: boolean;
  onCompleteOrder: () => void;
  onCreateDepositPayment: () => void;
  onCreateProduction: (input: { assignedTo: string; priority: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'; productionDeadline: string; note?: string | null }) => void;
  order: OrderDetailDto;
  projectTargetCompletionDate?: string | null;
  productionDeadline?: string | null;
  productionStaff: Array<{ accountId: string; fullName: string; activeRequestCount: number; isAvailable: boolean }>;
}) {
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [productionDeadlineDraft, setProductionDeadlineDraft] = useState(productionDeadline?.slice(0, 10) ?? '');
  const [productionActionMessage, setProductionActionMessage] = useState('');
  const orderItems = useMemo(
    () => aggregateDuplicateItems([...order.items].sort((first, second) => getOrderItemName(first).localeCompare(getOrderItemName(second)))),
    [order.items],
  );
  const canCompleteOrder = order.status === 'FINAL_PAYMENT_PENDING'
    && (order.remainingAmount ?? 0) <= 0
    && Boolean(order.customerConfirmedDeliveryAt);
  const isOrderCompleted = order.status === 'COMPLETED';
  const completeOrderBlocker = getCompleteOrderBlocker(order);
  const showFinalPaymentPanel = order.status === 'AWAITING_CUSTOMER_CONFIRMATION' || order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING' || order.status === 'COMPLETED';
  const isProductionDeadlineMissing = !isLoadingProductionDeadline && !productionDeadlineDraft;

  useEffect(() => {
    setAssignedTo((current) => current || productionStaff.find((staff) => staff.isAvailable)?.accountId || productionStaff[0]?.accountId || '');
  }, [productionStaff]);

  useEffect(() => {
    setProductionDeadlineDraft(productionDeadline?.slice(0, 10) ?? '');
  }, [productionDeadline]);

  const selectedProductionStaff = productionStaff.find((staff) => staff.accountId === assignedTo) ?? null;

  return (
    <section className="sale-orders-detail">
      <header>
        <span className={`sale-orders-status sale-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>
      <div className="sale-orders-money-grid">
        <MoneyValue label="Items Gross" value={formatMoney(order.itemsGrossAmount)} />
        <MoneyValue label="Item Discount" value={formatMoney(order.totalItemDiscountAmount)} />
        <MoneyValue label="Pre-VAT" value={formatMoney(order.preVatAmount)} />
        <MoneyValue label="VAT" value={formatMoney(order.vatAmount)} />
        <MoneyValue label="Total" value={formatMoney(order.totalAmount)} />
        <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
        <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
        <MoneyValue label="Remain" value={formatMoney(order.remainingAmount)} />
      </div>
      {order.status === 'CREATED' || order.status === 'DEPOSIT_PENDING' ? (
        <div className="sale-orders-flow-panel">
          <header>
            <div>
              <h3>{copy.depositPayment}</h3>
              <p>Deposit amount is copied from the accepted quotation. Change it on quotation before acceptance, not on the order.</p>
            </div>
          </header>
          <div className="sale-orders-actions">
            <button disabled={isCreatingDepositPayment} type="button" onClick={onCreateDepositPayment}>
              <IconSettings size={16} />
              {isCreatingDepositPayment ? 'Preparing...' : copy.createDeposit}
            </button>
          </div>
        </div>
      ) : null}
      {order.status === 'DEPOSIT_PAID' ? (
        <form
          className="sale-orders-flow-panel sale-orders-flow-panel-production"
          onSubmit={(event) => {
            event.preventDefault();
            setProductionActionMessage('');

            if (!productionDeadlineDraft) {
              setProductionActionMessage('Please select a production deadline.');
              return;
            }

            if (!assignedTo) {
              setProductionActionMessage('Please select production staff.');
              return;
            }

            onCreateProduction({
              assignedTo,
              note: 'Created from Sales order flow.',
              priority,
              productionDeadline: productionDeadlineDraft,
            });
          }}
        >
          <header>
            <div>
              <h3>{copy.productionAssignment}</h3>
              <p>Choose staff, priority, and deadline before creating the request.</p>
            </div>
            {isProductionDeadlineMissing ? (
              <span className="sale-orders-production-note">Deadline required</span>
            ) : null}
          </header>
          {isProductionDeadlineMissing ? (
            <p className="sale-orders-action-note">Vui lòng set Production Deadline trước khi tạo yêu cầu sản xuất.</p>
          ) : null}
          <div className="sale-orders-form-grid sale-orders-form-grid-production">
            <label>
              <span>{copy.staff}</span>
              <select
                title={selectedProductionStaff?.fullName ?? 'Select production staff'}
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
              >
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
                <em className="sale-orders-staff-meta">No production staff available</em>
              )}
            </label>
            <label>
              <span>{copy.priority}</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label>
              <span>{copy.productionDeadline}</span>
              <input
                disabled={isLoadingProductionDeadline || isSavingProductionDeadline}
                max={projectTargetCompletionDate ?? undefined}
                type="date"
                value={productionDeadlineDraft}
                onChange={(event) => {
                  setProductionDeadlineDraft(event.target.value);
                  setProductionActionMessage('');
                }}
              />
              {projectTargetCompletionDate ? (
                <em className="sale-orders-staff-meta">Project target: {formatDate(projectTargetCompletionDate)}</em>
              ) : null}
            </label>
            <button
              className="sale-orders-production-submit"
              disabled={isCreatingProduction || isSavingProductionDeadline || isLoadingProductionDeadline || isProductionDeadlineMissing || !assignedTo}
              type="submit"
            >
              <IconUserPlus size={16} />
              {isSavingProductionDeadline || isCreatingProduction ? 'Assigning...' : copy.createProduction}
            </button>
          </div>
          {productionActionMessage ? <p className="sale-orders-action-note">{productionActionMessage}</p> : null}
        </form>
      ) : null}
      {showFinalPaymentPanel ? (
        <div className="sale-orders-flow-panel">
          <header>
            <div>
              <h3>{copy.finalPayment}</h3>
              <p>{getFinalPaymentFlowMessage(order)}</p>
            </div>
          </header>
          {canCompleteOrder ? (
            <>
              <div className="sale-orders-actions">
                <button disabled={isOrderCompleted || !canCompleteOrder || Boolean(completeOrderBlocker) || isCompleting} type="button" onClick={onCompleteOrder}>
                  <IconCircleCheck size={16} />
                  {isCompleting ? 'Completing...' : 'Complete Zero-Remaining Order'}
                </button>
              </div>
              {completeOrderBlocker ? <p className="sale-orders-action-note">{completeOrderBlocker}</p> : null}
            </>
          ) : null}
        </div>
      ) : null}
      <div className="sale-orders-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Gross</th>
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
                <td>{formatMoney(getOrderItemGrossAmount(item))}</td>
                <td>{formatMoney(item.discountAmount)}</td>
                <td>{formatMoney(getOrderItemPreVatAmount(item))}</td>
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

function getOrderItemGrossAmount(item: Pick<OrderItemDto, 'quantity' | 'unitPrice'>) {
  if (typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') return null;

  return item.quantity * item.unitPrice;
}

function getOrderItemPreVatAmount(item: Pick<OrderItemDto, 'discountAmount' | 'quantity' | 'subtotalAmount' | 'unitPrice'>) {
  if (typeof item.subtotalAmount === 'number') return item.subtotalAmount;

  const grossAmount = getOrderItemGrossAmount(item);
  if (typeof grossAmount !== 'number') return null;

  return grossAmount - (item.discountAmount ?? 0);
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

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getProductionDeadlineDate(deadlines?: Array<{ phase?: string | null; deadlineAt?: string | null; dueDate?: string | null }> | null) {
  const productionDeadline = deadlines?.find((deadline) => deadline.phase === 'PRODUCTION');

  return productionDeadline?.deadlineAt ?? productionDeadline?.dueDate ?? null;
}

function getCompleteOrderBlocker(order: OrderDetailDto) {
  if (order.status === 'COMPLETED') return 'This order has already been completed.';
  if (order.status !== 'AWAITING_CUSTOMER_CONFIRMATION' && order.status !== 'DELIVERED' && order.status !== 'FINAL_PAYMENT_PENDING') return null;
  if (order.status === 'AWAITING_CUSTOMER_CONFIRMATION') return 'Waiting for customer final delivery confirmation. Remaining payment is created by backend after confirmation.';
  if (order.status === 'DELIVERED') return 'Delivery has been confirmed. Waiting for final payment state to settle if needed.';
  if ((order.remainingAmount ?? 0) > 0) return 'Waiting for customer final payment. The backend will complete this order automatically after payment is confirmed.';
  if (!order.customerConfirmedDeliveryAt) return 'Order is waiting for customer delivery confirmation.';

  return null;
}

function getFinalPaymentFlowMessage(order: OrderDetailDto) {
  if (order.status === 'COMPLETED') return 'This order is completed.';
  if (order.status === 'AWAITING_CUSTOMER_CONFIRMATION') return 'Waiting for customer final delivery confirmation. Sales cannot confirm delivery for the customer.';
  if (order.status === 'DELIVERED') return 'Customer delivery confirmation has been recorded. Remaining payment is handled by backend when needed.';
  if ((order.remainingAmount ?? 0) > 0) return 'Remaining payment is pending. Customer can pay it from their order screen.';
  if (order.status === 'FINAL_PAYMENT_PENDING') return 'No remaining amount is due. Complete the order if customer delivery was confirmed.';

  return 'Final payment is handled after full-order delivery confirmation.';
}
