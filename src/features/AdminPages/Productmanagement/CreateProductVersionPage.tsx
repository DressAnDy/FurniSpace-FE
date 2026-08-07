import { type FormEvent, useState } from 'react';
import { IconArrowLeft, IconBox, IconCube, IconUpload, IconX } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  type CatalogFileDto,
  getProductServiceResultMessage,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizeRequiredText,
  type ProductVersionDto,
} from '@/services/api';
import { useCreateProductVersion, useProductDetail, useUpdateProductVersion, useUploadProductVersionFile } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';
import { SelectedImagePreview } from './SelectedImagePreview';

export function CreateProductVersionPage() {
  const navigate = useNavigate();
  const { productId, productVersionId } = useParams();
  const effectiveProductId = productId ?? sessionStorage.getItem('admin.createdProductId') ?? undefined;
  const isEditMode = Boolean(productVersionId);
  const productQuery = useProductDetail(effectiveProductId);
  const createVersionMutation = useCreateProductVersion();
  const updateVersionMutation = useUpdateProductVersion(effectiveProductId);
  const uploadVersionFileMutation = useUploadProductVersionFile(effectiveProductId);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState('');
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);
  const [isModelPreviewOpen, setIsModelPreviewOpen] = useState(false);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const product = productQuery.data;
  const versionToEdit = product?.versions.find((version) => version.productVersionId === productVersionId) ?? null;
  const currentPreviewFile = getVersionPreviewFile(versionToEdit);
  const currentModelFile = getVersionModelFile(versionToEdit);
  const isSaving = createVersionMutation.isPending || updateVersionMutation.isPending || uploadVersionFileMutation.isPending;
  const shouldRenderForm = !isEditMode || Boolean(versionToEdit);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFileUploadError('');

    if (!effectiveProductId || !product) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const versionName = normalizeRequiredText(formData.get('version_name'));

    if (!versionName) {
      return;
    }

    try {
      const savedProductVersionId = isEditMode
        ? (
            await updateVersionMutation.mutateAsync({
              productVersionId: productVersionId ?? '',
              versionName,
              versionType: 'STANDARD',
              material: normalizeOptionalText(formData.get('material')),
              color: normalizeOptionalText(formData.get('color')),
              width: normalizeOptionalNumber(formData.get('width')),
              height: normalizeOptionalNumber(formData.get('height')),
              depth: normalizeOptionalNumber(formData.get('depth')),
              estimatedPrice: normalizeOptionalNumber(formData.get('estimated_price')),
              isDefault: formData.get('is_default') === 'on',
              isPublic: formData.get('is_public') === 'on',
              isProjectSpecific: false,
            })
          ).productVersionId
        : createdVersionId ??
          (
            await createVersionMutation.mutateAsync({
              productId: effectiveProductId,
              versionCode: normalizeRequiredText(formData.get('version_code')),
              versionName,
              versionType: 'STANDARD',
              material: normalizeOptionalText(formData.get('material')),
              color: normalizeOptionalText(formData.get('color')),
              width: normalizeOptionalNumber(formData.get('width')),
              height: normalizeOptionalNumber(formData.get('height')),
              depth: normalizeOptionalNumber(formData.get('depth')),
              estimatedPrice: normalizeOptionalNumber(formData.get('estimated_price')),
              isDefault: formData.get('is_default') === 'on',
              isPublic: formData.get('is_public') === 'on',
              isProjectSpecific: false,
            })
          ).productVersionId;

      setCreatedVersionId(savedProductVersionId);

      const uploadErrors: string[] = [];

      if (previewFile) {
        try {
          await uploadVersionFileMutation.mutateAsync({
            productVersionId: savedProductVersionId,
            file: previewFile,
            fileType: 'PRODUCT_PREVIEW',
            description: isEditMode ? 'Updated product version preview image' : 'Product version preview image',
          });
          setPreviewFile(null);
        } catch (error) {
          uploadErrors.push(`PRODUCT_PREVIEW upload failed: ${getProductServiceResultMessage(error)}`);
        }
      }

      if (modelFile) {
        try {
          await uploadVersionFileMutation.mutateAsync({
            productVersionId: savedProductVersionId,
            file: modelFile,
            fileType: 'MODEL_3D',
            description: isEditMode ? 'Updated product version 3D model' : 'Product version 3D model',
          });
          setModelFile(null);
        } catch (error) {
          uploadErrors.push(`MODEL_3D upload failed: ${getProductServiceResultMessage(error)}`);
        }
      }

      if (uploadErrors.length > 0) {
        setFileUploadError(uploadErrors.join('\n'));
        return;
      }

      sessionStorage.removeItem('admin.createdProductId');
      navigate(`/admin/products/${effectiveProductId}/versions`);
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Versions" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Product Versions" />
          <div className="admin-content product-management-content">
            <div className="product-form-heading">
              <button className="product-version-back" type="button" onClick={() => navigate(`/admin/products/${effectiveProductId}/versions`)}>
                <IconArrowLeft size={16} />
                Back to Versions
              </button>
              <h2>{isEditMode ? 'Update Product Version' : 'Create Product Version'}</h2>
              <p>
                {isEditMode
                  ? `Update details, preview image, and 3D model for ${versionToEdit?.versionName ?? 'selected version'}`
                  : `Add a new version for ${product?.productName ?? 'selected product'}`}
              </p>
            </div>

            {productQuery.isLoading ? (
              <section className="product-management-state">Loading parent product from API...</section>
            ) : null}

            {productQuery.isError ? (
              <section className="product-management-state product-management-state-error">{getProductServiceResultMessage(productQuery.error)}</section>
            ) : null}

            {isEditMode && !productQuery.isLoading && !productQuery.isError && !versionToEdit ? (
              <section className="product-management-state product-management-state-error">Product version not found in this product.</section>
            ) : null}

            {shouldRenderForm ? (
            <form className="product-form-shell" key={versionToEdit?.productVersionId ?? 'create-version'} onSubmit={handleSubmit}>
              <section className="product-form-card">
                <div className="product-form-note">
                  <strong>Note:</strong>{' '}
                  {isEditMode
                    ? 'Version code cannot be changed. You can update version details and upload missing replacement files here.'
                    : 'Version type is fixed as STANDARD. Public visibility can be adjusted before saving.'}
                </div>

                <div className="product-form-section">
                  <h3>Parent Product Information</h3>
                  <div className="product-form-info-grid">
                    <div>
                      <span>Product Name</span>
                      <strong>{product?.productName ?? 'Loading...'}</strong>
                    </div>
                    <div>
                      <span>Category</span>
                      <strong>{product?.categoryName ?? 'Loading...'}</strong>
                    </div>
                    <div>
                      <span>Product Code</span>
                      <strong>{product?.productCode ?? 'Auto-generated'}</strong>
                    </div>
                  </div>
                </div>

                <div className="product-form-section">
                  <div className="product-form-section-title">
                    <IconBox size={20} />
                    <h3>Version Information</h3>
                  </div>

                  <div className="product-form-grid">
                    <label className="product-form-field">
                      <span>Version Code *</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.versionCode ?? ''}
                        disabled={isEditMode}
                        maxLength={50}
                        name="version_code"
                        placeholder="e.g., SOFA-LUX-001-A"
                        required={!isEditMode}
                        type="text"
                      />
                    </label>

                    <label className="product-form-field">
                      <span>Version Name *</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.versionName ?? ''}
                        maxLength={150}
                        name="version_name"
                        placeholder="e.g., Premium Oak, Standard Black"
                        required
                        type="text"
                      />
                    </label>

                    <label className="product-form-field">
                      <span>Material</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.material ?? ''} name="material" placeholder="e.g., Oak Wood, Leather" type="text" />
                    </label>

                    <label className="product-form-field">
                      <span>Color</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.color ?? ''} name="color" placeholder="e.g., Natural, Black, White" type="text" />
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Dimensions (cm)</h3>
                  <div className="product-form-grid product-form-grid-three">
                    <label className="product-form-field">
                      <span>Width</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.width ?? ''} name="width" placeholder="0" type="number" />
                    </label>

                    <label className="product-form-field">
                      <span>Height</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.height ?? ''} name="height" placeholder="0" type="number" />
                    </label>

                    <label className="product-form-field">
                      <span>Depth</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.depth ?? ''} name="depth" placeholder="0" type="number" />
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Pricing</h3>
                  <label className="product-form-field product-form-field-half">
                    <span>Estimated Price</span>
                    <input className="admin-form-input" defaultValue={versionToEdit?.estimatedPrice ?? ''} name="estimated_price" placeholder="0.00" type="number" />
                  </label>
                </div>

                <div className="product-form-section">
                  <h3>Version Settings</h3>
                  <div className="product-setting-list">
                    <label>
                      <input defaultChecked={versionToEdit?.isDefault ?? false} name="is_default" type="checkbox" />
                      <span>
                        <strong>Set as Default Version</strong>
                        <small>This version will be the default for this product</small>
                      </span>
                    </label>
                    <label>
                      <input defaultChecked={versionToEdit?.isPublic ?? true} name="is_public" type="checkbox" />
                      <span>
                        <strong>Is Public</strong>
                        <small>Controls whether this version is visible in catalog responses.</small>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Version Files</h3>
                  {isEditMode ? (
                    <div className="product-version-existing-files">
                      <div>
                        <span>Current Preview</span>
                        <strong>{currentPreviewFile?.originalFileName ?? 'No preview image yet'}</strong>
                      </div>
                      <div>
                        <span>Current 3D Model</span>
                        <strong>{currentModelFile?.originalFileName ?? 'No 3D model yet'}</strong>
                      </div>
                      <button className="product-card-button product-card-button-secondary" type="button" onClick={() => setIsModelPreviewOpen(true)}>
                        <IconCube size={16} />
                        Preview 3D
                      </button>
                    </div>
                  ) : null}

                  <label className="product-form-field product-form-field-full">
                    <span>{isEditMode ? 'Replace / Add Main Version Image' : 'Main Version Image'}</span>
                    <input
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="product-upload-input"
                      type="file"
                      onChange={(event) => setPreviewFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="product-upload-main">
                      {previewFile ? (
                        <SelectedImagePreview className="product-upload-main-preview" file={previewFile} />
                      ) : currentPreviewFile ? (
                        <img className="product-upload-main-preview" src={getCatalogFileUrl(currentPreviewFile) ?? ''} alt={currentPreviewFile.originalFileName} />
                      ) : (
                        <IconUpload size={46} />
                      )}
                      <strong>{previewFile ? previewFile.name : currentPreviewFile?.originalFileName ?? 'Click to select version preview'}</strong>
                      <small>Uploaded as PRODUCT_PREVIEW and visible to customers</small>
                    </div>
                  </label>

                  <label className="product-form-field product-form-field-full">
                    <span>{isEditMode ? 'Replace / Add 3D Model File' : '3D Model File'}</span>
                    <input
                      accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                      className="product-upload-input"
                      type="file"
                      onChange={(event) => setModelFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="product-upload-main product-upload-model-main">
                      <IconCube size={46} />
                      <strong>{modelFile ? modelFile.name : currentModelFile?.originalFileName ?? 'Click to select GLB/glTF model'}</strong>
                      <small>
                        Uploaded as MODEL_3D after this Product Version is saved. No Product Version ID input is needed.
                      </small>
                    </div>
                  </label>

                  <p className="product-form-helper">Product versions accept one PRODUCT_PREVIEW image and one MODEL_3D GLB/glTF file.</p>
                </div>

                {createVersionMutation.isError ? (
                  <p className="product-form-error">{getProductServiceResultMessage(createVersionMutation.error)}</p>
                ) : null}
                {updateVersionMutation.isError ? (
                  <p className="product-form-error">{getProductServiceResultMessage(updateVersionMutation.error)}</p>
                ) : null}
                {fileUploadError ? (
                  <p className="product-form-error">
                    Product version was saved, but file upload failed: {fileUploadError}
                  </p>
                ) : null}
              </section>

              <div className="product-form-actions">
                <button className="product-form-button product-form-button-secondary" type="button" onClick={() => navigate(`/admin/products/${effectiveProductId}/versions`)}>
                  Cancel
                </button>
                <button className="product-form-button product-form-button-primary" disabled={!product || isSaving} type="submit">
                  {isSaving ? 'Saving...' : isEditMode ? 'Update Version' : 'Save Version'}
                </button>
              </div>
            </form>
            ) : null}

            {isModelPreviewOpen ? (
              <div className="product-edit-modal-overlay">
                <section className="product-edit-modal-panel product-model-preview-modal" aria-label={`${versionToEdit?.versionName ?? 'Product version'} 3D model preview`}>
                  <div className="product-card-edit-heading">
                    <div>
                      <strong>{versionToEdit?.versionName ?? 'Product version'}</strong>
                      <p>
                        {viewerStatus === 'error'
                          ? viewerError
                          : currentModelFile
                            ? 'Drag to rotate, scroll to zoom.'
                            : 'No MODEL_3D file is attached to this version.'}
                      </p>
                    </div>
                    <button
                      aria-label="Close 3D model preview"
                      className="product-card-icon-button"
                      type="button"
                      onClick={() => {
                        setIsModelPreviewOpen(false);
                        setViewerStatus('idle');
                        setViewerError(null);
                      }}
                    >
                      <IconX size={16} />
                    </button>
                  </div>

                  <div className="product-model-preview-canvas">
                    <ModelViewer
                      fallbackImageUrl={getCatalogFileUrl(currentPreviewFile) ?? undefined}
                      height="100%"
                      modelUrl={getCatalogFileUrl(currentModelFile) ?? undefined}
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

export default CreateProductVersionPage;
