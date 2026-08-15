import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconCircleCheck,
  IconInfoCircle,
  IconLock,
  IconPlus,
  IconSend,
  IconStack2,
} from '@tabler/icons-react';

import { getProposalServiceResultMessage, type ProposalDto } from '@/services/api/proposals';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProposal, useCreateProposalScene, useProjectAreas, useProjectProposals, useProposalScenes, usePublishProposal } from '@/services/queries';

type ProposalsTabProps = {
  project: ProjectDto;
};

export function ProposalsTab({ project }: Readonly<ProposalsTabProps>) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');
  const [publishingProposalId, setPublishingProposalId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [proposalDraft, setProposalDraft] = useState({ description: '', proposalName: '' });
  const createProposalMutation = useCreateProposal();
  const createSceneMutation = useCreateProposalScene();
  const publishProposalMutation = usePublishProposal();
  const areasQuery = useProjectAreas({
    projectId: project.projectId,
    includeCancelled: false,
  });
  const proposalsQuery = useProjectProposals({
    projectId: project.projectId,
    page: 1,
    limit: 20,
  });
  const proposals = proposalsQuery.data?.items ?? [];
  const areas = areasQuery.data ?? [];
  const canCreateProposal = isProposalDraftingStatus(project.status);

  function openProposalSetup() {
    setMessage('');
    setMessageTone('error');
    setProposalDraft({ description: '', proposalName: '' });
    setIsCreateModalOpen(true);
  }

  async function createRoomPlannerProposal() {
    const proposalName = proposalDraft.proposalName.trim();
    const description = proposalDraft.description.trim();
    const projectAreaIds = areas
      .filter((area) => area.status !== 'CANCELLED')
      .map((area) => area.projectAreaId);

    setMessage('');
    setMessageTone('error');

    if (!proposalName) {
      setMessage('Proposal name is required.');
      return;
    }

    if (!description) {
      setMessage('Proposal description is required.');
      return;
    }

    if (projectAreaIds.length === 0) {
      setMessage('Create at least one project area first. Each area will become a floor in the new room planner scene.');
      return;
    }

    try {
      const createdProposal = await createProposalMutation.mutateAsync({
        projectId: project.projectId,
        proposalName,
        description,
      });

      const createdScene = await createSceneMutation.mutateAsync({
        proposalId: createdProposal.proposalId,
        sceneName: `${proposalName} Room Planner`,
        sceneType: 'ROOM_PLANNER',
        projectAreaIds,
      });

      setIsCreateModalOpen(false);
      setProposalDraft({ description: '', proposalName: '' });
      setMessageTone('success');
      setMessage(`Created ${createdProposal.proposalName} with a room planner scene across ${projectAreaIds.length} floor${projectAreaIds.length === 1 ? '' : 's'}.`);
      navigate(`/designer/projects/${project.projectId}/proposals/${createdProposal.proposalId}`, {
        state: { createdSceneId: createdScene.sceneId },
      });
    } catch (error) {
      setMessageTone('error');
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function publishProposal(proposal: ProposalDto) {
    setMessage('');
    setMessageTone('error');
    setPublishingProposalId(proposal.proposalId);

    try {
      await publishProposalMutation.mutateAsync({
        proposalId: proposal.proposalId,
        note: 'Published by designer from assigned project proposal list.',
      });
      setMessageTone('success');
      setMessage(`${proposal.proposalName} is now visible to the customer.`);
    } catch (error) {
      setMessageTone('error');
      setMessage(getProposalServiceResultMessage(error));
    } finally {
      setPublishingProposalId(null);
    }
  }

  const proposalTotal = proposalsQuery.data?.total ?? proposals.length;

  return (
    <section className="designer-card designer-project-table-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>
            Proposals
            {!proposalsQuery.isLoading ? <span className="designer-proposal-count">{proposalTotal}</span> : null}
          </h3>
          <p>
            {proposalsQuery.isLoading
              ? 'Loading proposals from backend...'
              : `${pluralize(proposalTotal, 'proposal')} for this project.`}
          </p>
        </div>
        <div className="designer-project-table-actions">
          <button
            className="designer-project-detail-button designer-project-detail-button-primary designer-project-proposal-setup-button"
            disabled={!canCreateProposal || areasQuery.isLoading}
            title={canCreateProposal ? undefined : 'Available once the project reaches Proposal Consulting.'}
            type="button"
            onClick={openProposalSetup}
          >
            <IconPlus size={17} stroke={2.2} />
            Set Up Room Planner Proposal
          </button>
        </div>
      </div>

      {isCreateModalOpen ? (
        <CreateProposalModal
          areaCount={areas.length}
          draft={proposalDraft}
          isCreating={createProposalMutation.isPending || createSceneMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onDraftChange={setProposalDraft}
          onSubmit={() => void createRoomPlannerProposal()}
        />
      ) : null}

      {message ? (
        <p className={`designer-project-file-message ${messageTone === 'success' ? 'designer-project-message-success' : 'designer-project-file-error'}`}>
          {messageTone === 'success' ? <IconCircleCheck size={17} /> : <IconAlertCircle size={17} />}
          {message}
        </p>
      ) : null}
      {!canCreateProposal ? (
        <p className="designer-project-file-message">
          <IconInfoCircle size={17} />
          Move this project to Proposal Consulting before creating a new proposal.
        </p>
      ) : null}
      {proposalsQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">
          <IconAlertCircle size={17} />
          {getProposalServiceResultMessage(proposalsQuery.error)}
        </p>
      ) : null}

      <div className="designer-project-table-scroll">
        <table className="designer-project-table">
          <thead>
            <tr>
              {['Proposal', 'Version', 'Status', 'Scenes', 'Published', 'Updated', 'Action'].map((head) => (
                <th className={head === 'Status' ? 'designer-proposal-status-cell' : undefined} key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposalsQuery.isLoading ? (
              <tr>
                <td className="designer-proposal-table-state" colSpan={7}>
                  Loading proposals...
                </td>
              </tr>
            ) : null}

            {!proposalsQuery.isLoading && proposals.length === 0 ? (
              <tr>
                <td className="designer-proposal-table-state" colSpan={7}>
                  <IconStack2 size={22} stroke={1.6} />
                  <strong>No proposals yet</strong>
                  <span>Set up a room planner proposal to start designing for this project.</span>
                </td>
              </tr>
            ) : null}

            {proposals.map((proposal) => (
              <ProposalRow
                key={proposal.proposalId}
                proposal={proposal}
                onOpenDetail={() => navigate(`/designer/projects/${project.projectId}/proposals/${proposal.proposalId}`)}
                onPublish={() => publishProposal(proposal)}
                publishDisabled={publishingProposalId === proposal.proposalId || publishProposalMutation.isPending}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type ProposalRowProps = {
  proposal: ProposalDto;
  onOpenDetail: () => void;
  onPublish: () => void | Promise<void>;
  publishDisabled: boolean;
};

function ProposalRow({ proposal, onOpenDetail, onPublish, publishDisabled }: Readonly<ProposalRowProps>) {
  const scenesQuery = useProposalScenes({
    proposalId: proposal.proposalId,
    isActive: true,
    page: 1,
    limit: 20,
  });
  const scenes = scenesQuery.data?.items ?? [];
  const primaryScene = scenes[0] ?? null;
  const canPublish = proposal.status === 'DRAFT' && Boolean(primaryScene);
  const isCustomerVisible = isCustomerVisibleProposal(proposal.status);
  const sceneCount = scenesQuery.data?.total ?? scenes.length;

  return (
    <tr>
      <td>
        <strong>{proposal.proposalName}</strong>
        <span className="designer-proposal-id" title={proposal.proposalId}>
          {proposal.proposalId}
        </span>
      </td>
      <td>
        <span className="designer-proposal-version">v{proposal.versionNo}</span>
      </td>
      <td className="designer-proposal-status-cell">
        <div className="designer-proposal-status-stack">
          <span className={`designer-project-status designer-project-status-${getProposalStatusTone(proposal.status)}`}>{formatEnumLabel(proposal.status)}</span>
          <small className={`designer-project-proposal-visibility ${isCustomerVisible ? 'is-visible' : ''}`}>
            {isCustomerVisible ? 'Customer visible' : 'Hidden draft'}
          </small>
        </div>
      </td>
      <td>
        <span className="designer-proposal-scenes">
          <IconStack2 size={13} stroke={1.9} />
          {scenesQuery.isLoading ? 'Loading...' : pluralize(sceneCount, 'scene')}
        </span>
      </td>
      <td>{proposal.publishedAt ? <DateStamp value={proposal.publishedAt} /> : <span className="designer-proposal-empty-value">Not published</span>}</td>
      <td>
        <DateStamp value={proposal.updatedAt} />
      </td>
      <td>
        <div className="designer-project-table-actions">
          <button className="designer-project-table-open" type="button" onClick={onOpenDetail}>
            Open Detail
            <IconArrowUpRight size={14} stroke={2.1} />
          </button>
          {proposal.status === 'DRAFT' ? (
            <button
              className="designer-project-table-publish"
              disabled={!canPublish || publishDisabled || scenesQuery.isLoading}
              title={canPublish ? 'Publish this proposal so the customer can review it.' : 'Create at least one active scene before publishing.'}
              type="button"
              onClick={() => void onPublish()}
            >
              <IconSend size={14} stroke={1.9} />
              {publishDisabled ? 'Publishing...' : 'Publish to Customer'}
            </button>
          ) : (
            <button
              className="designer-project-table-locked"
              type="button"
              disabled
              title="Published proposals are customer-visible and locked for editing."
            >
              <IconLock size={14} stroke={1.9} />
              Customer Visible
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DateStamp({ value }: Readonly<{ value: string }>) {
  return (
    <span className="designer-proposal-datestamp">
      <strong>{formatDatePart(value)}</strong>
      <em>{formatTimePart(value)}</em>
    </span>
  );
}

function CreateProposalModal({
  areaCount,
  draft,
  isCreating,
  onClose,
  onDraftChange,
  onSubmit,
}: Readonly<{
  areaCount: number;
  draft: { description: string; proposalName: string };
  isCreating: boolean;
  onClose: () => void;
  onDraftChange: (draft: { description: string; proposalName: string }) => void;
  onSubmit: () => void;
}>) {
  function updateDraft(field: keyof typeof draft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <div className="designer-project-modal-backdrop">
      <section className="designer-project-modal" role="dialog" aria-modal="true" aria-labelledby="designer-create-proposal-title">
        <header>
          <div>
            <h3 id="designer-create-proposal-title">Create Room Planner Proposal</h3>
            <p>{areaCount} project area{areaCount === 1 ? '' : 's'} will be attached to the new scene as floors.</p>
          </div>
          <button className="designer-project-modal-close" type="button" aria-label="Close create proposal modal" onClick={onClose}>
            X
          </button>
        </header>
        <div className="designer-project-modal-form">
          <label>
            <span>Name</span>
            <input
              autoFocus
              placeholder="Enter proposal name"
              value={draft.proposalName}
              onChange={(event) => updateDraft('proposalName', event.target.value)}
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              placeholder="Enter proposal description"
              value={draft.description}
              onChange={(event) => updateDraft('description', event.target.value)}
            />
          </label>
        </div>
        <footer>
          <button className="designer-project-detail-button" disabled={isCreating} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="designer-project-detail-button designer-project-detail-button-primary"
            disabled={isCreating || !draft.proposalName.trim() || !draft.description.trim() || areaCount === 0}
            type="button"
            onClick={onSubmit}
          >
            {isCreating ? 'Creating...' : 'Create Proposal & Scene'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function isCustomerVisibleProposal(status: string) {
  return ['PUBLISHED', 'SELECTED', 'REVISION_REQUESTED', 'REJECTED'].includes(status);
}

function isProposalDraftingStatus(status: string) {
  return normalizeStatus(status) === 'PROPOSAL_CONSULTING';
}

function normalizeStatus(status: string) {
  return status.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function getProposalStatusTone(status: string) {
  if (status === 'DRAFT') return 'draft';
  if (status === 'PUBLISHED') return 'design';
  if (status === 'SELECTED') return 'reviewed';
  if (status === 'REVISION_REQUESTED') return 'pending';

  return 'missing';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function formatDatePart(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTimePart(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
