import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBriefcase,
  IconCalendarDue,
  IconChevronDown,
  IconEye,
  IconFolderOpen,
  IconRefresh,
  IconSearch,
  IconUsers,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import { getAccountRoleName, type AccountDto } from '@/services/api';
import {
  getProjectServiceResultMessage,
  type ProjectDto,
  type ProjectListItemDto,
  type ProjectStatus,
  type ProjectSpaceDataStatus,
  type ProjectWorkflowDto,
  type ProjectWorkflowLinkDto,
  type ProjectWorkflowMetricDto,
  type ProjectWorkflowStageDto,
  type ProjectWorkflowStageKey,
} from '@/services/api/projects';
import type {
  ProjectPhaseDeadlineRiskPhase,
  ProjectPhaseDeadlineRiskStatus,
} from '@/services/api/dashboard';
import type { ReportProjectsDto } from '@/services/api/reports';
import {
  useAccountList,
  useAdminProjectWorkflow,
  useAssignDesignerToProject,
  useAssignSalesToProject,
  useMarkReadyForDesignerAssignment,
  useProjectDetail,
  useProjectFiles,
  useProjectList,
  useProjectPhaseDeadlines,
  useProjectOrders,
  useProductionRequests,
  useReportProjects,
  useUpdateProductionDeadline,
} from '@/services/queries';
import { useQueryClient } from '@tanstack/react-query';
import { getLocalDateInputValue } from '@/shared/utils/dateValidation';
import { ProjectShowcaseManager } from '@/features/showcases/ProjectShowcaseManager';
import { ProjectPhaseTimelineCard } from '@/features/projectPhaseDeadlines/ProjectPhaseTimelineCard';
import { OperationalDelayPanel } from '@/features/operationalDelayReports/OperationalDelayPanel';
import { ProductIssuePanel } from '@/features/productIssues/ProductIssuePanel';

import { useLang } from '@/app/providers/useLang';
import { adminCopy } from '../admincomponents/adminI18n';
import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { PhaseDeadlineRiskPanel } from './PhaseDeadlineRiskPanel';
import { ProjectsPager } from './ProjectsPager';
import './AdminProjects.css';

const PROJECT_STATUSES: ProjectStatus[] = [
  'SUBMITTED',
  'IN_CONSULTATION',
  'NEED_BASIC_INFORMATION',
  'WAITING_FOR_DESIGNER_ASSIGNMENT',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_CONSULTING',
  'PROPOSAL_SELECTED',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
  'COMPLETED',
  'REJECTED',
];

const EMPTY_ACCOUNTS: AccountDto[] = [];
const EMPTY_PROJECTS: ProjectListItemDto[] = [];
const EMPTY_STAGES: ProjectWorkflowStageDto[] = [];
const PRODUCTION_DEADLINE_STATUSES: ProjectStatus[] = [
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
];
const MONEY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

type ProjectsListModule = 'projects' | 'deadlines';

