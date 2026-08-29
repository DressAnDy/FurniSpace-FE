import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { IconDiscount2, IconSearch, IconX } from '@tabler/icons-react';

import { useLang, type Lang } from '@/app/providers/useLang';
import {
  getAdminFinancialDiscountServiceResultMessage,
  type AdminFinancialDiscountOrderDetailDto,
  type AdminFinancialDiscountProjectRowDto,
} from '@/services/api/adminFinancialDiscount';
import {
  useAdminFinancialDiscountExceptions,
  useAdminFinancialDiscountOrderDetail,
  useAdminFinancialDiscountProjects,
  useAdminFinancialDiscountSummary,
} from '@/services/queries';

import {
  financialCopy,
  formatDateTime,
  formatEnumLabel,
  formatKpiMoney,
  formatMoney,
} from './adminReportsI18n';

type DateParams = { from: string; to: string };

export type DiscountPanelNavigation = {
  initialOrderId?: string | null;
  onOrderSelect?: (orderId: string | null) => void;
};

type DiscountPanelProps = {
  dateParams: DateParams;
  fromDate: string;
  toDate: string;
  navigation?: DiscountPanelNavigation;
};

const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;

export function DiscountPanel({ dateParams, fromDate, toDate, navigation }: DiscountPanelProps) {
  const { lang } = useLang();
  const t = financialCopy[lang];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [keyword, setKeyword] = useState('');
  const [hasDiscount, setHasDiscount] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(navigation?.initialOrderId ?? null);

  useEffect(() => {
    setPage(1);
  }, [dateParams.from, dateParams.to, hasDiscount]);

  useEffect(() => {
    if (navigation?.initialOrderId) {
      setSelectedOrderId(navigation.initialOrderId);
    }
  }, [navigation?.initialOrderId]);

  const summaryQuery = useAdminFinancialDiscountSummary(
    { from: dateParams.from, to: dateParams.to, currency: 'VND' },
    { enabled: true },
  );
  const projectsQuery = useAdminFinancialDiscountProjects(
    {
      from: dateParams.from,
      to: dateParams.to,
      hasDiscount: hasDiscount === 'all' ? undefined : hasDiscount === 'yes',
      page,
      pageSize,
      sortBy: 'confirmedAt',
      sortDirection: 'desc',
    },
    { enabled: true },
  );
  const exceptionsQuery = useAdminFinancialDiscountExceptions(
    { from: dateParams.from, to: dateParams.to, page: 1, pageSize: 5 },
    { enabled: true },
  );
  const detailQuery = useAdminFinancialDiscountOrderDetail(selectedOrderId ?? '', {
    enabled: Boolean(selectedOrderId),
  });

  const filteredItems = useMemo(() => {
    const items = projectsQuery.data?.items ?? [];
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.projectCode?.toLowerCase().includes(q) ||
        item.projectName.toLowerCase().includes(q) ||
        item.orderCode.toLowerCase().includes(q) ||
        item.customerName?.toLowerCase().includes(q),
    );
  }, [keyword, projectsQuery.data?.items]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    navigation?.onOrderSelect?.(orderId);
  };

  const handleCloseDetail = () => {
    setSelectedOrderId(null);
    navigation?.onOrderSelect?.(null);
  };

  return (
    <section className="admin-financial-discount-panel">
      <article className="admin-card admin-financial-section-card admin-financial-discount-summary-card">
        <header className="admin-financial-discount-header">
          <div>
            <span className="admin-financial-hero-eyebrow">
              <IconDiscount2 size={16} /> {t.discountEyebrow}
            </span>
            <h3>{t.discountTitle}</h3>
            <p>{t.discountSubtitle}</p>
          </div>
          <span className="admin-financial-discount-period">{t.statementPeriodNote(fromDate, toDate)}</span>
        </header>

        <p className="admin-financial-discount-note">{t.discountDisclaimer}</p>

        {summaryQuery.isLoading ? <StateBlock>{t.loadingDiscountSummary}</StateBlock> : null}
        {summaryQuery.isError ? (
          <ErrorBlock message={getAdminFinancialDiscountServiceResultMessage(summaryQuery.error)} />
        ) : null}
        {summaryQuery.data ? (
          <div className="admin-financial-discount-kpi-grid">
            <DiscountKpi label={t.discountTotalAmount} tone="warn" value={formatMoney(lang, summaryQuery.data.totalDiscountAmount)} />
            <DiscountKpi label={t.discountAverageRate} value={`${summaryQuery.data.averageDiscountRate.toFixed(1)}%`} />
            <DiscountKpi
              label={t.discountOrderCount}
              value={`${summaryQuery.data.discountedOrderCount} / ${summaryQuery.data.totalOrderCount}`}
            />
            <DiscountKpi label={t.discountGrossValue} value={formatMoney(lang, summaryQuery.data.grossOrderValue)} />
            <DiscountKpi label={t.discountFinalValue} value={formatMoney(lang, summaryQuery.data.finalOrderValue)} />
          </div>
        ) : null}
      </article>

      {exceptionsQuery.data && exceptionsQuery.data.items.length > 0 ? (
        <aside className="admin-financial-discount-exceptions">
          <h4>{t.discountExceptionsTitle}</h4>
          <ul>
            {exceptionsQuery.data.items.map((item, index) => (
              <li key={`${item.orderId}-${item.exceptionType}-${index}`}>
                <strong>{formatEnumLabel(lang, item.exceptionType)}</strong>
                <span>
                  {item.orderCode} · {item.projectCode || item.projectName} · {item.discountRate.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <article className="admin-card admin-financial-section-card admin-financial-discount-table-card">
        <div className="admin-financial-discount-toolbar">
          <label className="admin-financial-search">
            <IconSearch size={15} />
            <input
              aria-label={t.searchDiscounts}
              placeholder={t.searchPlaceholder}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label className="admin-report-filter">
            <span>{t.discountHasFilter}</span>
            <select
              value={hasDiscount}
              onChange={(event) => setHasDiscount(event.target.value as 'all' | 'yes' | 'no')}
            >
              <option value="all">{t.filterAll}</option>
              <option value="yes">{t.yes}</option>
              <option value="no">{t.no}</option>
            </select>
          </label>
        </div>

        {projectsQuery.isLoading ? <StateBlock>{t.loadingDiscountList}</StateBlock> : null}
        {projectsQuery.isError ? (
          <ErrorBlock message={getAdminFinancialDiscountServiceResultMessage(projectsQuery.error)} />
        ) : null}
        {projectsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>{t.project}</th>
                    <th>{t.customerSales}</th>
                    <th>{t.order}</th>
                    <th>{t.discountGrossValue}</th>
                    <th>{t.discountTotalAmount}</th>
                    <th>{t.discountAverageRate}</th>
                    <th>{t.discountFinalValue}</th>
                    <th>{t.confirmedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyRow text={t.emptyDiscounts} />
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <DiscountProjectRow
                        key={item.orderId}
                        item={item}
                        lang={lang}
                        selected={selectedOrderId === item.orderId}
                        onSelect={() => handleSelectOrder(item.orderId)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <footer className="admin-financial-discount-table-footer">
              <Pager
                lang={lang}
                page={projectsQuery.data.page}
                pageSize={pageSize}
                totalPages={projectsQuery.data.totalPages}
                totalItems={projectsQuery.data.totalItems}
                onChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </footer>
          </>
        ) : null}
      </article>

      {selectedOrderId ? (
        <DiscountOrderDetailPanel
          data={detailQuery.data}
          error={detailQuery.isError ? detailQuery.error : null}
          isLoading={detailQuery.isLoading}
          lang={lang}
          onClose={handleCloseDetail}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}
    </section>
  );
}

function DiscountKpi({ label, tone, value }: { label: string; tone?: 'warn'; value: string }) {
  return (
    <article className={`admin-financial-discount-kpi${tone ? ` is-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DiscountProjectRow({
  item,
  lang,
  onSelect,
  selected,
}: {
  item: AdminFinancialDiscountProjectRowDto;
  lang: Lang;
  onSelect: () => void;
  selected: boolean;
}) {
  const t = financialCopy[lang];

  return (
    <tr className={selected ? 'is-selected' : undefined}>
      <td>
        <button type="button" className="admin-financial-table-link" onClick={onSelect}>
          {item.projectCode || item.projectName}
        </button>
        <div className="admin-report-cell-sub">{item.projectName}</div>
      </td>
      <td>
        {item.customerName || '—'}
        <div className="admin-report-cell-sub">{item.salesName ? t.salesLabel(item.salesName) : '—'}</div>
      </td>
      <td>
        {item.orderCode}
        <div className="admin-report-cell-sub">{formatEnumLabel(lang, item.orderStatus || '')}</div>
      </td>
      <td className="admin-financial-money">{formatKpiMoney(lang, item.grossOrderValue)}</td>
      <td className="admin-financial-money is-warn">{formatKpiMoney(lang, item.totalDiscountAmount)}</td>
      <td>{item.discountRate.toFixed(1)}%</td>
      <td className="admin-financial-money">{formatKpiMoney(lang, item.finalOrderValue)}</td>
      <td>{formatDateTime(lang, item.confirmedAt)}</td>
    </tr>
  );
}

function DiscountOrderDetailPanel({
  data,
  error,
  isLoading,
  lang,
  onClose,
  onRetry,
}: {
  data: AdminFinancialDiscountOrderDetailDto | undefined;
  error: unknown;
  isLoading: boolean;
  lang: Lang;
  onClose: () => void;
  onRetry: () => void;
}) {
  const t = financialCopy[lang];

  return (
    <section className="admin-financial-inline-detail admin-financial-discount-detail">
      <header>
        <div>
          <span>{t.discountDetailTitle}</span>
          <h4>{data?.orderCode ?? t.loadingDiscountDetail}</h4>
          <p>{data ? `${data.projectCode || data.projectName} · ${data.customerName || '—'}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.closeDiscountDetail}>
          <IconX size={16} />
        </button>
      </header>

      {isLoading ? <StateBlock>{t.loadingDiscountDetail}</StateBlock> : null}
      {error ? (
        <>
          <ErrorBlock message={getAdminFinancialDiscountServiceResultMessage(error)} />
          <button type="button" className="admin-button admin-button-ghost" onClick={onRetry}>
            {t.retryDrilldown}
          </button>
        </>
      ) : null}

      {data && !isLoading ? (
        <>
          <div className="admin-financial-commercial-block">
            <h5>{t.discountPriceChain}</h5>
            <dl>
              <div>
                <dt>{t.discountGrossValue}</dt>
                <dd>{formatMoney(lang, data.grossOrderValue)}</dd>
              </div>
              <div>
                <dt>{t.discountItemAmount}</dt>
                <dd>− {formatMoney(lang, data.itemDiscountAmount)}</dd>
              </div>
              <div>
                <dt>{t.discountOrderAmount}</dt>
                <dd>− {formatMoney(lang, data.orderAdditionalDiscountAmount)}</dd>
              </div>
              <div>
                <dt>{t.discountNetBeforeVat}</dt>
                <dd>{formatMoney(lang, data.netOrderValueBeforeVat)}</dd>
              </div>
              <div>
                <dt>{t.discountVat}</dt>
                <dd>
                  + {formatMoney(lang, data.vatAmount)} ({data.vatRate}%)
                </dd>
              </div>
              <div>
                <dt>{t.discountFinalValue}</dt>
                <dd>{formatMoney(lang, data.finalOrderValue)}</dd>
              </div>
            </dl>
          </div>

          <div className="admin-report-table-wrap admin-financial-table-wrap">
            <table className="admin-report-table admin-financial-table">
              <thead>
                <tr>
                  <th>{t.discountItemName}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.discountGrossValue}</th>
                  <th>{t.discountTotalAmount}</th>
                  <th>{t.discountFinalValue}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.orderItemId}>
                    <td>
                      {item.productName || '—'}
                      {item.productVersionName ? (
                        <div className="admin-report-cell-sub">{item.productVersionName}</div>
                      ) : null}
                    </td>
                    <td>{item.quantity}</td>
                    <td className="admin-financial-money">{formatKpiMoney(lang, item.unitPrice)}</td>
                    <td className="admin-financial-money">{formatKpiMoney(lang, item.lineGrossAmount)}</td>
                    <td className="admin-financial-money is-warn">{formatKpiMoney(lang, item.discountAmount)}</td>
                    <td className="admin-financial-money">{formatKpiMoney(lang, item.subtotalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function StateBlock({ children }: { children: ReactNode }) {
  return <p className="admin-financial-state">{children}</p>;
}

function ErrorBlock({ message }: { message: string }) {
  return <p className="admin-financial-error">{message}</p>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="admin-financial-empty-row">{text}</p>;
}

function Pager({
  lang,
  onChange,
  onPageSizeChange,
  page,
  pageSize,
  totalItems,
  totalPages,
}: {
  lang: Lang;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const t = financialCopy[lang];
  const safeTotalPages = Math.max(totalPages, 1);
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  const commitPage = () => {
    const parsed = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }
    const next = Math.min(Math.max(parsed, 1), safeTotalPages);
    setPageDraft(String(next));
    if (next !== page) onChange(next);
  };

  const commitPageSize = () => {
    const parsed = Number.parseInt(sizeDraft, 10);
    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(pageSize));
      return;
    }
    const next = Math.min(Math.max(parsed, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  };

  return (
    <div className="admin-financial-pager">
      <div className="admin-financial-pager-meta">
        <label className="admin-financial-pager-field">
          <span>{t.rowsPerPage}</span>
          <input
            aria-label={t.rowsPerPage}
            inputMode="numeric"
            max={MAX_PAGE_SIZE}
            min={MIN_PAGE_SIZE}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </label>
        <label className="admin-financial-pager-field">
          <span>{t.pageLabel}</span>
          <input
            aria-label={t.pageLabel}
            inputMode="numeric"
            max={safeTotalPages}
            min={1}
            type="number"
            value={pageDraft}
            onBlur={commitPage}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span className="admin-financial-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="admin-financial-pager-total">{t.totalRows(totalItems)}</span>
      </div>
      <div className="admin-financial-pager-nav">
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          {t.prev}
        </button>
        <button disabled={page >= safeTotalPages} type="button" onClick={() => onChange(page + 1)}>
          {t.next}
        </button>
      </div>
    </div>
  );
}
