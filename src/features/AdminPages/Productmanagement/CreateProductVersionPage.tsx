import { type FormEvent, useState } from 'react';
import { IconArrowLeft, IconBox, IconCube, IconUpload } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getProductServiceResultMessage,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizeRequiredText,
} from '@/services/api';
import { useCreateProductVersion, useProductDetail, useUploadProductVersionFile } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';
import { SelectedImagePreview } from './SelectedImagePreview';

export function CreateProductVersionPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const effectiveProductId = productId ?? sessionStorage.getItem('admin.createdProductId') ?? undefined;
  const productQuery = useProductDetail(effectiveProductId);
  const createVersionMutation = useCreateProductVersion();
  const uploadVersionFileMutation = useUploadProductVersionFile(effectiveProductId);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState('');
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);
  const product = productQuery.data;
  const isSaving = createVersionMutation.isPending || uploadVersionFileMutation.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFileUploadError('');

    if (!effectiveProductId || !product) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const versionCode = normalizeRequiredText(formData.get('version_code'));
    const versionName = normalizeRequiredText(formData.get('version_name'));

    if (!versionCode || !versionName) {
      return;
    }

    try {
      const productVersionId =
        createdVersionId ??
        (
          await createVersionMutation.mutateAsync({
            productId: effectiveProductId,
            versionCode,
            versionName,
            versionType: 'STANDARD',
            material: normalizeOptionalText(formData.get('material')),
            color: normalizeOptionalText(formData.get('color')),
            width: normalizeOptionalNumber(formData.get('width')),
            height: normalizeOptionalNumber(formData.get('height')),
            depth: normalizeOptionalNumber(formData.get('depth')),
            estimatedPrice: normalizeOptionalNumber(formData.get('estimated_price')),
            isDefault: formData.get('is_default') === 'on',
            isPublic: true,
            isProjectSpecific: false,
          })
        ).productVersionId;

      setCreatedVersionId(productVersionId);

      const uploadErrors: string[] = [];

      if (previewFile) {
        try {
          await uploadVersionFileMutation.mutateAsync({
            productVersionId,
            file: previewFile,
            fileType: 'PRODUCT_PREVIEW',
            description: 'Product version preview image',
          });
          setPreviewFile(null);
        } catch (error) {
          uploadErrors.push(`PRODUCT_PREVIEW upload failed: ${getProductServiceResultMessage(error)}`);
        }
      }

      if (modelFile) {
        try {
          await uploadVersionFileMutation.mutateAsync({
            productVersionId,
            file: modelFile,
            fileType: 'MODEL_3D',
            description: 'Product version 3D model',
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
          <AdminNavbar />

          <div className="admin-content product-management-content">
            <div className="product-form-heading">
              <button className="product-version-back" type="button" onClick={() => navigate(`/admin/products/${effectiveProductId}/versions`)}>
                <IconArrowLeft size={16} />
                Back to Versions
              </button>
              <h2>Create Product Version</h2>
              <p>Add a new version for {product?.productName ?? 'selected product'}</p>
            </div>

            {productQuery.isLoading ? (
              <section className="product-management-state">Loading parent product from API...</section>
            ) : null}

            {productQuery.isError ? (
              <section className="product-management-state product-management-state-error">{getProductServiceResultMessage(productQuery.error)}</section>
            ) : null}

            <form className="product-form-shell" onSubmit={handleSubmit}>
              <section className="product-form-card">
                <div className="product-form-note">
                  <strong>Note:</strong> Version type will be submitted as STANDARD by default. Public is always enabled and project-specific is always disabled.
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
                      <input className="admin-form-input" maxLength={50} name="version_code" placeholder="e.g., SOFA-LUX-001-A" required type="text" />
                    </label>

                    <label className="product-form-field">
                      <span>Version Name *</span>
                      <input className="admin-form-input" name="version_name" placeholder="e.g., Premium Oak, Standard Black" required type="text" />
                    </label>

                    <label className="product-form-field">
                      <span>Material</span>
                      <input className="admin-form-input" name="material" placeholder="e.g., Oak Wood, Leather" type="text" />
                    </label>

                    <label className="product-form-field">
                      <span>Color</span>
                      <input className="admin-form-input" name="color" placeholder="e.g., Natural, Black, White" type="text" />
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Dimensions (cm)</h3>
                  <div className="product-form-grid product-form-grid-three">
                    <label className="product-form-field">
                      <span>Width</span>
                      <input className="admin-form-input" name="width" placeholder="0" type="number" />
                    </label>

                    <label className="product-form-field">
                      <span>Height</span>
                      <input className="admin-form-input" name="height" placeholder="0" type="number" />
                    </label>

                    <label className="product-form-field">
                      <span>Depth</span>
                      <input className="admin-form-input" name="depth" placeholder="0" type="number" />
                    </label>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Pricing</h3>
                  <label className="product-form-field product-form-field-half">
                    <span>Estimated Price</span>
                    <input className="admin-form-input" name="estimated_price" placeholder="0.00" type="number" />
                  </label>
                </div>

                <div className="product-form-section">
                  <h3>Version Settings</h3>
                  <div className="product-setting-list">
                    <label>
                      <input name="is_default" type="checkbox" />
                      <span>
                        <strong>Set as Default Version</strong>
                        <small>This version will be the default for this product</small>
                      </span>
                    </label>
                    <div className="product-setting-fixed">
                      <strong>Is Public</strong>
                      <small>Always submitted as true.</small>
                    </div>
                    <div className="product-setting-fixed">
                      <strong>Is Project Specific</strong>
                      <small>Always submitted as false.</small>
                    </div>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3>Version Files</h3>
                  <label className="product-form-field product-form-field-full">
                    <span>Main Version Image</span>
                    <input
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="product-upload-input"
                      type="file"
                      onChange={(event) => setPreviewFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="product-upload-main">
                      {previewFile ? (
                        <SelectedImagePreview className="product-upload-main-preview" file={previewFile} />
                      ) : (
                        <IconUpload size={46} />
                      )}
                      <strong>{previewFile ? previewFile.name : 'Click to select version preview'}</strong>
                      <small>Uploaded as PRODUCT_PREVIEW and visible to customers</small>
                    </div>
                  </label>

                  <label className="product-form-field product-form-field-full">
                    <span>3D Model File</span>
                    <input
                      accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                      className="product-upload-input"
                      type="file"
                      onChange={(event) => setModelFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="product-upload-main product-upload-model-main">
                      <IconCube size={46} />
                      <strong>{modelFile ? modelFile.name : 'Click to select GLB/glTF model'}</strong>
                      <small>
                        Uploaded as MODEL_3D after this Product Version is created. No Product Version ID input is needed.
                      </small>
                    </div>
                  </label>

                  <p className="product-form-helper">Product versions accept one PRODUCT_PREVIEW image and one MODEL_3D GLB/glTF file.</p>
                </div>

                {createVersionMutation.isError ? (
                  <p className="product-form-error">{getProductServiceResultMessage(createVersionMutation.error)}</p>
                ) : null}
                {fileUploadError ? (
                  <p className="product-form-error">
                    Product version was created, but file upload failed: {fileUploadError}
                  </p>
                ) : null}
              </section>

              <div className="product-form-actions">
                <button className="product-form-button product-form-button-secondary" type="button" onClick={() => navigate(`/admin/products/${effectiveProductId}/versions`)}>
                  Cancel
                </button>
                <button className="product-form-button product-form-button-primary" disabled={!product || isSaving} type="submit">
                  {isSaving ? 'Saving...' : 'Save Version'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CreateProductVersionPage;
