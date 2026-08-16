import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';

import { getAccountById, getAccountRoleName, type AccountDto } from '@/services/api';
import { getAccountServiceResultMessage } from '@/services/api/accounts';
import { getProjectServiceResultMessage, type ProjectSpaceDataStatus } from '@/services/api/projects';
import {
  useAssignDesignerToProject,
  useAvailableDesigners,
  useProjectStartFeeStatus,
} from '@/services/queries';

import type { ProjectDetailProject } from '../ProjectDetail';

type OverviewTabProps = {
  project: ProjectDetailProject;
  showAssignedTeam?: boolean;
};

export function OverviewTab({ project, showAssignedTeam = false }: OverviewTabProps) {
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [selectedDesignerId, setSelectedDesignerId] = useState(project.assignedDesignerId ?? '');
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
  const availableDesignersQuery = useAvailableDesigners(
    { page: 1, pageSize: 100 },
    { enabled: showAssignedTeam && !project.assignedDesignerId },
  );
  const assignDesignerMutation = useAssignDesignerToProject();
  const startFeeStatusQuery = useProjectStartFeeStatus(project.projectId, {
    enabled: showAssignedTeam && !project.assignedDesignerId,
  });
  const startFeeStatus = startFeeStatusQuery.data;
  const isStartFeeChecking = showAssignedTeam && !project.assignedDesignerId && startFeeStatusQuery.isLoading;
  const isStartFeeBlocking = Boolean(startFeeStatus?.requiresProjectStartFee && !startFeeStatus.isEligibleForDesignerAssignment);
  const canShowDesignerAssignment = !project.assignedDesignerId && !isStartFeeChecking && !isStartFeeBlocking;
  const availableDesigners = useMemo(
    () => availableDesignersQuery.data?.items ?? [],
    [availableDesignersQuery.data?.items],
  );
  const selectedDesigner = useMemo(
    () => availableDesigners.find((designer) => designer.accountId === project.assignedDesignerId) ?? null,
    [availableDesigners, project.assignedDesignerId],
  );
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

  useEffect(() => {
    setSelectedDesignerId(project.assignedDesignerId ?? '');
  }, [project.assignedDesignerId]);

  async function handleAssignDesigner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssignmentMessage('');

    const formData = new FormData(event.currentTarget);
    const designerId = String(formData.get('designerId') ?? selectedDesignerId).trim();
    const spaceDataStatus = String(formData.get('spaceDataStatus') ?? 'INSUFFICIENT') as ProjectSpaceDataStatus;

    if (!designerId) {
      setAssignmentMessage('Please select an available designer.');
      return;
    }

    if (designerId === project.assignedDesignerId) {
      setAssignmentMessage('This designer is already assigned to the project.');
      return;
    }

    try {
      await assignDesignerMutation.mutateAsync({
        projectId: project.projectId,
        designerId,
        spaceDataStatus,
        note: 'Designer assigned from project overview.',
      });
      setAssignmentMessage('Designer assigned successfully.');
    } catch (error) {
      setAssignmentMessage(getProjectServiceResultMessage(error));
    }
  }

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
            <p>Sales, designer, and assignment tools for this project.</p>
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

          {!project.assignedDesignerId && (isStartFeeChecking || canShowDesignerAssignment) ? <div className="project-detail-section-divider" /> : null}


          {isStartFeeChecking ? <p className="project-detail-muted">Checking project start fee status...</p> : null}

          {canShowDesignerAssignment ? (
            <form className="project-detail-designer-assignment" onSubmit={handleAssignDesigner}>
            <div className="project-detail-designer-form">
              <h4>Assignment Details</h4>
              <p className="project-detail-designer-selected">
                Selected: {availableDesigners.find((designer) => designer.accountId === selectedDesignerId)?.fullName ?? assignedDesigner?.fullName ?? 'Choose a designer from the list below'}
              </p>

              <label>
                <span>Space Data Status</span>
                <select name="spaceDataStatus" defaultValue="INSUFFICIENT" disabled={assignDesignerMutation.isPending}>
                  <option value="INSUFFICIENT">Insufficient - needs measurement</option>
                  <option value="SUFFICIENT">Sufficient - ready for design review</option>
                </select>
              </label>

              {assignmentMessage ? (
                <p className={`project-detail-form-message ${assignmentMessage.toLowerCase().includes('success') || assignmentMessage.toLowerCase().includes('already') ? '' : 'project-detail-form-message-error'}`}>
                  {assignmentMessage}
                </p>
              ) : null}

              <button className="project-detail-primary-button" type="submit" disabled={availableDesignersQuery.isLoading || assignDesignerMutation.isPending}>
                {assignDesignerMutation.isPending ? 'Assigning designer...' : 'Assign Designer'}
              </button>
            </div>

            <div className="project-detail-designer-list">
              <div className="project-detail-designer-list-header">
                <div>
                  <h4>Available Designers</h4>
                  <p>{availableDesignersQuery.isLoading ? 'Loading available designers...' : `${availableDesigners.length} designer${availableDesigners.length === 1 ? '' : 's'} available`}</p>
                </div>
                {selectedDesigner ? <span>Current: {selectedDesigner.fullName}</span> : null}
              </div>

              {availableDesignersQuery.isError ? (
                <p className="project-detail-form-message project-detail-form-message-error">
                  {getAccountServiceResultMessage(availableDesignersQuery.error)}
                </p>
              ) : null}

              {availableDesignersQuery.isLoading ? <p className="project-detail-muted">Loading designers...</p> : null}
              {!availableDesignersQuery.isLoading && availableDesigners.length === 0 ? <p className="project-detail-muted">No available designers found.</p> : null}

              <div className="project-detail-designer-options">
                {availableDesigners.map((designer) => (
                  <label className={designer.accountId === selectedDesignerId ? 'project-detail-designer-option project-detail-designer-option-active' : 'project-detail-designer-option'} key={designer.accountId}>
                    <input
                      type="radio"
                      name="designerId"
                      value={designer.accountId}
                      checked={designer.accountId === selectedDesignerId}
                      disabled={assignDesignerMutation.isPending}
                      onChange={(event) => setSelectedDesignerId(event.currentTarget.value)}
                    />
                    <div className="project-detail-team-avatar project-detail-team-avatar-designer">{getInitial(designer.fullName)}</div>
                    <div>
                      <strong>{designer.fullName}</strong>
                      <span>{designer.email}</span>
                    </div>
                    <em>{designer.availableSlot}/{designer.maxActiveProjects} slots</em>
                  </label>
                ))}
              </div>
            </div>
            </form>
          ) : null}
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

