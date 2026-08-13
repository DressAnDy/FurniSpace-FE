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
import {
  useAccountList,
  useAdminProjectWorkflow,
  useAssignDesignerToProject,
  useAssignSalesToProject,
  useMarkReadyForDesignerAssignment,
  useProjectDetail,
  useProjectFiles,
  useProjectList,
} from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
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
  'DELIVERED',
  'COMPLETED',
  'REJECTED',
];

const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = PROJECT_STATUSES.filter((status) => status !== 'COMPLETED' && status !== 'REJECTED');
const EMPTY_ACCOUNTS: AccountDto[] = [];
const EMPTY_PROJECTS: ProjectListItemDto[] = [];
const EMPTY_STAGES: ProjectWorkflowStageDto[] = [];
const MONEY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function AdminProjects() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [salesId, setSalesId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const projectsQuery = useProjectList({
    search,
    status: status || null,
    assignedSalesId: salesId || null,
    assignedDesignerId: designerId || null,
    page,
    limit: 5,
  });
  const accountsQuery = useAccountList({ page: 1, pageSize: 100, includeDeleted: false });
  const accounts = accountsQuery.data?.items ?? EMPTY_ACCOUNTS;
  const accountById = useMemo(() => createAccountLookup(accounts), [accounts]);
  const salesAccounts = useMemo(() => accounts.filter((account) => getAccountRoleName(account.roleId) === 'SALES'), [accounts]);
  const designerAccounts = useMemo(() => accounts.filter((account) => getAccountRoleName(account.roleId) === 'DESIGNER'), [accounts]);
  const projects = projectsQuery.data?.items ?? EMPTY_PROJECTS;
  const stats = useMemo(() => getProjectStats(projects), [projects]);
  const totalPages = Math.max(Math.ceil((projectsQuery.data?.total ?? 0) / (projectsQuery.data?.limit ?? 5)), 1);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void projectsQuery.refetch();
  }

  function handleFilterChange(next: () => void) {
    next();
    setPage(1);
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Projects" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Projects" />
          <div className="admin-content admin-projects-content">
            <div className="admin-page-heading admin-projects-heading">
              <div>
                <h2>Project Management</h2>
                <p>Monitor every customer project from request intake to design, production, delivery, and completion.</p>
              </div>
              <button className="admin-button admin-button-secondary" type="button" onClick={() => projectsQuery.refetch()}>
                <IconRefresh size={16} />
                Refresh
              </button>
            </div>

            <section className="admin-projects-summary-grid" aria-label="Project summary">
              <SummaryCard icon={IconFolderOpen} label="Projects in View" value={projectsQuery.data?.total ?? projects.length} note="" />
              <SummaryCard icon={IconBriefcase} label="Active Projects" value={stats.active} note="Not completed/rejected" />
              <SummaryCard icon={IconUsers} label="Needs Owner" value={stats.unassignedSales + stats.unassignedDesigner} note="Sales or designer missing" />
              <SummaryCard icon={IconCalendarDue} label="Attention Needed" value={stats.attention} note="Missing info or rejected" />
            </section>

            <section className="admin-card admin-projects-filters" aria-label="Project filters">
              <form className="admin-projects-search" onSubmit={handleSearchSubmit}>
                <IconSearch size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, project name, business type..." type="search" />
                <button type="submit">Search</button>
              </form>

              <FilterSelect label="Status" value={status} onChange={(value) => handleFilterChange(() => setStatus(value as ProjectStatus | ''))}>
                <option value="">All statuses</option>
                {PROJECT_STATUSES.map((item) => (
                  <option key={item} value={item}>{formatEnumLabel(item)}</option>
                ))}
              </FilterSelect>

              <FilterSelect label="Sales staff" value={salesId} onChange={(value) => handleFilterChange(() => setSalesId(value))}>
                <option value="">All sales staff</option>
                {salesAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>{account.fullName}</option>
                ))}
              </FilterSelect>

              <FilterSelect label="Designer" value={designerId} onChange={(value) => handleFilterChange(() => setDesignerId(value))}>
                <option value="">All designers</option>
                {designerAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>{account.fullName}</option>
                ))}
              </FilterSelect>
            </section>

            

            <section className="admin-card admin-projects-table-card">
              <div className="admin-projects-section-title">
                <h3>All Projects</h3>
                <span>Page {page} of {totalPages}</span>
              </div>

              {projectsQuery.isError ? (
                <div className="admin-projects-state admin-projects-state-error">{getProjectServiceResultMessage(projectsQuery.error)}</div>
              ) : null}

              <div className="admin-table-wrap">
                <table className="admin-projects-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Owners</th>
                      <th>Business Type</th>
                      <th>Submitted</th>
                      <th>Next Focus</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsQuery.isLoading ? (
                      <tr><td colSpan={8}>Loading projects from API...</td></tr>
                    ) : null}

                    {!projectsQuery.isLoading && projects.length === 0 && !projectsQuery.isError ? (
                      <tr><td colSpan={8}>No projects match the current filters.</td></tr>
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
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="admin-projects-pagination">
                <button type="button" disabled={page <= 1 || projectsQuery.isFetching} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                  Previous
                </button>
                <span>{projectsQuery.data?.total ?? 0} total projects</span>
                <button type="button" disabled={page >= totalPages || projectsQuery.isFetching} onClick={() => setPage((current) => current + 1)}>
                  Next
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>

      <ProjectDetailDrawer
        accountById={accountById}
        designerAccounts={designerAccounts}
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />
    </main>
  );
}

