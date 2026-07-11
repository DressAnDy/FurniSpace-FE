import {
  IconArrowLeft,
  IconBox,
  IconCalendarEvent,
  IconClipboardList,
  IconCube,
  IconFileText,
  IconMessage,
  IconPalette,
  IconPlus,
  IconRefresh,
  IconRulerMeasure,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState, type ComponentType } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { getAccountById } from '@/services/api';
import { getProposalServiceResultMessage } from '@/services/api/proposals';
import { getProjectServiceResultMessage, type ProjectDto, type ProjectStatus } from '@/services/api/projects';
import { useCreateProposal, useProjectDetail, useUpdateProjectStatus } from '@/services/queries';

import { ChatTab, CustomizationTab, FeedbackTab, OverviewTab, ProposalsTab, SchedulesTab, SpaceFilesTab } from './tabs';
import './DesignerProjectDetail.css';

type DesignerProjectDetailTab = 'overview' | 'space-files' | 'proposals' | 'feedback' | 'customization' | 'schedules' | 'chat';

type DesignerProjectTabProps = {
  project: ProjectDto;
};

type DesignerProjectTabConfig = {
  id: DesignerProjectDetailTab;
  label: string;
  component?: ComponentType<DesignerProjectTabProps>;
};

const detailTabs: DesignerProjectTabConfig[] = [
  { id: 'overview', label: 'Overview', component: OverviewTab },
  { id: 'space-files', label: 'Space Files', component: SpaceFilesTab },
  { id: 'proposals', label: 'Proposals', component: ProposalsTab },
  { id: 'feedback', label: 'Feedback', component: FeedbackTab },
  { id: 'customization', label: 'Customization', component: CustomizationTab },
  { id: 'schedules', label: 'Schedules', component: SchedulesTab },
  { id: 'chat', label: 'Chat', component: ChatTab },
];

