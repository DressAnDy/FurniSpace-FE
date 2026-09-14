import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconBox, IconCube, IconUpload, IconX } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  type CatalogFileDto,
  getProductServiceResultMessage,
  normalizeOptionalText,
  normalizeRequiredText,
  type ProductVersionDto,
} from '@/services/api';
import { useCreateProductVersion, useProductDetail, useUpdateProductVersion, useUploadProductVersionFile } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { useLang } from '@/app/providers/useLang';
import { adminCopy } from '../admincomponents/adminI18n';
import './Productmanagement.css';
import { SelectedImagePreview } from './SelectedImagePreview';

const VERSION_CODE_PATTERN = /^[A-Z0-9_-]+$/;
const MAX_VERSION_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VERSION_MODEL_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_VERSION_IMAGE_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
]);
const ALLOWED_MODEL_EXTENSIONS = new Set(['glb', 'gltf']);
const ALLOWED_MODEL_TYPES = new Set(['model/gltf-binary', 'model/gltf+json']);

export function CreateProductVersionPage() {
  const { lang } = useLang();
  const t = adminCopy[lang];
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
  const [isVersionFormReady, setIsVersionFormReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const product = productQuery.data;
  const versionToEdit = product?.versions.find((version) => version.productVersionId === productVersionId) ?? null;
  const currentPreviewFile = getVersionPreviewFile(versionToEdit);
  const currentModelFile = getVersionModelFile(versionToEdit);
  const isSaving = createVersionMutation.isPending || updateVersionMutation.isPending || uploadVersionFileMutation.isPending;
  const shouldRenderForm = !isEditMode || Boolean(versionToEdit);

  const refreshVersionFormReady = useCallback(() => {
    const currentForm = formRef.current;

    setIsVersionFormReady(
      currentForm
        ? !getVersionFormValidationMessage(currentForm, {
          isEditMode,
          productReady: Boolean(product),
        })
        : false,
    );
  }, [isEditMode, product]);

  useEffect(() => {
    refreshVersionFormReady();
  }, [refreshVersionFormReady, versionToEdit]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFileUploadError('');

    if (!effectiveProductId || !product) {
      return;
    }

    const validationMessage = getVersionFormValidationMessage(event.currentTarget, {
      isEditMode,
      productReady: Boolean(product),
    });

    if (validationMessage) {
      setFileUploadError(validationMessage);
      refreshVersionFormReady();
      return;
    }

    const formData = new FormData(event.currentTarget);
    const versionName = normalizeRequiredText(formData.get('version_name'));
    const versionCode = normalizeVersionCode(formData.get('version_code'));
    const width = normalizeDimensionValue(formData.get('width'));
    const height = normalizeDimensionValue(formData.get('height'));
    const depth = normalizeDimensionValue(formData.get('depth'));
    const estimatedPrice = normalizeEstimatedPrice(formData.get('estimated_price'));

    if (!versionName) {
      setFileUploadError('Version name is required.');
      return;
    }

    if (versionName.length < 2) {
      setFileUploadError('Version name must be at least 2 characters.');
      return;
    }

    if (!isEditMode && !versionCode) {
      setFileUploadError('Version code is required.');
      return;
    }

    if (versionCode && !VERSION_CODE_PATTERN.test(versionCode)) {
      setFileUploadError('Version code can only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    if ([width, height, depth].some((value) => value !== null && value <= 0)) {
      setFileUploadError('Dimensions must be greater than 0 when provided.');
      return;
    }

    if (estimatedPrice !== null && estimatedPrice <= 0) {
      setFileUploadError('Estimated price must be greater than 0 when provided.');
      return;
    }

    const fileValidationMessage = getVersionFileValidationMessage(previewFile, modelFile);

    if (fileValidationMessage) {
      setFileUploadError(fileValidationMessage);
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
              width,
              height,
              depth,
              estimatedPrice,
              isDefault: formData.get('is_default') === 'on',
              isPublic: formData.get('is_public') === 'on',
              isProjectSpecific: false,
            })
          ).productVersionId
        : createdVersionId ??
          (
            await createVersionMutation.mutateAsync({
              productId: effectiveProductId,
              versionCode: versionCode ?? '',
              versionName,
              versionType: 'STANDARD',
              material: normalizeOptionalText(formData.get('material')),
              color: normalizeOptionalText(formData.get('color')),
              width,
              height,
              depth,
              estimatedPrice,
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

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.tagName === 'TEXTAREA') {
      return;
    }

    const validationMessage = getVersionFormValidationMessage(event.currentTarget, {
      isEditMode,
      productReady: Boolean(product),
    });

    if (validationMessage) {
      event.preventDefault();
      setFileUploadError(validationMessage);
      refreshVersionFormReady();
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeKey="products" />

        <section className="admin-main">
          <AdminNavbar activeLabel={t.products.versionsTitle} />
          <div className="admin-content product-management-content">
            <div className="product-form-heading">
              <button className="product-version-back" type="button" onClick={() => navigate(`/admin/products/${effectiveProductId}/versions`)}>
                <IconArrowLeft size={16} />
                Back to Versions
              </button>
              <h2>{isEditMode ? t.products.updateVersion : t.products.createVersion}</h2>
              <p>
                {isEditMode
                  ? `Update details, preview image, and 3D model for ${versionToEdit?.versionName ?? 'selected version'}`
                  : `Add a new version for ${product?.productName ?? 'selected product'}`}
              </p>
            </div>

            {productQuery.isLoading ? (
              <section className="product-management-state">Loading parent product...</section>
            ) : null}

            {productQuery.isError ? (
              <section className="product-management-state product-management-state-error">{getProductServiceResultMessage(productQuery.error)}</section>
            ) : null}

            {isEditMode && !productQuery.isLoading && !productQuery.isError && !versionToEdit ? (
              <section className="product-management-state product-management-state-error">Product version not found in this product.</section>
            ) : null}

            {shouldRenderForm ? (
            <form
              className="product-form-shell"
              key={versionToEdit?.productVersionId ?? 'create-version'}
              ref={formRef}
              onChange={refreshVersionFormReady}
              onInput={refreshVersionFormReady}
              onKeyDown={handleFormKeyDown}
              onSubmit={handleSubmit}
            >
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
                        pattern="[A-Z0-9_-]*"
                        placeholder="e.g., SOFA-LUX-001-A"
                        required={!isEditMode}
                        type="text"
                        onInput={(event) => {
                          event.currentTarget.value = normalizeVersionCodeText(event.currentTarget.value);
                        }}
                      />
                    </label>

                    <label className="product-form-field">
                      <span>Version Name *</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.versionName ?? ''}
                        maxLength={150}
                        minLength={2}
                        name="version_name"
                        placeholder="e.g., Premium Oak, Standard Black"
                        required
                        type="text"
                      />
                    </label>

                    <label className="product-form-field">
                      <span>Material</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.material ?? ''} maxLength={80} name="material" placeholder="e.g., Oak Wood, Leather" type="text" />
                    </label>

                    <label className="product-form-field">
                      <span>Color</span>
                      <input className="admin-form-input" defaultValue={versionToEdit?.color ?? ''} maxLength={80} name="color" placeholder="e.g., Natural, Black, White" type="text" />
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Dimensions (cm)</h3>
                  <div className="product-form-grid product-form-grid-three">
                    <label className="product-form-field">
                      <span>Width</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.width ?? ''}
                        inputMode="decimal"
                        name="width"
                        pattern="[0-9]*[.]?[0-9]*"
                        placeholder="0"
                        type="text"
                        onInput={(event) => {
                          event.currentTarget.value = normalizeDecimalText(event.currentTarget.value);
                        }}
                      />
                    </label>

                    <label className="product-form-field">
                      <span>Height</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.height ?? ''}
                        inputMode="decimal"
                        name="height"
                        pattern="[0-9]*[.]?[0-9]*"
                        placeholder="0"
                        type="text"
                        onInput={(event) => {
                          event.currentTarget.value = normalizeDecimalText(event.currentTarget.value);
                        }}
                      />
                    </label>

                    <label className="product-form-field">
                      <span>Depth</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.depth ?? ''}
                        inputMode="decimal"
                        name="depth"
                        pattern="[0-9]*[.]?[0-9]*"
                        placeholder="0"
                        type="text"
                        onInput={(event) => {
                          event.currentTarget.value = normalizeDecimalText(event.currentTarget.value);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Pricing</h3>
                  <div className="product-form-grid">
                    <label className="product-form-field">
                      <span>Estimated Price</span>
                      <input
                        className="admin-form-input"
                        defaultValue={versionToEdit?.estimatedPrice ?? ''}
                        inputMode="numeric"
                        name="estimated_price"
                        pattern="[0-9]*"
                        placeholder="0"
                        type="text"
                        onInput={(event) => {
                          event.currentTarget.value = normalizeEstimatedPriceText(event.currentTarget.value);
                        }}
                      />
                    </label>
                  </div>
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
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        const validationMessage = getPreviewFileValidationMessage(file);

                        if (validationMessage) {
                          setFileUploadError(validationMessage);
                          setPreviewFile(null);
                          event.currentTarget.value = '';
                          return;
                        }

                        setFileUploadError('');
                        setPreviewFile(file);
                      }}
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
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        const validationMessage = getModelFileValidationMessage(file);

                        if (validationMessage) {
                          setFileUploadError(validationMessage);
                          setModelFile(null);
                          event.currentTarget.value = '';
                          return;
                        }

                        setFileUploadError('');
                        setModelFile(file);
                      }}
                    />
                    <div className="product-upload-main product-upload-model-main">
                      <IconCube size={46} />
                      <strong>{modelFile ? modelFile.name : currentModelFile?.originalFileName ?? 'Click to select GLB/glTF model'}</strong>
                      <small>
                        Uploaded as MODEL_3D after this product version is saved.
                      </small>
                    </div>
                  </label>

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
                <button className="product-form-button product-form-button-primary" disabled={!product || isSaving || !isVersionFormReady} type="submit">
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

