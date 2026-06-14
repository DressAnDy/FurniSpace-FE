import { useQueries } from '@tanstack/react-query';

import { getAccountById, getAccountRoleName, type AccountDto } from '@/services/api';

import type { ProjectDetailProject } from '../ProjectDetail';

type OverviewTabProps = {
  project: ProjectDetailProject;
  showAssignedTeam?: boolean;
};

export function OverviewTab({ project, showAssignedTeam = false }: OverviewTabProps) {
  const teamAccountIds = [project.assignedSalesId, project.assignedDesignerId].filter((accountId): accountId is string => Boolean(accountId));
  const teamQueries = useQueries({
    queries: teamAccountIds.map((accountId) => ({
      queryKey: ['accounts', 'detail', accountId],
      queryFn: () => getAccountById(accountId),
      enabled: showAssignedTeam,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const teamById = teamQueries.reduce<Record<string, AccountDto>>((lookup, query, index) => {
    const account = query.data;

    if (account) {
      lookup[teamAccountIds[index]] = account;
    }

    return lookup;
  }, {});
  const assignedSales = project.assignedSalesId ? teamById[project.assignedSalesId] : null;
  const assignedDesigner = project.assignedDesignerId ? teamById[project.assignedDesignerId] : null;
  const projectInfo = [
    ['Business Type', project.businessType],
    ['Total Area', formatArea(project.totalAreaSqm)],
    ['Number of Floors', formatNumber(project.numberOfFloors)],
    ['Target Completion', formatDateOnly(project.targetCompletionDate)],
    ['Budget Range', formatBudgetRange(project.budgetMin, project.budgetMax)],
  ].filter(([, value]) => Boolean(value));

  const textBlocks = [
    ['Project Address', project.projectAddress],
    ['Business Purpose', project.businessPurpose],
    ['Furniture Requirements', project.furnitureRequirement],
    ['Description', project.description],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="project-detail-overview project-detail-tab-panel">
      <section className="project-detail-card project-detail-information-card">
        <header>
          <h3>Project Information</h3>
        </header>

        {projectInfo.length > 0 ? (
          <div className="project-detail-info-grid">
            {projectInfo.map(([label, value]) => (
              <div key={label} className="project-detail-info-item">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {textBlocks.length > 0 ? <div className="project-detail-section-divider" /> : null}

        {textBlocks.map(([label, value]) => (
          <div key={label} className="project-detail-text-block">
            <span>{label}</span>
            <p>{value}</p>
          </div>
        ))}
      </section>

      {showAssignedTeam ? (
        <section className="project-detail-card project-detail-team-card">
          <header>
            <h3>Assigned Team</h3>
            <p>Sales and designer currently connected to this project.</p>
          </header>

          <div className="project-detail-team-grid">
            <TeamMemberCard
              label="Assigned Sales"
              fallbackId={project.assignedSalesId}
              account={assignedSales}
              placeholder="Unassigned"
              avatarClassName=""
            />
            <TeamMemberCard
              label="Assigned Designer"
              fallbackId={project.assignedDesignerId}
              account={assignedDesigner}
              placeholder="Unassigned"
              avatarClassName="project-detail-team-avatar-designer"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

type TeamMemberCardProps = {
  label: string;
  fallbackId: string | null;
  account: AccountDto | null;
  placeholder: string;
  avatarClassName: string;
};

function TeamMemberCard({ label, fallbackId, account, placeholder, avatarClassName }: TeamMemberCardProps) {
  const displayName = account?.fullName ?? (fallbackId ? 'Loading account...' : placeholder);
  const roleName = account ? getAccountRoleName(account.roleId) : null;

  return (
    <article className="project-detail-team-member-card">
      <div className={`project-detail-team-avatar ${avatarClassName}`}>{getInitial(displayName)}</div>
      <div className="project-detail-team-copy">
        <span>{label}</span>
        <strong>{displayName}</strong>
        {account ? <em>{account.email}</em> : fallbackId ? <em>{fallbackId}</em> : <em>No account assigned yet</em>}
      </div>
      <div className="project-detail-team-meta">
        <span>Role</span>
        <strong>{roleName ?? '-'}</strong>
      </div>
      <div className="project-detail-team-meta">
        <span>Status</span>
        <strong>{account?.status ?? '-'}</strong>
      </div>
      <div className="project-detail-team-meta">
        <span>Phone</span>
        <strong>{account?.phone ?? '-'}</strong>
      </div>
    </article>
  );
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || '-';
}

function formatArea(value: number | null) {
  return typeof value === 'number' ? `${value} sqm` : null;
}

function formatNumber(value: number | null) {
  return typeof value === 'number' ? String(value) : null;
}

function formatDateOnly(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatBudgetRange(min: number | null, max: number | null) {
  if (typeof min !== 'number' && typeof max !== 'number') {
    return null;
  }

  const formatter = new Intl.NumberFormat('en');
  const minText = typeof min === 'number' ? formatter.format(min) : null;
  const maxText = typeof max === 'number' ? formatter.format(max) : null;

  if (minText && maxText) return `${minText} - ${maxText}`;
  return minText ?? maxText;
}
