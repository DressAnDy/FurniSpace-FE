import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import {
  getOrderServiceResultMessage,
  type OrderDetailDto,
  type OrderEmbeddedDeliveryDto,
  type OrderItemDto,
  type OrderListItemDto,
  type OrderPaymentHistoryDto,
  type OrderStatus,
} from '@/services/api/orders';
import type { PaymentDetailDto, PaymentStatus, PaymentType } from '@/services/api/payments';
import {
  useConfirmOrderDelivery,
  useCreateOrderDepositPayment,
  useCustomerOrders,
  useOrderDetail,
  useOrderPaymentHistory,
  useUpdateOrderDeliveryDetails,
} from '@/services/queries';
import { useProjectList } from '@/services/queries/useProjects';
import { PaymentCollectionModal } from '@/features/payments/PaymentCollectionModal';
import { ProductIssuePanel } from '@/features/productIssues/ProductIssuePanel';
import { getDefaultPaymentExpiredAt } from '@/shared/utils/dateValidation';
import { aggregateDuplicateItems, getItemAggregateKey } from '@/shared/utils/itemAggregation';

import './CustomerOrdersPage.css';

type GroupedOrderItem = OrderItemDto & {
  sourceItems: OrderItemDto[];
};

type OrderProjectSummary = {
  projectCode?: string | null;
  projectName?: string | null;
};

type OrderDeliveryDetailsDraft = {
  deliveryAddress: string;
  receiverName: string;
  receiverPhone: string;
  deliveryNote?: string | null;
};

const ORDER_PAGE_SIZE = 5;

