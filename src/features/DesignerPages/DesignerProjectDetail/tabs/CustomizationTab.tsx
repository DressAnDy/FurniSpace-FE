import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';

import { useLang } from '@/app/providers/useLang';
import { designerCopy } from '@/features/DesignerPages/designercomponents';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCube,
  IconPalette,
  IconPlus,
  IconStack2,
  IconUpload,
} from '@tabler/icons-react';

import { SelectedImagePreview } from '@/features/AdminPages/Productmanagement/SelectedImagePreview';
import {
  getCustomizationRequestServiceResultFromError,
  getCustomizationRequestServiceResultMessage,
  type CustomizationRequestDto,
  type CustomizationRequestVersionDto,
  type CustomizationStatus,
  type SubmitCustomizationRequestInput,
  type UpdateCustomizationRequestVersionDto,
} from '@/services/api/customizationRequests';
import { getProductServiceResultMessage } from '@/services/api';
import { type ProjectDto } from '@/services/api/projects';
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
  useUploadProductVersionFile,
} from '@/services/queries';
import {
  parseOptionalProjectRequestNumber,
  sanitizeProjectRequestDecimalInput,
  validateOptionalPositiveNumber,
} from '@/shared/utils/projectRequestValidation';

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
  dimensionUnit: 'm',
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

