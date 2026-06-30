import { type FormEvent, useState } from 'react';
import { IconArrowLeft, IconBox, IconCheck, IconCube, IconEdit, IconPlus, IconX } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  getProductServiceResultMessage,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizeRequiredText,
  type ProductVersionDto,
  type ProductVersionType,
} from '@/services/api';
import { useProductDetail, useSetDefaultProductVersion, useUpdateProductVersion } from '@/services/queries';

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
  return version?.thumbnail ?? version?.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW') ?? null;
}

export function ProductVersionManagement() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const productQuery = useProductDetail(productId);
  const setDefaultMutation = useSetDefaultProductVersion(productId);
  const updateVersionMutation = useUpdateProductVersion(productId);
  const product = productQuery.data;
  const versions = product?.versions ?? [];
  const previewVersion = versions.find((version) => version.productVersionId === previewVersionId) ?? null;
  const previewModelFile = getVersionModelFile(previewVersion);
  const previewImageFile = getVersionPreviewFile(previewVersion);

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>, productVersionId: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const versionName = normalizeRequiredText(formData.get('version_name'));

    if (!versionName) {
      return;
    }

    try {
      await updateVersionMutation.mutateAsync({
        productVersionId,
        versionName,
        versionType: normalizeRequiredText(formData.get('version_type')) as ProductVersionType,
        material: normalizeOptionalText(formData.get('material')),
        color: normalizeOptionalText(formData.get('color')),
        width: normalizeOptionalNumber(formData.get('width')),
        height: normalizeOptionalNumber(formData.get('height')),
        depth: normalizeOptionalNumber(formData.get('depth')),
        estimatedPrice: normalizeOptionalNumber(formData.get('estimated_price')),
        isDefault: formData.get('is_default') === 'on',
        isPublic: formData.get('is_public') === 'on',
        isProjectSpecific: false,
      });
      setEditingVersionId(null);
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Versions" />

        <section className="admin-main">
          <AdminNavbar />

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
                const thumbnailUrl = version.thumbnail?.fileUrl ?? version.files?.[0]?.fileUrl;

                return (
                  <article key={version.productVersionId} className="product-version-card">
                    <div className="product-card-media">
                      <span className="product-version-index">#{index + 1}</span>
                      <span className={`product-card-status ${statusClassName[version.status] ?? 'product-management-status-archived'}`}>
                        {version.status}
                      </span>
                      {thumbnailUrl ? (
                        <img className="product-card-image" src={thumbnailUrl} alt={version.versionName} />
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
                      <div>
                        <span>Type</span>
                        <strong>{version.versionType}</strong>
                      </div>
                    </div>

                    <div className="product-version-details">
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
                        onClick={() => setEditingVersionId(version.productVersionId)}
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

                    {editingVersionId === version.productVersionId ? (
                      <div className="product-edit-modal-overlay">
                        <form className="product-edit-modal-panel product-version-edit-modal-panel" onSubmit={(event) => handleEditSubmit(event, version.productVersionId)}>
                          <div className="product-card-edit-heading">
                            <div>
                              <strong>Edit Product Version</strong>
                              <p>Update version details and visibility settings.</p>
                            </div>
                            <button
                              aria-label="Close edit product version form"
                              className="product-card-icon-button"
                              type="button"
                              onClick={() => setEditingVersionId(null)}
                            >
                              <IconX size={16} />
                            </button>
                          </div>

                          <div className="product-form-grid">
                            <label className="product-form-field">
                              <span>Version Code</span>
                              <input className="admin-form-input" defaultValue={version.versionCode} disabled type="text" />
                            </label>

                            <label className="product-form-field">
                              <span>Version Name *</span>
                              <input
                                className="admin-form-input"
                                defaultValue={version.versionName}
                                maxLength={150}
                                name="version_name"
                                required
                                type="text"
                              />
                            </label>

                            <label className="product-form-field">
                              <span>Version Type</span>
                              <select className="admin-form-input" defaultValue={version.versionType} name="version_type">
                                <option value="STANDARD">STANDARD</option>
                                <option value="CUSTOM">CUSTOM</option>
                                <option value="PROJECT_SPECIFIC">PROJECT_SPECIFIC</option>
                              </select>
                            </label>

                            <label className="product-form-field">
                              <span>Material</span>
                              <input className="admin-form-input" defaultValue={version.material ?? ''} name="material" type="text" />
                            </label>

                            <label className="product-form-field">
                              <span>Color</span>
                              <input className="admin-form-input" defaultValue={version.color ?? ''} name="color" type="text" />
                            </label>

                            <label className="product-form-field">
                              <span>Estimated Price</span>
                              <input className="admin-form-input" defaultValue={version.estimatedPrice ?? ''} name="estimated_price" type="number" />
                            </label>
                          </div>

                          <div className="product-form-grid product-form-grid-three">
                            <label className="product-form-field">
                              <span>Width</span>
                              <input className="admin-form-input" defaultValue={version.width ?? ''} name="width" type="number" />
                            </label>

                            <label className="product-form-field">
                              <span>Height</span>
                              <input className="admin-form-input" defaultValue={version.height ?? ''} name="height" type="number" />
                            </label>

                            <label className="product-form-field">
                              <span>Depth</span>
                              <input className="admin-form-input" defaultValue={version.depth ?? ''} name="depth" type="number" />
                            </label>
                          </div>

                          <div className="product-setting-list product-card-edit-settings">
                            <label>
                              <input defaultChecked={version.isDefault} name="is_default" type="checkbox" />
                              <span>
                                <strong>Set as Default Version</strong>
                                <small>Only one version should be default for a product.</small>
                              </span>
                            </label>
                            <label>
                              <input defaultChecked={version.isPublic} name="is_public" type="checkbox" />
                              <span>
                                <strong>Is Public</strong>
                                <small>Controls whether this version is visible in catalog responses.</small>
                              </span>
                            </label>
                            <div className="product-setting-fixed">
                              <strong>Is Project Specific</strong>
                              <small>Always submitted as false in this edit form.</small>
                            </div>
                          </div>

                          {updateVersionMutation.isError ? (
                            <p className="product-form-error">{getProductServiceResultMessage(updateVersionMutation.error)}</p>
                          ) : null}

                          <div className="product-card-edit-actions">
                            <button className="product-form-button product-form-button-secondary" type="button" onClick={() => setEditingVersionId(null)}>
                              Cancel
                            </button>
                            <button className="product-form-button product-form-button-primary" disabled={updateVersionMutation.isPending} type="submit">
                              {updateVersionMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : null}
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
                      fallbackImageUrl={previewImageFile?.fileUrl}
                      height="100%"
                      modelUrl={previewModelFile?.fileUrl}
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

export default ProductVersionManagement;
