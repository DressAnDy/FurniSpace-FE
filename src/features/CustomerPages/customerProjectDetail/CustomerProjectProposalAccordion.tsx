import { IconChevronDown } from '@tabler/icons-react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ModelViewer } from '@/features/ThreeD/components';
import {
  getCustomizationRequestServiceResultMessage,
  type CustomizationRequestDto,
  type CustomizationRequestVersionDto,
} from '@/services/api/customizationRequests';
import { getProposalServiceResultMessage, type ProposalDto, type ProposalItemDto, type ProposalSceneDto } from '@/services/api/proposals';
import {
  useAcceptCustomizationRequestVersion,
  useProjectCustomizationRequests,
  useProposalDetail,
  useProposalItems,
  useProposalScenes,
  useRequestProposalRevision,
  useSubmitCustomizationRequest,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import '../customerProposalDetail/CustomerProposalDetailPage.css';

const tableHeaders = ['Item Name', 'Version', 'Dimensions', 'Material', 'Qty', 'Unit Price', 'Total', 'Actions'];

type CustomerProjectProposalAccordionItemProps = {
  expanded: boolean;
  onToggle: () => void;
  projectId: string;
  proposal: ProposalDto;
};

export function CustomerProjectProposalAccordionItem({
  expanded,
  onToggle,
  projectId,
  proposal,
}: CustomerProjectProposalAccordionItemProps) {
  const navigate = useNavigate();

  return (
    <article className={`customer-project-detail-proposal-accordion${expanded ? ' is-expanded' : ''}`}>
      <button
        aria-expanded={expanded}
        className="customer-project-detail-proposal-item"
        type="button"
        onClick={onToggle}
      >
        <div className="customer-project-detail-proposal-copy">
          <strong>{proposal.proposalName}</strong>
          <span>
            Version {proposal.versionNo}
            {proposal.publishedAt ? ` · Published ${formatDate(proposal.publishedAt)}` : ''}
          </span>
        </div>
        <div className="customer-project-detail-proposal-meta">
          <span className={`customer-project-detail-proposal-status customer-project-detail-proposal-status-${getProposalStatusTone(proposal.status)}`}>
            {formatStatusLabel(proposal.status)}
          </span>
          <IconChevronDown className="customer-project-detail-proposal-chevron" size={16} stroke={1.8} />
        </div>
      </button>

      {expanded ? (
        <CustomerProjectProposalPanel
          navigate={navigate}
          projectId={projectId}
          proposal={proposal}
        />
      ) : null}
    </article>
  );
}

function CustomerProjectProposalPanel({
  navigate,
  projectId,
  proposal,
}: {
  navigate: ReturnType<typeof useNavigate>;
  projectId: string;
  proposal: ProposalDto;
}) {
  const [customizationMessage, setCustomizationMessage] = useState('');
  const [customizingItemId, setCustomizingItemId] = useState<string | null>(null);
  const [customizationTitle, setCustomizationTitle] = useState('');
  const [customizationDescription, setCustomizationDescription] = useState('');
  const [customizationMaterial, setCustomizationMaterial] = useState('');
  const [customizationColor, setCustomizationColor] = useState('');
  const [customizationWidth, setCustomizationWidth] = useState('');
  const [customizationHeight, setCustomizationHeight] = useState('');
  const [customizationDepth, setCustomizationDepth] = useState('');
  const [modelPreviewVersion, setModelPreviewVersion] = useState<CustomizationRequestVersionDto | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const submitCustomizationMutation = useSubmitCustomizationRequest();
  const acceptCustomizationMutation = useAcceptCustomizationRequestVersion();
  const requestRevisionMutation = useRequestProposalRevision();
  const proposalQuery = useProposalDetail(proposal.proposalId, { enabled: true });
  const customizationRequestsQuery = useProjectCustomizationRequests(
    {
      projectId,
      proposalId: proposal.proposalId,
    },
    { enabled: true },
  );

  const scenesQuery = useProposalScenes(
    {
      proposalId: proposal.proposalId,
      isActive: true,
      page: 1,
      limit: 50,
    },
    { enabled: true },
  );
  const itemsQuery = useProposalItems(
    {
      proposalId: proposal.proposalId,
      page: 1,
      limit: 100,
    },
    { enabled: true },
  );

  const backendProposal = proposalQuery.data;
  const currentProposal = backendProposal ?? proposal;
  const scenes = useMemo(
    () => scenesQuery.data?.items ?? backendProposal?.scenes ?? [],
    [backendProposal?.scenes, scenesQuery.data?.items],
  );
  const proposalItems = useMemo(
    () => itemsQuery.data?.items ?? backendProposal?.items ?? [],
    [backendProposal?.items, itemsQuery.data?.items],
  );
  const displayProposalItems = useMemo(() => aggregateDuplicateItems(proposalItems), [proposalItems]);
  const customizationRequests = useMemo(
    () => customizationRequestsQuery.data?.items ?? [],
    [customizationRequestsQuery.data?.items],
  );
  const customVersionReviewItems = useMemo(
    () =>
      customizationRequests.flatMap((request) =>
        (request.versions ?? [])
          .filter((version) =>
            !request.acceptedRequestVersionId &&
            request.status === 'REVIEWING' &&
            version.status === 'REVIEWING' &&
            !version.isAccepted,
          )
          .map((version) => ({ request, version })),
      ),
    [customizationRequests],
  );
  const acceptedCustomVersionItems = useMemo(
    () =>
      customizationRequests.flatMap((request) => {
        const acceptedVersion = request.acceptedVersion ?? (request.versions ?? []).find((version) => version.isAccepted);

        return acceptedVersion ? [{ request, version: acceptedVersion }] : [];
      }),
    [customizationRequests],
  );
  const estimatedTotal = displayProposalItems.reduce((total, item) => total + (item.subtotalAmount ?? 0), 0);
  const isLoadingScenes = (scenesQuery.isLoading || proposalQuery.isLoading) && scenes.length === 0;
  const isLoadingItems = (itemsQuery.isLoading || proposalQuery.isLoading) && displayProposalItems.length === 0;
  const shouldShowCustomizationVersions =
    customizationRequestsQuery.isLoading ||
    customizationRequestsQuery.isError ||
    customizationRequests.length > 0;
  const scenesError = scenesQuery.isError ? getProposalServiceResultMessage(scenesQuery.error) : null;
  const itemsError = itemsQuery.isError && displayProposalItems.length === 0
    ? getProposalServiceResultMessage(itemsQuery.error)
    : proposalQuery.isError && displayProposalItems.length === 0
      ? getProposalServiceResultMessage(proposalQuery.error)
      : null;
  const customizationRequestsError = customizationRequestsQuery.isError
    ? getCustomizationRequestServiceResultMessage(customizationRequestsQuery.error)
    : null;

  function openScene(scene: ProposalSceneDto) {
    const params = new URLSearchParams({
      projectId,
      proposalId: scene.proposalId,
      sceneId: scene.sceneId,
    });

    navigate(`/customer/3d-preview?${params.toString()}`);
  }

  function resetCustomizationForm() {
    setCustomizingItemId(null);
    setCustomizationTitle('');
    setCustomizationDescription('');
    setCustomizationMaterial('');
    setCustomizationColor('');
    setCustomizationWidth('');
    setCustomizationHeight('');
    setCustomizationDepth('');
  }

  async function submitCustomization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomizationMessage('');

    if (!customizingItemId) return;

    const hasCustomizationField = Boolean(
      customizationDescription.trim() ||
        customizationMaterial.trim() ||
        customizationColor.trim() ||
        customizationWidth ||
        customizationHeight ||
        customizationDepth,
    );

    if (!customizationTitle.trim() || !hasCustomizationField) {
      setCustomizationMessage('Title and at least one customization field are required.');
      return;
    }

    try {
      await submitCustomizationMutation.mutateAsync({
        proposalItemId: customizingItemId,
        requestTitle: customizationTitle,
        requestDescription: customizationDescription,
        requestedMaterial: customizationMaterial,
        requestedColor: customizationColor,
        requestedWidth: normalizeNumber(customizationWidth),
        requestedHeight: normalizeNumber(customizationHeight),
        requestedDepth: normalizeNumber(customizationDepth),
      });
      resetCustomizationForm();
      setCustomizationMessage('Customization request submitted for this proposal item.');
      void customizationRequestsQuery.refetch();
    } catch (error) {
      setCustomizationMessage(getCustomizationRequestServiceResultMessage(error));
    }
  }

  async function acceptCustomVersion(request: CustomizationRequestDto, version: CustomizationRequestVersionDto) {
    setCustomizationMessage('');

    try {
      await acceptCustomizationMutation.mutateAsync({
        customizationRequestId: request.customizationRequestId,
        customizationRequestVersionId: version.customizationRequestVersionId,
      });
      setCustomizationMessage('Custom version accepted. The designer can reopen the proposal and apply this custom product version.');
      void customizationRequestsQuery.refetch();
      void proposalQuery.refetch();
      void itemsQuery.refetch();
    } catch (error) {
      setCustomizationMessage(getCustomizationRequestServiceResultMessage(error));
    }
  }

  async function requestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomizationMessage('');

    const trimmedRevisionNote = revisionNote.trim();

    if (!trimmedRevisionNote) {
      setCustomizationMessage('Please enter revision feedback before sending it to the designer.');
      return;
    }

    try {
      await requestRevisionMutation.mutateAsync({
        proposalId: currentProposal.proposalId,
        revisionNote: trimmedRevisionNote,
      });
      setRevisionNote('');
      setCustomizationMessage('Revision request sent to the designer.');
      void proposalQuery.refetch();
    } catch (error) {
      setCustomizationMessage(getProposalServiceResultMessage(error));
    }
  }

  return (
    <div className="customer-project-detail-proposal-panel">
      {currentProposal.status === 'REVISION_REQUESTED' && currentProposal.revisionNote ? (
        <section className="customer-proposal-detail-card customer-proposal-detail-revision-note">
          <h2>Revision Feedback Sent</h2>
          <p>{currentProposal.revisionNote}</p>
        </section>
      ) : null}

      <section className="customer-proposal-detail-card customer-proposal-detail-scenes">
        <div className="customer-proposal-detail-section-heading">
          <div>
            <h2>Proposal Scenes ({scenes.length})</h2>
            <p>Open a saved scene to inspect the design before making a decision.</p>
          </div>
        </div>
        {isLoadingScenes ? <p>Loading scenes...</p> : null}
        {scenesError ? <p className="customer-proposal-detail-message">{scenesError}</p> : null}
        {!isLoadingScenes && !scenesError && scenes.length === 0 ? <p>No active scene is available for this proposal.</p> : null}
        <div className="customer-proposal-detail-scene-grid">
          {scenes.map((scene) => (
            <article key={scene.sceneId}>
              <div>
                <strong>{scene.sceneName}</strong>
                <span>{scene.sceneType} - v{scene.versionNo}</span>
                <button type="button" onClick={() => openScene(scene)}>Open Scene</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="customer-proposal-detail-card customer-proposal-detail-items">
        <div>
          <h2>Furniture &amp; Items</h2>
          <p>Total Estimated: {formatMoney(estimatedTotal)}</p>
        </div>
        {customizationMessage ? <p className="customer-proposal-detail-message">{customizationMessage}</p> : null}
        {itemsError ? <p className="customer-proposal-detail-message">{itemsError}</p> : null}
        {isLoadingItems ? <p>Loading proposal items...</p> : null}
        {!isLoadingItems ? (
          <>
            <div className="customer-proposal-detail-table-wrap">
              <table>
                <thead>
                  <tr>
                    {tableHeaders.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayProposalItems.map((item) => (
                    <ProposalItemRow
                      item={item}
                      key={item.proposalItemId}
                      proposalStatus={currentProposal.status}
                      onCustomize={() => {
                        setCustomizingItemId(item.proposalItemId);
                        setCustomizationMessage('');
                      }}
                    />
                  ))}
                  {displayProposalItems.length === 0 ? (
                    <tr>
                      <td colSpan={tableHeaders.length}>No proposal item is available for customization.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {customizingItemId ? (
              <form className="customer-proposal-detail-customization-form" onSubmit={submitCustomization}>
                <h3>Request Item Customization</h3>
                <input required value={customizationTitle} placeholder="Request title" onChange={(event) => setCustomizationTitle(event.target.value)} />
                <textarea rows={3} value={customizationDescription} placeholder="Describe the change" onChange={(event) => setCustomizationDescription(event.target.value)} />
                <div>
                  <input value={customizationMaterial} placeholder="Material" onChange={(event) => setCustomizationMaterial(event.target.value)} />
                  <input value={customizationColor} placeholder="Color" onChange={(event) => setCustomizationColor(event.target.value)} />
                  <input value={customizationWidth} placeholder="Width" type="number" onChange={(event) => setCustomizationWidth(event.target.value)} />
                  <input value={customizationHeight} placeholder="Height" type="number" onChange={(event) => setCustomizationHeight(event.target.value)} />
                  <input value={customizationDepth} placeholder="Depth" type="number" onChange={(event) => setCustomizationDepth(event.target.value)} />
                </div>
                <div>
                  <button type="button" onClick={resetCustomizationForm}>Cancel</button>
                  <button disabled={submitCustomizationMutation.isPending} type="submit">
                    {submitCustomizationMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            ) : null}
          </>
        ) : null}
      </section>

      {currentProposal.status === 'PUBLISHED' ? (
        <section className="customer-proposal-detail-card customer-proposal-detail-revision-form">
          <div className="customer-proposal-detail-section-heading">
            <div>
              <h2>Request Proposal Revision</h2>
              <p>Send design feedback to the designer before selecting the final proposal.</p>
            </div>
          </div>
          <form className="customer-proposal-detail-customization-form" onSubmit={requestRevision}>
            <textarea
              required
              rows={3}
              value={revisionNote}
              placeholder="Describe what the designer should revise in this proposal."
              onChange={(event) => setRevisionNote(event.target.value)}
            />
            <div>
              <button disabled={requestRevisionMutation.isPending || !revisionNote.trim()} type="submit">
                {requestRevisionMutation.isPending ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {shouldShowCustomizationVersions ? (
        <section className="customer-proposal-detail-card customer-proposal-detail-custom-version-review">
          <div className="customer-proposal-detail-section-heading">
            <div>
              <h2>Custom Versions for Review</h2>
              <p>Review designer custom versions while production checks feasibility. Accept becomes available after production marks a version feasible.</p>
            </div>
          </div>
          {customizationRequestsQuery.isLoading ? <p>Loading custom versions...</p> : null}
          {customizationRequestsError ? <p className="customer-proposal-detail-message">{customizationRequestsError}</p> : null}
          {!customizationRequestsQuery.isLoading && !customizationRequestsError && customVersionReviewItems.length === 0 && acceptedCustomVersionItems.length === 0 ? (
            <p className="customer-proposal-detail-custom-version-empty">No custom version is ready for customer review yet.</p>
          ) : null}
          {customVersionReviewItems.length > 0 ? (
            <div className="customer-proposal-detail-custom-version-list">
              {customVersionReviewItems.map(({ request, version }) => (
                <CustomVersionReviewCard
                  key={version.customizationRequestVersionId}
                  request={request}
                  version={version}
                  actionLabel={
                    version.feasibilityStatus === 'FEASIBLE'
                      ? acceptCustomizationMutation.isPending
                        ? 'Accepting...'
                        : 'Accept Custom Version'
                      : 'Feasibility Pending'
                  }
                  disabled={acceptCustomizationMutation.isPending || version.feasibilityStatus !== 'FEASIBLE'}
                  onPreviewModel={() => setModelPreviewVersion(version)}
                  onAccept={() => acceptCustomVersion(request, version)}
                />
              ))}
            </div>
          ) : null}
          {acceptedCustomVersionItems.length > 0 ? (
            <div className="customer-proposal-detail-custom-version-list">
              {acceptedCustomVersionItems.map(({ request, version }) => (
                <CustomVersionReviewCard
                  isAccepted
                  key={version.customizationRequestVersionId}
                  request={request}
                  version={version}
                  onPreviewModel={() => setModelPreviewVersion(version)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {modelPreviewVersion ? (
        <CustomVersionModelModal
          version={modelPreviewVersion}
          onClose={() => setModelPreviewVersion(null)}
        />
      ) : null}
    </div>
  );
}

function ProposalItemRow({ item, onCustomize, proposalStatus }: { item: ProposalItemDto; onCustomize: () => void; proposalStatus: string }) {
  return (
    <tr>
      <td data-label="Item Name">{item.productNameSnapshot}</td>
      <td data-label="Version">{item.versionNameSnapshot}</td>
      <td data-label="Dimensions">{formatDimensions(item.widthSnapshot, item.heightSnapshot, item.depthSnapshot, item.dimensionUnit)}</td>
      <td data-label="Material">{item.materialSnapshot ?? '-'}</td>
      <td data-label="Qty">{item.quantity}</td>
      <td data-label="Unit Price">{formatMoney(item.unitPriceSnapshot)}</td>
      <td data-label="Total">{formatMoney(item.subtotalAmount)}</td>
      <td data-label="Actions">
        <button disabled={proposalStatus !== 'PUBLISHED'} type="button" onClick={onCustomize}>
          Customize
        </button>
      </td>
    </tr>
  );
}

function CustomVersionReviewCard({
  actionLabel,
  disabled,
  isAccepted = false,
  onPreviewModel,
  onAccept,
  request,
  version,
}: {
  actionLabel?: string;
  disabled?: boolean;
  isAccepted?: boolean;
  onPreviewModel?: () => void;
  onAccept?: () => void;
  request: CustomizationRequestDto;
  version: CustomizationRequestVersionDto;
}) {
  const productVersion = version.productVersion;
  const previewUrl = getCustomVersionPreviewUrl(version);
  const modelUrl = getCustomVersionModelUrl(version);

  return (
    <article className="customer-proposal-detail-custom-version-card">
      {previewUrl ? (
        <img alt={productVersion.versionName ?? version.versionTitle ?? request.requestTitle} src={previewUrl} />
      ) : (
        <div className="customer-proposal-detail-custom-version-placeholder">No preview</div>
      )}
      <div>
        <div className="customer-proposal-detail-custom-version-title">
          <div>
            <strong>{version.versionTitle || productVersion.versionName || request.requestTitle}</strong>
            <span>{request.requestTitle}</span>
          </div>
          <span className={getCustomVersionBadgeClassName(isAccepted, version)}>
            {getCustomVersionBadgeLabel(isAccepted, version)}
          </span>
        </div>
        {version.designerNote ? <p>{version.designerNote}</p> : null}
        <dl>
          <div>
            <dt>Version</dt>
            <dd>{productVersion.versionName || `v${version.versionNo}`}</dd>
          </div>
          <div>
            <dt>Material</dt>
            <dd>{productVersion.material || request.requestedMaterial || '-'}</dd>
          </div>
          <div>
            <dt>Color</dt>
            <dd>{productVersion.color || request.requestedColor || '-'}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>{formatDimensions(productVersion.width, productVersion.height, productVersion.depth, productVersion.dimensionUnit)}</dd>
          </div>
          <div>
            <dt>Extra Cost</dt>
            <dd>{formatMoney(version.estimatedAdditionalCost)}</dd>
          </div>
          <div>
            <dt>Production</dt>
            <dd>{version.estimatedProductionDays ? `${version.estimatedProductionDays} days` : '-'}</dd>
          </div>
        </dl>
        {version.feasibilityNote ? <p>{version.feasibilityNote}</p> : null}
        <div className="customer-proposal-detail-custom-version-actions">
          <button disabled={!modelUrl} type="button" onClick={onPreviewModel}>
            View 3D
          </button>
          {!isAccepted && onAccept ? (
            <button disabled={disabled} type="button" onClick={onAccept}>
              {actionLabel ?? 'Accept Custom Version'}
            </button>
          ) : null}
        </div>
        {!modelUrl ? <p>No MODEL_3D file is available for this custom version yet.</p> : null}
      </div>
    </article>
  );
}

function CustomVersionModelModal({
  onClose,
  version,
}: {
  onClose: () => void;
  version: CustomizationRequestVersionDto;
}) {
  const previewUrl = getCustomVersionPreviewUrl(version) ?? undefined;
  const modelUrl = getCustomVersionModelUrl(version) ?? undefined;

  return (
    <div className="customer-proposal-detail-model-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Custom version 3D model preview"
        className="customer-proposal-detail-model-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>{version.versionTitle || version.productVersion.versionName || `Version ${version.versionNo}`}</h3>
            <p>{modelUrl ? 'Inspect the custom product MODEL_3D file.' : 'No MODEL_3D file is available.'}</p>
          </div>
          <button aria-label="Close 3D preview" type="button" onClick={onClose}>X</button>
        </header>
        <div className="customer-proposal-detail-model-modal-body">
          <ModelViewer
            fallbackImageUrl={previewUrl}
            height="100%"
            modelUrl={modelUrl}
            showGrid={false}
          />
        </div>
      </section>
    </div>
  );
}

function getCustomVersionFiles(version: CustomizationRequestVersionDto) {
  return [
    ...(version.productVersion.files ?? []),
    ...(version.productVersion.previewFiles ?? []),
    version.productVersion.thumbnail,
  ].filter((file): file is NonNullable<typeof file> => Boolean(file));
}

function getCustomVersionFileUrl(file: ReturnType<typeof getCustomVersionFiles>[number] | null | undefined) {
  return file?.fileUrl ?? file?.publicUrl ?? file?.url ?? null;
}

function getCustomVersionFileType(file: ReturnType<typeof getCustomVersionFiles>[number]) {
  return file.fileType?.toUpperCase() ?? '';
}

function getCustomVersionModelUrl(version: CustomizationRequestVersionDto) {
  const modelFile = getCustomVersionFiles(version).find((file) => getCustomVersionFileType(file) === 'MODEL_3D');

  return getCustomVersionFileUrl(modelFile) ?? version.productVersion.modelFileUrl ?? null;
}

function isPreviewFile(file: ReturnType<typeof getCustomVersionFiles>[number]) {
  const fileType = getCustomVersionFileType(file);

  return fileType === 'PRODUCT_PREVIEW' || fileType.startsWith('IMAGE');
}

function getCustomVersionPreviewUrl(version: CustomizationRequestVersionDto) {
  const previewFile = getCustomVersionFiles(version).find(isPreviewFile)
    ?? getCustomVersionFiles(version).find((file) => {
      const url = getCustomVersionFileUrl(file);

      return Boolean(url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
    });

  return getCustomVersionFileUrl(previewFile);
}

function getCustomVersionBadgeLabel(isAccepted: boolean, version: CustomizationRequestVersionDto) {
  if (isAccepted) return 'Accepted';
  if (version.feasibilityStatus === 'FEASIBLE') return 'Feasible';
  if (version.feasibilityStatus === 'NOT_FEASIBLE') return 'Not Feasible';

  return 'Production Review';
}

function getCustomVersionBadgeClassName(isAccepted: boolean, version: CustomizationRequestVersionDto) {
  if (isAccepted) return 'is-accepted';
  if (version.feasibilityStatus === 'FEASIBLE') return 'is-feasible';
  if (version.feasibilityStatus === 'NOT_FEASIBLE') return 'is-not-feasible';

  return 'is-pending';
}

function getProposalStatusTone(status: ProposalDto['status']) {
  if (status === 'SELECTED') return 'green';
  if (status === 'REJECTED') return 'muted';
  if (status === 'REVISION_REQUESTED') return 'amber';
  return 'stone';
}

function formatStatusLabel(value: string) {
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

function normalizeNumber(value: string) {
  if (!value.trim()) return null;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatDimensions(width?: number | null, height?: number | null, depth?: number | null, unit?: string | null) {
  const values = [
    width ? `W ${width}` : null,
    height ? `H ${height}` : null,
    depth ? `D ${depth}` : null,
  ].filter(Boolean);

  return values.length > 0 ? `${values.join(' x ')} ${unit || 'cm'}` : '-';
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}
