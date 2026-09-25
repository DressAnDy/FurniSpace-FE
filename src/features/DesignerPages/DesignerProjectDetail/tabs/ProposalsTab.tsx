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

import { useLang } from '@/app/providers/useLang';
import { designerCopy } from '@/features/DesignerPages/designercomponents';
import { getProposalServiceResultMessage, type ProposalDto } from '@/services/api/proposals';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProposal, useCreateProposalScene, useProjectAreas, useProjectProposals, useProposalScenes, usePublishProposal } from '@/services/queries';

type ProposalsTabProps = {
  project: ProjectDto;
};

export function ProposalsTab({ project }: Readonly<ProposalsTabProps>) {
  const { lang } = useLang();
  const t = designerCopy[lang].proposalsTab;
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
  const areas = getAreasByFloor(areasQuery.data ?? []);
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
      setMessage(t.errNameRequired);
      return;
    }

    if (!description) {
      setMessage(t.errDescRequired);
      return;
    }

    if (projectAreaIds.length === 0) {
      setMessage(t.errNeedAreas);
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
      setMessage(t.createSuccess(getDisplayText(createdProposal.proposalName, t.cols.proposal), projectAreaIds.length));
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
      setMessage(t.publishSuccess(getDisplayText(proposal.proposalName, t.cols.proposal)));
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
            {t.title}
            {!proposalsQuery.isLoading ? <span className="designer-proposal-count">{proposalTotal}</span> : null}
          </h3>
          <p>
            {proposalsQuery.isLoading
              ? t.loading
              : t.count(proposalTotal)}
          </p>
        </div>
        <div className="designer-project-table-actions">
          <button
            className="designer-project-detail-button designer-project-detail-button-primary designer-project-proposal-setup-button"
            disabled={!canCreateProposal || areasQuery.isLoading}
            title={canCreateProposal ? undefined : t.setupTooltip}
            type="button"
            onClick={openProposalSetup}
          >
            <IconPlus size={17} stroke={2.2} />
            {t.setupButton}
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
          t={t}
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
          {t.moveToConsulting}
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
              {[t.cols.proposal, t.cols.version, t.cols.status, t.cols.scenes, t.cols.published, t.cols.updated, t.cols.action].map((head) => (
                <th className={head === t.cols.status ? 'designer-proposal-status-cell' : undefined} key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposalsQuery.isLoading ? (
              <tr>
                <td className="designer-proposal-table-state" colSpan={7}>
                  {t.loadingTable}
                </td>
              </tr>
            ) : null}

            {!proposalsQuery.isLoading && proposals.length === 0 ? (
              <tr>
                <td className="designer-proposal-table-state" colSpan={7}>
                  <IconStack2 size={22} stroke={1.6} />
                  <strong>{t.empty}</strong>
                  <span>{t.emptyHint}</span>
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
                t={t}
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

function ProposalRow({
  proposal,
  onOpenDetail,
  onPublish,
  publishDisabled,
  t,
}: Readonly<ProposalRowProps & { t: typeof designerCopy.en.proposalsTab }>) {
  const scenesQuery = useProposalScenes({
    proposalId: proposal.proposalId,
    isActive: true,
    page: 1,
    limit: 20,
  });
  const scenes = scenesQuery.data?.items ?? [];
  const primaryScene = scenes[0] ?? null;
  const canPublish = isEditableProposalStatus(proposal.status) && Boolean(primaryScene);
  const sceneCount = scenesQuery.data?.total ?? scenes.length;

  return (
    <tr>
      <td>
        <strong>{getDisplayText(proposal.proposalName, t.cols.proposal)}</strong>
        {proposal.status === 'REVISION_REQUESTED' && proposal.revisionNote ? (
          <div className="designer-proposal-revision-note-inline">
            <span>{t.revisionNote}</span>
            <p>{proposal.revisionNote}</p>
          </div>
        ) : null}
      </td>
      <td>
        <span className="designer-proposal-version">v{proposal.versionNo}</span>
      </td>
      <td className="designer-proposal-status-cell">
        <div className="designer-proposal-status-stack">
          <span className={`designer-project-status designer-project-status-${getProposalStatusTone(proposal.status)}`}>{formatEnumLabel(proposal.status)}</span>
        </div>
      </td>
      <td>
        <span className="designer-proposal-scenes">
          <IconStack2 size={13} stroke={1.9} />
          {scenesQuery.isLoading ? t.loadingTable : t.scenes(sceneCount)}
        </span>
      </td>
      <td>{proposal.publishedAt ? <DateStamp value={proposal.publishedAt} /> : <span className="designer-proposal-empty-value">{t.notPublished}</span>}</td>
      <td>
        <DateStamp value={proposal.updatedAt} />
      </td>
      <td>
        <div className="designer-project-table-actions">
          <button className="designer-project-table-open" type="button" onClick={onOpenDetail}>
            {t.openDetail}
            <IconArrowUpRight size={14} stroke={2.1} />
          </button>
          {isEditableProposalStatus(proposal.status) ? (
            <button
              className="designer-project-table-publish"
              disabled={!canPublish || publishDisabled || scenesQuery.isLoading}
              title={canPublish ? t.publish : t.errNeedAreas}
              type="button"
              onClick={() => void onPublish()}
            >
              <IconSend size={14} stroke={1.9} />
              {publishDisabled ? t.publishing : t.publish}
            </button>
          ) : (
            <button
              className="designer-project-table-locked"
              type="button"
              disabled
              title={t.published}
            >
              <IconLock size={14} stroke={1.9} />
              {t.published}
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
  t,
}: Readonly<{
  areaCount: number;
  draft: { description: string; proposalName: string };
  isCreating: boolean;
  onClose: () => void;
  onDraftChange: (draft: { description: string; proposalName: string }) => void;
  onSubmit: () => void;
  t: typeof designerCopy.en.proposalsTab;
}>) {
  function updateDraft(field: keyof typeof draft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <div className="designer-project-modal-backdrop">
      <section className="designer-project-modal" role="dialog" aria-modal="true" aria-labelledby="designer-create-proposal-title">
        <header>
          <div>
            <h3 id="designer-create-proposal-title">{t.createModalTitle}</h3>
            <p>{t.errNeedAreas}</p>
          </div>
          <button className="designer-project-modal-close" type="button" aria-label="Close create proposal modal" onClick={onClose}>
            X
          </button>
        </header>
        <div className="designer-project-modal-form">
          <label>
            <span>{t.name}</span>
            <input
              autoFocus
              placeholder={t.namePh}
              value={draft.proposalName}
              onChange={(event) => updateDraft('proposalName', event.target.value)}
            />
          </label>
          <label>
            <span>{t.description}</span>
            <textarea
              placeholder={t.descPh}
              value={draft.description}
              onChange={(event) => updateDraft('description', event.target.value)}
            />
          </label>
        </div>
        <footer>
          <button className="designer-project-detail-button" disabled={isCreating} type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="designer-project-detail-button designer-project-detail-button-primary"
            disabled={isCreating || !draft.proposalName.trim() || !draft.description.trim() || areaCount === 0}
            type="button"
            onClick={onSubmit}
          >
            {isCreating ? t.creating : t.createSubmit}
          </button>
        </footer>
      </section>
    </div>
  );
}

function isEditableProposalStatus(status: ProposalDto['status']) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED';
}

function isProposalDraftingStatus(status: string) {
  return normalizeStatus(status) === 'PROPOSAL_CONSULTING';
}

function getAreasByFloor<T extends { areaName: string; floorNumber: number | null }>(areas: T[]) {
  return [...areas].sort((first, second) => {
    const floorDifference = getSortableFloor(first.floorNumber) - getSortableFloor(second.floorNumber);

    if (floorDifference !== 0) return floorDifference;

    return first.areaName.localeCompare(second.areaName);
  });
}

function getSortableFloor(floorNumber: number | null) {
  return typeof floorNumber === 'number' ? floorNumber : Number.MAX_SAFE_INTEGER;
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

function getDisplayText(value: string | null | undefined, fallback: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || isTechnicalId(normalizedValue)) {
    return fallback;
  }

  return normalizedValue;
}

function isTechnicalId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || /^[0-9a-f]{24}$/i.test(value);
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