export function AdminProjects() {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const projectFromUrl = searchParams.get('projectId');
  const stageFromUrl = searchParams.get('stage');
  const [listModule, setListModule] = useState<ProjectsListModule>('projects');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [salesId, setSalesId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [riskPhase, setRiskPhase] = useState<ProjectPhaseDeadlineRiskPhase | ''>('');
  const [riskStatus, setRiskStatus] = useState<ProjectPhaseDeadlineRiskStatus | ''>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectFromUrl);

  useEffect(() => {
    if (projectFromUrl) {
      setSelectedProjectId(projectFromUrl);
    }
  }, [projectFromUrl]);

  const projectsQuery = useProjectList(
    {
      search,
      status: status || null,
      assignedSalesId: salesId || null,
      assignedDesignerId: designerId || null,
      page,
      limit: pageSize,
    },
    { enabled: listModule === 'projects' },
  );
  const projectStatsQuery = useReportProjects();
  const accountsQuery = useAccountList({ page: 1, pageSize: 100, includeDeleted: false });
  const accounts = accountsQuery.data?.items ?? EMPTY_ACCOUNTS;
  const accountById = useMemo(() => createAccountLookup(accounts), [accounts]);
  const salesAccounts = useMemo(() => accounts.filter((account) => getAccountRoleName(account.roleId) === 'SALES'), [accounts]);
  const designerAccounts = useMemo(() => accounts.filter((account) => getAccountRoleName(account.roleId) === 'DESIGNER'), [accounts]);
  const projects = projectsQuery.data?.items ?? EMPTY_PROJECTS;
  const stats = useMemo(() => getProjectStats(projectStatsQuery.data), [projectStatsQuery.data]);
  const totalItems = projectsQuery.data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(totalItems / (projectsQuery.data?.limit ?? pageSize)), 1);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void projectsQuery.refetch();
  }

  function handleFilterChange(next: () => void) {
    next();
    setPage(1);
  }

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize);
    setPage(1);
  }

  function handleRefresh() {
    void Promise.all([
      projectsQuery.refetch(),
      projectStatsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'project-phase-deadlines'] }),
    ]);
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeKey="projects" />

        <section className="admin-main">
          <AdminNavbar activeLabel={t.nav.projects} />
          <div className="admin-content admin-projects-content">
            <div className="admin-page-heading admin-projects-heading">
              <div>
                <h2>{t.projects.title}</h2>
                <p>{t.projects.subtitle}</p>
              </div>
              <button className="admin-button admin-button-secondary" type="button" onClick={handleRefresh}>
                <IconRefresh size={16} />
                {t.common.refresh}
              </button>
            </div>

            <section className="admin-projects-summary-grid" aria-label="Project summary">
              <SummaryCard icon={IconFolderOpen} label={t.projects.projectsInView} value={projectsQuery.data?.total ?? projects.length} note={t.projects.matchesFilters} />
              <SummaryCard
                icon={IconBriefcase}
                label={t.projects.activeProjects}
                value={projectStatsQuery.isLoading ? '…' : stats.active}
                note={t.projects.systemWideActive}
              />
              <SummaryCard
                icon={IconUsers}
                label={t.projects.needsOwner}
                value={projectStatsQuery.isLoading ? '…' : stats.needsOwner}
                note={t.projects.unassignedNote}
              />
              <SummaryCard
                icon={IconCalendarDue}
                label={t.projects.attentionNeeded}
                value={projectStatsQuery.isLoading ? '…' : stats.attention}
                note={t.projects.attentionNote}
              />
            </section>

            <nav className="admin-projects-tabs" aria-label="Projects modules">
              <button
                type="button"
                className={`admin-projects-tab${listModule === 'projects' ? ' is-active' : ''}`}
                onClick={() => setListModule('projects')}
              >
                <IconFolderOpen size={16} />
                {t.projects.tabProjects}
              </button>
              <button
                type="button"
                className={`admin-projects-tab${listModule === 'deadlines' ? ' is-active' : ''}`}
                onClick={() => setListModule('deadlines')}
              >
                <IconCalendarDue size={16} />
                {t.projects.tabDeadlines}
              </button>
            </nav>

            <section className="admin-card admin-projects-table-card">
              {listModule === 'projects' ? (
                <div className="admin-projects-section-title">
                  <h3>{t.projects.allProjects}</h3>
                  <span>{t.common.page} {page} / {totalPages}</span>
                </div>
              ) : null}

              {listModule === 'deadlines' ? (
                <PhaseDeadlineRiskPanel
                  onOpenProject={setSelectedProjectId}
                  phase={riskPhase}
                  status={riskStatus}
                  onPhaseChange={setRiskPhase}
                  onStatusChange={setRiskStatus}
                />
              ) : (
                <>
                  {projectsQuery.isError ? (
                    <div className="admin-projects-state admin-projects-state-error">{getProjectServiceResultMessage(projectsQuery.error)}</div>
                  ) : null}

                  <div className="admin-table-wrap">
                    <div className="admin-projects-filters is-projects" aria-label="Project filters">
                      <form className="admin-projects-search" onSubmit={handleSearchSubmit}>
                        <IconSearch size={18} />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.projects.searchPlaceholder} type="search" />
                        <button type="submit">{t.common.search}</button>
                      </form>

                      <FilterSelect label={t.common.status} value={status} onChange={(value) => handleFilterChange(() => setStatus(value as ProjectStatus | ''))}>
                        <option value="">{t.projects.allStatuses}</option>
                        {PROJECT_STATUSES.map((item) => (
                          <option key={item} value={item}>{formatEnumLabel(item)}</option>
                        ))}
                      </FilterSelect>

                      <FilterSelect label={t.projects.salesStaff} value={salesId} onChange={(value) => handleFilterChange(() => setSalesId(value))}>
                        <option value="">{t.projects.allSales}</option>
                        {salesAccounts.map((account) => (
                          <option key={account.accountId} value={account.accountId}>{account.fullName}</option>
                        ))}
                      </FilterSelect>

                      <FilterSelect label={t.projects.designer} value={designerId} onChange={(value) => handleFilterChange(() => setDesignerId(value))}>
                        <option value="">{t.projects.allDesigners}</option>
                        {designerAccounts.map((account) => (
                          <option key={account.accountId} value={account.accountId}>{account.fullName}</option>
                        ))}
                      </FilterSelect>
                    </div>

                    <table className="admin-projects-table">
                      <thead>
                        <tr>
                          <th>{t.projects.colProject}</th>
                          <th>{t.projects.colCustomer}</th>
                          <th>{t.common.status}</th>
                          <th>{t.projects.colOwners}</th>
                          <th>{t.projects.colBusinessType}</th>
                          <th>{t.projects.colSubmitted}</th>
                          <th>{t.projects.colNextFocus}</th>
                          <th>{t.common.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectsQuery.isLoading ? (
                          <tr><td colSpan={8}>{t.projects.loadingProjects}</td></tr>
                        ) : null}

                        {!projectsQuery.isLoading && projects.length === 0 && !projectsQuery.isError ? (
                          <tr><td colSpan={8}>{t.projects.noProjects}</td></tr>
                        ) : null}

                        {projects.map((project) => {
                          const customer = accountById[project.customerId];
                          const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;
                          const designer = project.assignedDesignerId ? accountById[project.assignedDesignerId] : null;

                          return (
                            <tr key={project.projectId}>
                              <td>
                                <strong>{project.projectCode}</strong>
                                <span>{project.projectName}</span>
                              </td>
                              <td>
                                <strong>{customer?.fullName ?? 'Unknown customer'}</strong>
                                <span>{customer?.email ?? shortId(project.customerId)}</span>
                              </td>
                              <td><ProjectStatusPill status={project.status} /></td>
                              <td>
                                <strong>{sales?.fullName ?? 'Sales unassigned'}</strong>
                                <span>{designer?.fullName ?? 'Designer unassigned'}</span>
                              </td>
                              <td><span className="admin-projects-type">{project.businessType}</span></td>
                              <td>{formatDate(project.submittedAt)}</td>
                              <td>{getNextFocus(project)}</td>
                              <td>
                                <button className="admin-projects-view-button" type="button" onClick={() => setSelectedProjectId(project.projectId)}>
                                  <IconEye size={16} />
                                  {t.common.view}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <ProjectsPager
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    disabled={projectsQuery.isFetching}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </>
              )}
            </section>
          </div>
        </section>
      </div>

      <ProjectDetailDrawer
        accountById={accountById}
        designerAccounts={designerAccounts}
        projectId={selectedProjectId}
        initialStageKey={stageFromUrl}
        onClose={() => setSelectedProjectId(null)}
      />
    </main>
  );
}

function ProjectDetailDrawer({
  accountById,
  designerAccounts,
  projectId,
  initialStageKey,
  onClose,
}: {
  accountById: Record<string, AccountDto>;
  designerAccounts: AccountDto[];
  projectId: string | null;
  initialStageKey: string | null;
  onClose: () => void;
}) {
  const [designerId, setDesignerId] = useState('');
  const [proposalDeadline, setProposalDeadline] = useState('');
  const [productionDeadline, setProductionDeadline] = useState('');
  const [spaceDataStatus, setSpaceDataStatus] = useState<ProjectSpaceDataStatus>('SUFFICIENT');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedStageKey, setSelectedStageKey] = useState<ProjectWorkflowStageKey | null>(null);
  const projectQuery = useProjectDetail(projectId ?? undefined);
  const workflowQuery = useAdminProjectWorkflow(projectId ?? undefined);
  const filesQuery = useProjectFiles(projectId ? { projectId, page: 1, limit: 8 } : undefined);
  const phaseDeadlinesQuery = useProjectPhaseDeadlines(projectId ?? undefined, { enabled: Boolean(projectId) });
  const projectOrdersQuery = useProjectOrders(projectId ?? undefined, { enabled: Boolean(projectId) });
  const productionRequestsQuery = useProductionRequests(undefined, { enabled: Boolean(projectId) });
  const assignSalesMutation = useAssignSalesToProject();
  const markReadyForDesignerMutation = useMarkReadyForDesignerAssignment();
  const assignDesignerMutation = useAssignDesignerToProject();
  const updateProductionDeadlineMutation = useUpdateProductionDeadline();
  const project = projectQuery.data;
  const relatedOrder = projectOrdersQuery.data?.items[0] ?? null;
  const relatedProductionRequest =
    productionRequestsQuery.data?.items.find((request) => request.projectId === projectId) ?? null;
  const workflow = workflowQuery.data;
  const stages = workflow?.stages ?? EMPTY_STAGES;
  const proposalDeadlineMin = getLocalDateInputValue();
  const proposalDeadlineMax = project?.targetCompletionDate?.slice(0, 10) || undefined;
  const canEditProductionDeadline = Boolean(project && PRODUCTION_DEADLINE_STATUSES.includes(project.status));
  const existingProductionDeadline = useMemo(() => {
    const item = phaseDeadlinesQuery.data?.deadlines.find((deadline) => deadline.phase === 'PRODUCTION');
    return (item?.dueDate ?? item?.deadlineAt)?.slice(0, 10) ?? '';
  }, [phaseDeadlinesQuery.data?.deadlines]);

  useEffect(() => {
    setSelectedStageKey(null);
    setActionMessage('');
    setDesignerId('');
    setProposalDeadline('');
    setProductionDeadline('');
    setSpaceDataStatus('SUFFICIENT');
  }, [projectId]);

  useEffect(() => {
    if (existingProductionDeadline) {
      setProductionDeadline(existingProductionDeadline);
    }
  }, [existingProductionDeadline]);

  useEffect(() => {
    if (!workflow) return;
    if (selectedStageKey && workflow.stages.some((stage) => stage.key === selectedStageKey)) return;

    const requestedStage = workflow.stages.find((stage) => stage.key === initialStageKey);
    if (requestedStage) {
      setSelectedStageKey(requestedStage.key);
      return;
    }

    setSelectedStageKey(resolveDefaultStageKey(workflow));
  }, [initialStageKey, workflow, selectedStageKey]);

  if (!projectId) {
    return null;
  }

  async function handleAcceptProject() {
    if (!project) return;

    try {
      setActionMessage('');
      await assignSalesMutation.mutateAsync({
        projectId: project.projectId,
        note: 'Admin accepted this project for consultation.',
      });
      setActionMessage('Project moved to consultation.');
    } catch (error) {
      setActionMessage(getProjectServiceResultMessage(error));
    }
  }

  async function handleReadyForDesigner() {
    if (!project) return;

    try {
      setActionMessage('');
      await markReadyForDesignerMutation.mutateAsync({
        projectId: project.projectId,
        note: 'Admin marked project information as ready for designer assignment.',
      });
      setActionMessage('Project is ready for designer assignment.');
    } catch (error) {
      setActionMessage(getProjectServiceResultMessage(error));
    }
  }

  async function handleAssignDesigner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!project || !designerId) return;

    if (!proposalDeadline) {
      setActionMessage('Please select a proposal deadline before assigning the designer.');
      return;
    }

    if (proposalDeadline < proposalDeadlineMin) {
      setActionMessage('Proposal deadline cannot be before today.');
      return;
    }

    if (proposalDeadlineMax && proposalDeadline > proposalDeadlineMax) {
      setActionMessage('Proposal deadline cannot be after the project target date.');
      return;
    }

    try {
      setActionMessage('');
      await assignDesignerMutation.mutateAsync({
        projectId: project.projectId,
        designerId,
        proposalDeadline,
        spaceDataStatus,
        note: 'Designer assigned by admin from project management.',
      });
      setActionMessage('Designer assigned successfully.');
    } catch (error) {
      setActionMessage(getProjectServiceResultMessage(error));
    }
  }

  async function handleSaveProductionDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !productionDeadline) return;

    try {
      setActionMessage('');
      await updateProductionDeadlineMutation.mutateAsync({
        projectId: project.projectId,
        productionDeadline,
      });
      setActionMessage('Production deadline saved.');
      void phaseDeadlinesQuery.refetch();
    } catch (error) {
      setActionMessage(getProjectServiceResultMessage(error));
    }
  }

  const customer = project ? accountById[project.customerId] : null;
  const sales = project?.assignedSalesId ? accountById[project.assignedSalesId] : null;
  const designer = project?.assignedDesignerId ? accountById[project.assignedDesignerId] : null;
  const isMutating =
    assignSalesMutation.isPending ||
    markReadyForDesignerMutation.isPending ||
    assignDesignerMutation.isPending ||
    updateProductionDeadlineMutation.isPending;
  const selectedStage = stages.find((stage) => stage.key === selectedStageKey) ?? null;

  return (
    <div className="admin-projects-drawer-overlay">
      <aside className="admin-projects-drawer" aria-label="Project detail">
        <div className="admin-projects-drawer-header">
          <div>
            <span>Project Detail</span>
            <h2>{project?.projectCode ?? 'Loading project...'}</h2>
            <p>{project?.projectName ?? 'Fetching latest project data from API.'}</p>
          </div>
          <button type="button" aria-label="Close project detail" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        {projectQuery.isLoading ? <div className="admin-projects-state">Loading project detail...</div> : null}
        {projectQuery.isError ? <div className="admin-projects-state admin-projects-state-error">{getProjectServiceResultMessage(projectQuery.error)}</div> : null}

        {project ? (
          <>
            <section className="admin-projects-detail-hero">
              <ProjectStatusPill status={project.status} />
              <strong>{getNextFocus(project)}</strong>
              <p>{getProjectStageDescription(project.status)}</p>
            </section>

            <section className="admin-projects-detail-grid">
              <DetailItem label="Customer" value={customer?.fullName ?? shortId(project.customerId)} note={customer?.email ?? project.customerId} />
              <DetailItem label="Sales Owner" value={sales?.fullName ?? 'Unassigned'} note={project.assignedSalesId ?? 'Waiting for sales/admin acceptance'} />
              <DetailItem label="Designer" value={designer?.fullName ?? 'Unassigned'} note={project.assignedDesignerId ?? 'Not assigned yet'} />
              <DetailItem label="Business Type" value={project.businessType} note={project.businessPurpose ?? 'No business purpose'} />
              <DetailItem label="Address" value={project.projectAddress ?? '-'} note={`${project.totalAreaSqm ?? '-'} sqm, ${project.numberOfFloors ?? '-'} floor(s)`} />
              <DetailItem label="Budget" value={formatBudget(project)} note={`Target ${formatDate(project.targetCompletionDate)}`} />
            </section>

            <section className="admin-projects-detail-section">
              <h3>Project Requirements</h3>
              <p>{project.furnitureRequirement}</p>
              {project.description ? <p>{project.description}</p> : null}
            </section>

            <section className="admin-projects-detail-section">
              <OperationalDelayPanel
                orderId={relatedOrder?.orderId}
                productionRequestId={relatedProductionRequest?.productionRequestId}
                projectId={project.projectId}
              />
            </section>

            <section className="admin-projects-detail-section">
              <ProductIssuePanel projectId={project.projectId} />
            </section>

            <section className="admin-projects-detail-section">
              <ProjectPhaseTimelineCard
                projectId={project.projectId}
                phases={['PROPOSAL', 'PRODUCTION']}
                title="Phase deadlines"
                description="Proposal is set when assigning a designer. Production deadline is managed below."
              />
              {canEditProductionDeadline ? (
                <form className="admin-projects-production-deadline-form" onSubmit={handleSaveProductionDeadline}>
                  <label>
                    <span>Production deadline</span>
                    <input
                      max={proposalDeadlineMax}
                      min={getLocalDateInputValue()}
                      required
                      type="date"
                      value={productionDeadline}
                      onChange={(event) => setProductionDeadline(event.target.value)}
                    />
                  </label>
                  <button className="admin-button admin-button-primary" disabled={isMutating || !productionDeadline} type="submit">
                    {existingProductionDeadline ? 'Update production deadline' : 'Set production deadline'}
                  </button>
                </form>
              ) : (
                <p className="admin-projects-deadline-hint">
                  Production deadline can be set after the project has an active order (ORDER_CONFIRMED or later).
                </p>
              )}
            </section>

            <section className="admin-projects-detail-section">
              <div className="admin-projects-section-title">
                <h3>Workflow Tracker</h3>
                <button
                  className="admin-button admin-button-secondary"
                  type="button"
                  disabled={workflowQuery.isFetching}
                  onClick={() => void workflowQuery.refetch()}
                >
                  <IconRefresh size={16} />
                  Refresh
                </button>
              </div>

              {workflowQuery.isLoading ? <div className="admin-projects-state">Loading workflow...</div> : null}
              {workflowQuery.isError ? (
                <div className="admin-projects-state admin-projects-state-error">{getProjectServiceResultMessage(workflowQuery.error)}</div>
              ) : null}

              {workflow ? (
                <>
                  {workflow.isRejected ? (
                    <div className="admin-projects-workflow-banner admin-projects-workflow-banner-rejected">
                      Project rejected. Workflow shows completed stages only; no active stage.
                    </div>
                  ) : null}

                  <div className="admin-projects-flow">
                    {stages.map((stage, index) => {
                      const isSelected = stage.key === selectedStageKey;
                      const className = [
                        'admin-projects-flow-step',
                        `admin-projects-flow-step-${stage.state.toLowerCase()}`,
                        isSelected ? 'admin-projects-flow-step-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <button
                          key={stage.key}
                          className={className}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedStageKey(stage.key)}
                        >
                          <span className="admin-projects-flow-step-main">
                            <span className="admin-projects-flow-step-label">{stage.label}</span>
                            <span className="admin-projects-flow-step-state">{formatEnumLabel(stage.state)}</span>
                          </span>
                          {index < stages.length - 1 ? <IconArrowRight size={14} /> : null}
                        </button>
                      );
                    })}
                  </div>

                  {selectedStage ? <WorkflowStagePanel stage={selectedStage} /> : null}
                </>
              ) : null}
            </section>

            <section className="admin-projects-detail-section">
              <h3>Admin Actions</h3>
              <div className="admin-projects-action-panel">
                {project.status === 'SUBMITTED' || project.status === 'NEED_BASIC_INFORMATION' ? (
                  <button className="admin-button admin-button-primary" type="button" disabled={isMutating} onClick={handleAcceptProject}>
                    Accept for Consultation
                  </button>
                ) : null}
                {project.status === 'IN_CONSULTATION' ? (
                  <button className="admin-button admin-button-primary" type="button" disabled={isMutating} onClick={handleReadyForDesigner}>
                    Ready for Designer
                  </button>
                ) : null}
                {project.status === 'WAITING_FOR_DESIGNER_ASSIGNMENT' ? (
                  <form className="admin-projects-designer-form" onSubmit={handleAssignDesigner}>
                    <select value={designerId} onChange={(event) => setDesignerId(event.target.value)} required>
                      <option value="">Select designer</option>
                      {designerAccounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>{account.fullName}</option>
                      ))}
                    </select>
                    <select value={spaceDataStatus} onChange={(event) => setSpaceDataStatus(event.target.value as ProjectSpaceDataStatus)}>
                      <option value="SUFFICIENT">Space verified</option>
                      <option value="INSUFFICIENT">Measurement required</option>
                    </select>
                    <input
                      aria-label="Proposal deadline"
                      max={proposalDeadlineMax}
                      min={proposalDeadlineMin}
                      required
                      type="date"
                      value={proposalDeadline}
                      onChange={(event) => setProposalDeadline(event.target.value)}
                    />
                    <button className="admin-button admin-button-primary" type="submit" disabled={isMutating || !designerId || !proposalDeadline}>Assign Designer</button>
                  </form>
                ) : null}
                {project.status !== 'SUBMITTED' && project.status !== 'NEED_BASIC_INFORMATION' && project.status !== 'IN_CONSULTATION' && project.status !== 'WAITING_FOR_DESIGNER_ASSIGNMENT' ? (
                  <p>Current status is managed by the downstream design, quotation, production, or delivery workflow.</p>
                ) : null}
              </div>
              {actionMessage ? <div className="admin-projects-action-message">{actionMessage}</div> : null}
            </section>

            <section className="admin-projects-detail-section">
              <ProjectShowcaseManager projectId={project.projectId} projectName={project.projectName} projectStatus={project.status} role="admin" />
            </section>

            <section className="admin-projects-detail-section">
              <h3>Project Files</h3>
              {filesQuery.isLoading ? <p>Loading files...</p> : null}
              {filesQuery.isError ? <p>{getProjectServiceResultMessage(filesQuery.error)}</p> : null}
              {!filesQuery.isLoading && !filesQuery.isError && (filesQuery.data?.items.length ?? 0) === 0 ? <p>No files uploaded yet.</p> : null}
              <div className="admin-projects-file-list">
                {filesQuery.data?.items.map((file) => (
                  <a key={file.fileId} href={file.publicUrl} target="_blank" rel="noreferrer">
                    <strong>{file.originalFileName}</strong>
                    <span>{formatEnumLabel(file.fileType)} · {formatFileSize(file.fileSize)}</span>
                  </a>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function WorkflowStagePanel({ stage }: { stage: ProjectWorkflowStageDto }) {
  const factEntries = Object.entries(stage.facts);
  const hasBlocker = stage.summary.blockerCount > 0;

  return (
    <div className={`admin-projects-workflow-panel admin-projects-workflow-panel-${stage.state.toLowerCase()}`}>
      <div className="admin-projects-workflow-panel-header">
        <div>
          <span className="admin-projects-workflow-panel-eyebrow">{formatEnumLabel(stage.state)}</span>
          <h4>{stage.summary.title}</h4>
          <p>{stage.summary.description}</p>
        </div>
        <div className="admin-projects-workflow-panel-meta">
          <span>{stage.statusInStage ? formatEnumLabel(stage.statusInStage) : 'Not started'}</span>
          <span>{stage.summary.primaryOwnerName ?? 'No owner'}</span>
        </div>
      </div>

      {hasBlocker ? (
        <div className="admin-projects-workflow-blocker">
          <IconAlertTriangle size={16} />
          <div>
            <strong>Blocker</strong>
            <p>{stage.summary.description}</p>
          </div>
        </div>
      ) : null}

      {stage.metrics.length > 0 ? (
        <div className="admin-projects-workflow-metrics" aria-label={`${stage.label} metrics`}>
          {stage.metrics.map((metric) => (
            <article key={metric.key}>
              <span>{metric.label}</span>
              <strong>{formatMetricValue(metric)}</strong>
            </article>
          ))}
        </div>
      ) : null}

      {factEntries.length > 0 ? (
        <div className="admin-projects-workflow-facts" aria-label={`${stage.label} facts`}>
          {factEntries.map(([key, value]) => (
            <div key={key}>
              <span>{formatEnumLabel(key)}</span>
              <strong>{formatFactValue(key, value)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {stage.links.length > 0 ? (
        <div className="admin-projects-workflow-links" aria-label={`${stage.label} links`}>
          {stage.links.map((link) => (
            <WorkflowLinkChip key={`${link.type}-${link.id}`} link={link} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowLinkChip({ link }: { link: ProjectWorkflowLinkDto }) {
  return (
    <div className="admin-projects-workflow-link" title={link.id}>
      <span>{formatEnumLabel(link.type)}</span>
      <strong>{link.label}</strong>
    </div>
  );
}

function SummaryCard({
  icon: IconComponent,
  label,
  value,
  note,
}: {
  icon: Icon;
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <article className="admin-projects-summary-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
      <div className="admin-projects-summary-icon"><IconComponent size={22} /></div>
    </article>
  );
}

function FilterSelect({ children, label, value, onChange }: { children: ReactNode; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="admin-projects-filter">
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <IconChevronDown size={16} />
      </div>
    </label>
  );
}

function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`admin-projects-status admin-projects-status-${getStatusTone(status)}`}>{formatEnumLabel(status)}</span>;
}

function DetailItem({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="admin-projects-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function createAccountLookup(accounts: AccountDto[]) {
  return accounts.reduce<Record<string, AccountDto>>((lookup, account) => {
    lookup[account.accountId] = account;
    return lookup;
  }, {});
}

function resolveDefaultStageKey(workflow: ProjectWorkflowDto): ProjectWorkflowStageKey | null {
  if (workflow.currentStage) {
    return workflow.currentStage;
  }

  const activeOrBlocked = workflow.stages.find(
    (stage) => stage.state === 'ACTIVE' || stage.state === 'BLOCKED',
  );

  if (activeOrBlocked) {
    return activeOrBlocked.key;
  }

  const completed = [...workflow.stages].reverse().find((stage) => stage.state === 'COMPLETED');

  return completed?.key ?? workflow.stages[0]?.key ?? null;
}

function formatMetricValue(metric: ProjectWorkflowMetricDto) {
  if (metric.value == null) return '-';

  if (metric.unit === 'money' && typeof metric.value === 'number') {
    return MONEY_FORMATTER.format(metric.value);
  }

  if (metric.unit === 'percent' && typeof metric.value === 'number') {
    return `${metric.value}%`;
  }

  if (metric.unit === 'days' && typeof metric.value === 'number') {
    return `${metric.value}d`;
  }

  return String(metric.value);
}

function formatFactValue(key: string, value: string | number | null) {
  if (value == null) return '-';

  if (typeof value === 'number') {
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('total')) {
      return MONEY_FORMATTER.format(value);
    }

    if (key.toLowerCase().includes('percent')) {
      return `${value}%`;
    }

    return String(value);
  }

  if (key.toLowerCase().endsWith('at') || looksLikeIsoDate(value)) {
    return formatDateTime(value);
  }

  if (/^[A-Z0-9_]+$/.test(value)) {
    return formatEnumLabel(value);
  }

  return value;
}

function looksLikeIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getProjectStats(report: ReportProjectsDto | undefined) {
  if (!report) {
    return { active: 0, needsOwner: 0, attention: 0 };
  }

  const byStatusCount = (key: string) =>
    report.byStatus.find((item) => item.key === key)?.count ?? 0;

  return {
    active: report.totalNonTerminal,
    needsOwner: report.unassignedIntakeCount + report.waitingForDesignerCount,
    attention: byStatusCount('NEED_BASIC_INFORMATION') + byStatusCount('REJECTED'),
  };
}

function getNextFocus(project: ProjectListItemDto | ProjectDto) {
  if (project.status === 'SUBMITTED') return 'Accept or review request';
  if (project.status === 'NEED_BASIC_INFORMATION') return 'Wait for customer update';
  if (project.status === 'IN_CONSULTATION') return 'Confirm info and prepare designer assignment';
  if (project.status === 'WAITING_FOR_DESIGNER_ASSIGNMENT') return 'Assign designer';
  if (project.status === 'MEASUREMENT_REQUIRED') return 'Schedule measurement';
  if (project.status === 'SPACE_VERIFIED') return 'Start proposal consulting';
  if (project.status === 'PROPOSAL_CONSULTING') return 'Create, publish, and compare proposals';
  if (project.status === 'READY_FOR_DELIVERY') return 'Prepare delivery';
  if (project.status === 'DELIVERING') return 'Monitor delivery batches';
  if (project.status === 'AWAITING_CUSTOMER_CONFIRMATION') return 'Waiting for customer delivery confirmation';
  if (project.status === 'REJECTED') return 'Closed as rejected';
  if (project.status === 'COMPLETED') return 'Completed';
  return 'Track downstream workflow';
}

function getProjectStageDescription(status: ProjectStatus) {
  if (status === 'SUBMITTED') return 'New customer request is waiting for initial sales/admin review.';
  if (status === 'IN_CONSULTATION') return 'Sales consultation is active; basic requirements should be validated.';
  if (status === 'WAITING_FOR_DESIGNER_ASSIGNMENT') return 'Project is ready to hand over to a designer.';
  if (status === 'MEASUREMENT_REQUIRED') return 'Space data is not sufficient and measurement should be arranged.';
  if (status === 'SPACE_VERIFIED') return 'Space information is sufficient for proposal work.';
  if (status === 'REJECTED') return 'Project was rejected before order confirmation.';
  if (status === 'COMPLETED') return 'Project lifecycle is complete.';
  return 'Project is moving through the FurniSpace operational workflow.';
}

function getStatusTone(status: ProjectStatus) {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'NEED_BASIC_INFORMATION' || status === 'MEASUREMENT_REQUIRED' || status === 'AWAITING_CUSTOMER_CONFIRMATION') return 'warning';
  if (status === 'SUBMITTED' || status === 'WAITING_FOR_DESIGNER_ASSIGNMENT' || status === 'PROPOSAL_CONSULTING') return 'info';
  return 'neutral';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function formatBudget(project: ProjectDto) {
  if (project.budgetMin == null && project.budgetMax == null) return '-';

  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

  return `${project.budgetMin != null ? formatter.format(project.budgetMin) : '?'} - ${project.budgetMax != null ? formatter.format(project.budgetMax) : '?'}`;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

export default AdminProjects;
