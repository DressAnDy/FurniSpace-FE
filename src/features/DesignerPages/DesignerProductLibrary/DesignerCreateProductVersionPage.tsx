import { type FormEvent, useMemo } from 'react';
import { IconArrowLeft, IconBox } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { DesignerLayout, designerCopy } from '@/features/DesignerPages/designercomponents';
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
  const { lang } = useLang();
  const t = designerCopy[lang];
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
    <DesignerLayout activeKey="productLibrary">
      <section className="designer-products-header">
        <button className="designer-products-back" type="button" onClick={() => navigate('/designer/product-library')}>
          <IconArrowLeft size={16} />
          {t.createProductVersion.back}
        </button>
        <h2>{t.createProductVersion.title}</h2>
        <p>{product ? t.createProductVersion.subtitle(product.productName) : t.createProductVersion.loadingProduct}</p>
      </section>

      {productQuery.isLoading ? <section className="designer-card designer-products-state">{t.createProductVersion.loadingParent}</section> : null}
      {productQuery.isError ? (
        <section className="designer-card designer-products-state designer-products-state-error">
          {getProductServiceResultMessage(productQuery.error)}
        </section>
      ) : null}

      {product ? (
        <form className="product-form-shell designer-create-version-shell" onSubmit={handleSubmit}>
          <section className="product-form-card">
            <div className="product-form-note">
              {t.createProductVersion.adminNote}
            </div>

            <div className="product-form-section">
              <div className="product-form-section-title">
                <IconBox size={20} />
                <h3>{t.createProductVersion.parentProduct}</h3>
              </div>
              <div className="product-form-info-grid">
                <div>
                  <span>{t.createProductVersion.product}</span>
                  <strong>{product.productName}</strong>
                </div>
                <div>
                  <span>{t.createProductVersion.category}</span>
                  <strong>{product.categoryName}</strong>
                </div>
                <div>
                  <span>{t.createProductVersion.businessType}</span>
                  <strong>{product.businessTypes?.map((businessType) => businessType.name).join(', ') || t.createProductVersion.notAssigned}</strong>
                </div>
                <div>
                  <span>{t.createProductVersion.code}</span>
                  <strong>{product.productCode ?? product.productId}</strong>
                </div>
              </div>
            </div>

            <div className="product-form-section">
              <h3>{t.createProductVersion.versionInformation}</h3>
              <div className="product-form-grid">
                <label className="product-form-field">
                  <span>{t.createProductVersion.versionCode} *</span>
                  <input className="admin-form-input" defaultValue={suggestedVersionCode} maxLength={50} name="version_code" required type="text" />
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.versionName} *</span>
                  <input className="admin-form-input" maxLength={150} name="version_name" placeholder={t.createProductVersion.placeholderVersionName} required type="text" />
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.versionType}</span>
                  <select className="admin-form-input" defaultValue="STANDARD" name="version_type">
                    <option value="STANDARD">STANDARD</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="PROJECT_SPECIFIC">PROJECT_SPECIFIC</option>
                  </select>
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.material}</span>
                  <input className="admin-form-input" name="material" placeholder={t.createProductVersion.placeholderMaterial} type="text" />
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.color}</span>
                  <input className="admin-form-input" name="color" placeholder={t.createProductVersion.placeholderColor} type="text" />
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.estimatedPrice}</span>
                  <input className="admin-form-input" min="0" name="estimated_price" placeholder={t.createProductVersion.placeholderPrice} type="number" />
                </label>
              </div>
            </div>

            <div className="product-form-section">
              <h3>{t.createProductVersion.dimensions}</h3>
              <div className="product-form-grid product-form-grid-three">
                <label className="product-form-field">
                  <span>{t.createProductVersion.width}</span>
                  <input className="admin-form-input" min="0" name="width" placeholder={t.createProductVersion.placeholderPrice} type="number" />
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.height}</span>
                  <input className="admin-form-input" min="0" name="height" placeholder={t.createProductVersion.placeholderPrice} type="number" />
                </label>
                <label className="product-form-field">
                  <span>{t.createProductVersion.depth}</span>
                  <input className="admin-form-input" min="0" name="depth" placeholder={t.createProductVersion.placeholderPrice} type="number" />
                </label>
              </div>
            </div>

            <div className="product-form-section">
              <h3>{t.createProductVersion.settings}</h3>
              <div className="product-setting-list">
                <label>
                  <input name="is_project_specific" type="checkbox" />
                  <span>
                    <strong>{t.createProductVersion.projectSpecific}</strong>
                    <small>{t.createProductVersion.projectSpecificHint}</small>
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
              {t.createProductVersion.cancel}
            </button>
            <button className="product-form-button product-form-button-primary" disabled={createVersionMutation.isPending} type="submit">
              {createVersionMutation.isPending ? t.createProductVersion.saving : t.createProductVersion.createVersion}
            </button>
          </div>
        </form>
      ) : null}
    </DesignerLayout>
  );
}

export default DesignerCreateProductVersionPage;
