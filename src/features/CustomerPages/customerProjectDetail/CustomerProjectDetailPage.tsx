import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconMapPin,
  IconPalette,
  IconPhoto,
  IconRefresh,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy } from '@/features/CustomerPages/customercomponents';
import {
  formatCustomerDate,
  formatCustomerDateTime,
  getCustomerProjectStatusLabel,
} from '@/features/CustomerPages/utils';
import { ProjectPhaseTimelineCard } from '@/features/projectPhaseDeadlines/ProjectPhaseTimelineCard';
import { getMeasurementImageServiceResultMessage } from '@/services/api/measurementImages';
import { getProjectServiceResultMessage, type ProjectStatus } from '@/services/api/projects';
import { getProposalServiceResultMessage, type ProposalDto } from '@/services/api/proposals';
import {
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
} from '@/services/api/schedules';
import {
  useProjectDetail,
  useProjectMeasurementImages,
  useProjectProposals,
  useProjectScheduleList,
  useRequestProjectScheduleChange,
  useReopenProjectProposal,
  useUpdateProjectScheduleStatus,
} from '@/services/queries';
import { isScheduleVisible } from '@/shared/utils/scheduleVisibility';

import { CustomerProjectProposalAccordionItem } from './CustomerProjectProposalAccordion';
import '../customerProjectList/CustomerProjectListPage.css';

type CustomerProjectDetailTab = 'overview' | 'schedules' | 'proposals';

