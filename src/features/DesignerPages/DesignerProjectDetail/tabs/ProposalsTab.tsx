import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getProposalServiceResultMessage, type ProposalDto } from '@/services/api/proposals';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProposal, useCreateProposalScene, useProjectAreas, useProjectProposals, useProposalScenes, usePublishProposal } from '@/services/queries';

type ProposalsTabProps = {
  project: ProjectDto;
};

export function ProposalsTab({ project }: ProposalsTabProps) {
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

  function openLegacyProposalSetup() {
    navigate(`/designer/projects/${project.projectId}/proposals/legacy-new`);
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

  return (
    <section className="designer-card designer-project-table-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Proposals</h3>
          <p>{proposalsQuery.isLoading ? 'Loading proposals from backend...' : `${proposalsQuery.data?.total ?? proposals.length} proposal${(proposalsQuery.data?.total ?? proposals.length) === 1 ? '' : 's'} for this project.`}</p>
        </div>
        <div className="designer-project-table-actions">
          <button
            className="designer-project-detail-button"
            disabled={!canCreateProposal}
            type="button"
            onClick={openLegacyProposalSetup}
          >
            Legacy Setup
          </button>
          <button
            className="designer-project-detail-button designer-project-detail-button-primary"
            disabled={!canCreateProposal || areasQuery.isLoading}
            type="button"
            onClick={openProposalSetup}
          >
            Set Up Proposal
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
          {message}
        </p>
      ) : null}
      {!canCreateProposal ? (
        <p className="designer-project-file-message">Move this project to Proposal Consulting before creating a new proposal.</p>
      ) : null}
      {proposalsQuery.isError ? <p className="designer-project-file-message designer-project-file-error">{getProposalServiceResultMessage(proposalsQuery.error)}</p> : null}

      <div className="designer-project-table-scroll">
        <table className="designer-project-table">
          <thead>
            <tr>
              {['Proposal', 'Version', 'Status', 'Scenes', 'Published', 'Updated', 'Action'].map((head) => (
                <th key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposalsQuery.isLoading ? (
              <tr>
                <td colSpan={7}>Loading proposals...</td>
              </tr>
            ) : null}

            {!proposalsQuery.isLoading && proposals.length === 0 ? (
              <tr>
                <td colSpan={7}>No proposals found for this project.</td>
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

function ProposalRow({ proposal, onOpenDetail, onPublish, publishDisabled }: ProposalRowProps) {
  const scenesQuery = useProposalScenes({
    proposalId: proposal.proposalId,
    isActive: true,
    page: 1,
    limit: 20,
  });
  const scenes = scenesQuery.data?.items ?? [];
  const primaryScene = scenes[0] ?? null;
  const canPublish = proposal.status === 'DRAFT' && Boolean(primaryScene);
  const visibilityLabel = isCustomerVisibleProposal(proposal.status) ? 'Customer visible' : 'Hidden draft';

  return (
    <tr>
      <td>
        <strong>{proposal.proposalName}</strong>
        <span>{proposal.proposalId}</span>
      </td>
      <td>v{proposal.versionNo}</td>
      <td>
        <span className={`designer-project-status designer-project-status-${getProposalStatusTone(proposal.status)}`}>{formatEnumLabel(proposal.status)}</span>
        <small className="designer-project-proposal-visibility">{visibilityLabel}</small>
      </td>
      <td>
        {scenesQuery.isLoading ? 'Loading scenes...' : `${scenesQuery.data?.total ?? scenes.length} scene${(scenesQuery.data?.total ?? scenes.length) === 1 ? '' : 's'}`}
      </td>
      <td>{proposal.publishedAt ? formatDateTime(proposal.publishedAt) : '-'}</td>
      <td>{formatDateTime(proposal.updatedAt)}</td>
      <td>
        <div className="designer-project-table-actions">
          <button className="designer-project-table-open" type="button" onClick={onOpenDetail}>
            Open Detail
          </button>
          {proposal.status === 'DRAFT' ? (
            <button
              className="designer-project-table-publish"
              disabled={!canPublish || publishDisabled || scenesQuery.isLoading}
              title={canPublish ? 'Publish this proposal so the customer can review it.' : 'Create at least one active scene before publishing.'}
              type="button"
              onClick={() => void onPublish()}
            >
              {publishDisabled ? 'Publishing...' : 'Publish to Customer'}
            </button>
          ) : (
            <button type="button" disabled title="Published proposals are customer-visible and locked for editing.">
              Customer Visible
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateProposalModal({
  areaCount,
  draft,
  isCreating,
  onClose,
  onDraftChange,
  onSubmit,
}: {
  areaCount: number;
  draft: { description: string; proposalName: string };
  isCreating: boolean;
  onClose: () => void;
  onDraftChange: (draft: { description: string; proposalName: string }) => void;
  onSubmit: () => void;
}) {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