const statusOptions: Array<{ label: string; value: '' | OrderStatus }> = [
  { label: 'All statuses', value: '' },
  { label: 'Deposit pending', value: 'DEPOSIT_PENDING' },
  { label: 'In production', value: 'IN_PRODUCTION' },
  { label: 'Delivering', value: 'DELIVERING' },
  { label: 'Final payment', value: 'FINAL_PAYMENT_PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
];

export function CustomerOrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | OrderStatus>('');
  const [activePayment, setActivePayment] = useState<PaymentDetailDto | null>(null);
  const [savedDeliveryDetailsByOrderId, setSavedDeliveryDetailsByOrderId] = useState<Record<string, OrderDeliveryDetailsDraft>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const ordersQuery = useCustomerOrders({
    page: orderPage,
    pageSize: ORDER_PAGE_SIZE,
    search,
    status: statusFilter || null,
  });
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const projectLookup = useMemo(() => {
    return new Map((projectsQuery.data?.items ?? []).map((project) => [project.projectId, project]));
  }, [projectsQuery.data?.items]);
  const totalOrderPages = Math.max(1, Math.ceil((ordersQuery.data?.totalCount ?? 0) / ORDER_PAGE_SIZE));
  const orderDetailQuery = useOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const paymentHistoryQuery = useOrderPaymentHistory(selectedOrderId, { enabled: Boolean(selectedOrderId) });
  const order = useMemo(() => {
    const orderDetail = orderDetailQuery.data ?? null;

    if (!orderDetail) return null;

    const savedDeliveryDetails = savedDeliveryDetailsByOrderId[orderDetail.orderId];
    const resolvedDeliveryDetails = mergeDeliveryDetails(getOrderDeliveryDetailsDraft(orderDetail), savedDeliveryDetails);

    return { ...orderDetail, ...resolvedDeliveryDetails };
  }, [orderDetailQuery.data, savedDeliveryDetailsByOrderId]);
  const confirmDeliveryMutation = useConfirmOrderDelivery();
  const createDepositPaymentMutation = useCreateOrderDepositPayment();
  const updateDeliveryDetailsMutation = useUpdateOrderDeliveryDetails();

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].orderId);
      return;
    }

    if (selectedOrderId && orders.length > 0 && !orders.some((item) => item.orderId === selectedOrderId)) {
      setSelectedOrderId(orders[0].orderId);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (orderPage > totalOrderPages) {
      setOrderPage(totalOrderPages);
    }
  }, [orderPage, totalOrderPages]);

  return (
    <main className="customer-orders-page">
      <CustomerNavbar activeLabel="Orders" classPrefix="customer-orders" />

      <div className="customer-orders-main">
        <section className="customer-orders-heading">
          <div>
            <h1>Orders</h1>
          </div>
        </section>

        {message ? <section className={`customer-orders-message customer-orders-message-${message.tone}`}>{message.text}</section> : null}
        {ordersQuery.isError ? (
          <section className="customer-orders-message customer-orders-message-error">{getOrderServiceResultMessage(ordersQuery.error)}</section>
        ) : null}

        <section className="customer-orders-layout">
          <aside className="customer-orders-panel">
            <header>
              <div>
                <h2>My Orders</h2>
                <p>{ordersQuery.data?.totalCount ?? 0} order(s)</p>
              </div>
            </header>

            <div className="customer-orders-filter-grid">
              <input
                placeholder="Search order code"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOrderPage(1);
                }}
              />
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as '' | OrderStatus);
                  setOrderPage(1);
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {ordersQuery.isLoading ? <p className="customer-orders-muted">Loading orders...</p> : null}
            {!ordersQuery.isLoading && orders.length === 0 ? <p className="customer-orders-muted">No order is available yet.</p> : null}
            <div className="customer-orders-order-list">
              {orders.map((item) => (
                <button
                  aria-label={`Open order ${item.orderCode}`}
                  className={item.orderId === selectedOrderId ? 'is-active' : ''}
                  key={item.orderId}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(item.orderId);
                    setActivePayment(null);
                    setMessage(null);
                  }}
                >
                  <strong>{getOrderProjectName(item, projectLookup.get(item.projectId))}</strong>
                  <span>{getOrderProjectCode(item, projectLookup.get(item.projectId))}</span>
                  <em className={`customer-orders-status customer-orders-status-${statusClass(item.status)}`}>{formatEnumLabel(item.status ?? 'UNKNOWN')}</em>
                </button>
              ))}
            </div>
            {(ordersQuery.data?.totalCount ?? 0) > ORDER_PAGE_SIZE ? (
              <footer className="customer-orders-panel-pagination">
                <p>
                  Page <strong>{orderPage}</strong> / {totalOrderPages}
                </p>
                <div>
                  <button
                    aria-label="Previous orders page"
                    disabled={orderPage <= 1}
                    type="button"
                    onClick={() => setOrderPage((current) => Math.max(1, current - 1))}
                  >
                    <IconChevronLeft size={16} stroke={1.8} />
                  </button>
                  <button
                    aria-label="Next orders page"
                    disabled={orderPage >= totalOrderPages}
                    type="button"
                    onClick={() => setOrderPage((current) => Math.min(totalOrderPages, current + 1))}
                  >
                    <IconChevronRight size={16} stroke={1.8} />
                  </button>
                </div>
              </footer>
            ) : null}
          </aside>

          <section className="customer-orders-workspace">
            {order ? (
              <>
                <OrderDetailCard
                confirmDeliveryPending={confirmDeliveryMutation.isPending}
                deliveryDetailsPending={updateDeliveryDetailsMutation.isPending}
                depositPayment={getCollectablePayment(paymentHistoryQuery.data, 'DEPOSIT', order)}
                depositPaymentPending={createDepositPaymentMutation.isPending}
                isPaymentHistoryLoading={paymentHistoryQuery.isLoading}
                order={order}
                paymentHistory={paymentHistoryQuery.data ?? null}
                remainingPayment={getCollectablePayment(paymentHistoryQuery.data, 'REMAINING_PAYMENT', order)}
                onConfirmDelivery={async () => {
                  setMessage(null);

                  try {
                    await confirmDeliveryMutation.mutateAsync(order.orderId);
                    setMessage({ tone: 'success', text: 'Delivery confirmed.' });
                    void orderDetailQuery.refetch();
                    void paymentHistoryQuery.refetch();
                    void ordersQuery.refetch();
                  } catch (error) {
                    setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                  }
                }}
                onCreateDepositPayment={async () => {
                  setMessage(null);

                  if (!hasCompleteDeliveryDetails(order)) {
                    setMessage({ tone: 'error', text: 'Please complete all delivery details before creating the deposit payment.' });
                    return;
                  }

                  try {
                    const payment = await createDepositPaymentMutation.mutateAsync({
                      orderId: order.orderId,
                      expiredAt: getDefaultPaymentExpiredAt(),
                      note: 'Customer deposit payment from order.',
                    });

                    setActivePayment(payment);
                    setMessage({ tone: 'success', text: 'Deposit payment is ready.' });
                    void orderDetailQuery.refetch();
                    void paymentHistoryQuery.refetch();
                    void ordersQuery.refetch();
                  } catch (error) {
                    setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                  }
                }}
                onOpenDepositPayment={setActivePayment}
                onOpenRemainingPayment={setActivePayment}
                onSaveDeliveryDetails={async (details) => {
                  setMessage(null);

                  try {
                    const normalizedDetails = normalizeDeliveryDetailsDraft(details);

                    await updateDeliveryDetailsMutation.mutateAsync({
                      ...normalizedDetails,
                      orderId: order.orderId,
                    });

                    setSavedDeliveryDetailsByOrderId((current) => ({
                      ...current,
                      [order.orderId]: normalizedDetails,
                    }));
                    setMessage({ tone: 'success', text: 'Delivery details saved.' });
                    void orderDetailQuery.refetch();
                  } catch (error) {
                    setMessage({ tone: 'error', text: getOrderServiceResultMessage(error) });
                  }
                }}
                />
                <ProductIssuePanel
                  allowCreate
                  orderId={order.orderId}
                  orderItems={order.items ?? []}
                  projectId={order.projectId}
                  title="My product issues"
                />
              </>
            ) : orderDetailQuery.isLoading ? (
              <p className="customer-orders-muted">Loading order detail...</p>
            ) : null}

            <PaymentCollectionModal
              completionDescription="Your payment has been confirmed. The order status will be refreshed automatically."
              completionTitle="Payment Successful"
              continueLabel="Back to Orders"
              payment={activePayment}
              title="Order Payment"
              onClose={() => setActivePayment(null)}
              onPaid={() => {
                void orderDetailQuery.refetch();
                void paymentHistoryQuery.refetch();
                void ordersQuery.refetch();
                setActivePayment(null);
              }}
            />
          </section>
        </section>
      </div>
    </main>
  );
}

