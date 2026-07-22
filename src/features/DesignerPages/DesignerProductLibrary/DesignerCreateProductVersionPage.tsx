import { type FormEvent, useMemo } from 'react';
import { IconArrowLeft, IconBox } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import {
  generateProductVersionCode,
  getProductServiceResultMessage,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizeRequiredText,
  type ProductVersionType,
} from '@/services/api';
import { useCreateProductVersion, useProductDetail } from '@/services/queries';

import '../../AdminPages/Productmanagement/Productmanagement.css';
import './DesignerProductLibrary.css';

export function DesignerCreateProductVersionPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const productQuery = useProductDetail(productId);
  const createVersionMutation = useCreateProductVersion();
  const product = productQuery.data;
  const suggestedVersionCode = useMemo(() => generateProductVersionCode(product?.productCode), [product?.productCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!productId || !product) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const versionName = normalizeRequiredText(formData.get('version_name'));
    const versionCode = normalizeRequiredText(formData.get('version_code'));

    if (!versionName || !versionCode) {
      return;
    }

    try {
      await createVersionMutation.mutateAsync({
        productId,
        versionCode,
        versionName,
        versionType: normalizeRequiredText(formData.get('version_type')) as ProductVersionType,
        material: normalizeOptionalText(formData.get('material')),
        color: normalizeOptionalText(formData.get('color')),
        width: normalizeOptionalNumber(formData.get('width')),
        height: normalizeOptionalNumber(formData.get('height')),
        depth: normalizeOptionalNumber(formData.get('depth')),
        estimatedPrice: normalizeOptionalNumber(formData.get('estimated_price')),
        isDefault: false,
        isPublic: true,
        isProjectSpecific: formData.get('is_project_specific') === 'on',
      });
      navigate('/designer/product-library');
    } catch {
      // Error state is rendered from React Query mutation.
    }
  }

  return (
    <DesignerLayout activeLabel="Product Library">
      <section className="designer-products-header">
        <button className="designer-products-back" type="button" onClick={() => navigate('/designer/product-library')}>
          <IconArrowLeft size={16} />
          Back to Product Library
        </button>
        <h2>Create Product Version</h2>
        <p>{product ? `Add a Designer-created version for ${product.productName}` : 'Loading product from catalog...'}</p>
      </section>

      {productQuery.isLoading ? <section className="designer-card designer-products-state">Loading parent product...</section> : null}
      {productQuery.isError ? (
        <section className="designer-card designer-products-state designer-products-state-error">
          {getProductServiceResultMessage(productQuery.error)}
        </section>
      ) : null}

      {product ? (
        <form className="product-form-shell designer-create-version-shell" onSubmit={handleSubmit}>
          <section className="product-form-card">
            <div className="product-form-note">
              Designer can create version records. Updating versions, setting default, and uploading catalog files remain Admin-only until backend opens those permissions.
            </div>

            <div className="product-form-section">
              <div className="product-form-section-title">
                <IconBox size={20} />
                <h3>Parent Product</h3>
              </div>
              <div className="product-form-info-grid">
                <div>
                  <span>Product</span>
                  <strong>{product.productName}</strong>
                </div>
                <div>
                  <span>Category</span>
                  <strong>{product.categoryName}</strong>
                </div>
                <div>
                  <span>Business Type</span>
                  <strong>{product.businessTypes?.map((businessType) => businessType.name).join(', ') || 'Not assigned'}</strong>
                </div>
                <div>
                  <span>Code</span>
                  <strong>{product.productCode ?? product.productId}</strong>
                </div>
              </div>
            </div>

            <div className="product-form-section">
              <h3>Version Information</h3>
              <div className="product-form-grid">
                <label className="product-form-field">
                  <span>Version Code *</span>
                  <input className="admin-form-input" defaultValue={suggestedVersionCode} maxLength={50} name="version_code" required type="text" />
                </label>
                <label className="product-form-field">
                  <span>Version Name *</span>
                  <input className="admin-form-input" maxLength={150} name="version_name" placeholder="e.g., Designer layout variant" required type="text" />
                </label>
                <label className="product-form-field">
                  <span>Version Type</span>
                  <select className="admin-form-input" defaultValue="STANDARD" name="version_type">
                    <option value="STANDARD">STANDARD</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="PROJECT_SPECIFIC">PROJECT_SPECIFIC</option>
                  </select>
                </label>
                <label className="product-form-field">
                  <span>Material</span>
                  <input className="admin-form-input" name="material" placeholder="e.g., Oak Wood" type="text" />
                </label>
                <label className="product-form-field">
                  <span>Color</span>
                  <input className="admin-form-input" name="color" placeholder="e.g., Natural" type="text" />
                </label>
                <label className="product-form-field">
                  <span>Estimated Price</span>
                  <input className="admin-form-input" min="0" name="estimated_price" placeholder="0" type="number" />
                </label>
              </div>
            </div>

            <div className="product-form-section">
              <h3>Dimensions (cm)</h3>
              <div className="product-form-grid product-form-grid-three">
                <label className="product-form-field">
                  <span>Width</span>
                  <input className="admin-form-input" min="0" name="width" placeholder="0" type="number" />
                </label>
                <label className="product-form-field">
                  <span>Height</span>
                  <input className="admin-form-input" min="0" name="height" placeholder="0" type="number" />
                </label>
                <label className="product-form-field">
                  <span>Depth</span>
                  <input className="admin-form-input" min="0" name="depth" placeholder="0" type="number" />
                </label>
              </div>
            </div>

            <div className="product-form-section">
              <h3>Settings</h3>
              <div className="product-setting-list">
                <label>
                  <input name="is_project_specific" type="checkbox" />
                  <span>
                    <strong>Project Specific</strong>
                    <small>Marks this version as intended for a project-specific design.</small>
                  </span>
                </label>
              </div>
            </div>

            {createVersionMutation.isError ? (
              <p className="product-form-error">{getProductServiceResultMessage(createVersionMutation.error)}</p>
            ) : null}
          </section>

          <div className="product-form-actions">
            <button className="product-form-button product-form-button-secondary" type="button" onClick={() => navigate('/designer/product-library')}>
              Cancel
            </button>
            <button className="product-form-button product-form-button-primary" disabled={createVersionMutation.isPending} type="submit">
              {createVersionMutation.isPending ? 'Saving...' : 'Create Version'}
            </button>
          </div>
        </form>
      ) : null}
    </DesignerLayout>
  );
}

export default DesignerCreateProductVersionPage;