export function CustomizationTab({ project }: Readonly<CustomizationTabProps>) {
  const { lang } = useLang();
  const t = designerCopy[lang].customizationTab;
  const tc = designerCopy[lang].common;
  const statusFilters = useMemo(
    (): Array<{ label: string; value: CustomizationStatus | null }> => [
      { label: t.filterAll, value: null },
      { label: t.filterSubmitted, value: 'SUBMITTED' },
      { label: t.filterReviewing, value: 'REVIEWING' },
      { label: t.filterAccepted, value: 'ACCEPTED' },
      { label: t.filterCancelled, value: 'CANCELLED' },
    ],
    [t],
  );
  const [statusFilter, setStatusFilter] = useState<CustomizationStatus | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
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
  const uploadProductVersionFileMutation = useUploadProductVersionFile();
  const createVersionMutation = useCreateCustomizationRequestVersion();
  const updateVersionMutation = useUpdateCustomizationRequestVersion();
  const submitVersionMutation = useSubmitCustomizationRequestVersionForReview();
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

  function openNewVersionModal() {
    if (!activeRequest) return;

    setEditingVersionId(null);
    setVersionForm(formFromCustomizationRequest(activeRequest));
    setPreviewFile(null);
    setModelFile(null);
    setVersionModalOpen(true);
  }

  async function submitRequestOnBehalf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const requestValidation = getRequestInput(requestForm);

    if (!requestValidation.ok) {
      setMessage({ tone: 'error', text: t.errRequestFields });
      return;
    }

    try {
      const request = await submitRequestMutation.mutateAsync(requestValidation.input);
      setRequestForm((current) => ({
        ...emptyRequestForm,
        proposalId: current.proposalId,
        proposalItemId: current.proposalItemId,
      }));
      setStatusFilter(null);
      setActiveRequestId(request.customizationRequestId);
      setRequestModalOpen(false);
      setMessage({ tone: 'success', text: t.successRequestCreated });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function saveVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!activeRequest) return;

    if (!versionForm.versionName.trim()) {
      setMessage({ tone: 'error', text: t.errVersionName });
      return;
    }

    const versionValidation = getVersionBody(versionForm);

    if (!versionValidation.ok) {
      setMessage({ tone: 'error', text: versionValidation.message });
      return;
    }

    const body = versionValidation.body;
    const selectedFileValidationMessage = validateSelectedCustomizationFiles({ modelFile, previewFile });

    if (selectedFileValidationMessage) {
      setMessage({ tone: 'error', text: selectedFileValidationMessage });
      return;
    }

    try {
      const versionBody = getVersionMetadataBody(body, activeRequest, editingVersion);
      let savedVersion: CustomizationRequestVersionDto;
      if (editingVersion) {
        savedVersion = await updateVersionMutation.mutateAsync({
          customizationRequestId: activeRequest.customizationRequestId,
          customizationRequestVersionId: editingVersion.customizationRequestVersionId,
          body: versionBody,
        });
      } else {
        const createResult = await createVersionMutation.mutateAsync({
          customizationRequestId: activeRequest.customizationRequestId,
          body: versionBody,
        });
        savedVersion = createResult.version;
      }

      const productVersionId = savedVersion.productVersion?.productVersionId;

      if ((previewFile || modelFile) && !productVersionId) {
        setMessage({ tone: 'error', text: 'Custom ProductVersion was created, but its productVersionId was not returned for file upload.' });
        return;
      }

      if (previewFile && productVersionId) {
        await uploadProductVersionFileMutation.mutateAsync({
          description: `Customization preview for ${versionForm.versionName}`,
          file: previewFile,
          fileType: 'PRODUCT_PREVIEW',
          productVersionId,
        });
      }

      if (modelFile && productVersionId) {
        await uploadProductVersionFileMutation.mutateAsync({
          description: `Customization 3D model for ${versionForm.versionName}`,
          file: modelFile,
          fileType: 'MODEL_3D',
          productVersionId,
        });
      }

      setEditingVersionId(null);
      setVersionForm(emptyVersionForm);
      setPreviewFile(null);
      setModelFile(null);
      setVersionModalOpen(false);
      await requestsQuery.refetch();
      setMessage({ tone: 'success', text: t.successVersionSaved });
    } catch (error) {
      setMessage({ tone: 'error', text: getVersionSaveErrorMessage(error) });
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
      setMessage({ tone: 'success', text: t.successVersionSubmitted });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function cancelRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeRequest) return;
    setMessage(null);

    if (!cancelReason.trim()) {
      setMessage({ tone: 'error', text: t.errCancelReason });
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        customizationRequestId: activeRequest.customizationRequestId,
        cancelReason,
      });
      setCancelReason('');
      setCancelModalOpen(false);
      setMessage({ tone: 'success', text: t.successCancelled });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>
            {t.title}
            {!requestsQuery.isLoading ? <span className="designer-proposal-count">{requests.length}</span> : null}
          </h3>
        </div>
        <div className="designer-project-filter-list" aria-label={t.filterAria}>
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;

            return (
              <button
                aria-pressed={isActive}
                className={`designer-project-filter ${isActive ? 'designer-project-filter-active' : ''}`}
                key={filter.label}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  selectRequest(null);
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <p className={`designer-project-file-message ${message.tone === 'success' ? 'designer-project-message-success' : 'designer-project-file-error'}`}>
          {message.tone === 'success' ? <IconCircleCheck size={17} /> : <IconAlertCircle size={17} />}
          {message.text}
        </p>
      ) : null}

      <DesignerRequestPrompt
        itemsCount={proposalItems.length}
        proposalsCount={proposals.length}
        proposalsLoading={proposalsQuery.isLoading}
        onOpen={() => setRequestModalOpen(true)}
        t={t}
      />

      {requestsQuery.isLoading ? <p className="designer-project-empty-text">{t.loading}</p> : null}
      {requestsQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">
          <IconAlertCircle size={17} />
          {getCustomizationRequestServiceResultMessage(requestsQuery.error)}
        </p>
      ) : null}
      {!requestsQuery.isLoading && requests.length === 0 ? (
        <div className="designer-project-custom-empty-state">
          <IconPalette size={22} stroke={1.6} />
          <strong>{t.empty}</strong>
          <span>{t.emptyHint}</span>
        </div>
      ) : null}

      {requests.length > 0 ? (
        <div className="designer-project-custom-layout">
          <div className="designer-project-custom-list">
            {requests.map((request) => {
              const versionCount = (request.versions ?? []).length;

              return (
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
                      <span>{t.created(request.createdAt ? formatDate(request.createdAt) : tc.dash)}</span>
                      <span className="designer-project-custom-version-chip">
                        <IconStack2 size={12} stroke={1.9} />
                        {t.versions(versionCount)}
                      </span>
                    </p>
                    <p className="designer-project-custom-note-preview">
                      {request.requestedChangeNote || request.requestDescription || t.noNote}
                    </p>
                    <div className="designer-project-custom-specs">
                      <div className="designer-project-custom-spec">
                        <span>{t.source}</span>
                        <p>{request.sourceProductVersion?.versionName ?? request.sourceProductVersionId}</p>
                      </div>
                      <div className="designer-project-custom-spec">
                        <span>{t.material}</span>
                        <p>{request.requestedMaterial ?? '-'}</p>
                      </div>
                      <div className="designer-project-custom-spec">
                        <span>{t.color}</span>
                        <p>{request.requestedColor ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="designer-project-custom-review-panel">
            {activeRequest ? (
              <RequestVersionPanel
                activeRequest={activeRequest}
                cancelMutationPending={cancelMutation.isPending}
                mutationPending={
                  createVersionMutation.isPending ||
                  updateVersionMutation.isPending ||
                  submitVersionMutation.isPending
                }
                onCancelRequest={() => setCancelModalOpen(true)}
                onNewVersion={openNewVersionModal}
                onSubmitVersion={(version) => void submitVersion(version)}
                t={t}
              />
            ) : (
              <div className="designer-project-custom-empty-panel">
                <IconPalette size={22} stroke={1.6} />
                <span>{t.versionPanel}</span>
                <h4>{t.selectRequest}</h4>
                <p>{t.emptyHint}</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {requestModalOpen ? (
        <DesignerModal
          description={t.assistDesc}
          title={t.modalAssistTitle}
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
            t={t}
            tc={tc}
          />
        </DesignerModal>
      ) : null}

      {versionModalOpen && activeRequest ? (
        <DesignerModal
          description={t.assistDesc}
          title={editingVersion ? t.modalVersionEdit : t.modalVersionCreate}
          onClose={() => {
            setVersionModalOpen(false);
            setEditingVersionId(null);
            setPreviewFile(null);
            setModelFile(null);
          }}
        >
          <VersionForm
            editingVersion={editingVersion}
            form={versionForm}
            modelFile={modelFile}
            mutationPending={createVersionMutation.isPending || updateVersionMutation.isPending || uploadProductVersionFileMutation.isPending}
            previewFile={previewFile}
            onChange={setVersionForm}
            onModelFileChange={setModelFile}
            onPreviewFileChange={setPreviewFile}
            onSubmit={(event) => void saveVersion(event)}
            t={t}
          />
        </DesignerModal>
      ) : null}

      {cancelModalOpen && activeRequest ? (
        <DesignerModal
          description={activeRequest.requestTitle}
          title={t.modalCancelTitle}
          onClose={() => setCancelModalOpen(false)}
        >
          <form className="designer-project-modal-form" onSubmit={(event) => void cancelRequest(event)}>
            <label>
              <span>{t.formChangeNote}</span>
              <textarea required rows={4} value={cancelReason} placeholder={t.cancelReasonPh} onChange={(event) => setCancelReason(event.target.value)} />
            </label>
            <footer>
              <button className="designer-project-detail-button" disabled={cancelMutation.isPending} type="button" onClick={() => setCancelModalOpen(false)}>
                {tc.cancel}
              </button>
              <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={cancelMutation.isPending} type="submit">
                {cancelMutation.isPending ? t.cancelling : t.cancelRequest}
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
  t,
}: Readonly<{
  itemsCount: number;
  onOpen: () => void;
  proposalsCount: number;
  proposalsLoading: boolean;
  t: typeof designerCopy.en.customizationTab;
}>) {
  return (
    <section className="designer-project-custom-assist-card">
      <div className="designer-project-custom-assist-icon">
        <IconPalette size={20} stroke={1.8} />
      </div>
      <div>
        <span>{t.assistTitle}</span>
        <h4>{t.createRequest}</h4>
        <p>{t.assistDesc}</p>
      </div>
      <div className="designer-project-custom-assist-meta">
        <div>
          <strong>{proposalsCount}</strong>
          <span>{t.publishedProposals}</span>
        </div>
        <div>
          <strong>{itemsCount}</strong>
          <span>{t.itemsLoaded}</span>
        </div>
      </div>
      <button
        className="designer-project-detail-button designer-project-detail-button-primary designer-project-custom-assist-button"
        disabled={proposalsLoading || proposalsCount === 0}
        type="button"
        onClick={onOpen}
      >
        <IconPlus size={16} stroke={2.2} />
        {t.createRequest}
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
  t,
  tc,
}: {
  form: RequestFormState;
  items: ProposalItemDto[];
  itemsLoading: boolean;
  mutationPending: boolean;
  onChange: (form: RequestFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  proposals: ProposalDto[];
  proposalsLoading: boolean;
  t: typeof designerCopy.en.customizationTab;
  tc: typeof designerCopy.en.common;
}) {
  const setField = (name: keyof RequestFormState, value: string) => onChange({ ...form, [name]: value });
  const setDecimalField = (name: keyof RequestFormState, value: string) => setField(name, sanitizeCustomizationDecimalInput(value));
  const hasPublishedProposal = proposals.length > 0;
  const selectedItem = items.find((item) => item.proposalItemId === form.proposalItemId) ?? null;
  const canSubmitRequest = hasPublishedProposal && Boolean(form.proposalItemId) && !mutationPending;

  return (
    <form className="designer-project-custom-action-form" onSubmit={onSubmit}>
      <div className="designer-project-custom-review-header">
        <div>
          <span>{t.assistTitle}</span>
          <h4>{t.createRequest}</h4>
        </div>
      </div>

      {!hasPublishedProposal && !proposalsLoading ? (
        <p className="designer-project-empty-text">{t.emptyHint}</p>
      ) : null}
      {hasPublishedProposal && !itemsLoading && items.length === 0 ? (
        <p className="designer-project-empty-text">{t.emptyHint}</p>
      ) : null}

      <div className="designer-project-custom-detail-grid">
        <label>
          <span>{t.publishedProposals}</span>
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
          <span>{t.source}</span>
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
        <span>{t.formTitle}</span>
        <input required value={form.requestTitle} placeholder={t.formTitle} onChange={(event) => setField('requestTitle', event.target.value)} />
      </label>
      <label>
        <span>{t.formDescription}</span>
        <textarea rows={3} value={form.requestDescription} placeholder={t.formDescription} onChange={(event) => setField('requestDescription', event.target.value)} />
      </label>
      <div className="designer-project-custom-detail-grid">
        <label>
          <span>{t.formMaterial}</span>
          <input value={form.requestedMaterial} placeholder={t.formMaterial} onChange={(event) => setField('requestedMaterial', event.target.value)} />
        </label>
        <label>
          <span>{t.formColor}</span>
          <input value={form.requestedColor} placeholder={t.formColor} onChange={(event) => setField('requestedColor', event.target.value)} />
        </label>
        <label>
          <span>Width (cm)</span>
          <input inputMode="decimal" value={form.requestedWidth} onChange={(event) => setDecimalField('requestedWidth', event.target.value)} />
        </label>
        <label>
          <span>Height (cm)</span>
          <input inputMode="decimal" value={form.requestedHeight} onChange={(event) => setDecimalField('requestedHeight', event.target.value)} />
        </label>
        <label>
          <span>Depth (cm)</span>
          <input inputMode="decimal" value={form.requestedDepth} onChange={(event) => setDecimalField('requestedDepth', event.target.value)} />
        </label>
      </div>
      <label>
        <span>{t.formChangeNote}</span>
        <textarea rows={2} value={form.requestedChangeNote} placeholder={t.formChangeNote} onChange={(event) => setField('requestedChangeNote', event.target.value)} />
      </label>
      <footer className="designer-project-custom-action-footer">
        <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={!canSubmitRequest} type="submit">
          {mutationPending ? t.submitting : t.submit}
        </button>
      </footer>
    </form>
  );
}

function RequestVersionPanel({
  activeRequest,
  cancelMutationPending,
  mutationPending,
  onCancelRequest,
  onNewVersion,
  onSubmitVersion,
  t,
}: Readonly<{
  activeRequest: CustomizationRequestDto;
  cancelMutationPending: boolean;
  mutationPending: boolean;
  onCancelRequest: () => void;
  onNewVersion: () => void;
  onSubmitVersion: (version: CustomizationRequestVersionDto) => void;
  t: typeof designerCopy.en.customizationTab;
}>) {
  const versions = activeRequest.versions ?? [];
  const canCreateVersion = activeRequest.status === 'SUBMITTED' || activeRequest.status === 'REVIEWING';
  const readOnlyRequest = activeRequest.status === 'ACCEPTED' || activeRequest.status === 'CANCELLED';

  return (
    <>
      <div className="designer-project-custom-review-header">
        <div>
          <span>{t.selectedRequest}</span>
          <h4>{activeRequest.requestTitle}</h4>
          <p className="designer-project-custom-review-status">
            <span className={`designer-project-status designer-project-status-${getRequestStatusTone(activeRequest.status)}`}>
              {formatEnumLabel(activeRequest.status ?? 'UNKNOWN')}
            </span>
          </p>
        </div>
        <button
          className="designer-project-detail-button designer-project-detail-button-primary designer-project-custom-new-version-button"
          disabled={!canCreateVersion || readOnlyRequest}
          type="button"
          onClick={onNewVersion}
        >
          <IconPlus size={15} stroke={2.2} />
          {t.newVersion}
        </button>
      </div>

      <CustomizationRequestSummary request={activeRequest} t={t} />

      <div className="designer-project-custom-detail">
        <div className="designer-project-custom-versions-header">
          <div>
            <span>{t.versionsLabel}</span>
            <strong>{versions.length ? t.versions(versions.length) : t.noVersion}</strong>
            <p>{t.successVersionSubmitted}</p>
          </div>
        </div>
        {versions.map((version) => (
          <VersionCard
            key={version.customizationRequestVersionId}
            mutationPending={mutationPending}
            version={version}
            onSubmit={() => onSubmitVersion(version)}
          />
        ))}
      </div>

      {!readOnlyRequest ? (
        <button className="designer-project-detail-button designer-project-custom-cancel-button" disabled={cancelMutationPending} type="button" onClick={onCancelRequest}>
          {cancelMutationPending ? t.cancelling : t.cancelRequest}
        </button>
      ) : null}
    </>
  );
}

function CustomizationRequestSummary({ request, t }: { request: CustomizationRequestDto; t: typeof designerCopy.en.customizationTab }) {
  return (
    <div className="designer-project-custom-detail">
      <div className="designer-project-custom-detail-section">
        <span>Source Product Version</span>
        <strong>{request.sourceProductVersion?.versionName ?? request.sourceProductVersionId}</strong>
        <p>{request.sourceProductVersion?.productName ?? '-'}</p>
      </div>
      <div className="designer-project-custom-detail-grid">
        <DetailValue label={t.formMaterial} value={request.requestedMaterial} />
        <DetailValue label={t.formColor} value={request.requestedColor} />
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
  onSubmit,
  version,
}: Readonly<{
  mutationPending: boolean;
  onSubmit: () => void;
  version: CustomizationRequestVersionDto;
}>) {
  const canSubmit = version.status === 'DRAFT';

  return (
    <div className="designer-project-custom-version-card">
      <div className="designer-project-custom-version-head">
        <div>
          <strong>{version.productVersion?.versionName ?? version.versionTitle ?? `Version ${version.versionNo}`}</strong>
          <span>Version {version.versionNo}</span>
        </div>
        <div className="designer-project-custom-version-badges">
          <span className={`designer-project-status designer-project-status-${getVersionStatusTone(version.status)}`}>
            {formatEnumLabel(version.status)}
          </span>
          <span className={`designer-project-status designer-project-status-${getFeasibilityStatusTone(version.feasibilityStatus)}`}>
            {formatEnumLabel(version.feasibilityStatus)}
          </span>
        </div>
      </div>
      <p>{version.designerNote || version.feasibilityNote || 'No designer note yet.'}</p>
      <div className="designer-project-custom-detail-grid">
        <DetailValue label="Material" value={version.productVersion?.material} />
        <DetailValue label="Color" value={version.productVersion?.color} />
        <DetailValue label="Estimated Price" value={formatMoney(version.productVersion?.estimatedPrice ?? version.productVersion?.price)} />
        <DetailValue label="Additional Cost" value={formatMoney(version.estimatedAdditionalCost)} />
      </div>
      <div className="designer-project-progress-actions">
        <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={!canSubmit || mutationPending} type="button" onClick={onSubmit}>
          Submit Review
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
  onSubmit,
  previewFile,
  t,
}: {
  editingVersion: CustomizationRequestVersionDto | null;
  form: VersionFormState;
  modelFile: File | null;
  mutationPending: boolean;
  onChange: (form: VersionFormState) => void;
  onModelFileChange: (file: File | null) => void;
  onPreviewFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  previewFile: File | null;
  t: typeof designerCopy.en.customizationTab;
}) {
  const setField = (name: keyof VersionFormState, value: string) => onChange({ ...form, [name]: value });
  const setDecimalField = (name: keyof VersionFormState, value: string) => setField(name, sanitizeCustomizationDecimalInput(value));
  const currentPreviewFile = editingVersion?.productVersion?.previewFiles?.[0] ?? null;

  return (
    <form className="designer-project-custom-action-form" onSubmit={onSubmit}>
      <div className="designer-project-custom-field-grid">
        <label>
          <span>{editingVersion ? 'Edit draft version' : 'Create custom version'}</span>
          <input required value={form.versionName} placeholder="Version name" onChange={(event) => setField('versionName', event.target.value)} />
        </label>
        <label>
          <span>Version title</span>
          <input value={form.versionTitle} placeholder="Version title" onChange={(event) => setField('versionTitle', event.target.value)} />
        </label>
      </div>
      <label>
        <span>Designer note</span>
        <textarea rows={3} value={form.designerNote} placeholder="Designer note" onChange={(event) => setField('designerNote', event.target.value)} />
      </label>
      <div className="designer-project-custom-field-grid">
        <label>
          <span>{t.material}</span>
          <input value={form.material} placeholder={t.formMaterial} onChange={(event) => setField('material', event.target.value)} />
        </label>
        <label>
          <span>{t.color}</span>
          <input value={form.color} placeholder={t.formColor} onChange={(event) => setField('color', event.target.value)} />
        </label>
        <label>
          <span>Width (cm)</span>
          <input inputMode="decimal" value={form.width} onChange={(event) => setDecimalField('width', event.target.value)} />
        </label>
        <label>
          <span>Height (cm)</span>
          <input inputMode="decimal" value={form.height} onChange={(event) => setDecimalField('height', event.target.value)} />
        </label>
        <label>
          <span>Depth (cm)</span>
          <input inputMode="decimal" value={form.depth} onChange={(event) => setDecimalField('depth', event.target.value)} />
        </label>
        <label>
          <span>Version code</span>
          <input value={form.versionCode} placeholder="Optional unique code" onChange={(event) => setField('versionCode', event.target.value)} />
        </label>
      </div>
      <div className="designer-project-custom-upload-section">
        <div>
          <span>Version Files</span>
          <p>Create the custom ProductVersion first, then upload files directly to that ProductVersion.</p>
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
              <strong>{previewFile?.name ?? getDisplayFileName(currentPreviewFile?.originalFileName, currentPreviewFile ? 'Current preview image' : 'Select PRODUCT_PREVIEW image')}</strong>
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
              <strong>{modelFile?.name ?? (form.modelFileId ? 'Current 3D model attached' : 'Select GLB/glTF model')}</strong>
              <small>Uploaded as MODEL_3D after this custom ProductVersion is saved.</small>
            </div>
          </div>
        </label>
        <div className="designer-project-custom-file-actions">
          <small>{modelFile ? 'Local model selected for upload.' : 'Choose a model file to upload with this custom ProductVersion.'}</small>
        </div>
      </div>
      <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={mutationPending} type="submit">
        {mutationPending ? t.saving : editingVersion ? t.updateDraft : t.createDraft}
      </button>
    </form>
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

function getVersionStatusTone(status: string) {
  if (status === 'DRAFT') return 'draft';
  if (status === 'REVIEWING') return 'pending';
  if (status === 'ACCEPTED' || status === 'APPROVED') return 'feasible';
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CANCELLED') return 'missing';

  return 'new';
}

function getFeasibilityStatusTone(status: string) {
  if (status === 'PENDING') return 'pending';
  if (status === 'FEASIBLE' || status === 'APPROVED') return 'feasible';
  if (status === 'NOT_FEASIBLE' || status === 'REJECTED') return 'missing';

  return 'new';
}

type RequestInputValidationResult =
  | { ok: true; input: SubmitCustomizationRequestInput }
  | { ok: false; message: string };

type VersionBodyValidationResult =
  | { ok: true; body: UpdateCustomizationRequestVersionDto }
  | { ok: false; message: string };

function getRequestInput(form: RequestFormState): RequestInputValidationResult {
  const width = validateOptionalCustomizationNumber(form.requestedWidth, 'Width (cm)');
  const height = validateOptionalCustomizationNumber(form.requestedHeight, 'Height (cm)');
  const depth = validateOptionalCustomizationNumber(form.requestedDepth, 'Depth (cm)');

  if (!width.ok) return width;
  if (!height.ok) return height;
  if (!depth.ok) return depth;

  const body = {
    proposalItemId: form.proposalItemId,
    requestTitle: form.requestTitle.trim(),
    requestDescription: normalizeText(form.requestDescription),
    requestedMaterial: normalizeText(form.requestedMaterial),
    requestedColor: normalizeText(form.requestedColor),
    requestedWidth: width.value,
    requestedHeight: height.value,
    requestedDepth: depth.value,
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
    return {
      ok: false,
      message: 'Select a proposal item, add a title, and provide at least one customization field.',
    };
  }

  return { ok: true, input: body };
}

function getVersionBody(form: VersionFormState): VersionBodyValidationResult {
  const width = validateOptionalCustomizationNumber(form.width, 'Width (cm)');
  const height = validateOptionalCustomizationNumber(form.height, 'Height (cm)');
  const depth = validateOptionalCustomizationNumber(form.depth, 'Depth (cm)');
  const estimatedPrice = validateOptionalCustomizationNumber(form.estimatedPrice, 'Estimated price');

  if (!width.ok) return width;
  if (!height.ok) return height;
  if (!depth.ok) return depth;
  if (!estimatedPrice.ok) return estimatedPrice;

  return {
    ok: true,
    body: {
      versionTitle: normalizeText(form.versionTitle),
      designerNote: normalizeText(form.designerNote),
      versionName: form.versionName.trim(),
      versionCode: normalizeText(form.versionCode),
      material: normalizeText(form.material),
      color: normalizeText(form.color),
      width: width.value,
      height: height.value,
      depth: depth.value,
      dimensionUnit: form.dimensionUnit,
      estimatedPrice: estimatedPrice.value,
      modelFileId: normalizeText(form.modelFileId),
      previewFileIds: getPreviewFileIds(form.previewFileIds),
    },
  };
}

function getVersionMetadataBody(
  formBody: UpdateCustomizationRequestVersionDto,
  request: CustomizationRequestDto,
  editingVersion: CustomizationRequestVersionDto | null,
): UpdateCustomizationRequestVersionDto {
  const inheritedEstimatedPrice = request.sourceProductVersion?.estimatedPrice
    ?? request.sourceProductVersion?.price
    ?? editingVersion?.productVersion?.estimatedPrice
    ?? editingVersion?.productVersion?.price
    ?? formBody.estimatedPrice;

  return {
    color: formBody.color,
    depth: formBody.depth,
    designerNote: formBody.designerNote,
    dimensionUnit: 'm',
    estimatedPrice: inheritedEstimatedPrice,
    height: formBody.height,
    material: formBody.material,
    versionCode: formBody.versionCode,
    versionName: formBody.versionName,
    versionTitle: formBody.versionTitle,
    width: formBody.width,
  };
}

function getVersionSaveErrorMessage(error: unknown) {
  const customizationResult = getCustomizationRequestServiceResultFromError(error);

  if (customizationResult?.errorCode && customizationResult.errorCode.startsWith('CUSTOMIZATION')) {
    return getCustomizationRequestServiceResultMessage(error);
  }

  if (customizationResult?.errorCode === 'PRODUCT_VERSION_FILE_LINK_CONFLICT') {
    return 'File already belongs to this version. Please refresh or choose another file.';
  }

  return getProductServiceResultMessage(error);
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

function isModel3dFileName(fileName: string) {
  return /\.(glb|gltf)$/i.test(fileName.trim());
}

function formFromVersion(version: CustomizationRequestVersionDto): VersionFormState {
  const productVersion = version.productVersion ?? {};

  return {
    color: productVersion.color ?? '',
    depth: formatInputNumber(productVersion.depth),
    designerNote: version.designerNote ?? '',
    dimensionUnit: isDimensionUnit(productVersion.dimensionUnit) ? productVersion.dimensionUnit : 'm',
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

function formFromCustomizationRequest(request: CustomizationRequestDto): VersionFormState {
  const customerNote = request.requestedChangeNote || request.requestDescription || '';

  return {
    ...emptyVersionForm,
    color: request.requestedColor ?? '',
    depth: formatInputNumber(request.requestedDepth),
    designerNote: customerNote,
    dimensionUnit: 'm',
    height: formatInputNumber(request.requestedHeight),
    material: request.requestedMaterial ?? '',
    versionName: request.requestTitle,
    versionTitle: request.requestTitle,
    width: formatInputNumber(request.requestedWidth),
  };
}

function getPreviewFileIds(value: string) {
  return value
    .split(',')
    .map((fileId) => fileId.trim())
    .filter(Boolean);
}

function getDisplayFileName(value: string | null | undefined, fallback: string) {
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

function isDimensionUnit(value?: string | null): value is 'cm' | 'm' | 'mm' {
  return value === 'cm' || value === 'm' || value === 'mm';
}

function normalizeText(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function validateOptionalCustomizationNumber(value: string, label: string) {
  const parsedValue = parseOptionalProjectRequestNumber(value);

  return validateOptionalPositiveNumber(parsedValue, label);
}

function sanitizeCustomizationDecimalInput(value: string) {
  return sanitizeProjectRequestDecimalInput(value);
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
