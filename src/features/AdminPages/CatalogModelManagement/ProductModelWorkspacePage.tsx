import { type ChangeEvent, useCallback, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
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
  type ProductVersionFileType,
} from '@/services/api';
import {
  useFilesByReference,
  useProductDetail,
  useUploadProductVersionFile,
} from '@/services/queries';

import { getPlannerReadiness, getVersionFile } from './catalogModel.utils';
import './CatalogModelManagement.css';

function formatPrice(value: number | null) {
  return value === null ? 'Not set' : `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

export function ProductModelWorkspacePage() {
  const navigate = useNavigate();
  const { productId, productVersionId } = useParams();
  const productQuery = useProductDetail(productId);
  const filesQuery = useFilesByReference(productVersionId ? {
    referenceId: productVersionId,
    referenceType: 'PRODUCT_VERSION',
    limit: 100,
  } : undefined);
  const uploadMutation = useUploadProductVersionFile(productId);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [viewerRevision, setViewerRevision] = useState(0);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const product = productQuery.data;
  const version = product?.versions.find((candidate) => candidate.productVersionId === productVersionId) ?? null;
  const apiFiles = useMemo(
    () => filesQuery.data?.items ?? [],
    [filesQuery.data?.items],
  );
  const displayedFiles = apiFiles;
  const modelFile = displayedFiles.find((file) => file.fileType === 'MODEL_3D');
  const previewFile = displayedFiles.find((file) => file.fileType === 'PRODUCT_PREVIEW');
  const modelUrl = modelFile?.publicUrl ?? getVersionFile(version, 'MODEL_3D')?.fileUrl;
  const previewUrl = previewFile?.publicUrl ?? version?.thumbnail?.fileUrl ?? getVersionFile(version, 'PRODUCT_PREVIEW')?.fileUrl;
  const dimensions = version
    ? `${version.width ?? '-'} x ${version.height ?? '-'} x ${version.depth ?? '-'}`
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

  const handleViewerStatusChange = useCallback((status: ModelViewerStatus, error: string | null) => {
    setViewerStatus(status);
    setViewerError(error);
  }, []);

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="3D Model & File Library" />
        <section className="admin-main">
          <AdminNavbar
            activeLabel={(
              <button className="product-version-back product-version-back-topbar" type="button" onClick={() => navigate('/admin/catalog/models')}>
                <IconArrowLeft size={16} /> Back to 3D Models
              </button>
            )}
          />
          <div className="admin-content model-workspace-content">
            <header className="product-management-heading model-workspace-heading">
              <div>
                <h2>{version?.versionName ?? 'Product Version Model Workspace'}</h2>
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
            {actionMessage && <div className="catalog-action-message">{actionMessage}</div>}

            {version && product && (
              <div className="model-workspace-layout">
                <aside className="model-workspace-details model-version-panel">
                  <div className="model-workspace-section-heading">
                    <span>Version information</span>
                    <strong className={`catalog-inline-status is-${version.status.toLowerCase()}`}>{version.status}</strong>
                  </div>
                  <dl className="model-metadata-list model-version-summary">
                    <div><dt>Product</dt><dd>{product.productName}</dd></div>
                    <div><dt>Version</dt><dd>{version.versionName}</dd></div>
                    <div><dt>Type</dt><dd>{version.versionType}</dd></div>
                    <div><dt>Dimensions W x H x D</dt><dd>{dimensions}</dd></div>
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
                      <label className="model-preview-version-control">
                        <span>Version assets</span>
                        <select
                          className="model-preview-version-select"
                          value={version.productVersionId}
                          onChange={(event) => navigate(`/admin/catalog/models/workspace/${product.productId}/${event.target.value}`)}
                        >
                          {product.versions.map((candidate) => (
                            <option key={candidate.productVersionId} value={candidate.productVersionId}>
                              {candidate.versionName}
                            </option>
                          ))}
                        </select>
                      </label>
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

              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
