import {
  IconChevronRight,
  IconHome,
} from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getCustomizationRequestServiceResultMessage, type CustomizationRequestDto, type CustomizationRequestVersionDto } from '@/services/api/customizationRequests';
import { getProposalServiceResultMessage, type ProposalDto, type ProposalItemDto, type ProposalSceneDto } from '@/services/api/proposals';
import {
  useAcceptCustomizationRequestVersion,
  useProjectCustomizationRequests,
  useProjectList,
  useProjectProposals,
  useProposalDetail,
  useProposalItems,
  useProposalScenes,
  useSubmitCustomizationRequest,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './CustomerProposalDetailPage.css';

const tableHeaders = ['Item Name', 'Version', 'Dimensions', 'Material', 'Qty', 'Unit Price', 'Total', 'Actions'];

export function CustomerProposalDetailPage() {
  const navigate = useNavigate();
  const { proposalId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId') ?? '';
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl);
  const [selectedProposalId, setSelectedProposalId] = useState(proposalId ?? '');
  const [customizationMessage, setCustomizationMessage] = useState('');
  const [customizingItemId, setCustomizingItemId] = useState<string | null>(null);
  const [customizationTitle, setCustomizationTitle] = useState('');
  const [customizationDescription, setCustomizationDescription] = useState('');
  const [customizationMaterial, setCustomizationMaterial] = useState('');
  const [customizationColor, setCustomizationColor] = useState('');
  const [customizationWidth, setCustomizationWidth] = useState('');
  const [customizationHeight, setCustomizationHeight] = useState('');
  const [customizationDepth, setCustomizationDepth] = useState('');

  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projectProposalsQuery = useProjectProposals(
    {
      projectId: selectedProjectId,
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(selectedProjectId) },
  );
  const proposalQuery = useProposalDetail(selectedProposalId, { enabled: Boolean(selectedProposalId) });
  const scenesQuery = useProposalScenes(
    {
      proposalId: selectedProposalId,
      isActive: true,
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(selectedProposalId) },
  );
  const itemsQuery = useProposalItems(
    {
      proposalId: selectedProposalId,
      page: 1,
      limit: 100,
    },
    { enabled: Boolean(selectedProposalId) },
  );
  const submitCustomizationMutation = useSubmitCustomizationRequest();
  const acceptCustomizationMutation = useAcceptCustomizationRequestVersion();
  const backendProposal = proposalQuery.data;
  const proposals = useMemo(
    () => (projectProposalsQuery.data?.items ?? []).filter((proposal) => isCustomerVisibleProposal(proposal.status)),
    [projectProposalsQuery.data?.items],
  );
  const scenes = useMemo(() => scenesQuery.data?.items ?? backendProposal?.scenes ?? [], [backendProposal?.scenes, scenesQuery.data?.items]);
  const proposalItems = useMemo(() => itemsQuery.data?.items ?? backendProposal?.items ?? [], [backendProposal?.items, itemsQuery.data?.items]);
  const displayProposalItems = useMemo(() => aggregateDuplicateItems(proposalItems), [proposalItems]);
  const estimatedTotal = displayProposalItems.reduce((total, item) => total + (item.subtotalAmount ?? 0), 0);
  const customizationRequestsQuery = useProjectCustomizationRequests(
    {
      projectId: backendProposal?.projectId ?? '',
      proposalId: backendProposal?.proposalId ?? null,
    },
    { enabled: Boolean(backendProposal?.projectId) },
  );
  const customizationRequests = customizationRequestsQuery.data?.items ?? [];
  const customerApprovalItems = getCustomerApprovalItems(customizationRequests);

  useEffect(() => {
    if (proposalId && proposalId !== selectedProposalId) {
      setSelectedProposalId(proposalId);
    }
  }, [proposalId, selectedProposalId]);

  useEffect(() => {
    if (projectIdFromUrl && projectIdFromUrl !== selectedProjectId) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && projectsQuery.data?.items.length) {
      const firstProjectId = projectsQuery.data.items[0].projectId;
      setSelectedProjectId(firstProjectId);
      setSearchParams({ projectId: firstProjectId });
    }
  }, [projectsQuery.data?.items, selectedProjectId, setSearchParams]);

  useEffect(() => {
    if (!selectedProposalId && proposals.length > 0) {
      setSelectedProposalId(proposals[0].proposalId);
      navigate(`/customer/proposals/${proposals[0].proposalId}?projectId=${proposals[0].projectId}`, { replace: true });
    }
  }, [navigate, proposals, selectedProposalId]);

  function openProposal(proposal: ProposalDto) {
    setSelectedProposalId(proposal.proposalId);
    setCustomizationMessage('');
    setCustomizingItemId(null);
    navigate(`/customer/proposals/${proposal.proposalId}?projectId=${proposal.projectId}`);
  }

  function openScene(scene: ProposalSceneDto) {
    const params = new URLSearchParams({
      projectId: backendProposal?.projectId ?? selectedProjectId,
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
    } catch (error) {
      setCustomizationMessage(getCustomizationRequestServiceResultMessage(error));
    }
  }

  async function acceptCustomization(request: CustomizationRequestDto, version: CustomizationRequestVersionDto) {
    setCustomizationMessage('');

    try {
      await acceptCustomizationMutation.mutateAsync({
        customizationRequestId: request.customizationRequestId,
        customizationRequestVersionId: version.customizationRequestVersionId,
      });
      setCustomizationMessage('Customization version accepted. Proposal pricing will refresh with the approved version.');
    } catch (error) {
      setCustomizationMessage(getCustomizationRequestServiceResultMessage(error));
    }
  }

  return (
    <main className="customer-proposal-detail-page">
      <CustomerNavbar activeLabel="Design Proposals" classPrefix="customer-proposal-detail" />

      <div className="customer-proposal-detail-main">
        <nav className="customer-proposal-detail-breadcrumb" aria-label="Breadcrumb">
          <a href="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </a>
          <IconChevronRight size={16} stroke={1.8} />
          <a href="/customer/projects">My Projects</a>
          <IconChevronRight size={16} stroke={1.8} />
          <span>{backendProposal?.proposalName ?? 'Design Proposals'}</span>
        </nav>

        {projectsQuery.isLoading ? <section className="customer-proposal-detail-state">Loading your projects...</section> : null}
        {projectsQuery.isError ? <section className="customer-proposal-detail-state is-error">Cannot load customer projects.</section> : null}

        {proposalQuery.isLoading ? <section className="customer-proposal-detail-state">Loading proposal detail...</section> : null}
        {proposalQuery.isError ? <section className="customer-proposal-detail-state is-error">{getProposalServiceResultMessage(proposalQuery.error)}</section> : null}

        <div className="customer-proposal-detail-layout">
          <aside className="customer-proposal-detail-proposal-list">
            <header>
              <div>
                <h2>Project Proposals</h2>
              </div>
            </header>
            {projectProposalsQuery.isLoading ? <p>Loading proposals...</p> : null}
            {projectProposalsQuery.isError ? <p>{getProposalServiceResultMessage(projectProposalsQuery.error)}</p> : null}
            {!projectProposalsQuery.isLoading && selectedProjectId && proposals.length === 0 ? <p>No proposal is available for this project yet.</p> : null}
            <div>
              {proposals.map((proposal) => (
                <button
                  className={proposal.proposalId === selectedProposalId ? 'is-active' : ''}
                  key={proposal.proposalId}
                  type="button"
                  onClick={() => openProposal(proposal)}
                >
                  <strong>{proposal.proposalName}</strong>
                  <span>v{proposal.versionNo} - {formatEnumLabel(proposal.status)}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="customer-proposal-detail-primary">
            {backendProposal ? (
              <>
              <section className="customer-proposal-detail-card customer-proposal-detail-scenes">
                <div className="customer-proposal-detail-section-heading">
                  <div>
                    <h2>Proposal Scenes ({scenes.length})</h2>
                    <p>Open a saved scene to inspect the design before making a decision.</p>
                  </div>
                </div>
                {scenesQuery.isLoading ? <p>Loading scenes...</p> : null}
                {!scenesQuery.isLoading && scenes.length === 0 ? <p>No active scene is available for this proposal.</p> : null}
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
                  <h2>Furniture & Items</h2>
                  <p>Total Estimated: {formatMoney(estimatedTotal)}</p>
                </div>
                {customizationMessage ? <p className="customer-proposal-detail-message">{customizationMessage}</p> : null}
                {itemsQuery.isLoading ? <p>Loading proposal items...</p> : null}
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
                          proposalStatus={backendProposal.status}
                          onCustomize={() => {
                            setCustomizingItemId(item.proposalItemId);
                            setCustomizationMessage('');
                          }}
                        />
                      ))}
                      {!itemsQuery.isLoading && displayProposalItems.length === 0 ? (
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
              </section>

              {customerApprovalItems.length > 0 ? (
                <section className="customer-proposal-detail-card customer-proposal-detail-customization-approval">
                  <h2>Customization Approval</h2>
                  {customerApprovalItems.map(({ request, version }) => (
                    <article key={version.customizationRequestVersionId}>
                      <strong>{request.requestTitle}</strong>
                      <span>{formatMoney(version.estimatedAdditionalCost)} - {version.estimatedProductionDays ?? '-'} days</span>
                      <p>{version.feasibilityNote ?? version.additionalCostReason ?? version.designerNote ?? 'Production confirmed this customization version.'}</p>
                      <div>
                        <button disabled={acceptCustomizationMutation.isPending || !canAcceptCustomizationVersion(request, version)} type="button" onClick={() => void acceptCustomization(request, version)}>
                          Accept
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              ) : null}
              </>
            ) : (
              <section className="customer-proposal-detail-state">Select a proposal to review scenes and furniture items.</section>
            )}
          </div>
        </div>
      </div>
    </main>
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

function isCustomerVisibleProposal(status: ProposalDto['status']) {
  return ['PUBLISHED', 'REVISION_REQUESTED', 'SELECTED', 'REJECTED'].includes(status);
}

function getCustomerApprovalItems(requests: CustomizationRequestDto[]) {
  return requests.flatMap((request) =>
    (request.versions ?? [])
      .filter((version) => request.status === 'REVIEWING' && version.status === 'REVIEWING' && version.feasibilityStatus === 'FEASIBLE')
      .map((version) => ({ request, version })),
  );
}

function canAcceptCustomizationVersion(request: CustomizationRequestDto, version: CustomizationRequestVersionDto) {
  const sourcePrice = request.sourceProductVersion?.estimatedPrice ?? request.sourceProductVersion?.price;

  return request.status === 'REVIEWING' &&
    version.status === 'REVIEWING' &&
    version.feasibilityStatus === 'FEASIBLE' &&
    typeof version.estimatedAdditionalCost === 'number' &&
    typeof sourcePrice === 'number';
}

function normalizeNumber(value: string) {
  if (!value.trim()) return null;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