function OrderDetailCard({
  confirmDeliveryPending,
  deliveryDetailsPending,
  depositPayment,
  depositPaymentPending,
  isPaymentHistoryLoading,
  onCreateDepositPayment,
  onConfirmDelivery,
  onOpenDepositPayment,
  onOpenRemainingPayment,
  onSaveDeliveryDetails,
  order,
  paymentHistory,
  remainingPayment,
}: {
  confirmDeliveryPending: boolean;
  deliveryDetailsPending: boolean;
  depositPayment: PaymentDetailDto | null;
  depositPaymentPending: boolean;
  isPaymentHistoryLoading: boolean;
  onCreateDepositPayment: () => Promise<void>;
  onConfirmDelivery: () => Promise<void>;
  onOpenDepositPayment: (payment: PaymentDetailDto) => void;
  onOpenRemainingPayment: (payment: PaymentDetailDto) => void;
  onSaveDeliveryDetails: (details: OrderDeliveryDetailsDraft) => Promise<void>;
  order: OrderDetailDto;
  paymentHistory: OrderPaymentHistoryDto | null;
  remainingPayment: PaymentDetailDto | null;
}) {
  const orderItems = useMemo(() => aggregateOrderItems(order.items ?? []), [order.items]);
  const deliveryDetailsComplete = hasCompleteDeliveryDetails(order);
  const deliverySummary = order.deliverySummary;
  const deliveries = useMemo(() => sortEmbeddedDeliveries(order.deliveries ?? []), [order.deliveries]);

  return (
    <section className="customer-orders-card customer-orders-detail">
      <header>
        <div>
          <h2>{order.orderCode}</h2>
        </div>
        <span className={`customer-orders-status customer-orders-status-${statusClass(order.status)}`}>{formatEnumLabel(order.status ?? 'UNKNOWN')}</span>
      </header>

      <AccordionSection defaultOpen meta={formatMoney(order.totalAmount)} title="Order Summary">
        <div className="customer-orders-money-grid">
          <MoneyValue label="Items Gross" value={formatMoney(order.itemsGrossAmount)} />
          <MoneyValue label="Item Discount" value={formatMoney(order.totalItemDiscountAmount)} />
          <MoneyValue label="Pre-VAT" value={formatMoney(order.preVatAmount)} />
          <MoneyValue label={`VAT ${formatPercentRate(order.vatRate)}`} value={formatMoney(order.vatAmount)} />
          <MoneyValue label="Total" value={formatMoney(order.totalAmount)} />
          <MoneyValue label="Deposit" value={formatMoney(order.depositAmount)} />
          <MoneyValue label="Paid" value={formatMoney(order.paidAmount)} />
          <MoneyValue label="Remaining" value={formatMoney(order.remainingAmount)} />
        </div>
      </AccordionSection>

      {canCreateDepositPayment(order.status) || order.status === 'DEPOSIT_PAID' ? (
        <AccordionSection defaultOpen meta={formatMoney(order.depositAmount)} title="Deposit Payment">
          <section className="customer-orders-payment-panel">
            <div>
              <span>Deposit Payment</span>
              <strong>{getDepositPaymentLabel(order, deliveryDetailsComplete, Boolean(depositPayment))}</strong>
            </div>
            {canCreateDepositPayment(order.status) ? (
              depositPayment ? (
                <button disabled={!deliveryDetailsComplete} type="button" onClick={() => onOpenDepositPayment(depositPayment)}>
                  Pay Deposit
                </button>
              ) : (
                <button disabled={depositPaymentPending || !deliveryDetailsComplete} type="button" onClick={() => void onCreateDepositPayment()}>
                  {depositPaymentPending ? 'Preparing...' : 'Create Deposit Payment'}
                </button>
              )
            ) : null}
          </section>
        </AccordionSection>
      ) : null}

      <AccordionSection defaultOpen meta={deliveryDetailsComplete ? 'Complete' : 'Required'} title="Delivery Details">
        {!areDeliveryDetailsLocked(order.status) ? (
          <DeliveryDetailsPanel
            isPending={deliveryDetailsPending}
            order={order}
            onSave={onSaveDeliveryDetails}
          />
        ) : order.deliveryDetails ? (
          <DeliveryDetailsSummary details={getOrderDeliveryDetailsDraft(order)} />
        ) : (
          <p className="customer-orders-muted">No delivery details available.</p>
        )}
      </AccordionSection>

      <DeliverySummaryPanel deliveries={deliveries} summary={deliverySummary} />

      {(order.status === 'FINAL_PAYMENT_PENDING' || canConfirmOrderDelivery(order)) ? (
        <AccordionSection defaultOpen title="Actions">
          <div className="customer-orders-actions">
            {order.status === 'FINAL_PAYMENT_PENDING' && remainingPayment ? (
              <button type="button" onClick={() => onOpenRemainingPayment(remainingPayment)}>
                Pay Remaining
              </button>
            ) : null}
            {canConfirmOrderDelivery(order) ? (
              <button disabled={confirmDeliveryPending} type="button" onClick={() => void onConfirmDelivery()}>
                {confirmDeliveryPending ? 'Confirming...' : 'Confirm Delivery'}
              </button>
            ) : null}
            {order.status === 'FINAL_PAYMENT_PENDING' && !remainingPayment && (order.remainingAmount ?? 0) > 0 ? (
              <span>Remaining payment is being prepared.</span>
            ) : null}
          </div>
        </AccordionSection>
      ) : null}

      <PaymentHistoryPanel history={paymentHistory} isLoading={isPaymentHistoryLoading} />

      <AccordionSection meta={`${orderItems.length} line(s)`} title="Order Items">
        <div className="customer-orders-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Gross</th>
                <th>Discount</th>
                <th>Pre-VAT</th>
                <th>Delivery</th>
                <th>Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => (
                <tr key={item.sourceItems.map((sourceItem) => sourceItem.orderItemId).join('-')}>
                  <td>{getOrderItemName(item)}</td>
                  <td>{item.quantity ?? '-'}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                  <td>{formatMoney(getItemGrossAmount(item))}</td>
                  <td>{formatMoney(item.discountAmount)}</td>
                  <td>{formatMoney(getItemPreVatAmount(item))}</td>
                  <td>{formatGroupedDeliveryState(item)}</td>
                  <td>{confirmDeliveryPending ? 'Confirming...' : getOrderDeliveryConfirmationLabel(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AccordionSection>
    </section>
  );
}

function AccordionSection({
  children,
  defaultOpen = false,
  meta,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: string;
  title: string;
}) {
  return (
    <details className="customer-orders-accordion" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <div>
          {meta ? <em>{meta}</em> : null}
          <IconChevronDown size={18} stroke={1.9} />
        </div>
      </summary>
      <div className="customer-orders-accordion-body">
        {children}
      </div>
    </details>
  );
}

function PaymentHistoryPanel({ history, isLoading }: { history: OrderPaymentHistoryDto | null; isLoading: boolean }) {
  const payments = history?.payments ?? [];

  return (
    <AccordionSection meta={`${payments.length} record(s)`} title="Payment History">
      <section className="customer-orders-history-panel">
      {isLoading ? <p className="customer-orders-muted">Loading payment history...</p> : null}
      {!isLoading && payments.length === 0 ? <p className="customer-orders-muted">No payment history yet.</p> : null}
      {payments.length > 0 ? (
        <div className="customer-orders-payment-history-list">
          {payments.map((payment) => (
            <article key={payment.paymentId}>
              <div>
                <strong>{payment.paymentCode}</strong>
                <PaymentStatusPill status={payment.status} />
              </div>
              <dl>
                <div><dt>Type</dt><dd>{formatEnumLabel(payment.paymentType ?? 'PAYMENT')}</dd></div>
                <div><dt>Amount</dt><dd>{formatMoney(payment.amount)}</dd></div>
                <div><dt>Paid</dt><dd>{formatDateTime(payment.paidAt)}</dd></div>
                <div><dt>Expired</dt><dd>{formatDateTime(payment.expiredAt)}</dd></div>
              </dl>
              {payment.transactions.length > 0 ? (
                <small>{payment.transactions.length} transaction attempt(s)</small>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      </section>
    </AccordionSection>
  );
}

function PaymentStatusPill({ status }: { status?: PaymentStatus | null }) {
  return <span className={`customer-orders-payment-status customer-orders-payment-status-${(status ?? 'PENDING').toLowerCase()}`}>{formatEnumLabel(status ?? 'PENDING')}</span>;
}

function DeliveryDetailsSummary({ details }: { details: OrderDeliveryDetailsDraft }) {
  return (
    <section className="customer-orders-delivery-details">
      <header>
        <div>
          <h2>Locked Delivery Details</h2>
        </div>
        <span className="is-complete">Locked</span>
      </header>
      <div className="customer-orders-delivery-summary-grid">
        <MoneyValue label="Address" value={details.deliveryAddress || '-'} />
        <MoneyValue label="Receiver" value={details.receiverName || '-'} />
        <MoneyValue label="Phone" value={details.receiverPhone || '-'} />
        <MoneyValue label="Note" value={details.deliveryNote || '-'} />
      </div>
    </section>
  );
}

function DeliverySummaryPanel({ deliveries, summary }: { deliveries: OrderEmbeddedDeliveryDto[]; summary?: OrderDetailDto['deliverySummary'] | null }) {
  if (!summary && deliveries.length === 0) {
    return null;
  }

  return (
    <AccordionSection meta={summary ? `${summary.deliveryProgressPercent}%` : `${deliveries.length} batch(es)`} title="Delivery Progress">
      <section className="customer-orders-delivery-embed">
      {summary ? (
        <div className="customer-orders-delivery-summary-grid">
          <MoneyValue label="Delivered" value={`${summary.totalDeliveredQuantity} / ${summary.totalOrderedQuantity}`} />
          <MoneyValue label="Remaining" value={String(summary.remainingQuantity)} />
          <MoneyValue label="Progress" value={`${summary.deliveryProgressPercent}%`} />
          <MoneyValue label="Next Delivery" value={formatDateTime(summary.nextDeliveryAt)} />
        </div>
      ) : null}
      {deliveries.length > 0 ? (
        <div className="customer-orders-delivery-batches">
          {deliveries.map((delivery) => (
            <article key={delivery.deliveryId}>
              <div>
                <strong>{formatEnumLabel(delivery.status)}</strong>
                <span>{formatDateTime(delivery.scheduledStart)} - {formatDateTime(delivery.scheduledEnd)}</span>
              </div>
              <p>{delivery.location || 'No location'}</p>
              <small>{delivery.items.map((item) => `${item.productName ?? item.orderItemId}: ${item.quantity}`).join(', ') || 'No items'}</small>
            </article>
          ))}
        </div>
      ) : null}
      </section>
    </AccordionSection>
  );
}

function DeliveryDetailsPanel({
  isPending,
  onSave,
  order,
}: {
  isPending: boolean;
  onSave: (details: OrderDeliveryDetailsDraft) => Promise<void>;
  order: OrderDetailDto;
}) {
  const [draft, setDraft] = useState<OrderDeliveryDetailsDraft>(() => getOrderDeliveryDetailsDraft(order));
  const isComplete = hasCompleteDeliveryDetails(draft);

  useEffect(() => {
    setDraft(getOrderDeliveryDetailsDraft(order));
  }, [
    order,
    order.orderId,
    order.deliveryAddress,
    order.deliveryDetails?.deliveryAddress,
    order.deliveryDetails?.deliveryNote,
    order.deliveryDetails?.receiverName,
    order.deliveryDetails?.receiverPhone,
    order.deliveryNote,
    order.receiverName,
    order.receiverPhone,
  ]);

  return (
    <section className="customer-orders-delivery-details">
      <header>
        <div>
          <h2>Delivery Details</h2>
        </div>
        <span className={isComplete ? 'is-complete' : 'is-missing'}>{isComplete ? 'Complete' : 'Required'}</span>
      </header>
      <div className="customer-orders-delivery-details-grid">
        <label>
          <span>Delivery address</span>
          <input
            disabled={isPending}
            value={draft.deliveryAddress}
            onChange={(event) => setDraft((current) => ({ ...current, deliveryAddress: event.target.value }))}
          />
        </label>
        <label>
          <span>Receiver name</span>
          <input
            disabled={isPending}
            value={draft.receiverName}
            onChange={(event) => setDraft((current) => ({ ...current, receiverName: event.target.value }))}
          />
        </label>
        <label>
          <span>Receiver phone</span>
          <input
            disabled={isPending}
            value={draft.receiverPhone}
            onChange={(event) => setDraft((current) => ({ ...current, receiverPhone: event.target.value }))}
          />
        </label>
        <label className="customer-orders-delivery-details-note">
          <span>Delivery note</span>
          <textarea
            disabled={isPending}
            rows={3}
            value={draft.deliveryNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, deliveryNote: event.target.value }))}
          />
        </label>
      </div>
      <div className="customer-orders-actions">
        <button disabled={isPending || !isComplete} type="button" onClick={() => void onSave(normalizeDeliveryDetailsDraft(draft))}>
          {isPending ? 'Saving...' : 'Save Delivery Details'}
        </button>
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

function getCollectablePayment(history: OrderPaymentHistoryDto | null | undefined, paymentType: PaymentType, order: OrderDetailDto): PaymentDetailDto | null {
  const payment = history?.payments.find((item) => item.paymentType === paymentType && isCollectablePaymentStatus(item.status));

  if (!payment) return null;

  return {
    paymentId: payment.paymentId,
    projectId: order.projectId,
    orderId: order.orderId,
    paymentCode: payment.paymentCode,
    paymentType: payment.paymentType,
    amount: payment.amount,
    paidAmount: payment.status === 'PAID' ? payment.amount : 0,
    remainingAmount: payment.status === 'PAID' ? 0 : payment.amount,
    currency: payment.currency,
    status: payment.status,
    expiredAt: payment.expiredAt,
    paidAt: payment.paidAt,
    cancelledAt: payment.cancelledAt,
    createdAt: payment.createdAt,
  };
}

function isCollectablePaymentStatus(status?: PaymentStatus | null) {
  return status === 'PENDING' || status === 'PROCESSING';
}

function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? '-';
}

function aggregateOrderItems(items: OrderItemDto[]): GroupedOrderItem[] {
  const groupedItems = new Map<string, GroupedOrderItem>();
  const aggregateItems = aggregateDuplicateItems(items);

  for (const item of aggregateItems) {
    groupedItems.set(getItemAggregateKey(item), { ...item, sourceItems: [] });
  }

  for (const item of items) {
    groupedItems.get(getItemAggregateKey(item))?.sourceItems.push(item);
  }

  return Array.from(groupedItems.values());
}

function getOrderDeliveryDetailsDraft(order: Pick<OrderDetailDto | OrderListItemDto, 'deliveryAddress' | 'deliveryDetails' | 'deliveryNote' | 'receiverName' | 'receiverPhone'>): OrderDeliveryDetailsDraft {
  return {
    deliveryAddress: order.deliveryAddress ?? order.deliveryDetails?.deliveryAddress ?? '',
    deliveryNote: order.deliveryNote ?? order.deliveryDetails?.deliveryNote ?? '',
    receiverName: order.receiverName ?? order.deliveryDetails?.receiverName ?? '',
    receiverPhone: order.receiverPhone ?? order.deliveryDetails?.receiverPhone ?? '',
  };
}

function mergeDeliveryDetails(detail: OrderDeliveryDetailsDraft, saved?: OrderDeliveryDetailsDraft | null): OrderDeliveryDetailsDraft {
  return {
    deliveryAddress: getFirstDeliveryDetailValue(saved?.deliveryAddress, detail.deliveryAddress),
    deliveryNote: getFirstDeliveryDetailValue(saved?.deliveryNote, detail.deliveryNote),
    receiverName: getFirstDeliveryDetailValue(saved?.receiverName, detail.receiverName),
    receiverPhone: getFirstDeliveryDetailValue(saved?.receiverPhone, detail.receiverPhone),
  };
}

function getFirstDeliveryDetailValue(...values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? '';
}

function normalizeDeliveryDetailsDraft(details: OrderDeliveryDetailsDraft): OrderDeliveryDetailsDraft {
  return {
    deliveryAddress: details.deliveryAddress.trim(),
    deliveryNote: details.deliveryNote?.trim() || null,
    receiverName: details.receiverName.trim(),
    receiverPhone: details.receiverPhone.trim(),
  };
}

function hasCompleteDeliveryDetails(details: OrderDeliveryDetailsDraft | OrderDetailDto) {
  const resolvedDetails = 'deliveryDetails' in details ? getOrderDeliveryDetailsDraft(details) : details;

  return Boolean(
    resolvedDetails.deliveryAddress?.trim()
    && resolvedDetails.deliveryNote?.trim()
    && resolvedDetails.receiverName?.trim()
    && resolvedDetails.receiverPhone?.trim(),
  );
}

function areDeliveryDetailsLocked(status?: OrderStatus | null) {
  return Boolean(status && status !== 'CREATED' && status !== 'DEPOSIT_PENDING');
}

function canCreateDepositPayment(status?: OrderStatus | null) {
  return status === 'CREATED' || status === 'DEPOSIT_PENDING';
}

function canConfirmOrderDelivery(order: OrderDetailDto) {
  return Boolean(order.awaitingCustomerConfirmation ?? order.status === 'AWAITING_CUSTOMER_CONFIRMATION') && !order.customerConfirmedDeliveryAt;
}

function getDepositPaymentLabel(order: OrderDetailDto, deliveryDetailsComplete: boolean, hasDepositPayment: boolean) {
  if (order.status === 'DEPOSIT_PAID') return 'Deposit paid';
  if (!deliveryDetailsComplete) return 'Complete delivery details first';
  if (hasDepositPayment) return 'Payment pending';

  return 'Ready to create payment';
}

function getOrderDeliveryConfirmationLabel(order: OrderDetailDto) {
  if (order.customerConfirmedDeliveryAt) return `Confirmed ${formatDateTime(order.customerConfirmedDeliveryAt)}`;
  if (order.awaitingCustomerConfirmation ?? order.status === 'AWAITING_CUSTOMER_CONFIRMATION') return 'Waiting for your final confirmation';
  if (order.status === 'DELIVERING') return 'Physical delivery in progress';
  if (order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING' || order.status === 'COMPLETED') return 'Confirmed';

  return 'Pending delivery';
}

function sortEmbeddedDeliveries(deliveries: OrderEmbeddedDeliveryDto[]) {
  return [...deliveries].sort((first, second) => {
    const createdDiff = new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime();

    return createdDiff || second.deliveryId.localeCompare(first.deliveryId);
  });
}

function getOrderProjectName(order: OrderListItemDto & OrderProjectSummary, project?: OrderProjectSummary) {
  return order.projectName?.trim() || project?.projectName?.trim() || 'Project';
}

function getOrderProjectCode(order: OrderListItemDto & OrderProjectSummary, project?: OrderProjectSummary) {
  return order.projectCode?.trim() || project?.projectCode?.trim() || 'Project details';
}

function getItemGrossAmount(item: OrderItemDto) {
  if (typeof item.unitPrice === 'number' && typeof item.quantity === 'number') {
    return item.unitPrice * item.quantity;
  }

  return null;
}

function getItemPreVatAmount(item: OrderItemDto) {
  if (typeof item.subtotalAmount === 'number') return item.subtotalAmount;

  const gross = getItemGrossAmount(item);
  if (typeof gross === 'number') return gross - (item.discountAmount ?? 0);

  return null;
}

function statusClass(value?: OrderStatus | null) {
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

function formatGroupedDeliveryState(item: GroupedOrderItem) {
  const deliveredQuantity = item.sourceItems.reduce((total, sourceItem) => total + (sourceItem.deliveredQuantity ?? 0), 0);
  const quantity = item.quantity ?? 0;
  const statuses = Array.from(new Set(item.sourceItems.map((sourceItem) => sourceItem.status ?? 'PENDING')));
  const status = statuses.length === 1 ? formatEnumLabel(statuses[0]) : 'Mixed';

  return `${deliveredQuantity} / ${quantity || '-'} item(s) - ${status}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
