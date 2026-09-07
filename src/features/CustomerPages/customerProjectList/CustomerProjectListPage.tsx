import {
  IconArrowRight,
  IconCalendar,
  IconMessageCircle,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './CustomerProjectListPage.css';
import { useLang, type Lang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy, type CustomerCopy } from '@/features/CustomerPages/customercomponents';
import { formatCustomerDate, getCustomerProjectStatusLabel } from '@/features/CustomerPages/utils';
import { PaymentCollectionModal } from '@/features/payments';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
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
  const [chatProject, setChatProject] = useState<ProjectListItemDto | null>(null);
  const projectsQuery = useProjectList({
    search: keyword,
    status: status || null,
    page,
    limit: PROJECT_PAGE_SIZE,
  });
  const projects = projectsQuery.data?.items ?? [];
  const totalProjects = projectsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProjects / PROJECT_PAGE_SIZE));
  const showingFrom = totalProjects === 0 ? 0 : (page - 1) * PROJECT_PAGE_SIZE + 1;
  const showingTo = Math.min(page * PROJECT_PAGE_SIZE, totalProjects);

  useEffect(() => {
    setPage(1);
  }, [keyword, status]);

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
              onOpenChat={() => setChatProject(project)}
              onPaymentCompleted={() => void projectsQuery.refetch()}
            />
          ))}
        </section>

        <footer className="customer-project-list-pagination">
          <p>{t.projects.showing(showingFrom, showingTo, totalProjects)}</p>
          <div>
            <button disabled={page <= 1 || projectsQuery.isFetching} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>
              {t.common.previous}
            </button>
            <button className="customer-project-list-page-active" type="button" aria-current="page">
              {page}
            </button>
            <button disabled={page >= totalPages || projectsQuery.isFetching} type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              {t.common.next}
            </button>
          </div>
        </footer>
      </div>

      {chatProject ? (
        <div className="customer-project-chat-modal" role="dialog" aria-modal="true" aria-label={`${chatProject.projectName} chat`}>
          <div className="customer-project-chat-backdrop" onClick={() => setChatProject(null)} />
          <div className="customer-project-chat-dialog">
            <button className="customer-project-chat-close" type="button" aria-label={t.common.close} onClick={() => setChatProject(null)}>
              <IconX size={18} />
            </button>
            <ProjectChatPanel
              preferredChatType="SALES"
              projectCode={chatProject.projectCode}
              projectId={chatProject.projectId}
              title={`${chatProject.projectName} ${t.projects.chat}`}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

type ProjectCardProps = {
  lang: Lang;
  onOpenChat: () => void;
  onPaymentCompleted: () => void;
  project: ProjectListItemDto;
  t: CustomerCopy;
};

function ProjectCard({ lang, onOpenChat, onPaymentCompleted, project, t }: ProjectCardProps) {
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
          <button type="button" onClick={onOpenChat}>
            <IconMessageCircle size={16} stroke={1.8} />
            {t.projects.chat}
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
