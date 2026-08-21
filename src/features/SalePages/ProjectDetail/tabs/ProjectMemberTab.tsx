import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';

import { getAccountById, getAccountRoleName, type AccountDto } from '@/services/api';
import { getAccountServiceResultMessage } from '@/services/api/accounts';
import { getProjectServiceResultMessage, type ProjectSpaceDataStatus } from '@/services/api/projects';
import {
  useAssignDesignerToProject,
  useAvailableDesigners,
  useProjectPhaseDeadlines,
  useProjectStartFeeStatus,
  useUpdateProjectPhaseDeadlines,
} from '@/services/queries';

import type { ProjectDetailProject } from '../ProjectDetail';

type ProjectMemberTabProps = {
  project: ProjectDetailProject;
  canManageAssignment?: boolean;
};

export function ProjectMemberTab({ project, canManageAssignment = false }: ProjectMemberTabProps) {
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState(project.assignedDesignerId ?? '');
  const accountIds = [project.customerId, project.assignedSalesId, project.assignedDesignerId].filter((accountId): accountId is string => Boolean(accountId));
  const accountQueries = useQueries({
    queries: accountIds.map((accountId) => ({
      queryKey: ['accounts', 'detail', accountId],
      queryFn: () => getAccountById(accountId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const accountById = accountQueries.reduce<Record<string, AccountDto>>((lookup, query, index) => {
    const account = query.data;

    if (account) {
      lookup[accountIds[index]] = account;
    }

    return lookup;
  }, {});
  const customer = accountById[project.customerId] ?? null;
  const assignedSales = project.assignedSalesId ? accountById[project.assignedSalesId] ?? null : null;
  const assignedDesigner = project.assignedDesignerId ? accountById[project.assignedDesignerId] ?? null : null;
  const isLoadingMembers = accountQueries.some((query) => query.isLoading);
  const hasMemberLoadError = accountQueries.some((query) => query.isError);
  const availableDesignersQuery = useAvailableDesigners(
    { page: 1, pageSize: 100 },
    { enabled: canManageAssignment && !project.assignedDesignerId },
  );
  const assignDesignerMutation = useAssignDesignerToProject();
  const startFeeStatusQuery = useProjectStartFeeStatus(project.projectId, {
    enabled: canManageAssignment && !project.assignedDesignerId,
  });
  const startFeeStatus = startFeeStatusQuery.data;
  const isStartFeeChecking = canManageAssignment && !project.assignedDesignerId && startFeeStatusQuery.isLoading;
  const isStartFeeBlocking = Boolean(startFeeStatus?.requiresProjectStartFee && !startFeeStatus.isEligibleForDesignerAssignment);
  const canShowDesignerAssignment = canManageAssignment && !project.assignedDesignerId && !isStartFeeChecking && !isStartFeeBlocking;
  const availableDesigners = useMemo(
    () => availableDesignersQuery.data?.items ?? [],
    [availableDesignersQuery.data?.items],
  );
  const selectedDesigner = useMemo(
    () => availableDesigners.find((designer) => designer.accountId === selectedDesignerId) ?? null,
    [availableDesigners, selectedDesignerId],
  );

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
        note: 'Designer assigned from project members.',
      });
      setAssignmentMessage('Designer assigned successfully.');
      setIsDeadlineModalOpen(true);
    } catch (error) {
      setAssignmentMessage(getProjectServiceResultMessage(error));
    }
  }

  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-member-card">
      <header>
        <h3>Project Members</h3>
        <p>Customer, sales, and designer ownership for this project.</p>
      </header>

      {isLoadingMembers ? <p className="project-detail-muted">Loading project members...</p> : null}
      {hasMemberLoadError ? <p className="project-detail-api-note">Some account details could not be loaded. Showing assigned ids where available.</p> : null}

      <div className="project-detail-member-grid">
        <ProjectMemberCard label="Customer" fallbackId={project.customerId} account={customer} placeholder="Customer unavailable" />
        <ProjectMemberCard label="Sales" fallbackId={project.assignedSalesId} account={assignedSales} placeholder="Unassigned" />
        <ProjectMemberCard
          label="Designer"
          fallbackId={project.assignedDesignerId}
          account={assignedDesigner}
          placeholder="Unassigned"
          avatarClassName="project-detail-team-avatar-designer"
        />
      </div>

      {canManageAssignment && !project.assignedDesignerId ? <div className="project-detail-section-divider" /> : null}
      {isStartFeeChecking ? <p className="project-detail-muted">Checking project start fee status...</p> : null}

      {canShowDesignerAssignment ? (
        <form className="project-detail-designer-assignment project-detail-member-assignment" onSubmit={handleAssignDesigner}>
          <div className="project-detail-designer-form">
            <h4>Assignment Details</h4>
            <p className="project-detail-designer-selected">
              Selected: {selectedDesigner?.fullName ?? 'Choose a designer from the list'}
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
      {isDeadlineModalOpen ? (
        <PhaseDeadlineModal
          projectId={project.projectId}
          onClose={() => setIsDeadlineModalOpen(false)}
          onSaved={() => {
            setAssignmentMessage('Designer assigned and phase deadlines saved.');
            setIsDeadlineModalOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function PhaseDeadlineModal({
  onClose,
  onSaved,
  projectId,
}: {
  onClose: () => void;
  onSaved: () => void;
  projectId: string;
}) {
  const deadlinesQuery = useProjectPhaseDeadlines(projectId, { enabled: true });
  const updateDeadlinesMutation = useUpdateProjectPhaseDeadlines();
  const [proposalDueDate, setProposalDueDate] = useState('');
  const [productionDueDate, setProductionDueDate] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const targetCompletionDate = toDateInputValue(deadlinesQuery.data?.targetCompletionDate);

  useEffect(() => {
    const proposalDeadline = deadlinesQuery.data?.deadlines.find((deadline) => deadline.phase === 'PROPOSAL');
    const productionDeadline = deadlinesQuery.data?.deadlines.find((deadline) => deadline.phase === 'PRODUCTION');

    setProposalDueDate(toDateInputValue(proposalDeadline?.dueDate));
    setProductionDueDate(toDateInputValue(productionDeadline?.dueDate));
  }, [deadlinesQuery.data]);

  async function saveDeadlines(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage('');

    if (proposalDueDate && productionDueDate && proposalDueDate > productionDueDate) {
      setFormMessage('Proposal due date cannot be after production due date.');
      return;
    }

    if (targetCompletionDate && proposalDueDate && proposalDueDate > targetCompletionDate) {
      setFormMessage('Proposal due date cannot be after target completion date.');
      return;
    }

    if (targetCompletionDate && productionDueDate && productionDueDate > targetCompletionDate) {
      setFormMessage('Production due date cannot be after target completion date.');
      return;
    }

    try {
      await updateDeadlinesMutation.mutateAsync({
        projectId,
        productionDueDate: productionDueDate || null,
        proposalDueDate: proposalDueDate || null,
      });
      onSaved();
    } catch (error) {
      setFormMessage(getProjectServiceResultMessage(error));
    }
  }

  return (
    <div className="project-detail-modal-backdrop" role="presentation">
      <form className="project-detail-phase-deadline-modal" onSubmit={saveDeadlines}>
        <header>
          <div>
            <h3>Plan Phase Deadlines</h3>
            <p>Set proposal and production due dates after assigning the designer.</p>
          </div>
          <button aria-label="Close deadline planner" type="button" onClick={onClose}>x</button>
        </header>

        {deadlinesQuery.isLoading ? <p className="project-detail-muted">Loading current deadlines...</p> : null}
        {deadlinesQuery.isError ? <p className="project-detail-form-message project-detail-form-message-error">{getProjectServiceResultMessage(deadlinesQuery.error)}</p> : null}

        <div className="project-detail-phase-deadline-grid">
          <label>
            <span>Proposal due date</span>
            <input
              max={productionDueDate || targetCompletionDate || undefined}
              type="date"
              value={proposalDueDate}
              onChange={(event) => {
                setProposalDueDate(event.target.value);
                setFormMessage('');
              }}
            />
          </label>
          <label>
            <span>Production due date</span>
            <input
              max={targetCompletionDate || undefined}
              min={proposalDueDate || undefined}
              type="date"
              value={productionDueDate}
              onChange={(event) => {
                setProductionDueDate(event.target.value);
                setFormMessage('');
              }}
            />
          </label>
        </div>

        <div className="project-detail-phase-deadline-status">
          <DeadlineStatus label="Proposal" status={getDeadlineStatus(deadlinesQuery.data, 'PROPOSAL')} />
          <DeadlineStatus label="Production" status={getDeadlineStatus(deadlinesQuery.data, 'PRODUCTION')} />
          <DeadlineStatus label="Target" status={targetCompletionDate || '-'} />
        </div>

        {formMessage ? <p className="project-detail-form-message project-detail-form-message-error">{formMessage}</p> : null}

        <footer>
          <button className="project-detail-secondary-button" disabled={updateDeadlinesMutation.isPending} type="button" onClick={onClose}>
            Skip
          </button>
          <button className="project-detail-primary-button" disabled={deadlinesQuery.isLoading || updateDeadlinesMutation.isPending} type="submit">
            {updateDeadlinesMutation.isPending ? 'Saving...' : 'Save Deadlines'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DeadlineStatus({ label, status }: { label: string; status: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{status}</strong>
    </div>
  );
}

function getDeadlineStatus(
  data: ReturnType<typeof useProjectPhaseDeadlines>['data'],
  phase: 'PROPOSAL' | 'PRODUCTION',
) {
  const deadline = data?.deadlines.find((item) => item.phase === phase);

  return deadline?.status ? formatEnumLabel(deadline.status) : '-';
}

type ProjectMemberCardProps = {
  label: string;
  fallbackId: string | null;
  account: AccountDto | null;
  placeholder: string;
  avatarClassName?: string;
};

function ProjectMemberCard({ label, fallbackId, account, placeholder, avatarClassName = '' }: ProjectMemberCardProps) {
  const displayName = account?.fullName ?? (fallbackId ? 'Loading account...' : placeholder);
  const roleName = account ? getAccountRoleName(account.roleId) : label;

  return (
    <article className="project-detail-team-member-card project-detail-project-member-card">
      <div className={`project-detail-team-avatar ${avatarClassName}`}>{account?.avatarUrl ? <img src={account.avatarUrl} alt="" /> : getInitial(displayName)}</div>
      <div className="project-detail-team-copy">
        <span>{label}</span>
        <strong>{displayName}</strong>
        {account ? <em>{account.email}</em> : fallbackId ? <em>{fallbackId}</em> : <em>No account assigned yet</em>}
      </div>
      <div className="project-detail-member-meta-row">
        <div className="project-detail-team-meta">
          <span>Role</span>
          <strong>{roleName}</strong>
        </div>
        <div className="project-detail-team-meta">
          <span>Status</span>
          <strong>{account?.status ?? '-'}</strong>
        </div>
        <div className="project-detail-team-meta">
          <span>Phone</span>
          <strong>{account?.phone ?? '-'}</strong>
        </div>
      </div>
    </article>
  );
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || '-';
}

function toDateInputValue(value?: string | null) {
  return value?.slice(0, 10) ?? '';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