function normalizeVersionCode(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === 'string' ? normalizeVersionCodeText(value) || null : null;
}

function normalizeVersionCodeText(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function normalizeDimensionValue(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = normalizeDecimalText(value);

  if (!normalizedValue || normalizedValue === '.') {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeDecimalText(value: string) {
  const normalizedValue = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [integerPart, ...fractionParts] = normalizedValue.split('.');
  const fractionPart = fractionParts.join('');

  return fractionParts.length > 0 ? `${integerPart}.${fractionPart}` : integerPart;
}

function normalizeEstimatedPrice(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = normalizeEstimatedPriceText(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function normalizeEstimatedPriceText(value: string) {
  return value.replace(/\D/g, '');
}

function getVersionFileValidationMessage(previewFile: File | null, modelFile: File | null) {
  return getPreviewFileValidationMessage(previewFile) ?? getModelFileValidationMessage(modelFile);
}

function getVersionFormValidationMessage(
  form: HTMLFormElement,
  options: {
    isEditMode: boolean;
    productReady: boolean;
  },
) {
  const formData = new FormData(form);
  const versionName = normalizeRequiredText(formData.get('version_name'));
  const versionCode = normalizeVersionCode(formData.get('version_code'));
  const width = normalizeDimensionValue(formData.get('width'));
  const height = normalizeDimensionValue(formData.get('height'));
  const depth = normalizeDimensionValue(formData.get('depth'));
  const estimatedPrice = normalizeEstimatedPrice(formData.get('estimated_price'));

  if (!options.productReady) {
    return 'Parent product is required before saving a version.';
  }

  if (!versionName) {
    return 'Version name is required.';
  }

  if (versionName.length < 2) {
    return 'Version name must be at least 2 characters.';
  }

  if (!options.isEditMode && !versionCode) {
    return 'Version code is required.';
  }

  if (versionCode && !VERSION_CODE_PATTERN.test(versionCode)) {
    return 'Version code can only contain letters, numbers, underscores, and hyphens.';
  }

  if ([width, height, depth].some((value) => value !== null && value <= 0)) {
    return 'Dimensions must be greater than 0 when provided.';
  }

  if (estimatedPrice !== null && estimatedPrice <= 0) {
    return 'Estimated price must be greater than 0 when provided.';
  }

  return null;
}

function getPreviewFileValidationMessage(file: File | null) {
  if (!file) {
    return null;
  }

  if (!ALLOWED_VERSION_IMAGE_TYPES.has(file.type)) {
    return 'Version image must be JPEG, PNG, WebP, GIF, or SVG.';
  }

  if (file.size > MAX_VERSION_IMAGE_SIZE_BYTES) {
    return 'Version image must be 5MB or smaller.';
  }

  return null;
}

function getModelFileValidationMessage(file: File | null) {
  if (!file) {
    return null;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!ALLOWED_MODEL_EXTENSIONS.has(extension) && !ALLOWED_MODEL_TYPES.has(file.type)) {
    return '3D model must be a GLB or glTF file.';
  }

  if (file.size > MAX_VERSION_MODEL_SIZE_BYTES) {
    return '3D model must be 50MB or smaller.';
  }

  return null;
}

export default CreateProductVersionPage;
