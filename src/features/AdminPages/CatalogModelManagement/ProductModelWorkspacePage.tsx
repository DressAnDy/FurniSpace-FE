import { type ChangeEvent, useCallback, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconArchive,
  IconArrowLeft,
  IconCheck,
  IconCube,
  IconFile3d,
  IconPhoto,
  IconRefresh,
  IconRotate,
  IconUpload,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';
import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  getProductServiceResultMessage,
  type FileListItemDto,
  type ProductVersionFileType,
} from '@/services/api';
import {
  useArchiveFile,
  useFilesByReference,
  useProductDetail,
  useUploadProductVersionFile,
} from '@/services/queries';

import { formatFileSize, getPlannerReadiness, getVersionFile } from './catalogModel.utils';
import {
  CATALOG_MOCK_ENABLED,
  getMockCatalogProduct,
  getMockVersionFiles,
} from './catalogModel.mock';
import './CatalogModelManagement.css';

function formatPrice(value: number | null) {
  return value === null ? 'Not set' : `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

export function ProductModelWorkspacePage() {
  const navigate = useNavigate();
  const { productId, productVersionId } = useParams();
  const productQuery = useProductDetail(productId, !CATALOG_MOCK_ENABLED);
  const filesQuery = useFilesByReference(productVersionId ? {
    referenceId: productVersionId,
    referenceType: 'PRODUCT_VERSION',
    limit: 100,
  } : undefined, !CATALOG_MOCK_ENABLED);
  const uploadMutation = useUploadProductVersionFile(productId);
  const archiveMutation = useArchiveFile(productId);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [viewerRevision, setViewerRevision] = useState(0);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [demoFiles, setDemoFiles] = useState<FileListItemDto[]>([]);
  const [archivedDemoFileIds, setArchivedDemoFileIds] = useState<string[]>([]);
  const product = CATALOG_MOCK_ENABLED ? getMockCatalogProduct(productId) : productQuery.data;
  const version = product?.versions.find((candidate) => candidate.productVersionId === productVersionId) ?? null;
  const apiFiles = useMemo(
    () => (CATALOG_MOCK_ENABLED ? getMockVersionFiles(productVersionId) : filesQuery.data?.items ?? []),
    [filesQuery.data?.items, productVersionId],
  );
  const displayedFiles = useMemo(
    () => [...demoFiles, ...apiFiles].filter((file) => !archivedDemoFileIds.includes(file.fileId)),
    [apiFiles, archivedDemoFileIds, demoFiles],
  );
  const modelFile = displayedFiles.find((file) => file.fileType === 'MODEL_3D');
  const previewFile = displayedFiles.find((file) => file.fileType === 'PRODUCT_PREVIEW');
  const modelUrl = modelFile?.publicUrl ?? (CATALOG_MOCK_ENABLED ? undefined : getVersionFile(version, 'MODEL_3D')?.fileUrl);
  const previewUrl = previewFile?.publicUrl ?? (CATALOG_MOCK_ENABLED
    ? undefined
    : version?.thumbnail?.fileUrl ?? getVersionFile(version, 'PRODUCT_PREVIEW')?.fileUrl);
  const dimensions = version
    ? `${version.width ?? '-'} × ${version.height ?? '-'} × ${version.depth ?? '-'}`
    : '-';
  const readinessVersion = version ? {
    ...version,
    files: displayedFiles.map((file) => ({
      fileId: file.fileId,
      fileLinkId: file.fileLinkId,
      fileSizeBytes: file.fileSize,
      fileType: file.fileType,
      fileUrl: file.publicUrl,
      mimeType: file.mimeType,
      originalFileName: file.originalFileName,
    })),
    thumbnail: previewFile ? {
      fileId: previewFile.fileId,
      fileLinkId: previewFile.fileLinkId,
      fileSizeBytes: previewFile.fileSize,
      fileType: previewFile.fileType,
      fileUrl: previewFile.publicUrl,
      mimeType: previewFile.mimeType,
      originalFileName: previewFile.originalFileName,
    } : null,
  } : null;
  const readiness = product && readinessVersion ? getPlannerReadiness(product.status, readinessVersion) : null;

  async function uploadFile(event: ChangeEvent<HTMLInputElement>, fileType: ProductVersionFileType) {
    const file = event.target.files?.[0];

    if (!file || !productVersionId) return;

    setActionMessage('');

    if (CATALOG_MOCK_ENABLED) {
      const demoFile: FileListItemDto = {
        fileId: `demo-${fileType}-${Date.now()}`,
        fileLinkId: `demo-link-${Date.now()}`,
        fileSize: file.size,
        fileType,
        mimeType: file.type || (fileType === 'MODEL_3D' ? 'model/gltf-binary' : 'image/*'),
        originalFileName: file.name,
        publicUrl: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Demo Admin',
        visibility: 'STAFF_ONLY',
      };
      setDemoFiles((currentFiles) => [demoFile, ...currentFiles.filter((item) => item.fileType !== fileType)]);
      setActionMessage(`${fileType} added to the demo workspace.`);
      setViewerRevision((revision) => revision + 1);
      event.target.value = '';
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file,
        fileType,
        productVersionId,
        description: fileType === 'MODEL_3D' ? 'Product Version 3D model' : 'Product Version preview image',
      });
      setActionMessage(`${fileType} uploaded successfully.`);
      setViewerRevision((revision) => revision + 1);
    } catch (error) {
      setActionMessage(getProductServiceResultMessage(error));
    } finally {
      event.target.value = '';
    }
  }

  async function archiveAsset(file: FileListItemDto) {
    setActionMessage('');

    if (CATALOG_MOCK_ENABLED) {
      setArchivedDemoFileIds((fileIds) => [...fileIds, file.fileId]);
      setActionMessage(`${file.originalFileName} archived in demo mode.`);
      setViewerRevision((revision) => revision + 1);
      return;
    }

    try {
      await archiveMutation.mutateAsync(file.fileId);
      setActionMessage(`${file.originalFileName} archived.`);
      setViewerRevision((revision) => revision + 1);
    } catch (error) {
      setActionMessage(getProductServiceResultMessage(error));
    }
  }

  const handleViewerStatusChange = useCallback((status: ModelViewerStatus, error: string | null) => {
    setViewerStatus(status);
    setViewerError(error);
  }, []);

  const queryError = CATALOG_MOCK_ENABLED ? null : productQuery.error ?? filesQuery.error;

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="3D Model & File Library" />
        <section className="admin-main">
          <AdminNavbar />
          <div className="admin-content model-workspace-content">
            <header className="model-workspace-heading">
              <div>
                <button className="product-version-back" type="button" onClick={() => navigate('/admin/catalog/models')}>
                  <IconArrowLeft size={16} /> Back to 3D Models
                </button>
                <h2>{version?.versionName ?? 'Product Version Model Workspace'}</h2>
                <p>{product?.productName ?? 'Loading product'} · {version?.versionCode ?? productVersionId}</p>
              </div>
              <div className="model-workspace-upload-actions">
                <label className="admin-button admin-button-secondary">
                  <IconPhoto size={16} /> Preview image
                  <input accept="image/*" hidden type="file" onChange={(event) => void uploadFile(event, 'PRODUCT_PREVIEW')} />
                </label>
                <label className="admin-button admin-button-primary">
                  <IconUpload size={16} /> Upload model
                  <input accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden type="file" onChange={(event) => void uploadFile(event, 'MODEL_3D')} />
                </label>
              </div>
            </header>

            {(productQuery.isLoading || filesQuery.isLoading) && <div className="catalog-model-state">Loading Product Version assets...</div>}
            {queryError && <div className="catalog-model-state is-error">{getProductServiceResultMessage(queryError)}</div>}
            {!productQuery.isLoading && product && !version && (
              <div className="catalog-model-state is-error">Product Version was not found in this Product.</div>
            )}
            {actionMessage && <div className="catalog-action-message">{actionMessage}</div>}
            {CATALOG_MOCK_ENABLED && (
              <div className="catalog-demo-banner">
                Demo mode: uploads and archive actions only affect this browser session.
              </div>
            )}

            {version && product && (
              <div className="model-workspace-layout">
                <aside className="model-workspace-details">
                  <div className="model-workspace-section-heading">
                    <span>Version information</span>
                    <strong className={`catalog-inline-status is-${version.status.toLowerCase()}`}>{version.status}</strong>
                  </div>
                  <label className="model-version-selector">
                    <span>Product Version</span>
                    <select
                      value={version.productVersionId}
                      onChange={(event) => navigate(`/admin/catalog/models/${product.productId}/${event.target.value}`)}
                    >
                      {product.versions.map((candidate) => (
                        <option key={candidate.productVersionId} value={candidate.productVersionId}>
                          {candidate.versionName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <dl className="model-metadata-list">
                    <div><dt>Product</dt><dd>{product.productName}</dd></div>
                    <div><dt>Version</dt><dd>{version.versionName}</dd></div>
                    <div><dt>Type</dt><dd>{version.versionType}</dd></div>
                    <div><dt>Dimensions W × H × D</dt><dd>{dimensions}</dd></div>
                    <div><dt>Material</dt><dd>{version.material ?? 'Not set'}</dd></div>
                    <div><dt>Color</dt><dd>{version.color ?? 'Not set'}</dd></div>
                    <div><dt>Estimated price</dt><dd>{formatPrice(version.estimatedPrice)}</dd></div>
                  </dl>

                  <div className="model-workspace-section-heading"><span>Planner readiness</span></div>
                  <div className={readiness?.isReady ? 'planner-readiness is-ready' : 'planner-readiness is-warning'}>
                    {readiness?.isReady ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                    <strong>{readiness?.isReady ? 'Ready for Room Planner' : 'Needs attention'}</strong>
                  </div>
                  {!readiness?.isReady && (
                    <ul className="planner-readiness-issues">
                      {readiness?.issues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                  )}
                </aside>

                <section className="model-preview-workspace">
                  <div className="model-preview-toolbar">
                    <div>
                      <strong>3D Preview</strong>
                      <span>{viewerStatus === 'error' ? viewerError : modelUrl ? modelFile?.originalFileName ?? 'MODEL_3D' : 'No model attached'}</span>
                    </div>
                    <div>
                      <button className={autoRotate ? 'is-active' : ''} type="button" title="Auto rotate" onClick={() => setAutoRotate((enabled) => !enabled)}>
                        <IconRotate size={17} />
                      </button>
                      <button className={showGrid ? 'is-active' : ''} type="button" onClick={() => setShowGrid((visible) => !visible)}>Grid</button>
                      <button type="button" title="Reset viewer" onClick={() => setViewerRevision((revision) => revision + 1)}>
                        <IconRefresh size={17} />
                      </button>
                    </div>
                  </div>
                  <ModelViewer
                    autoRotate={autoRotate}
                    fallbackImageUrl={previewUrl}
                    height="100%"
                    key={`${viewerRevision}-${showGrid}`}
                    modelUrl={modelUrl}
                    showGrid={showGrid}
                    onStatusChange={handleViewerStatusChange}
                  />
                </section>

                <aside className="model-assets-panel">
                  <div className="model-workspace-section-heading">
                    <span>Version assets</span>
                    <strong>{displayedFiles.length}</strong>
                  </div>
                  {displayedFiles.length === 0 && (
                    <div className="model-assets-empty"><IconFile3d size={28} /><span>No linked files found.</span></div>
                  )}
                  <div className="model-assets-list">
                    {displayedFiles.map((file) => (
                      <article className="model-asset-row" key={file.fileLinkId}>
                        <div className="model-asset-icon">{file.fileType === 'MODEL_3D' ? <IconCube size={18} /> : <IconPhoto size={18} />}</div>
                        <div>
                          <strong>{file.originalFileName}</strong>
                          <span>{file.fileType} · {formatFileSize(file.fileSize)}</span>
                          <small>{new Date(file.uploadedAt).toLocaleString()}</small>
                        </div>
                        <button
                          aria-label={`Archive ${file.originalFileName}`}
                          disabled={archiveMutation.isPending}
                          title="Archive file"
                          type="button"
                          onClick={() => void archiveAsset(file)}
                        >
                          <IconArchive size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
