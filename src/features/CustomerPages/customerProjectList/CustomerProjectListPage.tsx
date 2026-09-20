import {
  IconArrowRight,
  IconCalendar,
  IconSearch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './CustomerProjectListPage.css';
import { useLang, type Lang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy, type CustomerCopy } from '@/features/CustomerPages/customercomponents';
import { formatCustomerDate, getCustomerProjectStatusLabel } from '@/features/CustomerPages/utils';
import { PaymentCollectionModal } from '@/features/payments';
import type { PaymentDetailDto } from '@/services/api/payments';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
import { usePayments } from '@/services/queries';
import { useProjectList } from '@/services/queries/useProjects';

const PROJECT_PAGE_SIZE = 6;

export function CustomerProjectListPage() {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PROJECT_PAGE_SIZE);
  const projectsQuery = useProjectList({
    search: keyword,
    status: status || null,
    page,
    limit: pageSize,
  });
  const projects = projectsQuery.data?.items ?? [];
  const totalProjects = projectsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize));

  useEffect(() => {
    setPage(1);
  }, [keyword, pageSize, status]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize);
    setPage(1);
  }

  return (
    <main className="customer-project-list-page">
      <CustomerNavbar activeKey="myProjects" classPrefix="customer-project-list" />

      <div className="customer-project-list-main">
        <section className="customer-project-list-heading">
          <div>
            <h1>{t.projects.title}</h1>
          </div>
        </section>

        <section className="customer-project-list-filters" aria-label="Project filters">
          <label>
            <IconSearch size={17} stroke={1.8} />
            <input
              type="search"
              placeholder={t.projects.searchPlaceholder}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | '')}>
            <option value="">{t.projects.allStatuses}</option>
            <option value="SUBMITTED">{t.status.SUBMITTED}</option>
            <option value="NEED_BASIC_INFORMATION">{t.status.NEED_BASIC_INFORMATION}</option>
            <option value="IN_CONSULTATION">{t.status.IN_CONSULTATION}</option>
            <option value="WAITING_FOR_DESIGNER_ASSIGNMENT">{t.status.WAITING_FOR_DESIGNER_ASSIGNMENT}</option>
            <option value="MEASUREMENT_REQUIRED">{t.status.MEASUREMENT_REQUIRED}</option>
            <option value="SPACE_VERIFIED">{t.status.SPACE_VERIFIED}</option>
            <option value="REJECTED">{t.status.REJECTED}</option>
          </select>
        </section>

        <section className="customer-project-list-grid" aria-label="Projects">
          {projectsQuery.isLoading ? <p className="customer-project-list-state">{t.projects.loading}</p> : null}
          {projectsQuery.isError ? <p className="customer-project-list-state customer-project-list-state-error">{t.projects.loadError}</p> : null}
          {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 ? (
            <p className="customer-project-list-state">{t.projects.empty}</p>
          ) : null}
          {projects.map((project) => (
            <ProjectCard
              key={project.projectId}
              lang={lang}
              project={project}
              t={t}
              onPaymentCompleted={() => void projectsQuery.refetch()}
            />
          ))}
        </section>

        <CustomerProjectPager
          disabled={projectsQuery.isFetching}
          lang={lang}
          page={page}
          pageSize={pageSize}
          totalItems={totalProjects}
          totalPages={totalPages}
          t={t}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </main>
  );
}

type CustomerProjectPagerProps = {
  disabled?: boolean;
  lang: Lang;
  page: number;
  pageSize: number;
  t: CustomerCopy;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function CustomerProjectPager({
  disabled = false,
  lang,
  page,
  pageSize,
  t,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: CustomerProjectPagerProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));
  const rowsLabel = lang === 'vi' ? 'Dòng' : 'Rows';
  const pageLabel = lang === 'vi' ? 'Trang' : 'Page';
  const totalRowsLabel = lang === 'vi' ? `${totalItems} dòng` : `${totalItems} rows`;

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  function commitPage() {
    const parsed = Number.parseInt(pageDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), safeTotalPages) : page;
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : pageSize;
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <footer className="customer-project-list-pagination">
      <div className="customer-project-list-pager-meta">
        <label className="customer-project-list-pager-field">
          <span>{rowsLabel}</span>
          <input
            aria-label={rowsLabel}
            disabled={disabled}
            max={100}
            min={1}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </label>
        <label className="customer-project-list-pager-field">
          <span>{pageLabel}</span>
          <input
            aria-label={pageLabel}
            disabled={disabled}
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
          <span className="customer-project-list-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="customer-project-list-pager-total">{totalRowsLabel}</span>
      </div>
      <div className="customer-project-list-pager-nav">
        <button disabled={disabled || page <= 1} type="button" onClick={() => onPageChange(page - 1)}>
          {t.common.previous}
        </button>
        <button disabled={disabled || page >= safeTotalPages} type="button" onClick={() => onPageChange(page + 1)}>
          {t.common.next}
        </button>
      </div>
    </footer>
  );
}

type ProjectCardProps = {
  lang: Lang;
  onPaymentCompleted: () => void;
  project: ProjectListItemDto;
  t: CustomerCopy;
};