function ProjectDetailDrawer({
  accountById,
  designerAccounts,
  projectId,
  onClose,
}: {
  accountById: Record<string, AccountDto>;
  designerAccounts: AccountDto[];
  projectId: string | null;
  onClose: () => void;
}) {
  const [designerId, setDesignerId] = useState('');
  const [spaceDataStatus, setSpaceDataStatus] = useState<ProjectSpaceDataStatus>('SUFFICIENT');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedStageKey, setSelectedStageKey] = useState<ProjectWorkflowStageKey | null>(null);
  const projectQuery = useProjectDetail(projectId ?? undefined);
  const workflowQuery = useAdminProjectWorkflow(projectId ?? undefined);
  const filesQuery = useProjectFiles(projectId ? { projectId, page: 1, limit: 8 } : undefined);
  const assignSalesMutation = useAssignSalesToProject();
  const markReadyForDesignerMutation = useMarkReadyForDesignerAssignment();
  const assignDesignerMutation = useAssignDesignerToProject();
  const project = projectQuery.data;
  const workflow = workflowQuery.data;
  const stages = workflow?.stages ?? EMPTY_STAGES;

  useEffect(() => {
    setSelectedStageKey(null);
    setActionMessage('');
    setDesignerId('');
    setSpaceDataStatus('SUFFICIENT');
  }, [projectId]);

  useEffect(() => {
    if (!workflow) return;
    if (selectedStageKey && workflow.stages.some((stage) => stage.key === selectedStageKey)) return;

    setSelectedStageKey(resolveDefaultStageKey(workflow));
  }, [workflow, selectedStageKey]);

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

    try {
      setActionMessage('');
      await assignDesignerMutation.mutateAsync({
        projectId: project.projectId,
        designerId,
        spaceDataStatus,
        note: 'Designer assigned by admin from project management.',
      });
      setActionMessage('Designer assigned successfully.');
    } catch (error) {
      setActionMessage(getProjectServiceResultMessage(error));
    }
  }

  const customer = project ? accountById[project.customerId] : null;
  const sales = project?.assignedSalesId ? accountById[project.assignedSalesId] : null;
  const designer = project?.assignedDesignerId ? accountById[project.assignedDesignerId] : null;
  const isMutating = assignSalesMutation.isPending || markReadyForDesignerMutation.isPending || assignDesignerMutation.isPending;
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
                    <button className="admin-button admin-button-primary" type="submit" disabled={isMutating || !designerId}>Assign Designer</button>
                  </form>
                ) : null}
                {project.status !== 'SUBMITTED' && project.status !== 'NEED_BASIC_INFORMATION' && project.status !== 'IN_CONSULTATION' && project.status !== 'WAITING_FOR_DESIGNER_ASSIGNMENT' ? (
                  <p>Current status is managed by the downstream design, quotation, production, or delivery workflow.</p>
                ) : null}
              </div>
              {actionMessage ? <div className="admin-projects-action-message">{actionMessage}</div> : null}
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

function SummaryCard({ icon: IconComponent, label, value, note }: { icon: Icon; label: string; value: number; note: string }) {
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

function getProjectStats(projects: ProjectListItemDto[]) {
  return {
    active: projects.filter((project) => ACTIVE_PROJECT_STATUSES.includes(project.status)).length,
    unassignedSales: projects.filter((project) => !project.assignedSalesId).length,
    unassignedDesigner: projects.filter((project) => project.status !== 'SUBMITTED' && !project.assignedDesignerId).length,
    attention: projects.filter((project) => ['NEED_BASIC_INFORMATION', 'REJECTED'].includes(project.status)).length,
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
  if (status === 'NEED_BASIC_INFORMATION' || status === 'MEASUREMENT_REQUIRED') return 'warning';
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
