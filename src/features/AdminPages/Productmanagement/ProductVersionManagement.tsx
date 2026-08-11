import { useState } from 'react';
import { IconArrowLeft, IconBox, IconCheck, IconCube, IconEdit, IconPlus, IconX } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  type CatalogFileDto,
  getProductServiceResultMessage,
  type ProductVersionDto,
} from '@/services/api';
import { useProductDetail, useSetDefaultProductVersion } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const statusClassName: Record<string, string> = {
  ACTIVE: 'product-management-status-active',
  INACTIVE: 'product-management-status-inactive',
  ARCHIVED: 'product-management-status-archived',
};

function formatDimensions(width: number | null, height: number | null, depth: number | null) {
  const values = [width, height, depth].map((value) => (value === null ? '-' : value));

  return `${values[0]} x ${values[1]} x ${values[2]}`;
}

function formatPrice(value: number | null) {
  if (value === null) {
    return 'Not set';
  }

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function getVersionModelFile(version: ProductVersionDto | null | undefined) {
  return version?.files?.find((file) => file.fileType === 'MODEL_3D') ?? null;
}

function getVersionPreviewFile(version: ProductVersionDto | null | undefined) {
  if (version?.thumbnail?.fileType === 'PRODUCT_PREVIEW') {
    return version.thumbnail;
  }

  return version?.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW') ?? null;
}

function getCatalogFileUrl(file: CatalogFileDto | null | undefined) {
  const fileLike = file as (CatalogFileDto & { publicUrl?: string | null; url?: string | null }) | null | undefined;

  return fileLike?.fileUrl ?? fileLike?.publicUrl ?? fileLike?.url ?? null;
}

export function ProductVersionManagement() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const productQuery = useProductDetail(productId);
  const setDefaultMutation = useSetDefaultProductVersion(productId);
  const product = productQuery.data;
  const versions = product?.versions ?? [];
  const previewVersion = versions.find((version) => version.productVersionId === previewVersionId) ?? null;
  const previewModelFile = getVersionModelFile(previewVersion);
  const previewImageFile = getVersionPreviewFile(previewVersion);

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Versions" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Product Versions" />
          <div className="admin-content product-management-content">
            <div className="product-version-heading">
              <div>
                <button className="product-version-back" type="button" onClick={() => navigate('/admin/products')}>
                  <IconArrowLeft size={16} />
                  Back to Products
                </button>
                <h2>Product Versions</h2>
                <p>Product ID: {product?.productCode ?? productId ?? 'Loading...'}</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => navigate(`/admin/products/${productId}/versions/create`)} disabled={!productId}>
                <IconPlus size={16} />
                Add Version
              </button>
            </div>

            {productQuery.isLoading ? (
              <section className="product-management-state">Loading product versions from API...</section>
            ) : null}

            {productQuery.isError ? (
              <section className="product-management-state product-management-state-error">{getProductServiceResultMessage(productQuery.error)}</section>
            ) : null}

            {setDefaultMutation.isError ? (
              <section className="product-management-state product-management-state-error">
                {getProductServiceResultMessage(setDefaultMutation.error)}
              </section>
            ) : null}

            {product ? (
              <section className="product-version-summary">
                <div>
                  <span>Product</span>
                  <strong>{product.productName}</strong>
                  <p>{product.description ?? 'No description yet.'}</p>
                </div>
                <div>
                  <span>Category</span>
                  <strong>{product.categoryName}</strong>
                </div>
              </section>
            ) : null}

            {!productQuery.isLoading && !productQuery.isError && versions.length === 0 ? (
              <section className="product-management-state">No product versions found.</section>
            ) : null}

            <section className="product-version-grid">
              {versions.map((version, index) => {
                const thumbnailUrl = getCatalogFileUrl(getVersionPreviewFile(version));

                return (
                  <article key={version.productVersionId} className="product-version-card">
                    <div className="product-card-media">
                      <span className="product-version-index">#{index + 1}</span>
                      <span className={`product-card-status ${statusClassName[version.status] ?? 'product-management-status-archived'}`}>
                        {version.status}
                      </span>
                      {thumbnailUrl ? (
                        <ProductVersionImage alt={version.versionName} src={thumbnailUrl} />
                      ) : (
                        <div className="product-card-placeholder">
                          <IconBox size={42} />
                          <span>No image</span>
                        </div>
                      )}
                    </div>

                  <div className="product-card-body">
                    <h3>{version.versionName}</h3>
                    <p className="product-card-category">{version.versionCode}</p>

                    <div className="product-version-price-row">
                      <div>
                        <span>Price</span>
                        <strong>{formatPrice(version.estimatedPrice)}</strong>
                      </div>
                    </div>

                    <div className="product-version-details">
                      <div>
                        <span>Type</span>
                        <strong>{version.versionType}</strong>
                      </div>
                      <div>
                        <span>Material</span>
                        <strong>{version.material ?? 'Not set'}</strong>
                      </div>
                      <div>
                        <span>Color</span>
                        <strong>{version.color ?? 'Not set'}</strong>
                      </div>
                      <div>
                        <span>Dimensions</span>
                        <strong>{formatDimensions(version.width, version.height, version.depth)}</strong>
                      </div>
                    </div>

                    <div className="product-version-flags">
                      {version.isDefault ? <span className="product-management-flag">DEFAULT</span> : null}
                      {version.isPublic ? <span className="product-management-flag">PUBLIC</span> : null}
                      {version.isProjectSpecific ? <span className="product-management-flag">PROJECT</span> : null}
                    </div>

                    <div className="product-card-actions">
                      <button
                        className="product-card-button product-card-button-secondary"
                        type="button"
                        onClick={() => {
                          setPreviewVersionId(version.productVersionId);
                          setViewerStatus('idle');
                          setViewerError(null);
                        }}
                      >
                        <IconCube size={16} />
                        3D Assets
                      </button>
                      <button
                        className="product-card-button product-card-button-secondary"
                        type="button"
                        onClick={() => navigate(`/admin/products/${productId}/versions/${version.productVersionId}/edit`)}
                      >
                        <IconEdit size={16} />
                        Edit
                      </button>
                      <button
                        className="product-card-button product-card-button-primary"
                        disabled={version.isDefault || setDefaultMutation.isPending}
                        type="button"
                        onClick={() => setDefaultMutation.mutate(version.productVersionId)}
                      >
                        <IconCheck size={16} />
                        {version.isDefault ? 'Default' : 'Set Default'}
                      </button>
                    </div>

                  </div>
                  </article>
                );
              })}
            </section>

            <div className="product-management-note">
              <strong>Note:</strong> Versions will be locked after inventory stock is created. Only Active versions can be calculated.
            </div>

            {previewVersion ? (
              <div className="product-edit-modal-overlay">
                <section className="product-edit-modal-panel product-model-preview-modal" aria-label={`${previewVersion.versionName} 3D model preview`}>
                  <div className="product-card-edit-heading">
                    <div>
                      <strong>{previewVersion.versionName}</strong>
                      <p>
                        {viewerStatus === 'error'
                          ? viewerError
                          : previewModelFile
                            ? 'Drag to rotate, scroll to zoom.'
                            : 'No MODEL_3D file is attached to this version.'}
                      </p>
                    </div>
                    <button
                      aria-label="Close 3D model preview"
                      className="product-card-icon-button"
                      type="button"
                      onClick={() => setPreviewVersionId(null)}
                    >
                      <IconX size={16} />
                    </button>
                  </div>

                  <div className="product-model-preview-canvas">
                    <ModelViewer
                      fallbackImageUrl={getCatalogFileUrl(previewImageFile) ?? undefined}
                      height="100%"
                      modelUrl={getCatalogFileUrl(previewModelFile) ?? undefined}
                      showGrid={false}
                      onStatusChange={(status, error) => {
                        setViewerStatus(status);
                        setViewerError(error);
                      }}
                    />
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

type ProductVersionImageProps = {
  alt: string;
  src: string;
};

function ProductVersionImage({ alt, src }: ProductVersionImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="product-card-placeholder">
        <IconBox size={42} />
        <span>No image</span>
      </div>
    );
  }

  return <img className="product-card-image" src={src} alt={alt} onError={() => setHasError(true)} />;
}

export default ProductVersionManagement;