function ProjectCard({ lang, onPaymentCompleted, project, t }: ProjectCardProps) {
  const navigate = useNavigate();
  const [startFeePayment, setStartFeePayment] = useState<PaymentDetailDto | null>(null);
  const stage = getProjectStage(project.status, lang);
  const needsInformationUpdate = project.status === 'NEED_BASIC_INFORMATION';
  const startFeePaymentsQuery = usePayments(
    {
      projectId: project.projectId,
      paymentType: 'PROJECT_START_FEE',
    },
    {
      enabled: !project.assignedDesignerId && project.status !== 'SUBMITTED' && project.status !== 'REJECTED',
    },
  );
  const projectStartFeePayment = useMemo(() => {
    const payments = startFeePaymentsQuery.data?.items ?? [];

    return payments.find((payment) => isCollectablePaymentStatus(normalizePaymentStatus(payment.status))) ?? payments[0] ?? null;
  }, [startFeePaymentsQuery.data?.items]);
  const startFeePaymentStatus = normalizePaymentStatus(projectStartFeePayment?.status);
  const canPayStartFee = Boolean(projectStartFeePayment && isCollectablePaymentStatus(startFeePaymentStatus));

  return (
    <article className="customer-project-list-card">
      <div className="customer-project-list-card-cover">
        <div>
          <strong>{project.businessType}</strong>
          <span>{project.projectCode}</span>
        </div>
        <span className={`customer-project-list-status customer-project-list-status-${stage.tone}`}>
          {stage.label}
        </span>
      </div>

      <div className="customer-project-list-card-body">
        <h2>{project.projectName}</h2>
        <p className="customer-project-list-code">{project.projectCode}</p>

        <div className="customer-project-list-detail-stack">
          <p>
            <IconCalendar size={16} stroke={1.8} />
            {t.projects.submitted} {formatCustomerDate(project.submittedAt, lang)}
          </p>
        </div>

        <div className="customer-project-list-stage">
          <span>{t.projects.currentStage}</span>
          <strong>{stage.label}</strong>
        </div>

        <div className="customer-project-list-actions">
          <button
            type="button"
            onClick={() => {
              if (canPayStartFee && projectStartFeePayment) {
                setStartFeePayment(projectStartFeePayment);
                return;
              }

              navigate(
                needsInformationUpdate
                  ? `/customer/projects/${project.projectId}/edit`
                  : `/customer/projects/${project.projectId}`,
              );
            }}
          >
            {canPayStartFee ? t.projects.payStartFee : needsInformationUpdate ? t.projects.updateInformation : t.projects.openProject}
            <IconArrowRight size={16} stroke={1.8} />
          </button>
        </div>
      </div>

      <PaymentCollectionModal
        payment={startFeePayment}
        title={t.projects.startFeeTitle}
        completionTitle={t.projects.startFeePaid}
        completionDescription="Your project can now continue to designer assignment."
        continueLabel={t.projects.backToProjects}
        onClose={() => setStartFeePayment(null)}
        onContinue={() => {
          setStartFeePayment(null);
          onPaymentCompleted();
        }}
        onPaid={() => {
          void startFeePaymentsQuery.refetch();
          onPaymentCompleted();
        }}
      />
    </article>
  );
}

function getProjectStage(status: ProjectListItemDto['status'], lang: Lang) {
  const tones: Record<ProjectListItemDto['status'], string> = {
    SUBMITTED: 'gold',
    NEED_BASIC_INFORMATION: 'gold',
    IN_CONSULTATION: 'stone',
    WAITING_FOR_DESIGNER_ASSIGNMENT: 'stone',
    MEASUREMENT_REQUIRED: 'stone',
    SPACE_VERIFIED: 'green',
    PROPOSAL_CONSULTING: 'gold',
    PROPOSAL_SELECTED: 'green',
    QUOTATION_SENT: 'gold',
    QUOTATION_REVISION_REQUESTED: 'gold',
    ORDER_CONFIRMED: 'green',
    IN_PRODUCTION: 'stone',
    READY_FOR_DELIVERY: 'green',
    DELIVERING: 'green',
    AWAITING_CUSTOMER_CONFIRMATION: 'gold',
    DELIVERED: 'green',
    COMPLETED: 'green',
    REJECTED: 'stone',
  };

  return {
    label: getCustomerProjectStatusLabel(status, lang),
    tone: tones[status],
  };
}

/** Matches backend PaymentStatus enum ordinals (see services/api/payments.ts). */
const paymentStatusByNumber: Record<number, string> = {
  0: 'PENDING',
  1: 'PROCESSING',
  2: 'PAID',
  3: 'FAILED',
  4: 'CANCELLED',
  5: 'EXPIRED',
  6: 'REFUNDED',
};

function isCollectablePaymentStatus(status?: string | null) {
  return status === 'PENDING' || status === 'PROCESSING';
}

function normalizePaymentStatus(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);

    if (trimmed && Number.isInteger(numeric) && numeric in paymentStatusByNumber) {
      return paymentStatusByNumber[numeric];
    }

    return trimmed ? normalizeLegacyPaymentStatus(trimmed.toUpperCase()) : null;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value in paymentStatusByNumber) {
    return paymentStatusByNumber[value];
  }

  if (value && typeof value === 'object') {
    const candidate = value as { name?: unknown; value?: unknown; status?: unknown };

    return normalizePaymentStatus(candidate.name ?? candidate.value ?? candidate.status);
  }

  return null;
}

function normalizeLegacyPaymentStatus(status: string) {
  if (status === 'PARTIALLY_PAID' || status === 'LEGACY_PARTIALLY_PAID') return 'PAID';

  return status;
}
