import {
  IconBox,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconHome,
  IconMessageDots,
  IconRefresh,
} from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getCustomizationRequestServiceResultMessage } from '@/services/api/customizationRequests';
import { getProposalServiceResultMessage, type ProposalDto, type ProposalItemDto, type ProposalSceneDto } from '@/services/api/proposals';
import {
  useCustomerDecisionCustomizationRequest,
  useProjectCustomizationRequests,
  useProjectList,
  useProjectProposals,
  useProposalDetail,
  useProposalItems,
  useProposalScenes,
  useRequestProposalRevision,
  useSelectFinalProposal,
  useSubmitCustomizationRequest,
} from '@/services/queries';

import './CustomerProposalDetailPage.css';

const tableHeaders = ['Item Name', 'Version', 'Dimensions', 'Material', 'Qty', 'Unit Price', 'Total', 'Actions'];

export function CustomerProposalDetailPage() {
  const navigate = useNavigate();
  const { proposalId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId') ?? '';
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl);
  const [selectedProposalId, setSelectedProposalId] = useState(proposalId ?? '');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [customizationMessage, setCustomizationMessage] = useState('');
  const [customizingItemId, setCustomizingItemId] = useState<string | null>(null);
  const [customizationTitle, setCustomizationTitle] = useState('');
  const [customizationDescription, setCustomizationDescription] = useState('');
  const [customizationMaterial, setCustomizationMaterial] = useState('');
  const [customizationColor, setCustomizationColor] = useState('');
  const [customizationWidth, setCustomizationWidth] = useState('');
  const [customizationHeight, setCustomizationHeight] = useState('');
  const [customizationDepth, setCustomizationDepth] = useState('');
  const [customizationRejectReasonById, setCustomizationRejectReasonById] = useState<Record<string, string>>({});

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
  const selectFinalMutation = useSelectFinalProposal();
  const requestRevisionMutation = useRequestProposalRevision();
  const submitCustomizationMutation = useSubmitCustomizationRequest();
  const customizationDecisionMutation = useCustomerDecisionCustomizationRequest();
  const backendProposal = proposalQuery.data;
  const selectedProject = projectsQuery.data?.items.find((project) => project.projectId === selectedProjectId) ?? null;
  const proposals = useMemo(
    () => (projectProposalsQuery.data?.items ?? []).filter((proposal) => isCustomerVisibleProposal(proposal.status)),
    [projectProposalsQuery.data?.items],
  );
  const scenes = useMemo(() => scenesQuery.data?.items ?? backendProposal?.scenes ?? [], [backendProposal?.scenes, scenesQuery.data?.items]);
  const proposalItems = useMemo(() => itemsQuery.data?.items ?? backendProposal?.items ?? [], [backendProposal?.items, itemsQuery.data?.items]);
  const estimatedTotal = proposalItems.reduce((total, item) => total + (item.subtotalAmount ?? 0), 0);
  const customizationRequestsQuery = useProjectCustomizationRequests(
    {
      projectId: backendProposal?.projectId ?? '',
      proposalId: backendProposal?.proposalId ?? null,
    },
    { enabled: Boolean(backendProposal?.projectId) },
  );
  const customizationRequests = customizationRequestsQuery.data?.items ?? [];
  const customerApprovalRequests = customizationRequests.filter((request) => request.status === 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL');
  const canDecideProposal = backendProposal?.status === 'PUBLISHED';

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
    setDecisionMessage('');
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

  async function decideCustomization(customizationRequestId: string, decision: 'ACCEPT' | 'REJECT') {
    setCustomizationMessage('');
    const rejectReason = customizationRejectReasonById[customizationRequestId] ?? '';

    if (decision === 'REJECT' && !rejectReason.trim()) {
      setCustomizationMessage('Reject reason is required.');
      return;
    }

    try {
      await customizationDecisionMutation.mutateAsync({
        customizationRequestId,
        decision,
        rejectReason: decision === 'REJECT' ? rejectReason : null,
      });
      setCustomizationRejectReasonById((current) => ({ ...current, [customizationRequestId]: '' }));
      setCustomizationMessage(decision === 'ACCEPT' ? 'Customization accepted and proposal item price updated.' : 'Customization rejected.');
    } catch (error) {
      setCustomizationMessage(getCustomizationRequestServiceResultMessage(error));
    }
  }

  async function selectFinalProposal() {
    if (!selectedProposalId) {
      setDecisionMessage('Choose a proposal before selecting the final design.');
      return;
    }

    setDecisionMessage('');

    try {
      await selectFinalMutation.mutateAsync({
        proposalId: selectedProposalId,
        note: 'Customer selected this proposal as the final design for quotation preparation.',
      });
      setDecisionMessage('Final proposal selected. The project can move toward quotation.');
    } catch (error) {
      setDecisionMessage(getProposalServiceResultMessage(error));
    }
  }

  async function requestRevision() {
    if (!selectedProposalId) {
      setDecisionMessage('Choose a proposal before requesting a revision.');
      return;
    }

    setDecisionMessage('');

    try {
      await requestRevisionMutation.mutateAsync({
        proposalId: selectedProposalId,
        note: 'Customer requested another review/revision for this design proposal.',
      });
      setDecisionMessage('Revision request sent to the design team.');
    } catch (error) {
      setDecisionMessage(getProposalServiceResultMessage(error));
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

        {selectedProjectId ? (
          <section className="customer-proposal-detail-proposal-list">
            <header>
              <div>
                <h2>Project Proposals</h2>
                <p>Select a published proposal to review scenes, items, and customization options.</p>
              </div>
            </header>
            {projectProposalsQuery.isLoading ? <p>Loading proposals...</p> : null}
            {projectProposalsQuery.isError ? <p>{getProposalServiceResultMessage(projectProposalsQuery.error)}</p> : null}
            {!projectProposalsQuery.isLoading && proposals.length === 0 ? <p>No proposal is available for this project yet.</p> : null}
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
          </section>
        ) : null}

        {proposalQuery.isLoading ? <section className="customer-proposal-detail-state">Loading proposal detail...</section> : null}
        {proposalQuery.isError ? <section className="customer-proposal-detail-state is-error">{getProposalServiceResultMessage(proposalQuery.error)}</section> : null}

        {backendProposal ? (
          <>
          <section className="customer-proposal-detail-snapshot-strip" aria-label="Proposal snapshot">
            <div>
              <h2>Proposal Snapshot</h2>
              <p>{selectedProject?.projectName ?? selectedProject?.projectCode ?? backendProposal.projectId}</p>
            </div>
            <div className="customer-proposal-detail-summary-grid">
              <SnapshotItem label="Status" value={formatEnumLabel(backendProposal.status)} />
              <SnapshotItem label="Published" value={backendProposal.publishedAt ? formatDate(backendProposal.publishedAt) : '-'} />
              <SnapshotItem label="Revision" value={`Version ${backendProposal.versionNo}`} />
              <SnapshotItem label="Scenes" value={`${scenes.length} active`} />
              <SnapshotItem label="Estimated Cost" value={formatMoney(estimatedTotal)} />
            </div>
          </section>

          <div className="customer-proposal-detail-layout">
            <div className="customer-proposal-detail-primary">
              <section className="customer-proposal-detail-hero">
                {getHeroImage(scenes) ? (
                  <img className="customer-proposal-detail-hero-media" alt="Published interior proposal" src={getHeroImage(scenes)} />
                ) : null}
                <div className="customer-proposal-detail-hero-copy">
                  <div>
                    <h1>{backendProposal.proposalName}</h1>
                    <span>Version {backendProposal.versionNo}</span>
                  </div>
                  <p>{backendProposal.description ?? 'Published design proposal ready for customer review.'}</p>
                  <ul>
                    <li>{selectedProject?.projectCode ?? backendProposal.projectId}</li>
                    <li>{backendProposal.publishedAt ? `Published ${formatDate(backendProposal.publishedAt)}` : 'Not published yet'}</li>
                    <li>{formatMoney(estimatedTotal)}</li>
                  </ul>
                </div>
                <div className="customer-proposal-detail-hero-footer">
                  <div>
                    <span className="customer-proposal-detail-status">{formatEnumLabel(backendProposal.status)}</span>
                    <p>{scenes.length} active scene(s) - {proposalItems.length} item(s)</p>
                  </div>
                  <button disabled={scenes.length === 0} type="button" onClick={() => scenes[0] && openScene(scenes[0])}>
                    <IconBox size={20} stroke={1.8} />
                    Open 2D/3D Review
                  </button>
                </div>
              </section>

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
                  <h2>Furniture & Items ({proposalItems.length})</h2>
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
                      {proposalItems.map((item) => (
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
                      {!itemsQuery.isLoading && proposalItems.length === 0 ? (
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
            </div>

            <aside className="customer-proposal-detail-sidebar">
              <section className="customer-proposal-detail-decision">
                <h2>Make Your Decision</h2>
                <p>Resolve customization requests before selecting the final proposal.</p>
                {decisionMessage ? <p>{decisionMessage}</p> : null}
                <div>
                  <button type="button">
                    <IconMessageDots size={20} stroke={1.8} />
                    Submit Feedback
                  </button>
                  <button disabled={!canDecideProposal || requestRevisionMutation.isPending} type="button" onClick={() => void requestRevision()}>
                    <IconRefresh size={20} stroke={1.8} />
                    {requestRevisionMutation.isPending ? 'Requesting...' : 'Request Revision'}
                  </button>
                  <button disabled={!canDecideProposal || selectFinalMutation.isPending || customerApprovalRequests.length > 0} type="button" onClick={() => void selectFinalProposal()}>
                    <IconCircleCheck size={20} stroke={1.8} />
                    {selectFinalMutation.isPending ? 'Selecting...' : 'Select This Proposal'}
                  </button>
                  <button type="button">
                    <IconCircleX size={20} stroke={1.8} />
                    Reject Proposal
                  </button>
                </div>
              </section>

              {customerApprovalRequests.length > 0 ? (
                <section className="customer-proposal-detail-card customer-proposal-detail-customization-approval">
                  <h2>Customization Approval</h2>
                  {customerApprovalRequests.map((request) => (
                    <article key={request.customizationRequestId}>
                      <strong>{request.requestTitle}</strong>
                      <span>{formatMoney(request.estimatedAdditionalCost)} - {request.estimatedProductionDays ?? '-'} days</span>
                      <p>{request.feasibilityNote ?? request.additionalCostReason ?? 'Production confirmed this customization.'}</p>
                      <textarea
                        rows={2}
                        value={customizationRejectReasonById[request.customizationRequestId] ?? ''}
                        placeholder="Reject reason"
                        onChange={(event) =>
                          setCustomizationRejectReasonById((current) => ({
                            ...current,
                            [request.customizationRequestId]: event.target.value,
                          }))
                        }
                      />
                      <div>
                        <button disabled={customizationDecisionMutation.isPending} type="button" onClick={() => void decideCustomization(request.customizationRequestId, 'REJECT')}>
                          Reject
                        </button>
                        <button disabled={customizationDecisionMutation.isPending} type="button" onClick={() => void decideCustomization(request.customizationRequestId, 'ACCEPT')}>
                          Accept
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              ) : null}
            </aside>
          </div>
          </>
        ) : null}
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

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
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

function getHeroImage(scenes: ProposalSceneDto[]) {
  return scenes.find((scene) => scene.previewFileUrl)?.previewFileUrl ?? '';
}