export function CustomerProjectDetailPage() {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const proposalIdFromUrl = searchParams.get('proposalId');
  const navigate = useNavigate();
  const projectQuery = useProjectDetail(projectId);
  const project = projectQuery.data;
  const reopenProposalMutation = useReopenProjectProposal();
  const proposalsQuery = useProjectProposals(
    {
      projectId: project?.projectId ?? '',
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(project?.projectId) },
  );
  const proposals = useMemo(
    () => (proposalsQuery.data?.items ?? []).filter((proposal) => isCustomerVisibleProposal(proposal.status)),
    [proposalsQuery.data?.items],
  );
  const measurementImagesQuery = useProjectMeasurementImages(project?.projectId, { page: 1, limit: 50 });
  const measurementImages = measurementImagesQuery.data?.items ?? [];
  const schedulesQuery = useProjectScheduleList(
    project?.projectId
      ? {
          projectId: project.projectId,
          page: 1,
          limit: 50,
        }
      : undefined,
  );
  const schedules = useMemo(
    () => [...(schedulesQuery.data?.items ?? [])]
      .filter((schedule) => isScheduleVisible(schedule.status))
      .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime()),
    [schedulesQuery.data?.items],
  );
  const requestScheduleChangeMutation = useRequestProjectScheduleChange();
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(proposalIdFromUrl);
  const [activeTab, setActiveTab] = useState<CustomerProjectDetailTab>(proposalIdFromUrl ? 'proposals' : 'overview');
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [scheduleActionNotes, setScheduleActionNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!proposalIdFromUrl) {
      return;
    }

    setExpandedProposalId(proposalIdFromUrl);
    setActiveTab('proposals');

    const frameId = window.requestAnimationFrame(() => {
      document.querySelector('.customer-project-detail-proposals')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [proposalIdFromUrl, proposals]);

  async function reopenProposalFlow() {
    if (!project) return;

    setMessage(null);

    try {
      await reopenProposalMutation.mutateAsync(project.projectId);
      setMessage({ tone: 'success', text: t.projectDetail.reopenedToast });
      setExpandedProposalId(null);
      void projectQuery.refetch();
      void proposalsQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectServiceResultMessage(error) });
    }
  }

  async function confirmSchedule(schedule: ProjectScheduleDto) {
    setMessage(null);
    setActiveScheduleId(schedule.scheduleId);

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: 'CONFIRMED',
        note: 'Confirmed by customer from project detail.',
      });
      setMessage({ tone: 'success', text: t.projectDetail.scheduleConfirmedToast });
      void schedulesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    } finally {
      setActiveScheduleId(null);
    }
  }

  async function cancelSchedule(schedule: ProjectScheduleDto) {
    const note = scheduleActionNotes[schedule.scheduleId]?.trim();

    setMessage(null);
    setActiveScheduleId(schedule.scheduleId);

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: 'CANCELLED',
        note: note || 'Cancelled by customer from project detail.',
      });
      setScheduleActionNotes((current) => ({ ...current, [schedule.scheduleId]: '' }));
      setMessage({ tone: 'success', text: t.projectDetail.scheduleCancelledToast });
      void schedulesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    } finally {
      setActiveScheduleId(null);
    }
  }

  async function requestScheduleChange(schedule: ProjectScheduleDto) {
    const note = scheduleActionNotes[schedule.scheduleId]?.trim();

    setMessage(null);
    setActiveScheduleId(schedule.scheduleId);

    try {
      await requestScheduleChangeMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        note,
      });
      setScheduleActionNotes((current) => ({ ...current, [schedule.scheduleId]: '' }));
      setMessage({ tone: 'success', text: t.projectDetail.changeRequestSentToast });
      void schedulesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    } finally {
      setActiveScheduleId(null);
    }
  }

  return (
    <main className="customer-project-list-page">
      <CustomerNavbar activeKey="myProjects" classPrefix="customer-project-list" />

      <div className="customer-project-list-main">
        {projectQuery.isLoading ? <section className="customer-project-list-state">{t.common.loading}</section> : null}
        {projectQuery.isError ? <section className="customer-project-list-state is-error">{getProjectServiceResultMessage(projectQuery.error)}</section> : null}
        {message ? <section className={`customer-project-detail-message customer-project-detail-message-${message.tone}`}>{message.text}</section> : null}

        {project ? (
          <section className="customer-project-detail-card">
            <div className="customer-project-detail-hero">
              <span className={`customer-project-list-status customer-project-list-status-${getStageTone(project.status)}`}>
                {getCustomerProjectStatusLabel(project.status, lang)}
              </span>
              <div className="customer-project-detail-hero-copy">
                <span className="customer-project-detail-kicker">{t.projectDetail.overview}</span>
                <h1>{project.projectName}</h1>
                <span className="customer-project-detail-code">{project.projectCode}</span>
              </div>
            </div>

            <div className="customer-project-detail-body">
              {(project.status === 'NEED_BASIC_INFORMATION' || project.status === 'SUBMITTED') ? (
                <div className="customer-project-detail-actions">
                  {project.status === 'NEED_BASIC_INFORMATION' || project.status === 'SUBMITTED' ? (
                    <button type="button" onClick={() => navigate(`/customer/projects/${project.projectId}/edit`)}>
                      {t.projectDetail.updateInformation}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <nav className="customer-project-detail-tabs" aria-label="Project detail sections">
                <button className={activeTab === 'overview' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('overview')}>
                  {t.projectDetail.tabOverview}
                </button>
                <button className={activeTab === 'schedules' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('schedules')}>
                  {t.projectDetail.tabSchedules}
                </button>
                <button className={activeTab === 'proposals' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('proposals')}>
                  {t.projectDetail.tabProposals}
                </button>
              </nav>

              {activeTab === 'overview' ? (
                <>
                  <div className="customer-project-detail-grid">
                    <DetailBlock icon={IconCalendar} label={t.projectDetail.submitted} value={formatCustomerDate(project.submittedAt, lang)} />
                    <DetailBlock icon={IconMapPin} label={t.projectDetail.address} value={project.projectAddress ?? t.common.notSpecified} />
                    <DetailBlock label={t.common.businessType} value={project.businessType} />
                    <DetailBlock label={t.projectDetail.currentStage} value={getCustomerProjectStatusLabel(project.status, lang)} />
                    <DetailBlock label={t.projectDetail.area} value={project.totalAreaSqm ? `${project.totalAreaSqm} sqm` : '-'} />
                    <DetailBlock label={t.projectDetail.floors} value={project.numberOfFloors ? String(project.numberOfFloors) : '-'} />
                    <DetailBlock label={t.projectDetail.minBudget} value={formatBudgetAmount(project.budgetMin)} />
                    <DetailBlock label={t.projectDetail.maxBudget} value={formatBudgetAmount(project.budgetMax)} />
                  </div>

                  <section className="customer-project-detail-section">
                    <h2>{t.projectDetail.requirements}</h2>
                    <p>{project.furnitureRequirement}</p>
                    {project.description ? <p>{project.description}</p> : null}
                  </section>

                  <ProjectPhaseTimelineCard
                    description=""
                    projectId={project.projectId}
                    title={t.projectDetail.projectTimeline}
                  />

                  <section className="customer-project-detail-section customer-project-measurement-section">
                    <h2>{t.projectDetail.measurementImages}</h2>
                    {measurementImagesQuery.isLoading ? <p className="customer-project-detail-proposals-state">{t.common.loading}</p> : null}
                    {measurementImagesQuery.isError ? (
                      <p className="customer-project-detail-proposals-state is-error">
                        {getMeasurementImageServiceResultMessage(measurementImagesQuery.error)}
                      </p>
                    ) : null}
                    {!measurementImagesQuery.isLoading && !measurementImagesQuery.isError && measurementImages.length === 0 ? (
                      <p className="customer-project-detail-proposals-state">No measurement images have been uploaded yet.</p>
                    ) : null}
                    {measurementImages.length > 0 ? (
                      <div className="customer-project-measurement-grid">
                        {measurementImages.map((image) => {
                          const imageUrl = image.url ?? image.publicUrl;

                          return (
                            <article className="customer-project-measurement-card" key={image.fileId}>
                              {imageUrl ? (
                                <button type="button" onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}>
                                  <img alt={image.originalFileName ?? t.projectDetail.measurementImages} src={imageUrl} />
                                </button>
                              ) : (
                                <span><IconPhoto size={24} /></span>
                              )}
                              <div>
                                <strong>{image.originalFileName ?? image.fileId}</strong>
                                <small>{image.areas?.length ? image.areas.map((area) => area.areaName ?? area.projectAreaId).join(', ') : t.common.notSpecified}</small>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>

                  <section className="customer-project-detail-links">
                    <Link to="/customer/orders">{t.projectDetail.orders}</Link>
                    <Link to="/customer/tracking">{t.projectDetail.deliveryTracking}</Link>
                  </section>
                </>
              ) : null}

              {activeTab === 'schedules' ? (
                <CustomerProjectSchedulesTab
                  activeScheduleId={activeScheduleId}
                  isLoading={schedulesQuery.isLoading}
                  isUpdating={updateScheduleStatusMutation.isPending || requestScheduleChangeMutation.isPending}
                  scheduleActionNotes={scheduleActionNotes}
                  schedules={schedules}
                  scheduleError={schedulesQuery.error}
                  onCancelSchedule={(schedule) => void cancelSchedule(schedule)}
                  onConfirmSchedule={(schedule) => void confirmSchedule(schedule)}
                  onRequestScheduleChange={(schedule) => void requestScheduleChange(schedule)}
                  onScheduleActionNoteChange={(scheduleId, value) => setScheduleActionNotes((current) => ({ ...current, [scheduleId]: value }))}
                />
              ) : null}

              {activeTab === 'proposals' ? (
                <section className="customer-project-detail-proposals" aria-label="Design proposals">
                <header className="customer-project-detail-proposals-head">
                  <div>
                    <span className="customer-project-detail-proposals-icon">
                      <IconPalette size={18} stroke={1.8} />
                    </span>
                    <div>
                      <h2>{t.projectDetail.designProposals}</h2>
                    </div>
                  </div>
                  <div className="customer-project-detail-proposals-tools">
                    <span className="customer-project-detail-proposals-count">
                      {proposals.length} option{proposals.length === 1 ? '' : 's'}
                    </span>
                    {canReopenProjectProposal(project.status) ? (
                      <button
                        className="customer-project-detail-reopen-button"
                        type="button"
                        disabled={reopenProposalMutation.isPending}
                        onClick={() => void reopenProposalFlow()}
                      >
                        <IconRefresh size={16} stroke={1.8} />
                        {reopenProposalMutation.isPending ? t.common.loading : t.projectDetail.reopenProposal}
                      </button>
                    ) : null}
                  </div>
                </header>

                {proposalsQuery.isLoading ? <p className="customer-project-detail-proposals-state">{t.projectDetail.loadingProposals}</p> : null}
                {proposalsQuery.isError ? (
                  <p className="customer-project-detail-proposals-state is-error">
                    {getProposalServiceResultMessage(proposalsQuery.error)}
                  </p>
                ) : null}
                {!proposalsQuery.isLoading && !proposalsQuery.isError && proposals.length === 0 ? (
                  <p className="customer-project-detail-proposals-state">
                    {t.projectDetail.noProposals}
                  </p>
                ) : null}

                <div className="customer-project-detail-proposal-list">
                  {proposals.map((proposal) => (
                    <CustomerProjectProposalAccordionItem
                      expanded={expandedProposalId === proposal.proposalId}
                      key={proposal.proposalId}
                      projectId={project.projectId}
                      proposal={proposal}
                      onToggle={() => {
                        setExpandedProposalId((current) => (
                          current === proposal.proposalId ? null : proposal.proposalId
                        ));
                      }}
                    />
                  ))}
                </div>
              </section>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CustomerProjectSchedulesTab({
  activeScheduleId,
  isLoading,
  isUpdating,
  onCancelSchedule,
  onConfirmSchedule,
  onRequestScheduleChange,
  onScheduleActionNoteChange,
  scheduleActionNotes,
  schedules,
  scheduleError,
}: {
  activeScheduleId: string | null;
  isLoading: boolean;
  isUpdating: boolean;
  onCancelSchedule: (schedule: ProjectScheduleDto) => void;
  onConfirmSchedule: (schedule: ProjectScheduleDto) => void;
  onRequestScheduleChange: (schedule: ProjectScheduleDto) => void;
  onScheduleActionNoteChange: (scheduleId: string, value: string) => void;
  scheduleActionNotes: Record<string, string>;
  schedules: ProjectScheduleDto[];
  scheduleError: unknown;
}) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const pendingCount = schedules.filter((schedule) => schedule.status === 'PENDING_CONFIRMATION').length;
  const upcomingCount = schedules.filter((schedule) => new Date(schedule.scheduledStart).getTime() >= Date.now() && schedule.status !== 'CANCELLED').length;

  return (
    <section className="customer-project-detail-schedules" aria-label="Project schedules">
      <header className="customer-project-detail-proposals-head">
        <div>
          <span className="customer-project-detail-proposals-icon">
            <IconCalendar size={18} stroke={1.8} />
          </span>
          <div>
            <h2>{t.projectDetail.projectSchedules}</h2>
          </div>
        </div>
        <div className="customer-project-detail-schedule-summary">
          <span>{t.projectDetail.pendingUpcoming(pendingCount + upcomingCount)}</span>
        </div>
      </header>

      {isLoading ? <p className="customer-project-detail-proposals-state">{t.common.loading}</p> : null}
      {scheduleError ? (
        <p className="customer-project-detail-proposals-state is-error">
          {getProjectScheduleServiceResultMessage(scheduleError)}
        </p>
      ) : null}
      {!isLoading && !scheduleError && schedules.length === 0 ? (
        <p className="customer-project-detail-proposals-state">No schedule has been created for this project yet.</p>
      ) : null}

      <div className="customer-project-detail-schedule-list">
        {schedules.map((schedule) => (
          <article className="customer-project-detail-schedule-card" key={schedule.scheduleId}>
            <div className="customer-project-detail-schedule-date">
              <IconClock size={18} stroke={1.8} />
              <strong>{formatCustomerDateTime(schedule.scheduledStart, lang)}</strong>
              <span>{schedule.scheduledEnd ? formatCustomerDateTime(schedule.scheduledEnd, lang) : t.common.notSpecified}</span>
            </div>
            <div className="customer-project-detail-schedule-main">
              <div>
                <h3>{schedule.title ?? getCustomerProjectStatusLabel(schedule.scheduleType, lang)}</h3>
                <p>{schedule.description ?? schedule.customerNote ?? t.common.notSpecified}</p>
              </div>
              <div className="customer-project-detail-schedule-meta">
                <span>{getCustomerProjectStatusLabel(schedule.scheduleType, lang)}</span>
                <strong className={`customer-project-detail-schedule-status customer-project-detail-schedule-status-${schedule.status.toLowerCase().replace(/_/g, '-')}`}>
                  {getCustomerProjectStatusLabel(schedule.status, lang)}
                </strong>
              </div>
            </div>
            <div className="customer-project-detail-schedule-footer">
              <span>
                <IconMapPin size={16} stroke={1.8} />
                {schedule.location ?? t.common.notSpecified}
              </span>
              {schedule.scheduleType === 'DELIVERY' ? (
                <Link to="/customer/tracking">
                  <IconTruckDelivery size={16} stroke={1.8} />
                  {t.projectDetail.trackingLink}
                </Link>
              ) : null}
            </div>
            {schedule.status === 'PENDING_CONFIRMATION' ? (
              <div className="customer-project-detail-schedule-actions">
                <label>
                  <span>Response note</span>
                  <textarea
                    disabled={isUpdating}
                    placeholder={t.projectDetail.responseNotePlaceholder}
                    rows={2}
                    value={scheduleActionNotes[schedule.scheduleId] ?? ''}
                    onChange={(event) => onScheduleActionNoteChange(schedule.scheduleId, event.target.value)}
                  />
                </label>
                <div>
                  {schedule.status === 'PENDING_CONFIRMATION' ? (
                    <button disabled={isUpdating} type="button" onClick={() => onConfirmSchedule(schedule)}>
                      <IconCheck size={16} stroke={2} />
                      {activeScheduleId === schedule.scheduleId && isUpdating ? t.common.confirming : t.common.confirm}
                    </button>
                  ) : null}
                  {schedule.scheduleType === 'DELIVERY' ? (
                    <button className="is-secondary" disabled={isUpdating} type="button" onClick={() => onRequestScheduleChange(schedule)}>
                      {t.projectDetail.requestChange}
                    </button>
                  ) : null}
                  {schedule.status === 'PENDING_CONFIRMATION' ? (
                    <button className="is-danger" disabled={isUpdating} type="button" onClick={() => onCancelSchedule(schedule)}>
                      {t.common.cancel}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DetailBlock({
  icon: IconComponent,
  label,
  value,
}: {
  icon?: typeof IconCalendar;
  label: string;
  value: string;
}) {
  return (
    <article className="customer-project-detail-block">
      <span>{label}</span>
      <strong>
        {IconComponent ? <IconComponent size={16} stroke={1.8} /> : null}
        {value}
      </strong>
    </article>
  );
}

function isCustomerVisibleProposal(status: ProposalDto['status']) {
  return ['PUBLISHED', 'REVISION_REQUESTED', 'SELECTED', 'REJECTED'].includes(status);
}

function getStageTone(status: ProjectStatus) {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'green';
  if (status === 'AWAITING_CUSTOMER_CONFIRMATION') return 'gold';
  if (status === 'REJECTED') return 'gold';
  return 'stone';
}

function canReopenProjectProposal(status: ProjectStatus) {
  return status === 'PROPOSAL_SELECTED'
    || status === 'QUOTATION_SENT'
    || status === 'ORDER_CONFIRMED';
}

function formatBudgetAmount(value: number | null | undefined) {
  if (value == null) {
    return '-';
  }

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value)} VNĐ`;
}
