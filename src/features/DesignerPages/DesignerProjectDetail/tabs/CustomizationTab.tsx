import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { IconCube, IconUpload } from '@tabler/icons-react';

import { SelectedImagePreview } from '@/features/AdminPages/Productmanagement/SelectedImagePreview';
import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  getCustomizationRequestServiceResultMessage,
  type CustomizationRequestDto,
  type CustomizationRequestVersionDto,
  type CustomizationStatus,
  type SubmitCustomizationRequestInput,
  type UpdateCustomizationRequestVersionDto,
} from '@/services/api/customizationRequests';
import {
  getProjectServiceResultMessage,
  type FileType,
  type ProjectDto,
  type ProjectFileUploadResponseDto,
} from '@/services/api/projects';
import type { ProposalDto, ProposalItemDto } from '@/services/api/proposals';
import {
  useCancelCustomizationRequest,
  useCreateCustomizationRequestVersion,
  useProjectCustomizationRequests,
  useProjectProposals,
  useProposalItems,
  useSubmitCustomizationRequest,
  useSubmitCustomizationRequestVersionForReview,
  useUpdateCustomizationRequestVersion,
  useUploadProjectFile,
  useWithdrawCustomizationRequestVersion,
} from '@/services/queries';

type CustomizationTabProps = {
  project: ProjectDto;
};

type VersionFormState = {
  color: string;
  depth: string;
  designerNote: string;
  dimensionUnit: 'cm' | 'm' | 'mm';
  estimatedPrice: string;
  height: string;
  material: string;
  modelFileId: string;
  previewFileIds: string;
  versionCode: string;
  versionName: string;
  versionTitle: string;
  width: string;
};

type RequestFormState = {
  proposalId: string;
  proposalItemId: string;
  requestTitle: string;
  requestDescription: string;
  requestedMaterial: string;
  requestedColor: string;
  requestedWidth: string;
  requestedHeight: string;
  requestedDepth: string;
  requestedChangeNote: string;
};

const emptyVersionForm: VersionFormState = {
  color: '',
  depth: '',
  designerNote: '',
  dimensionUnit: 'cm',
  estimatedPrice: '',
  height: '',
  material: '',
  modelFileId: '',
  previewFileIds: '',
  versionCode: '',
  versionName: '',
  versionTitle: '',
  width: '',
};

const emptyRequestForm: RequestFormState = {
  proposalId: '',
  proposalItemId: '',
  requestTitle: '',
  requestDescription: '',
  requestedMaterial: '',
  requestedColor: '',
  requestedWidth: '',
  requestedHeight: '',
  requestedDepth: '',
  requestedChangeNote: '',
};

