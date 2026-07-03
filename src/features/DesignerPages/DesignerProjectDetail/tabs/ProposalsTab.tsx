import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getProposalServiceResultMessage, type ProposalDto, type ProposalSceneDto } from '@/services/api/proposals';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProposal, useCreateProposalScene, useProjectProposals, useProposalScenes } from '@/services/queries';

type ProposalsTabProps = {
  project: ProjectDto;
};

export function ProposalsTab({ project }: ProposalsTabProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const createProposalMutation = useCreateProposal();
  const createProposalSceneMutation = useCreateProposalScene();
  const proposalsQuery = useProjectProposals({
    projectId: project.projectId,
    page: 1,
    limit: 20,
  });
  const proposals = proposalsQuery.data?.items ?? [];

  async function createProposalAndScene() {
    setMessage('');

    try {
      const proposal = await createProposalMutation.mutateAsync({
        projectId: project.projectId,
        proposalName: `${project.projectName} 3D Proposal`,
        description: 'Created from designer Room Planner.',
      });
      const scene = await createProposalSceneMutation.mutateAsync({
        proposalId: proposal.proposalId,
        sceneName: `${project.projectName} 3D Scene`,
        sceneType: 'THREE_D',
      });

      openScene(scene, proposal.proposalId);
    } catch (error) {
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

  return (
    <section className="designer-card designer-project-table-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Proposals</h3>
          <p>{proposalsQuery.isLoading ? 'Loading proposals from backend...' : `${proposalsQuery.data?.total ?? proposals.length} proposal${(proposalsQuery.data?.total ?? proposals.length) === 1 ? '' : 's'} for this project.`}</p>
        </div>
        <button
          className="designer-project-detail-button designer-project-detail-button-primary"
          disabled={project.status !== 'PROPOSAL_DRAFTING' || createProposalMutation.isPending || createProposalSceneMutation.isPending}
          type="button"
          onClick={() => void createProposalAndScene()}
        >
          {createProposalMutation.isPending || createProposalSceneMutation.isPending ? 'Creating...' : 'Create Proposal'}
        </button>
      </div>

      {message ? <p className="designer-project-file-message designer-project-file-error">{message}</p> : null}
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
                onCreateScene={async () => {
                  setMessage('');

                  try {
                    const scene = await createProposalSceneMutation.mutateAsync({
                      proposalId: proposal.proposalId,
                      sceneName: `${proposal.proposalName} 3D Scene`,
                      sceneType: 'THREE_D',
                    });

                    openScene(scene, proposal.proposalId);
                  } catch (error) {
                    setMessage(getProposalServiceResultMessage(error));
                  }
                }}
                onOpenScene={(scene) => openScene(scene, proposal.proposalId)}
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
};

function ProposalRow({ proposal, onCreateScene, onOpenScene }: ProposalRowProps) {
  const scenesQuery = useProposalScenes({
    proposalId: proposal.proposalId,
    sceneType: 'THREE_D',
    isActive: true,
    page: 1,
    limit: 20,
  });
  const scenes = scenesQuery.data?.items ?? [];
  const primaryScene = scenes[0] ?? null;

  return (
    <tr>
      <td>
        <strong>{proposal.proposalName}</strong>
        <span>{proposal.proposalId}</span>
      </td>
      <td>v{proposal.versionNo}</td>
      <td><span className={`designer-project-status designer-project-status-${getProposalStatusTone(proposal.status)}`}>{formatEnumLabel(proposal.status)}</span></td>
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
              Create Scene
            </button>
          )}
          <button type="button" disabled>{proposal.status === 'DRAFT' ? 'Draft' : 'Locked'}</button>
        </div>
      </td>
    </tr>
  );
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