export function DesignerProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<DesignerProjectDetailTab>('overview');
  const [projectActionMessage, setProjectActionMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectQuery = useProjectDetail(projectId);
  const createProposalMutation = useCreateProposal();
  const updateProjectStatusMutation = useUpdateProjectStatus();
  const project = projectQuery.data;
  const accountIds = useMemo(() => [project?.customerId, project?.assignedSalesId].filter((accountId): accountId is string => Boolean(accountId)), [project?.assignedSalesId, project?.customerId]);
  const accountQueries = useQueries({
    queries: accountIds.map((accountId) => ({
      queryKey: ['accounts', 'detail', accountId],
      queryFn: () => getAccountById(accountId),
      enabled: Boolean(accountId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const accountById = useMemo(() => {
    return accountQueries.reduce<Record<string, { fullName: string; email: string }>>((lookup, query, index) => {
      const account = query.data;

      if (account) {
        lookup[accountIds[index]] = account;
      }

      return lookup;
    }, {});
  }, [accountIds, accountQueries]);
  const customer = project ? accountById[project.customerId] : null;
  const sales = project?.assignedSalesId ? accountById[project.assignedSalesId] : null;
  const activeTabConfig = useMemo(() => detailTabs.find((tab) => tab.id === activeTab) ?? detailTabs[0], [activeTab]);
  const ActiveTab = activeTabConfig.component ?? OverviewTab;
  const projectFacts = project
    ? [
        { icon: IconBox, label: `${project.businessType}${project.totalAreaSqm ? ` - ${project.totalAreaSqm} sqm` : ''}` },
        { icon: IconClipboardList, label: customer?.fullName ?? 'Loading customer...' },
        { icon: IconCalendarEvent, label: project.targetCompletionDate ? formatDate(project.targetCompletionDate) : 'No target date' },
        { icon: IconMessage, label: `Sales: ${sales?.fullName ?? project.assignedSalesId ?? '-'}` },
      ]
    : [];

  async function openProposalWorkspace() {
    if (!project) {
      return;
    }

    setProjectActionMessage(null);

    try {
      const proposal = await createProposalMutation.mutateAsync({
        projectId: project.projectId,
        proposalName: `${project.projectName} 3D Proposal`,
        description: 'Created from designer proposal workspace.',
      });

      navigate(`/designer/projects/${project.projectId}/proposals/${proposal.proposalId}`);
    } catch (error) {
      setProjectActionMessage({ tone: 'error', text: getProposalServiceResultMessage(error) });
    }
  }

  async function updateProjectToNextDesignStatus() {
    if (!project) {
      return;
    }

    const nextStatus = getNextDesignStatus(project.status);

    if (!nextStatus) {
      return;
    }

    setProjectActionMessage(null);

    try {
      await updateProjectStatusMutation.mutateAsync({
        projectId: project.projectId,
        status: nextStatus,
        note: `Designer moved project from ${project.status} to ${nextStatus} from project detail.`,
      });
      setProjectActionMessage({ tone: 'success', text: `Project status updated to ${formatEnumLabel(nextStatus)}.` });
    } catch (error) {
      setProjectActionMessage({ tone: 'error', text: getProjectServiceResultMessage(error) });
    }
  }

  return (
    <DesignerLayout activeLabel="Assigned Projects" searchPlaceholder="Search designer features...">
      <section className="designer-project-detail-page">
        <Link className="designer-project-back-link" to="/designer/assigned-projects">
          <IconArrowLeft size={18} stroke={1.8} />
          <span>Back to Assigned Projects</span>
        </Link>

        {projectQuery.isLoading ? <section className="designer-card designer-project-state">Loading project detail...</section> : null}
        {projectQuery.isError ? <section className="designer-card designer-project-state designer-project-state-error">{getProjectServiceResultMessage(projectQuery.error)}</section> : null}
        {projectActionMessage ? (
          <section className={`designer-card designer-project-state ${projectActionMessage.tone === 'error' ? 'designer-project-state-error' : 'designer-project-state-success'}`}>
            {projectActionMessage.text}
          </section>
        ) : null}

        {project ? (
          <>
            <section className="designer-project-hero">
              <div className="designer-project-hero-main">
                <div className="designer-project-hero-meta">
                  <span className={`designer-project-status designer-project-status-${getStatusTone(project.status)}`}>{formatEnumLabel(project.status)}</span>
                  <span className="designer-project-code">{project.projectCode}</span>
                </div>
                <h2>{project.projectName}</h2>
                <p>{project.description ?? project.furnitureRequirement}</p>
                <div className="designer-project-fact-grid">
                  {projectFacts.map(({ icon: FactIcon, label }) => (
                    <span className="designer-project-fact" key={label}>
                      <FactIcon size={17} stroke={1.8} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="designer-project-process-card">
                <div className="designer-project-current-status">
                  <span>Current Status</span>
                  <strong>{formatEnumLabel(project.status)}</strong>
                </div>
                <div className="designer-project-progress-actions">
                  <button
                    className="designer-project-detail-button"
                    disabled={!getNextDesignStatus(project.status) || updateProjectStatusMutation.isPending}
                    type="button"
                    onClick={() => void updateProjectToNextDesignStatus()}
                  >
                    <IconRefresh size={17} />
                    {updateProjectStatusMutation.isPending ? 'Updating...' : getDesignStatusActionLabel(project.status)}
                  </button>
                  <button
                    className="designer-project-detail-button designer-project-detail-button-primary"
                    disabled={!isProposalDraftingStatus(project.status) || createProposalMutation.isPending}
                    type="button"
                    onClick={() => void openProposalWorkspace()}
                  >
                    <IconPlus size={17} />
                    {createProposalMutation.isPending ? 'Creating...' : 'Create Proposal'}
                  </button>
                  <button className="designer-project-detail-button" type="button">
                    <IconCube size={17} />
                    Scenes
                  </button>
                  <button className="designer-project-detail-button" type="button">
                    <IconRulerMeasure size={17} />
                    Requirements
                  </button>
                </div>
              </div>
            </section>

            <section className="designer-project-tabs-section">
              <div className="designer-project-tabs" role="tablist" aria-label="Designer project detail sections">
                {detailTabs.map((tab) => {
                  const disabled = !tab.component;
                  return (
                    <button
                      aria-selected={activeTab === tab.id}
                      className={activeTab === tab.id ? 'designer-project-tab-active' : ''}
                      disabled={disabled}
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      type="button"
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {!activeTabConfig.component ? (
                <section className="designer-card designer-project-placeholder">
                  <div className="designer-project-placeholder-row">
                    <IconFileText className="designer-project-placeholder-icon" size={22} />
                    <div>
                      <h3>{activeTabConfig.label}</h3>
                      <p>This section is reserved for the next designer workflow implementation.</p>
                    </div>
                  </div>
                </section>
              ) : (
                <ActiveTab project={project} />
              )}
            </section>

            <aside className="designer-project-floating-note">
              <IconPalette size={18} />
              <span>Project information is loaded from your assigned designer workspace.</span>
            </aside>
          </>
        ) : null}
      </section>
    </DesignerLayout>
  );
}

function getNextDesignStatus(status: ProjectStatus): ProjectStatus | null {
  if (status === 'MEASUREMENT_REQUIRED') return 'SPACE_VERIFIED';
  if (status === 'SPACE_VERIFIED') return 'PROPOSAL_CONSULTING';

  return null;
}

function getDesignStatusActionLabel(status: ProjectStatus) {
  const nextStatus = getNextDesignStatus(status);

  if (status === 'MEASUREMENT_REQUIRED') {
    return 'Mark Space Verified';
  }

  if (status === 'SPACE_VERIFIED') {
    return 'Start Proposal Consulting';
  }

  if (!nextStatus) {
    return status === 'PROPOSAL_CONSULTING' ? 'Ready for Proposals' : 'No Designer Step';
  }

  return `Update to ${formatEnumLabel(nextStatus)}`;
}

function isProposalDraftingStatus(status: string) {
  return normalizeStatus(status) === 'PROPOSAL_CONSULTING';
}

function normalizeStatus(status: string) {
  return status.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function getStatusTone(status: string) {
  if (status === 'MEASUREMENT_REQUIRED' || status === 'SPACE_VERIFIED') return 'new';
  if (status === 'PROPOSAL_CONSULTING') return 'design';
  if (status === 'PROPOSAL_SELECTED' || status === 'QUOTATION_SENT') return 'reviewed';
  return 'missing';
}

function formatEnumLabel(value: string) {
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
