import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getProposalServiceResultMessage, type ProposalDto, type ProposalSceneDto } from '@/services/api/proposals';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProposal, useProjectProposals, useProposalScenes, usePublishProposal } from '@/services/queries';

type ProposalsTabProps = {
  project: ProjectDto;
};

export function ProposalsTab({ project }: ProposalsTabProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');
  const [publishingProposalId, setPublishingProposalId] = useState<string | null>(null);
  const createProposalMutation = useCreateProposal();
  const publishProposalMutation = usePublishProposal();
  const proposalsQuery = useProjectProposals({
    projectId: project.projectId,
    page: 1,
    limit: 20,
  });
  const proposals = proposalsQuery.data?.items ?? [];

  async function createProposal() {
    setMessage('');
    setMessageTone('error');

    try {
      const proposal = await createProposalMutation.mutateAsync({
        projectId: project.projectId,
        proposalName: `${project.projectName} 3D Proposal`,
        description: 'Created from designer proposal workspace.',
      });

      navigate(`/designer/projects/${project.projectId}/proposals/${proposal.proposalId}`);
    } catch (error) {
      setMessageTone('error');
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  function openScene(scene: ProposalSceneDto, proposalId: string) {
    navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
        projectId: project.projectId,
        proposalId,
        returnTo: `/designer/assigned-projects/${project.projectId}`,
      },
    });
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
        <button
          className="designer-project-detail-button designer-project-detail-button-primary"
          disabled={project.status !== 'PROPOSAL_DRAFTING' || createProposalMutation.isPending}
          type="button"
          onClick={() => void createProposal()}
        >
          {createProposalMutation.isPending ? 'Creating...' : 'Create Proposal'}
        </button>
      </div>

      {message ? (
        <p className={`designer-project-file-message ${messageTone === 'success' ? 'designer-project-message-success' : 'designer-project-file-error'}`}>
          {message}
        </p>
      ) : null}
      {project.status !== 'PROPOSAL_DRAFTING' ? (
        <p className="designer-project-file-message">Move this project to Proposal Drafting before creating a new proposal.</p>
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
                onCreateScene={async () => navigate(`/designer/projects/${project.projectId}/proposals/${proposal.proposalId}`)}
                onOpenScene={(scene) => openScene(scene, proposal.proposalId)}
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
  onCreateScene: () => Promise<void>;
  onOpenScene: (scene: ProposalSceneDto) => void;
  onPublish: () => void | Promise<void>;
  publishDisabled: boolean;
};

function ProposalRow({ proposal, onCreateScene, onOpenScene, onPublish, publishDisabled }: ProposalRowProps) {
  const scenesQuery = useProposalScenes({
    proposalId: proposal.proposalId,
    sceneType: 'THREE_D',
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
          {primaryScene ? (
            <button className="designer-project-table-open" type="button" onClick={() => onOpenScene(primaryScene)}>
              Open 3D Scene
            </button>
          ) : (
            <button className="designer-project-table-open" disabled={proposal.status !== 'DRAFT'} type="button" onClick={() => void onCreateScene()}>
              Open Workspace
            </button>
          )}
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

function isCustomerVisibleProposal(status: string) {
  return ['PUBLISHED', 'VIEWED', 'SELECTED', 'REVISION_REQUESTED'].includes(status);
}

function getProposalStatusTone(status: string) {
  if (status === 'DRAFT') return 'draft';
  if (status === 'PUBLISHED' || status === 'VIEWED') return 'design';
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
