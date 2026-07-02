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
  IconRulerMeasure,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { getAccountById } from '@/services/api';
import { getProjectServiceResultMessage, type ProjectDto } from '@/services/api/projects';
import { useProjectDetail } from '@/services/queries';

import { ChatTab, CustomizationTab, OverviewTab, ProposalsTab, SchedulesTab, SpaceFilesTab } from './tabs';
import './DesignerProjectDetail.css';

type DesignerProjectDetailTab = 'overview' | 'space-files' | 'proposals' | 'scenes' | 'feedback' | 'customization' | 'schedules' | 'chat' | 'handover';

type DesignerProjectTabProps = {
  project: ProjectDto;
};

type DesignerProjectTabConfig = {
  id: DesignerProjectDetailTab;
  label: string;
  badge?: string;
  component?: ComponentType<DesignerProjectTabProps>;
};

const detailTabs: DesignerProjectTabConfig[] = [
  { id: 'overview', label: 'Overview', component: OverviewTab },
  { id: 'space-files', label: 'Space Files', component: SpaceFilesTab },
  { id: 'proposals', label: 'Proposals', badge: '2', component: ProposalsTab },
  { id: 'scenes', label: '2D/3D Scenes', badge: '3' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'customization', label: 'Customization', component: CustomizationTab },
  { id: 'schedules', label: 'Schedules', component: SchedulesTab },
  { id: 'chat', label: 'Chat', component: ChatTab },
  { id: 'handover', label: 'Handover' },
];

export function DesignerProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<DesignerProjectDetailTab>('overview');
  const projectQuery = useProjectDetail(projectId);
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

  function openProposalSceneEditor() {
    const editorSceneId = projectId ?? 'new-proposal-scene';

    navigate(`/proposal-scenes/${editorSceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
        projectId: editorSceneId,
        returnTo: projectId ? `/designer/assigned-projects/${projectId}` : '/designer/assigned-projects',
      },
    });
  }

  return (
    <DesignerLayout activeLabel="Assigned Projects" searchPlaceholder="Search projects, proposals...">
      <section className="designer-project-detail-page">
        <Link className="designer-project-back-link" to="/designer/assigned-projects">
          <IconArrowLeft size={18} stroke={1.8} />
          <span>Back to Assigned Projects</span>
        </Link>

        {projectQuery.isLoading ? <section className="designer-card designer-project-state">Loading project detail...</section> : null}
        {projectQuery.isError ? <section className="designer-card designer-project-state designer-project-state-error">{getProjectServiceResultMessage(projectQuery.error)}</section> : null}

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

              <div className="designer-project-progress-card">
                <div className="designer-project-progress-ring" style={{ '--progress': `${getProjectProgress(project.status)}%` } as CSSProperties}>
                  <span>{getProjectProgress(project.status)}%</span>
                </div>
                <p>Design Progress</p>
                <div className="designer-project-progress-actions">
                  <button className="designer-project-detail-button designer-project-detail-button-primary" type="button" onClick={openProposalSceneEditor}>
                    <IconPlus size={17} />
                    Create Proposal
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
                      {tab.badge ? <em>{tab.badge}</em> : null}
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

function getProjectProgress(status: string) {
  const progressByStatus: Record<string, number> = {
    MEASUREMENT_REQUIRED: 15,
    SPACE_VERIFIED: 25,
    PROPOSAL_DRAFTING: 45,
    WAITING_FOR_CUSTOMER_REVIEW: 65,
    REVISION_REQUESTED: 70,
    PROPOSAL_SELECTED: 82,
    QUOTATION_SENT: 90,
    COMPLETED: 100,
  };

  return progressByStatus[status] ?? 10;
}

function getStatusTone(status: string) {
  if (status === 'MEASUREMENT_REQUIRED' || status === 'SPACE_VERIFIED') return 'new';
  if (status === 'PROPOSAL_DRAFTING' || status === 'WAITING_FOR_CUSTOMER_REVIEW') return 'design';
  if (status === 'REVISION_REQUESTED') return 'pending';
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
