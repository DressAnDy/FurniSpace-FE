import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { useLang, type Lang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy, type CustomerCopy } from '@/features/CustomerPages/customercomponents';
import {
  formatCustomerDateTime,
  formatCustomerMoney,
  getPaymentTypeLabel,
} from '@/features/CustomerPages/utils';
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

export function CustomerOrdersPage() {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const statusOptions: Array<{ label: string; value: '' | OrderStatus }> = [
    { label: t.orders.allStatuses, value: '' },
    { label: t.orders.depositPending, value: 'DEPOSIT_PENDING' },
    { label: t.orders.inProduction, value: 'IN_PRODUCTION' },
    { label: t.orders.delivering, value: 'DELIVERING' },
    { label: t.orders.finalPayment, value: 'FINAL_PAYMENT_PENDING' },
    { label: t.orders.completed, value: 'COMPLETED' },
  ];
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
      <CustomerNavbar activeKey="orders" classPrefix="customer-orders" />

      <div className="customer-orders-main">
        <section className="customer-orders-heading">
          <div>
            <h1>{t.orders.title}</h1>
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
                <h2>{t.orders.myOrders}</h2>
                <p>{t.orders.orderCount(ordersQuery.data?.totalCount ?? 0)}</p>
              </div>
            </header>

            <div className="customer-orders-filter-grid">
              <input
                placeholder={t.orders.searchOrderCode}
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

            {ordersQuery.isLoading ? <p className="customer-orders-muted">{t.common.loading}</p> : null}
            {!ordersQuery.isLoading && orders.length === 0 ? <p className="customer-orders-muted">{t.orders.emptyOrders}</p> : null}
            <div className="customer-orders-order-list">
              {orders.map((item) => (
                <button
                  aria-label={`${t.common.open} ${item.orderCode}`}
                  className={item.orderId === selectedOrderId ? 'is-active' : ''}
                  key={item.orderId}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(item.orderId);
                    setActivePayment(null);
                    setMessage(null);
                  }}
                >
                  <strong>{getOrderProjectName(item, projectLookup.get(item.projectId), t.common.project)}</strong>
                  <span>{getOrderProjectCode(item, projectLookup.get(item.projectId), t.orders.projectDetails)}</span>
                  <em className={`customer-orders-status customer-orders-status-${statusClass(item.status)}`}>{formatEnumLabel(item.status ?? 'UNKNOWN')}</em>
                </button>
              ))}
            </div>
            {(ordersQuery.data?.totalCount ?? 0) > ORDER_PAGE_SIZE ? (
              <footer className="customer-orders-panel-pagination">
                <p>
                  <strong>{orderPage}</strong> / {totalOrderPages}
                </p>
                <div>
                  <button
                    aria-label={t.common.previous}
                    disabled={orderPage <= 1}
                    type="button"
                    onClick={() => setOrderPage((current) => Math.max(1, current - 1))}
                  >
                    <IconChevronLeft size={16} stroke={1.8} />
                  </button>
                  <button
                    aria-label={t.common.next}
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
                    setMessage({ tone: 'success', text: t.orders.deliveryConfirmedToast });
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
                    setMessage({ tone: 'success', text: t.orders.depositReadyToast });
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
                    setMessage({ tone: 'success', text: t.orders.deliverySavedToast });
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
              <p className="customer-orders-muted">{t.common.loading}</p>
            ) : null}

            <PaymentCollectionModal
              completionDescription={t.orders.paymentSuccessful}
              completionTitle={t.orders.paymentSuccessful}
              continueLabel={t.orders.backToOrders}
              payment={activePayment}
              title={t.orders.orderPayment}
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
  const { lang } = useLang();
  const t = customerCopy[lang];
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

      <AccordionSection defaultOpen meta={formatCustomerMoney(order.totalAmount)} title={t.orders.orderSummary}>
        <div className="customer-orders-money-grid">
          <MoneyValue label={t.orders.itemsGross} value={formatCustomerMoney(order.itemsGrossAmount)} />
          <MoneyValue label={t.orders.itemDiscount} value={formatCustomerMoney(order.totalItemDiscountAmount)} />
          <MoneyValue label={t.orders.preVat} value={formatCustomerMoney(order.preVatAmount)} />
          <MoneyValue label={`${t.orders.vat} ${formatPercentRate(order.vatRate)}`} value={formatCustomerMoney(order.vatAmount)} />
          <MoneyValue label={t.orders.total} value={formatCustomerMoney(order.totalAmount)} />
          <MoneyValue label={t.orders.deposit} value={formatCustomerMoney(order.depositAmount)} />
          <MoneyValue label={t.orders.paid} value={formatCustomerMoney(order.paidAmount)} />
          <MoneyValue label={t.orders.remaining} value={formatCustomerMoney(order.remainingAmount)} />
        </div>
      </AccordionSection>

      {canCreateDepositPayment(order.status) || order.status === 'DEPOSIT_PAID' ? (
        <AccordionSection defaultOpen meta={formatCustomerMoney(order.depositAmount)} title={t.orders.depositPayment}>
          <section className="customer-orders-payment-panel">
            <div>
              <span>{t.orders.depositPayment}</span>
              <strong>{getDepositPaymentLabel(order, deliveryDetailsComplete, Boolean(depositPayment), t.orders)}</strong>
            </div>
            {canCreateDepositPayment(order.status) ? (
              depositPayment ? (
                <button disabled={!deliveryDetailsComplete} type="button" onClick={() => onOpenDepositPayment(depositPayment)}>
                  Pay Deposit
                </button>
              ) : (
                <button disabled={depositPaymentPending || !deliveryDetailsComplete} type="button" onClick={() => void onCreateDepositPayment()}>
                  {depositPaymentPending ? t.common.loading : t.orders.createDepositPayment}
                </button>
              )
            ) : null}
          </section>
        </AccordionSection>
      ) : null}

      <AccordionSection defaultOpen meta={deliveryDetailsComplete ? t.orders.complete : t.orders.required} title={t.orders.deliveryDetails}>
        {!areDeliveryDetailsLocked(order.status) ? (
          <DeliveryDetailsPanel
            isPending={deliveryDetailsPending}
            order={order}
            onSave={onSaveDeliveryDetails}
          />
        ) : order.deliveryDetails ? (
          <DeliveryDetailsSummary details={getOrderDeliveryDetailsDraft(order)} />
        ) : (
          <p className="customer-orders-muted">{t.orders.noDeliveryDetails}</p>
        )}
      </AccordionSection>

      <DeliverySummaryPanel deliveries={deliveries} summary={deliverySummary} />

      {(order.status === 'FINAL_PAYMENT_PENDING' || canConfirmOrderDelivery(order)) ? (
        <AccordionSection defaultOpen title={t.orders.actions}>
          <div className="customer-orders-actions">
            {order.status === 'FINAL_PAYMENT_PENDING' && remainingPayment ? (
              <button type="button" onClick={() => onOpenRemainingPayment(remainingPayment)}>
                {t.orders.payRemaining}
              </button>
            ) : null}
            {canConfirmOrderDelivery(order) ? (
              <button disabled={confirmDeliveryPending} type="button" onClick={() => void onConfirmDelivery()}>
                {confirmDeliveryPending ? t.common.confirming : t.orders.confirmDelivery}
              </button>
            ) : null}
            {order.status === 'FINAL_PAYMENT_PENDING' && !remainingPayment && (order.remainingAmount ?? 0) > 0 ? (
              <span>Remaining payment is being prepared.</span>
            ) : null}
          </div>
        </AccordionSection>
      ) : null}

      <PaymentHistoryPanel history={paymentHistory} isLoading={isPaymentHistoryLoading} />

      <AccordionSection meta={`${orderItems.length}`} title={t.orders.orderItems}>
        <div className="customer-orders-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.quotations.item}</th>
                <th>{t.quotations.qty}</th>
                <th>{t.quotations.unit}</th>
                <th>{t.quotations.gross}</th>
                <th>{t.quotations.discount}</th>
                <th>{t.orders.preVat}</th>
                <th>{t.orders.deliveryProgress}</th>
                <th>{t.common.confirm}</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => (
                <tr key={item.sourceItems.map((sourceItem) => sourceItem.orderItemId).join('-')}>
                  <td>{getOrderItemName(item)}</td>
                  <td>{item.quantity ?? '-'}</td>
                  <td>{formatCustomerMoney(item.unitPrice)}</td>
                  <td>{formatCustomerMoney(getItemGrossAmount(item))}</td>
                  <td>{formatCustomerMoney(item.discountAmount)}</td>
                  <td>{formatCustomerMoney(getItemPreVatAmount(item))}</td>
                  <td>{formatGroupedDeliveryState(item, t.orders)}</td>
                  <td>{confirmDeliveryPending ? t.common.confirming : getOrderDeliveryConfirmationLabel(order, lang, t.orders)}</td>
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
  const { lang } = useLang();
  const t = customerCopy[lang];
  const payments = history?.payments ?? [];

  return (
    <AccordionSection meta={`${payments.length}`} title={t.orders.paymentHistory}>
      <section className="customer-orders-history-panel">
      {isLoading ? <p className="customer-orders-muted">{t.common.loading}</p> : null}
      {!isLoading && payments.length === 0 ? <p className="customer-orders-muted">{t.orders.noPaymentHistory}</p> : null}
      {payments.length > 0 ? (
        <div className="customer-orders-payment-history-list">
          {payments.map((payment) => (
            <article key={payment.paymentId}>
              <div>
                <strong>{payment.paymentCode}</strong>
                <PaymentStatusPill status={payment.status} />
              </div>
              <dl>
                <div><dt>{t.orders.type}</dt><dd>{payment.paymentType ? getPaymentTypeLabel(payment.paymentType, lang) : formatEnumLabel('PAYMENT')}</dd></div>
                <div><dt>{t.orders.total}</dt><dd>{formatCustomerMoney(payment.amount)}</dd></div>
                <div><dt>{t.orders.paid}</dt><dd>{formatCustomerDateTime(payment.paidAt, lang)}</dd></div>
                <div><dt>{t.orders.expired}</dt><dd>{formatCustomerDateTime(payment.expiredAt, lang)}</dd></div>
              </dl>
              {payment.transactions.length > 0 ? (
                <small>{t.orders.transactionAttempts(payment.transactions.length)}</small>
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
  const { lang } = useLang();
  const resolved = status ?? 'PENDING';
  const known = customerCopy[lang].paymentStatus[resolved as keyof typeof customerCopy.en.paymentStatus];
  return <span className={`customer-orders-payment-status customer-orders-payment-status-${resolved.toLowerCase()}`}>{known ?? formatEnumLabel(resolved)}</span>;
}

function DeliveryDetailsSummary({ details }: { details: OrderDeliveryDetailsDraft }) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  return (
    <section className="customer-orders-delivery-details">
      <header>
        <div>
          <h2>{t.orders.deliveryDetails}</h2>
        </div>
        <span className="is-complete">{t.orders.locked}</span>
      </header>
      <div className="customer-orders-delivery-summary-grid">
        <MoneyValue label={t.orders.address} value={details.deliveryAddress || '-'} />
        <MoneyValue label={t.orders.receiver} value={details.receiverName || '-'} />
        <MoneyValue label={t.orders.phone} value={details.receiverPhone || '-'} />
        <MoneyValue label={t.orders.note} value={details.deliveryNote || '-'} />
      </div>
    </section>
  );
}

function DeliverySummaryPanel({ deliveries, summary }: { deliveries: OrderEmbeddedDeliveryDto[]; summary?: OrderDetailDto['deliverySummary'] | null }) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  if (!summary && deliveries.length === 0) {
    return null;
  }

  return (
    <AccordionSection meta={summary ? `${summary.deliveryProgressPercent}%` : `${deliveries.length}`} title={t.orders.deliveryProgress}>
      <section className="customer-orders-delivery-embed">
      {summary ? (
        <div className="customer-orders-delivery-summary-grid">
          <MoneyValue label="Delivered" value={`${summary.totalDeliveredQuantity} / ${summary.totalOrderedQuantity}`} />
          <MoneyValue label={t.orders.remaining} value={String(summary.remainingQuantity)} />
          <MoneyValue label={t.orders.deliveryProgress} value={`${summary.deliveryProgressPercent}%`} />
          <MoneyValue label="Next Delivery" value={formatCustomerDateTime(summary.nextDeliveryAt, lang)} />
        </div>
      ) : null}
      {deliveries.length > 0 ? (
        <div className="customer-orders-delivery-batches">
          {deliveries.map((delivery) => (
            <article key={delivery.deliveryId}>
              <div>
                <strong>{formatEnumLabel(delivery.status)}</strong>
                <span>{formatCustomerDateTime(delivery.scheduledStart, lang)} - {formatCustomerDateTime(delivery.scheduledEnd, lang)}</span>
              </div>
              <p>{delivery.location || '-'}</p>
              <small>{delivery.items.map((item) => `${item.productName ?? item.orderItemId}: ${item.quantity}`).join(', ') || '-'}</small>
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
  const { lang } = useLang();
  const t = customerCopy[lang];
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
          <h2>{t.orders.deliveryDetails}</h2>
        </div>
        <span className={isComplete ? 'is-complete' : 'is-missing'}>{isComplete ? t.orders.complete : t.orders.required}</span>
      </header>
      <div className="customer-orders-delivery-details-grid">
        <label>
          <span>{t.orders.address}</span>
          <input
            disabled={isPending}
            value={draft.deliveryAddress}
            onChange={(event) => setDraft((current) => ({ ...current, deliveryAddress: event.target.value }))}
          />
        </label>
        <label>
          <span>{t.orders.receiver}</span>
          <input
            disabled={isPending}
            value={draft.receiverName}
            onChange={(event) => setDraft((current) => ({ ...current, receiverName: event.target.value }))}
          />
        </label>
        <label>
          <span>{t.orders.phone}</span>
          <input
            disabled={isPending}
            value={draft.receiverPhone}
            onChange={(event) => setDraft((current) => ({ ...current, receiverPhone: event.target.value }))}
          />
        </label>
        <label className="customer-orders-delivery-details-note">
          <span>{t.orders.note}</span>
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
          {isPending ? t.common.loading : t.orders.saveDeliveryDetails}
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

function getDepositPaymentLabel(
  order: OrderDetailDto,
  deliveryDetailsComplete: boolean,
  hasDepositPayment: boolean,
  copy: CustomerCopy['orders'],
) {
  if (order.status === 'DEPOSIT_PAID') return copy.depositPaid;
  if (!deliveryDetailsComplete) return copy.completeDeliveryFirst;
  if (hasDepositPayment) return copy.paymentPending;

  return copy.readyToCreatePayment;
}

function getOrderDeliveryConfirmationLabel(order: OrderDetailDto, lang: Lang, copy: CustomerCopy['orders']) {
  if (order.customerConfirmedDeliveryAt) return copy.confirmedAt(formatCustomerDateTime(order.customerConfirmedDeliveryAt, lang));
  if (order.awaitingCustomerConfirmation ?? order.status === 'AWAITING_CUSTOMER_CONFIRMATION') return copy.waitingFinalConfirmation;
  if (order.status === 'DELIVERING') return copy.physicalDeliveryInProgress;
  if (order.status === 'DELIVERED' || order.status === 'FINAL_PAYMENT_PENDING' || order.status === 'COMPLETED') return copy.confirmed;

  return copy.pendingDelivery;
}

function sortEmbeddedDeliveries(deliveries: OrderEmbeddedDeliveryDto[]) {
  return [...deliveries].sort((first, second) => {
    const createdDiff = new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime();

    return createdDiff || second.deliveryId.localeCompare(first.deliveryId);
  });
}

function getOrderProjectName(order: OrderListItemDto & OrderProjectSummary, project?: OrderProjectSummary, fallback = 'Project') {
  return order.projectName?.trim() || project?.projectName?.trim() || fallback;
}

function getOrderProjectCode(order: OrderListItemDto & OrderProjectSummary, project?: OrderProjectSummary, fallback = 'Project details') {
  return order.projectCode?.trim() || project?.projectCode?.trim() || fallback;
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

function formatPercentRate(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

function formatGroupedDeliveryState(item: GroupedOrderItem, copy: CustomerCopy['orders']) {
  const deliveredQuantity = item.sourceItems.reduce((total, sourceItem) => total + (sourceItem.deliveredQuantity ?? 0), 0);
  const quantity = item.quantity ?? 0;
  const statuses = Array.from(new Set(item.sourceItems.map((sourceItem) => sourceItem.status ?? 'PENDING')));
  const status = statuses.length === 1 ? formatEnumLabel(statuses[0]) : copy.mixed;

  return copy.itemsProgress(deliveredQuantity, String(quantity || '-'), status);
}
