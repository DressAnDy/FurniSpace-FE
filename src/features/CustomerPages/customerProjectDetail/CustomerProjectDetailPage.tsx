import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconHome,
  IconMapPin,
  IconPalette,
  IconPhoto,
  IconRefresh,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
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
      setMessage({ tone: 'success', text: 'Project was reopened to proposal consulting.' });
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
      setMessage({ tone: 'success', text: 'Schedule confirmed successfully.' });
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
      setMessage({ tone: 'success', text: 'Schedule cancelled.' });
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
      setMessage({ tone: 'success', text: 'Schedule change request sent.' });
      void schedulesQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectScheduleServiceResultMessage(error) });
    } finally {
      setActiveScheduleId(null);
    }
  }

  return (
    <main className="customer-project-list-page">
      <CustomerNavbar activeLabel="My Projects" classPrefix="customer-project-list" />

      <div className="customer-project-list-main">
        <div className="customer-project-list-breadcrumb">
          <Link to="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </Link>
          <IconChevronRight size={16} stroke={1.8} />
          <Link to="/customer/projects">My Projects</Link>
          <IconChevronRight size={16} stroke={1.8} />
          <span>{project?.projectCode ?? 'Project Detail'}</span>
        </div>

        {projectQuery.isLoading ? <section className="customer-project-list-state">Loading project detail...</section> : null}
        {projectQuery.isError ? <section className="customer-project-list-state is-error">{getProjectServiceResultMessage(projectQuery.error)}</section> : null}
        {message ? <section className={`customer-project-detail-message customer-project-detail-message-${message.tone}`}>{message.text}</section> : null}

        {project ? (
          <section className="customer-project-detail-card">
            <div className="customer-project-detail-hero">
              <span className={`customer-project-list-status customer-project-list-status-${getStageTone(project.status)}`}>
                {formatStatusLabel(project.status)}
              </span>
              <div className="customer-project-detail-hero-copy">
                <span className="customer-project-detail-kicker">Project Overview</span>
                <h1>{project.projectName}</h1>
                <p className="customer-project-detail-code">{project.projectCode}</p>
              </div>
            </div>

            <div className="customer-project-detail-body">
              {(project.status === 'NEED_BASIC_INFORMATION' || project.status === 'SUBMITTED') ? (
                <div className="customer-project-detail-actions">
                  {project.status === 'NEED_BASIC_INFORMATION' || project.status === 'SUBMITTED' ? (
                    <button type="button" onClick={() => navigate(`/customer/projects/${project.projectId}/edit`)}>
                      Update Information
                    </button>
                  ) : null}
                </div>
              ) : null}

              <nav className="customer-project-detail-tabs" aria-label="Project detail sections">
                <button className={activeTab === 'overview' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('overview')}>
                  Overview
                </button>
                <button className={activeTab === 'schedules' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('schedules')}>
                  Schedules
                </button>
                <button className={activeTab === 'proposals' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('proposals')}>
                  Proposals
                </button>
              </nav>

              {activeTab === 'overview' ? (
                <>
                  <div className="customer-project-detail-grid">
                    <DetailBlock icon={IconCalendar} label="Submitted" value={formatDate(project.submittedAt)} />
                    <DetailBlock icon={IconMapPin} label="Address" value={project.projectAddress ?? 'Not provided'} />
                    <DetailBlock label="Business Type" value={project.businessType} />
                    <DetailBlock label="Current Stage" value={getStageLabel(project.status)} />
                    <DetailBlock label="Area" value={project.totalAreaSqm ? `${project.totalAreaSqm} sqm` : '-'} />
                    <DetailBlock label="Floors" value={project.numberOfFloors ? String(project.numberOfFloors) : '-'} />
                    <DetailBlock label="Minimum Budget" value={formatBudgetAmount(project.budgetMin)} />
                    <DetailBlock label="Maximum Budget" value={formatBudgetAmount(project.budgetMax)} />
                  </div>

                  <section className="customer-project-detail-section">
                    <h2>Requirements</h2>
                    <p>{project.furnitureRequirement}</p>
                    {project.description ? <p>{project.description}</p> : null}
                  </section>

                  <ProjectPhaseTimelineCard
                    projectId={project.projectId}
                    title="Project Timeline"
                    description="All planned project phase deadlines and progress."
                  />

                  <section className="customer-project-detail-section customer-project-measurement-section">
                    <h2>Measurement Images</h2>
                    <p>Photos captured during measurement sessions and linked to project areas.</p>
                    {measurementImagesQuery.isLoading ? <p className="customer-project-detail-proposals-state">Loading measurement images...</p> : null}
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
                                  <img alt={image.originalFileName ?? 'Measurement'} src={imageUrl} />
                                </button>
                              ) : (
                                <span><IconPhoto size={24} /></span>
                              )}
                              <div>
                                <strong>{image.originalFileName ?? image.fileId}</strong>
                                <small>{image.areas?.length ? image.areas.map((area) => area.areaName ?? area.projectAreaId).join(', ') : 'Unassigned'}</small>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>

                  <section className="customer-project-detail-links">
                    <Link to="/customer/orders">Orders</Link>
                    <Link to="/customer/tracking">Delivery Tracking</Link>
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
                      <h2>Design Proposals</h2>
                      <p>Review published design options for this project.</p>
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
                        {reopenProposalMutation.isPending ? 'Reopening...' : 'Reopen Proposal'}
                      </button>
                    ) : null}
                  </div>
                </header>

                {proposalsQuery.isLoading ? <p className="customer-project-detail-proposals-state">Loading proposals...</p> : null}
                {proposalsQuery.isError ? (
                  <p className="customer-project-detail-proposals-state is-error">
                    {getProposalServiceResultMessage(proposalsQuery.error)}
                  </p>
                ) : null}
                {!proposalsQuery.isLoading && !proposalsQuery.isError && proposals.length === 0 ? (
                  <p className="customer-project-detail-proposals-state">
                    No design proposal has been published for this project yet.
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
            <h2>Project Schedules</h2>
            <p>Review appointments for this project and confirm schedules from your team.</p>
          </div>
        </div>
        <div className="customer-project-detail-schedule-summary">
          <span>{pendingCount} pending</span>
          <span>{upcomingCount} upcoming</span>
        </div>
      </header>

      {isLoading ? <p className="customer-project-detail-proposals-state">Loading schedules...</p> : null}
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
              <strong>{formatDateTime(schedule.scheduledStart)}</strong>
              <span>{schedule.scheduledEnd ? `Ends ${formatDateTime(schedule.scheduledEnd)}` : 'End time not specified'}</span>
            </div>
            <div className="customer-project-detail-schedule-main">
              <div>
                <h3>{schedule.title ?? formatStatusLabel(schedule.scheduleType)}</h3>
                <p>{schedule.description ?? schedule.customerNote ?? 'No additional details were provided.'}</p>
              </div>
              <div className="customer-project-detail-schedule-meta">
                <span>{formatStatusLabel(schedule.scheduleType)}</span>
                <strong className={`customer-project-detail-schedule-status customer-project-detail-schedule-status-${schedule.status.toLowerCase().replace(/_/g, '-')}`}>
                  {formatStatusLabel(schedule.status)}
                </strong>
              </div>
            </div>
            <div className="customer-project-detail-schedule-footer">
              <span>
                <IconMapPin size={16} stroke={1.8} />
                {schedule.location ?? 'Location not specified'}
              </span>
              {schedule.scheduleType === 'DELIVERY' ? (
                <Link to="/customer/tracking">
                  <IconTruckDelivery size={16} stroke={1.8} />
                  Tracking
                </Link>
              ) : null}
            </div>
            {schedule.status === 'PENDING_CONFIRMATION' ? (
              <div className="customer-project-detail-schedule-actions">
                <label>
                  <span>Response note</span>
                  <textarea
                    disabled={isUpdating}
                    placeholder="Add a note for cancellation or schedule change request"
                    rows={2}
                    value={scheduleActionNotes[schedule.scheduleId] ?? ''}
                    onChange={(event) => onScheduleActionNoteChange(schedule.scheduleId, event.target.value)}
                  />
                </label>
                <div>
                  {schedule.status === 'PENDING_CONFIRMATION' ? (
                    <button disabled={isUpdating} type="button" onClick={() => onConfirmSchedule(schedule)}>
                      <IconCheck size={16} stroke={2} />
                      {activeScheduleId === schedule.scheduleId && isUpdating ? 'Confirming...' : 'Confirm'}
                    </button>
                  ) : null}
                  {schedule.scheduleType === 'DELIVERY' ? (
                    <button className="is-secondary" disabled={isUpdating} type="button" onClick={() => onRequestScheduleChange(schedule)}>
                      Request Change
                    </button>
                  ) : null}
                  {schedule.status === 'PENDING_CONFIRMATION' ? (
                    <button className="is-danger" disabled={isUpdating} type="button" onClick={() => onCancelSchedule(schedule)}>
                      Cancel
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

function getStageLabel(status: ProjectStatus) {
  const labels: Partial<Record<ProjectStatus, string>> = {
    SUBMITTED: 'Submitted',
    NEED_BASIC_INFORMATION: 'Need Info',
    IN_CONSULTATION: 'In Consultation',
    PROPOSAL_CONSULTING: 'Proposal Review',
    PROPOSAL_SELECTED: 'Proposal Selected',
    QUOTATION_SENT: 'Quotation Sent',
    ORDER_CONFIRMED: 'Order Confirmed',
    IN_PRODUCTION: 'In Production',
    DELIVERING: 'Delivering',
    AWAITING_CUSTOMER_CONFIRMATION: 'Confirm Delivery',
    DELIVERED: 'Awaiting Sales Completion',
    COMPLETED: 'Completed',
  };

  return labels[status] ?? formatStatusLabel(status);
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

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatBudgetAmount(value: number | null | undefined) {
  if (value == null) {
    return '-';
  }

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value)} VNĐ`;
}