const statusFilters: Array<{ label: string; value: CustomizationStatus | null }> = [
  { label: 'All', value: null },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Reviewing', value: 'REVIEWING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function CustomizationTab({ project }: CustomizationTabProps) {
  const [statusFilter, setStatusFilter] = useState<CustomizationStatus | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [modelPreviewOpen, setModelPreviewOpen] = useState(false);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [requestForm, setRequestForm] = useState<RequestFormState>(emptyRequestForm);
  const [versionForm, setVersionForm] = useState<VersionFormState>(emptyVersionForm);
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const proposalsQuery = useProjectProposals({
    projectId: project.projectId,
    status: 'PUBLISHED',
    page: 1,
    limit: 50,
  });
  const selectedProposalId = requestForm.proposalId || proposalsQuery.data?.items?.[0]?.proposalId || '';
  const proposalItemsQuery = useProposalItems({
    proposalId: selectedProposalId,
    page: 1,
    limit: 100,
  }, { enabled: Boolean(selectedProposalId) });
  const requestsQuery = useProjectCustomizationRequests({
    projectId: project.projectId,
    status: statusFilter,
  });
  const submitRequestMutation = useSubmitCustomizationRequest();
  const uploadProjectFileMutation = useUploadProjectFile();
  const createVersionMutation = useCreateCustomizationRequestVersion();
  const updateVersionMutation = useUpdateCustomizationRequestVersion();
  const submitVersionMutation = useSubmitCustomizationRequestVersionForReview();
  const withdrawVersionMutation = useWithdrawCustomizationRequestVersion();
  const cancelMutation = useCancelCustomizationRequest();
  const proposals = useMemo(() => proposalsQuery.data?.items ?? [], [proposalsQuery.data?.items]);
  const proposalItems = useMemo(() => proposalItemsQuery.data?.items ?? [], [proposalItemsQuery.data?.items]);
  const requests = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data?.items]);
  const activeRequest = requests.find((request) => request.customizationRequestId === activeRequestId) ?? requests[0] ?? null;
  const editingVersion = activeRequest?.versions?.find((version) => version.customizationRequestVersionId === editingVersionId) ?? null;

  useEffect(() => {
    if (!requestForm.proposalId && proposals.length > 0) {
      setRequestForm((current) => ({ ...current, proposalId: proposals[0].proposalId }));
    }
  }, [proposals, requestForm.proposalId]);

  useEffect(() => {
    if (!proposalItems.some((item) => item.proposalItemId === requestForm.proposalItemId)) {
      setRequestForm((current) => ({ ...current, proposalItemId: proposalItems[0]?.proposalItemId ?? '' }));
    }
  }, [proposalItems, requestForm.proposalItemId]);

  useEffect(() => {
    if (!activeRequestId && requests.length > 0) {
      setActiveRequestId(requests[0].customizationRequestId);
    }
  }, [activeRequestId, requests]);

  useEffect(() => {
    if (editingVersion) {
      setVersionForm(formFromVersion(editingVersion));
    } else {
      setVersionForm(emptyVersionForm);
    }
  }, [editingVersion]);

  function selectRequest(requestId: string | null) {
    setActiveRequestId(requestId);
    setEditingVersionId(null);
    setCancelReason('');
    setMessage(null);
  }

  async function submitRequestOnBehalf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const input = getRequestInput(requestForm);

    if (!input) {
      setMessage({ tone: 'error', text: 'Select a proposal item, add a title, and provide at least one customization field.' });
      return;
    }

    try {
      const request = await submitRequestMutation.mutateAsync(input);
      setRequestForm((current) => ({
        ...emptyRequestForm,
        proposalId: current.proposalId,
        proposalItemId: current.proposalItemId,
      }));
      setStatusFilter(null);
      setActiveRequestId(request.customizationRequestId);
      setRequestModalOpen(false);
      setMessage({ tone: 'success', text: 'Customization request created for the customer.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function saveVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!activeRequest) return;

    if (!versionForm.versionName.trim()) {
      setMessage({ tone: 'error', text: 'Version name is required.' });
      return;
    }

    const body = getVersionBody(versionForm);
    const selectedFileValidationMessage = validateSelectedCustomizationFiles({ modelFile, previewFile });

    if (selectedFileValidationMessage) {
      setMessage({ tone: 'error', text: selectedFileValidationMessage });
      return;
    }

    try {
      const uploadedPreviewFile = previewFile
        ? await uploadProjectFileMutation.mutateAsync({
          file: previewFile,
          fileType: 'PRODUCT_PREVIEW',
          note: `Customization preview for ${versionForm.versionName}`,
          projectId: project.projectId,
          visibility: 'CUSTOMER_VISIBLE',
        })
        : null;
      const uploadedModelFile = modelFile
        ? await uploadProjectFileMutation.mutateAsync({
          file: modelFile,
          fileType: 'MODEL_3D',
          note: `Customization 3D model for ${versionForm.versionName}`,
          projectId: project.projectId,
          visibility: 'CUSTOMER_VISIBLE',
        })
        : null;
      const uploadedFileValidationMessage = validateUploadedCustomizationFiles({
        modelFile: uploadedModelFile,
        previewFile: uploadedPreviewFile,
        projectId: project.projectId,
      });

      if (uploadedFileValidationMessage) {
        setMessage({ tone: 'error', text: uploadedFileValidationMessage });
        return;
      }

      const versionBody = {
        ...body,
        modelFileId: uploadedModelFile?.fileId ?? body.modelFileId ?? null,
        previewFileIds: uploadedPreviewFile?.fileId
          ? [uploadedPreviewFile.fileId]
          : body.previewFileIds ?? [],
      };

      if (editingVersion) {
        await updateVersionMutation.mutateAsync({
          customizationRequestId: activeRequest.customizationRequestId,
          customizationRequestVersionId: editingVersion.customizationRequestVersionId,
          body: versionBody,
        });
        setMessage({ tone: 'success', text: 'Customization version updated.' });
      } else {
        await createVersionMutation.mutateAsync({
          customizationRequestId: activeRequest.customizationRequestId,
          body: versionBody,
        });
        setMessage({ tone: 'success', text: 'Customization version draft created.' });
      }

      setEditingVersionId(null);
      setVersionForm(emptyVersionForm);
      setPreviewFile(null);
      setModelFile(null);
      setVersionModalOpen(false);
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectServiceResultMessage(error) || getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function submitVersion(version: CustomizationRequestVersionDto) {
    if (!activeRequest) return;
    setMessage(null);

    try {
      await submitVersionMutation.mutateAsync({
        customizationRequestId: activeRequest.customizationRequestId,
        customizationRequestVersionId: version.customizationRequestVersionId,
      });
      setMessage({ tone: 'success', text: 'Customization version sent to production review.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function withdrawVersion(version: CustomizationRequestVersionDto) {
    if (!activeRequest) return;
    setMessage(null);

    try {
      await withdrawVersionMutation.mutateAsync({
        customizationRequestId: activeRequest.customizationRequestId,
        customizationRequestVersionId: version.customizationRequestVersionId,
      });
      setMessage({ tone: 'success', text: 'Customization version withdrawn.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function cancelRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeRequest) return;
    setMessage(null);

    if (!cancelReason.trim()) {
      setMessage({ tone: 'error', text: 'Cancel reason is required.' });
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        customizationRequestId: activeRequest.customizationRequestId,
        cancelReason,
      });
      setCancelReason('');
      setCancelModalOpen(false);
      setMessage({ tone: 'success', text: 'Customization request cancelled.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Customization</h3>
          <p>Manage customer requests or create assisted requests when the customer needs help describing a product change.</p>
        </div>
        <div className="designer-project-filter-list">
          {statusFilters.map((filter) => (
            <button
              className={`designer-project-filter ${statusFilter === filter.value ? 'designer-project-filter-active' : ''}`}
              key={filter.label}
              type="button"
              onClick={() => {
                setStatusFilter(filter.value);
                selectRequest(null);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <p className={`designer-project-schedule-message ${message.tone === 'success' ? 'designer-project-message-success' : 'designer-project-file-error'}`}>
          {message.text}
        </p>
      ) : null}

      <DesignerRequestPrompt
        itemsCount={proposalItems.length}
        proposalsCount={proposals.length}
        proposalsLoading={proposalsQuery.isLoading}
        onOpen={() => setRequestModalOpen(true)}
      />

      {requestsQuery.isLoading ? <p className="designer-project-empty-text">Loading customization requests...</p> : null}
      {requestsQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">
          {getCustomizationRequestServiceResultMessage(requestsQuery.error)}
        </p>
      ) : null}
      {!requestsQuery.isLoading && requests.length === 0 ? (
        <p className="designer-project-empty-text">No customization requests found for this project.</p>
      ) : null}

      {requests.length > 0 ? (
        <div className="designer-project-custom-layout">
          <div className="designer-project-custom-list">
            {requests.map((request) => (
              <button
                className={`designer-project-custom-card ${activeRequest?.customizationRequestId === request.customizationRequestId ? 'designer-project-custom-card-active' : ''}`}
                key={request.customizationRequestId}
                type="button"
                onClick={() => selectRequest(request.customizationRequestId)}
              >
                <div className="designer-project-custom-main">
                  <div className="designer-project-custom-title">
                    <h4>{request.requestTitle}</h4>
                    <span className={`designer-project-status designer-project-status-${getRequestStatusTone(request.status)}`}>
                      {formatEnumLabel(request.status ?? 'UNKNOWN')}
                    </span>
                  </div>
                  <p className="designer-project-custom-subtitle">
                    Created {request.createdAt ? formatDate(request.createdAt) : '-'} - {(request.versions ?? []).length} versions
                  </p>
                  <p className="designer-project-custom-note-preview">
                    {request.requestedChangeNote || request.requestDescription || 'No note provided.'}
                  </p>
                  <div className="designer-project-custom-specs">
                    <div className="designer-project-custom-spec">
                      <span>Source</span>
                      <p>{request.sourceProductVersion?.versionName ?? request.sourceProductVersionId}</p>
                    </div>
                    <div className="designer-project-custom-spec">
                      <span>Material</span>
                      <p>{request.requestedMaterial ?? '-'}</p>
                    </div>
                    <div className="designer-project-custom-spec">
                      <span>Color</span>
                      <p>{request.requestedColor ?? '-'}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <aside className="designer-project-custom-review-panel">
            {activeRequest ? (
              <RequestVersionPanel
                activeRequest={activeRequest}
                cancelMutationPending={cancelMutation.isPending}
                mutationPending={
                  createVersionMutation.isPending ||
                  updateVersionMutation.isPending ||
                  submitVersionMutation.isPending ||
                  withdrawVersionMutation.isPending
                }
                onCancelRequest={() => setCancelModalOpen(true)}
                onEditVersion={(versionId) => {
                  setEditingVersionId(versionId);
                  setVersionModalOpen(true);
                }}
                onNewVersion={() => {
                  setEditingVersionId(null);
                  setVersionForm(emptyVersionForm);
                  setVersionModalOpen(true);
                }}
                onSubmitVersion={(version) => void submitVersion(version)}
                onWithdrawVersion={(version) => void withdrawVersion(version)}
              />
            ) : (
              <div className="designer-project-custom-empty-panel">
                <span>Version Panel</span>
                <h4>Select a customization request</h4>
                <p>Requested specs, custom versions, and review actions will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {requestModalOpen ? (
        <DesignerModal
          description="Create a customer customization request from a published proposal item."
          title="Designer Assisted Request"
          onClose={() => setRequestModalOpen(false)}
        >
          <DesignerRequestForm
            form={requestForm}
            items={proposalItems}
            itemsLoading={proposalItemsQuery.isLoading}
            mutationPending={submitRequestMutation.isPending}
            proposals={proposals}
            proposalsLoading={proposalsQuery.isLoading}
            onChange={setRequestForm}
            onSubmit={(event) => void submitRequestOnBehalf(event)}
          />
        </DesignerModal>
      ) : null}

      {versionModalOpen && activeRequest ? (
        <DesignerModal
          description={editingVersion ? 'Update the selected draft before production review.' : 'Create a draft custom product version for this request.'}
          title={editingVersion ? 'Edit Custom Version' : 'Create Custom Version'}
          onClose={() => {
            setVersionModalOpen(false);
            setEditingVersionId(null);
            setPreviewFile(null);
            setModelFile(null);
            setViewerStatus('idle');
            setViewerError(null);
          }}
        >
          <VersionForm
            editingVersion={editingVersion}
            form={versionForm}
            modelFile={modelFile}
            mutationPending={createVersionMutation.isPending || updateVersionMutation.isPending || uploadProjectFileMutation.isPending}
            previewFile={previewFile}
            viewerError={viewerError}
            viewerStatus={viewerStatus}
            onChange={setVersionForm}
            onModelFileChange={setModelFile}
            onPreviewFileChange={setPreviewFile}
            onPreviewModel={() => {
              setModelPreviewOpen(true);
              setViewerStatus('idle');
              setViewerError(null);
            }}
            onSubmit={(event) => void saveVersion(event)}
          />
        </DesignerModal>
      ) : null}

      {modelPreviewOpen ? (
        <DesignerModal
          description={viewerStatus === 'error' ? viewerError ?? 'Could not load model.' : modelFile ? 'Drag to rotate, scroll to zoom.' : 'No local MODEL_3D file is selected yet.'}
          title={modelFile?.name ?? editingVersion?.productVersion?.versionName ?? '3D Model Preview'}
          onClose={() => {
            setModelPreviewOpen(false);
            setViewerStatus('idle');
            setViewerError(null);
          }}
        >
          <ModelPreviewCanvas
            modelFile={modelFile}
            onStatusChange={(status, error) => {
              setViewerStatus(status);
              setViewerError(error);
            }}
          />
        </DesignerModal>
      ) : null}

      {cancelModalOpen && activeRequest ? (
        <DesignerModal
          description={`Cancel "${activeRequest.requestTitle}" and withdraw active versions.`}
          title="Cancel Customization Request"
          onClose={() => setCancelModalOpen(false)}
        >
          <form className="designer-project-modal-form" onSubmit={(event) => void cancelRequest(event)}>
            <label>
              <span>Cancel reason</span>
              <textarea required rows={4} value={cancelReason} placeholder="Explain why this request is being cancelled" onChange={(event) => setCancelReason(event.target.value)} />
            </label>
            <footer>
              <button className="designer-project-detail-button" disabled={cancelMutation.isPending} type="button" onClick={() => setCancelModalOpen(false)}>
                Keep Request
              </button>
              <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={cancelMutation.isPending} type="submit">
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </footer>
          </form>
        </DesignerModal>
      ) : null}
    </section>
  );
}

function DesignerRequestPrompt({
  itemsCount,
  onOpen,
  proposalsCount,
  proposalsLoading,
}: {
  itemsCount: number;
  onOpen: () => void;
  proposalsCount: number;
  proposalsLoading: boolean;
}) {
  return (
    <section className="designer-project-custom-assist-card">
      <div>
        <span>Designer Assisted Request</span>
        <h4>Create a request for the customer</h4>
        <p>Use this when the customer explains a change in chat or during review and needs the designer to submit it from a published proposal item.</p>
      </div>
      <div className="designer-project-custom-assist-meta">
        <strong>{proposalsCount}</strong>
        <span>Published proposals</span>
        <strong>{itemsCount}</strong>
        <span>Items loaded</span>
      </div>
      <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={proposalsLoading || proposalsCount === 0} type="button" onClick={onOpen}>
        Create Request
      </button>
    </section>
  );
}

function DesignerModal({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="designer-project-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="designer-project-modal designer-project-custom-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <button className="designer-project-modal-close" type="button" onClick={onClose}>
            x
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DesignerRequestForm({
  form,
  items,
  itemsLoading,
  mutationPending,
  onChange,
  onSubmit,
  proposals,
  proposalsLoading,
}: {
  form: RequestFormState;
  items: ProposalItemDto[];
  itemsLoading: boolean;
  mutationPending: boolean;
  onChange: (form: RequestFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  proposals: ProposalDto[];
  proposalsLoading: boolean;
}) {
  const setField = (name: keyof RequestFormState, value: string) => onChange({ ...form, [name]: value });
  const hasPublishedProposal = proposals.length > 0;
  const selectedItem = items.find((item) => item.proposalItemId === form.proposalItemId) ?? null;

  return (
    <form className="designer-project-custom-action-form" onSubmit={onSubmit}>
      <div className="designer-project-custom-review-header">
        <div>
          <span>Designer Assisted Request</span>
          <h4>Create a customization request for the customer</h4>
        </div>
        <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={!hasPublishedProposal || !form.proposalItemId || mutationPending} type="submit">
          {mutationPending ? 'Submitting...' : 'Create for Customer'}
        </button>
      </div>

      {!hasPublishedProposal && !proposalsLoading ? (
        <p className="designer-project-empty-text">No published proposal is available for assisted customization requests.</p>
      ) : null}
      {hasPublishedProposal && !itemsLoading && items.length === 0 ? (
        <p className="designer-project-empty-text">No proposal items are available for assisted customization requests.</p>
      ) : null}

      <div className="designer-project-custom-detail-grid">
        <label>
          <span>Published proposal</span>
          <select
            disabled={proposalsLoading || mutationPending}
            value={form.proposalId}
            onChange={(event) => onChange({ ...form, proposalId: event.target.value, proposalItemId: '' })}
          >
            {proposals.map((proposal) => (
              <option key={proposal.proposalId} value={proposal.proposalId}>
                {proposal.proposalName} - v{proposal.versionNo}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Proposal item</span>
          <select
            disabled={!hasPublishedProposal || itemsLoading || mutationPending}
            value={form.proposalItemId}
            onChange={(event) => setField('proposalItemId', event.target.value)}
          >
            {items.map((item) => (
              <option key={item.proposalItemId} value={item.proposalItemId}>
                {item.productNameSnapshot} - {item.versionNameSnapshot}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedItem ? (
        <div className="designer-project-custom-detail-section">
          <span>Selected Source</span>
          <strong>{selectedItem.productNameSnapshot} - {selectedItem.versionNameSnapshot}</strong>
          <p>
            {selectedItem.materialSnapshot ?? 'No material'} / {selectedItem.colorSnapshot ?? 'No color'} / Qty {selectedItem.quantity}
          </p>
        </div>
      ) : null}

      <label>
        <span>Request title</span>
        <input required value={form.requestTitle} placeholder="Customer request title" onChange={(event) => setField('requestTitle', event.target.value)} />
      </label>
      <label>
        <span>Description</span>
        <textarea rows={3} value={form.requestDescription} placeholder="Describe the requested change" onChange={(event) => setField('requestDescription', event.target.value)} />
      </label>
      <div className="designer-project-custom-detail-grid">
        <label>
          <span>Material</span>
          <input value={form.requestedMaterial} placeholder="Requested material" onChange={(event) => setField('requestedMaterial', event.target.value)} />
        </label>
        <label>
          <span>Color</span>
          <input value={form.requestedColor} placeholder="Requested color" onChange={(event) => setField('requestedColor', event.target.value)} />
        </label>
        <label>
          <span>Width</span>
          <input min="0" type="number" value={form.requestedWidth} onChange={(event) => setField('requestedWidth', event.target.value)} />
        </label>
        <label>
          <span>Height</span>
          <input min="0" type="number" value={form.requestedHeight} onChange={(event) => setField('requestedHeight', event.target.value)} />
        </label>
        <label>
          <span>Depth</span>
          <input min="0" type="number" value={form.requestedDepth} onChange={(event) => setField('requestedDepth', event.target.value)} />
        </label>
      </div>
      <label>
        <span>Change note</span>
        <textarea rows={2} value={form.requestedChangeNote} placeholder="Customer-facing change note" onChange={(event) => setField('requestedChangeNote', event.target.value)} />
      </label>
    </form>
  );
}

function RequestVersionPanel({
  activeRequest,
  cancelMutationPending,
  mutationPending,
  onCancelRequest,
  onEditVersion,
  onNewVersion,
  onSubmitVersion,
  onWithdrawVersion,
}: {
  activeRequest: CustomizationRequestDto;
  cancelMutationPending: boolean;
  mutationPending: boolean;
  onCancelRequest: () => void;
  onEditVersion: (versionId: string | null) => void;
  onNewVersion: () => void;
  onSubmitVersion: (version: CustomizationRequestVersionDto) => void;
  onWithdrawVersion: (version: CustomizationRequestVersionDto) => void;
}) {
  const versions = activeRequest.versions ?? [];
  const canCreateVersion = activeRequest.status === 'SUBMITTED' || activeRequest.status === 'REVIEWING';
  const readOnlyRequest = activeRequest.status === 'ACCEPTED' || activeRequest.status === 'CANCELLED';

  return (
    <>
      <div className="designer-project-custom-review-header">
        <div>
          <span>Selected Request</span>
          <h4>{activeRequest.requestTitle}</h4>
        </div>
        <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={!canCreateVersion || readOnlyRequest} type="button" onClick={onNewVersion}>
          New Version
        </button>
      </div>

      <CustomizationRequestSummary request={activeRequest} />

      <div className="designer-project-custom-detail">
        <div className="designer-project-custom-detail-section">
          <span>Versions</span>
          <strong>{versions.length ? `${versions.length} custom versions` : 'No version yet'}</strong>
          <p>Create a draft version, then submit it to production review.</p>
        </div>
        {versions.map((version) => (
          <VersionCard
            key={version.customizationRequestVersionId}
            mutationPending={mutationPending}
            version={version}
            onEdit={() => onEditVersion(version.customizationRequestVersionId)}
            onSubmit={() => onSubmitVersion(version)}
            onWithdraw={() => onWithdrawVersion(version)}
          />
        ))}
      </div>

      {!readOnlyRequest ? (
        <button className="designer-project-detail-button" disabled={cancelMutationPending} type="button" onClick={onCancelRequest}>
          {cancelMutationPending ? 'Cancelling...' : 'Cancel Request'}
        </button>
      ) : null}
    </>
  );
}

function CustomizationRequestSummary({ request }: { request: CustomizationRequestDto }) {
  return (
    <div className="designer-project-custom-detail">
      <div className="designer-project-custom-detail-section">
        <span>Source Product Version</span>
        <strong>{request.sourceProductVersion?.versionName ?? request.sourceProductVersionId}</strong>
        <p>{request.sourceProductVersion?.productName ?? '-'}</p>
      </div>
      <div className="designer-project-custom-detail-grid">
        <DetailValue label="Requested Material" value={request.requestedMaterial} />
        <DetailValue label="Requested Color" value={request.requestedColor} />
        <DetailValue label="Requested Width" value={formatDimension(request.requestedWidth)} />
        <DetailValue label="Requested Height" value={formatDimension(request.requestedHeight)} />
        <DetailValue label="Requested Depth" value={formatDimension(request.requestedDepth)} />
        <DetailValue label="Request Note" value={request.requestedChangeNote || request.requestDescription} />
      </div>
    </div>
  );
}

function VersionCard({
  mutationPending,
  onEdit,
  onSubmit,
  onWithdraw,
  version,
}: {
  mutationPending: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onWithdraw: () => void;
  version: CustomizationRequestVersionDto;
}) {
  const canEdit = version.status === 'DRAFT';
  const canSubmit = version.status === 'DRAFT';
  const canWithdraw = version.status === 'DRAFT' || (version.status === 'REVIEWING' && version.feasibilityStatus === 'PENDING');

  return (
    <div className="designer-project-custom-detail-section">
      <span>
        Version {version.versionNo} - {formatEnumLabel(version.status)} / {formatEnumLabel(version.feasibilityStatus)}
      </span>
      <strong>{version.productVersion?.versionName ?? version.versionTitle ?? `Version ${version.versionNo}`}</strong>
      <p>{version.designerNote || version.feasibilityNote || '-'}</p>
      <div className="designer-project-custom-detail-grid">
        <DetailValue label="Material" value={version.productVersion?.material} />
        <DetailValue label="Color" value={version.productVersion?.color} />
        <DetailValue label="Estimated Price" value={formatMoney(version.productVersion?.estimatedPrice ?? version.productVersion?.price)} />
        <DetailValue label="Additional Cost" value={formatMoney(version.estimatedAdditionalCost)} />
      </div>
      <div className="designer-project-progress-actions">
        <button className="designer-project-detail-button" disabled={!canEdit || mutationPending} type="button" onClick={onEdit}>
          Edit Draft
        </button>
        <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={!canSubmit || mutationPending} type="button" onClick={onSubmit}>
          Submit Review
        </button>
        <button className="designer-project-detail-button" disabled={!canWithdraw || mutationPending} type="button" onClick={onWithdraw}>
          Withdraw
        </button>
      </div>
    </div>
  );
}

function VersionForm({
  editingVersion,
  form,
  modelFile,
  mutationPending,
  onChange,
  onModelFileChange,
  onPreviewFileChange,
  onPreviewModel,
  onSubmit,
  previewFile,
  viewerError,
  viewerStatus,
}: {
  editingVersion: CustomizationRequestVersionDto | null;
  form: VersionFormState;
  modelFile: File | null;
  mutationPending: boolean;
  onChange: (form: VersionFormState) => void;
  onModelFileChange: (file: File | null) => void;
  onPreviewFileChange: (file: File | null) => void;
  onPreviewModel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  previewFile: File | null;
  viewerError: string | null;
  viewerStatus: ModelViewerStatus;
}) {
  const setField = (name: keyof VersionFormState, value: string) => onChange({ ...form, [name]: value });
  const currentPreviewFile = editingVersion?.productVersion?.previewFiles?.[0] ?? null;
  const canPreviewModel = Boolean(modelFile);

  return (
    <form className="designer-project-custom-action-form" onSubmit={onSubmit}>
      <label>
        <span>{editingVersion ? 'Edit draft version' : 'Create custom version'}</span>
        <input required value={form.versionName} placeholder="Version name" onChange={(event) => setField('versionName', event.target.value)} />
      </label>
      <label>
        <span>Version title</span>
        <input value={form.versionTitle} placeholder="Version title" onChange={(event) => setField('versionTitle', event.target.value)} />
      </label>
      <label>
        <span>Designer note</span>
        <textarea rows={3} value={form.designerNote} placeholder="Designer note" onChange={(event) => setField('designerNote', event.target.value)} />
      </label>
      <div className="designer-project-custom-detail-grid">
        <label>
          <span>Material</span>
          <input value={form.material} placeholder="Material" onChange={(event) => setField('material', event.target.value)} />
        </label>
        <label>
          <span>Color</span>
          <input value={form.color} placeholder="Color" onChange={(event) => setField('color', event.target.value)} />
        </label>
        <label>
          <span>Width</span>
          <input min="0" type="number" value={form.width} onChange={(event) => setField('width', event.target.value)} />
        </label>
        <label>
          <span>Height</span>
          <input min="0" type="number" value={form.height} onChange={(event) => setField('height', event.target.value)} />
        </label>
        <label>
          <span>Depth</span>
          <input min="0" type="number" value={form.depth} onChange={(event) => setField('depth', event.target.value)} />
        </label>
        <label>
          <span>Estimated price</span>
          <input min="0" type="number" value={form.estimatedPrice} onChange={(event) => setField('estimatedPrice', event.target.value)} />
        </label>
      </div>
      <div className="designer-project-custom-detail-grid">
        <label>
          <span>Version code</span>
          <input value={form.versionCode} placeholder="Optional unique code" onChange={(event) => setField('versionCode', event.target.value)} />
        </label>
        <label>
          <span>Dimension unit</span>
          <select value={form.dimensionUnit} onChange={(event) => setField('dimensionUnit', event.target.value)}>
            <option value="cm">cm</option>
            <option value="m">m</option>
            <option value="mm">mm</option>
          </select>
        </label>
      </div>
      <div className="designer-project-custom-upload-section">
        <div>
          <span>Version Files</span>
          <p>Files are uploaded to Project Files first, then linked to this custom ProductVersion.</p>
        </div>
        <label className="designer-project-custom-upload-card">
          <span>{editingVersion ? 'Replace / Add Preview Image' : 'Preview Image'}</span>
          <div className="designer-project-custom-upload-shell">
            {previewFile ? (
              <button className="designer-project-custom-file-remove" type="button" aria-label="Remove selected preview image" onClick={() => onPreviewFileChange(null)}>
                x
              </button>
            ) : null}
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="designer-project-custom-upload-input"
              type="file"
              onChange={(event) => onPreviewFileChange(event.target.files?.[0] ?? null)}
            />
            <div className="designer-project-custom-upload-main">
              {previewFile ? (
                <SelectedImagePreview className="designer-project-custom-upload-preview" file={previewFile} />
              ) : currentPreviewFile?.fileUrl ? (
                <img className="designer-project-custom-upload-preview" src={currentPreviewFile.fileUrl} alt="Current customization preview" />
              ) : (
                <IconUpload size={42} />
              )}
              <strong>{previewFile?.name ?? currentPreviewFile?.fileId ?? 'Select PRODUCT_PREVIEW image'}</strong>
              <small>Visible in customization review and customer approval.</small>
            </div>
          </div>
        </label>
        <label className="designer-project-custom-upload-card">
          <span>{editingVersion ? 'Replace / Add 3D Model' : '3D Model File'}</span>
          <div className="designer-project-custom-upload-shell">
            {modelFile ? (
              <button className="designer-project-custom-file-remove" type="button" aria-label="Remove selected 3D model" onClick={() => onModelFileChange(null)}>
                x
              </button>
            ) : null}
            <input
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              className="designer-project-custom-upload-input"
              type="file"
              onChange={(event) => onModelFileChange(event.target.files?.[0] ?? null)}
            />
            <div className="designer-project-custom-upload-main designer-project-custom-upload-model">
              <IconCube size={42} />
              <strong>{(modelFile?.name ?? form.modelFileId) || 'Select GLB/glTF model'}</strong>
              <small>Uploaded as MODEL_3D before this custom version is saved.</small>
            </div>
          </div>
        </label>
        <div className="designer-project-custom-file-actions">
          <button className="designer-project-detail-button" disabled={!canPreviewModel} type="button" onClick={onPreviewModel}>
            <IconCube size={16} />
            Preview 3D
          </button>
          <small>{viewerStatus === 'error' ? viewerError : modelFile ? 'Local model ready to preview.' : 'Choose a model file to preview it.'}</small>
        </div>
      </div>
      <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={mutationPending} type="submit">
        {mutationPending ? 'Saving...' : editingVersion ? 'Update Draft' : 'Create Draft'}
      </button>
    </form>
  );
}

function ModelPreviewCanvas({
  modelFile,
  onStatusChange,
}: {
  modelFile: File | null;
  onStatusChange: (status: ModelViewerStatus, error: string | null) => void;
}) {
  const [modelUrl, setModelUrl] = useState('');

  useEffect(() => {
    if (!modelFile) {
      setModelUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(modelFile);
    setModelUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [modelFile]);

  if (!modelFile || !modelUrl) {
    return <p className="designer-project-empty-text">Choose a GLB/glTF model file before opening preview.</p>;
  }

  return (
    <div className="designer-project-custom-model-preview">
      <ModelViewer height="100%" modelUrl={modelUrl} showGrid={false} onStatusChange={onStatusChange} />
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="designer-project-custom-detail-value">
      <span>{label}</span>
      <p>{value || '-'}</p>
    </div>
  );
}

function getRequestStatusTone(status?: CustomizationStatus | null) {
  if (status === 'ACCEPTED') return 'feasible';
  if (status === 'SUBMITTED' || status === 'REVIEWING') return 'pending';
  if (status === 'CANCELLED') return 'missing';

  return 'new';
}

function getRequestInput(form: RequestFormState): SubmitCustomizationRequestInput | null {
  const body = {
    proposalItemId: form.proposalItemId,
    requestTitle: form.requestTitle.trim(),
    requestDescription: normalizeText(form.requestDescription),
    requestedMaterial: normalizeText(form.requestedMaterial),
    requestedColor: normalizeText(form.requestedColor),
    requestedWidth: normalizeNumber(form.requestedWidth),
    requestedHeight: normalizeNumber(form.requestedHeight),
    requestedDepth: normalizeNumber(form.requestedDepth),
    requestedChangeNote: normalizeText(form.requestedChangeNote),
  };
  const hasCustomizationField = Boolean(
    body.requestDescription ||
      body.requestedMaterial ||
      body.requestedColor ||
      body.requestedChangeNote ||
      typeof body.requestedWidth === 'number' ||
      typeof body.requestedHeight === 'number' ||
      typeof body.requestedDepth === 'number',
  );

  if (!body.proposalItemId || !body.requestTitle || !hasCustomizationField) {
    return null;
  }

  return body;
}

function getVersionBody(form: VersionFormState): UpdateCustomizationRequestVersionDto {
  return {
    versionTitle: form.versionTitle,
    designerNote: form.designerNote,
    versionName: form.versionName,
    versionCode: form.versionCode,
    material: form.material,
    color: form.color,
    width: normalizeNumber(form.width),
    height: normalizeNumber(form.height),
    depth: normalizeNumber(form.depth),
    dimensionUnit: form.dimensionUnit,
    estimatedPrice: normalizeNumber(form.estimatedPrice),
    modelFileId: form.modelFileId,
    previewFileIds: getPreviewFileIds(form.previewFileIds),
  };
}

function validateSelectedCustomizationFiles({
  modelFile,
  previewFile,
}: {
  modelFile: File | null;
  previewFile: File | null;
}) {
  if (modelFile && !isModel3dFileName(modelFile.name)) {
    return 'MODEL_3D file must use .glb or .gltf extension.';
  }

  if (previewFile && !previewFile.type.startsWith('image/')) {
    return 'PRODUCT_PREVIEW file must be an image file.';
  }

  return null;
}

function validateUploadedCustomizationFiles({
  modelFile,
  previewFile,
  projectId,
}: {
  modelFile: ProjectFileUploadResponseDto | null;
  previewFile: ProjectFileUploadResponseDto | null;
  projectId: string;
}) {
  const modelValidationMessage = modelFile ? validateUploadedCustomizationFile({
    expectedFileType: 'MODEL_3D',
    file: modelFile,
    projectId,
    requireModelExtension: true,
  }) : null;

  if (modelValidationMessage) {
    return modelValidationMessage;
  }

  const previewValidationMessage = previewFile ? validateUploadedCustomizationFile({
    expectedFileType: 'PRODUCT_PREVIEW',
    file: previewFile,
    projectId,
  }) : null;

  if (previewValidationMessage) {
    return previewValidationMessage;
  }

  return null;
}

function validateUploadedCustomizationFile({
  expectedFileType,
  file,
  projectId,
  requireModelExtension = false,
}: {
  expectedFileType: FileType;
  file: ProjectFileUploadResponseDto & { status?: string | null };
  projectId: string;
  requireModelExtension?: boolean;
}) {
  if (file.projectId !== projectId) {
    return `${expectedFileType} upload belongs to another project. Please upload the file from this project.`;
  }

  if (file.fileType !== expectedFileType) {
    return `Uploaded file ${file.originalFileName} has fileType ${file.fileType}, expected ${expectedFileType}. Please remove it and upload again.`;
  }

  if (file.status && file.status !== 'ACTIVE') {
    return `Uploaded file ${file.originalFileName} is ${file.status}, expected ACTIVE.`;
  }

  if (requireModelExtension && !isModel3dFileName(file.originalFileName || file.fileName)) {
    return `Uploaded MODEL_3D file ${file.originalFileName || file.fileName} must be .glb or .gltf.`;
  }

  return null;
}

function isModel3dFileName(fileName: string) {
  return /\.(glb|gltf)$/i.test(fileName.trim());
}

function formFromVersion(version: CustomizationRequestVersionDto): VersionFormState {
  const productVersion = version.productVersion ?? {};

  return {
    color: productVersion.color ?? '',
    depth: formatInputNumber(productVersion.depth),
    designerNote: version.designerNote ?? '',
    dimensionUnit: isDimensionUnit(productVersion.dimensionUnit) ? productVersion.dimensionUnit : 'cm',
    estimatedPrice: formatInputNumber(productVersion.estimatedPrice ?? productVersion.price),
    height: formatInputNumber(productVersion.height),
    material: productVersion.material ?? '',
    modelFileId: productVersion.modelFileId ?? '',
    previewFileIds: (productVersion.previewFiles ?? []).map((file) => file.fileId).join(', '),
    versionCode: productVersion.versionCode ?? '',
    versionName: productVersion.versionName ?? '',
    versionTitle: version.versionTitle ?? '',
    width: formatInputNumber(productVersion.width),
  };
}

function getPreviewFileIds(value: string) {
  return value
    .split(',')
    .map((fileId) => fileId.trim())
    .filter(Boolean);
}

function isDimensionUnit(value?: string | null): value is 'cm' | 'm' | 'mm' {
  return value === 'cm' || value === 'm' || value === 'mm';
}

function normalizeNumber(value: string) {
  if (!value.trim()) return null;
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeText(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function formatInputNumber(value?: number | null) {
  return typeof value === 'number' ? String(value) : '';
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

function formatDimension(value?: number | null) {
  return typeof value === 'number' ? `${value} cm` : '-';
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}
