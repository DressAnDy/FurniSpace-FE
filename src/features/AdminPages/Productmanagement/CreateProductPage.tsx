import { type FormEvent, useState } from 'react';
import { IconArrowLeft, IconPackage, IconUpload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getProductServiceResultMessage, normalizeOptionalText, normalizeRequiredText } from '@/services/api';
import { useCategoryList, useCreateProduct, useUploadProductPreviewFile } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';
import { SelectedImagePreview } from './SelectedImagePreview';

export function CreateProductPage() {
  const navigate = useNavigate();
  const categoryListQuery = useCategoryList({ page: 1, limit: 100 });
  const createProductMutation = useCreateProduct();
  const uploadProductPreviewMutation = useUploadProductPreviewFile();
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const categoryOptions = categoryListQuery.data?.items ?? [];
  const isSaving = createProductMutation.isPending || uploadProductPreviewMutation.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const productName = normalizeRequiredText(formData.get('product_name'));
    const categoryId = normalizeRequiredText(formData.get('category_id'));

    if (!productName || !categoryId) {
      return;
    }

    try {
      const productId =
        createdProductId ??
        (
          await createProductMutation.mutateAsync({
            categoryId,
            productCode: normalizeOptionalText(formData.get('product_code')),
            productName,
            description: normalizeOptionalText(formData.get('description')),
          })
        ).productId;

      setCreatedProductId(productId);

      if (previewFile) {
        await uploadProductPreviewMutation.mutateAsync({
          productId,
          file: previewFile,
          description: 'Product preview image',
        });
        setPreviewFile(null);
      }

      sessionStorage.setItem('admin.createdProductId', productId);
      navigate(`/admin/products/${productId}/versions/create`);
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Products" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content product-management-content">
            <div className="product-form-heading">
              <button className="product-version-back" type="button" onClick={() => navigate('/admin/products')}>
                <IconArrowLeft size={16} />
                Back to Products
              </button>
              <h2>Create New Product</h2>
              <p>Add a new product to the catalog</p>
            </div>

            <form className="product-form-shell" onSubmit={handleSubmit}>
              <input name="status" type="hidden" value="ACTIVE" />
              <section className="product-form-card">
                <div className="product-form-note">
                  <strong>Note:</strong> After creating the product, you will be prompted to create at least one product version.
                </div>

                <div className="product-form-section">
                  <div className="product-form-section-title">
                    <IconPackage size={20} />
                    <h3>Basic Information</h3>
                  </div>

                  <label className="product-form-field product-form-field-full">
                    <span>Product Name *</span>
                    <input className="admin-form-input" name="product_name" placeholder="Enter product name" required type="text" />
                  </label>

                  <div className="product-form-grid">
                    <label className="product-form-field">
                      <span>Product Code</span>
                      <input className="admin-form-input" maxLength={50} name="product_code" placeholder="e.g., SOFA-LUX-001" type="text" />
                    </label>

                    <label className="product-form-field">
                      <span>Category *</span>
                      <select className="admin-form-input" name="category_id" defaultValue="" required disabled={categoryListQuery.isLoading}>
                        <option value="" disabled>
                          {categoryListQuery.isLoading ? 'Loading categories...' : 'Select category'}
                        </option>
                        {categoryOptions.map((category) => (
                          <option key={category.categoryId} value={category.categoryId}>
                            {category.categoryName}
                          </option>
                        ))}
                      </select>
                      {categoryListQuery.isError ? <em>{getProductServiceResultMessage(categoryListQuery.error)}</em> : null}
                    </label>
                  </div>

                  <label className="product-form-field product-form-field-full">
                    <span>Description</span>
                    <textarea className="admin-form-textarea" name="description" placeholder="Describe product purpose, use cases, and catalog notes" />
                  </label>
                </div>

                <div className="product-form-section">
                  <h3>Product Preview Image</h3>
                  <label className="product-form-field product-form-field-full">
                    <span>Main Product Image</span>
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
                      <strong>{previewFile ? previewFile.name : 'Click to select product preview'}</strong>
                      <small>Uploaded as PRODUCT_PREVIEW and visible to customers</small>
                    </div>
                  </label>

                  <p className="product-form-helper">Products currently accept only FileType.PRODUCT_PREVIEW.</p>
                </div>

                {createProductMutation.isError ? (
                  <p className="product-form-error">{getProductServiceResultMessage(createProductMutation.error)}</p>
                ) : null}
                {uploadProductPreviewMutation.isError ? (
                  <p className="product-form-error">
                    Product was created, but preview upload failed: {getProductServiceResultMessage(uploadProductPreviewMutation.error)}
                  </p>
                ) : null}
              </section>

              <div className="product-form-actions">
                <button className="product-form-button product-form-button-secondary" type="button" onClick={() => navigate('/admin/products')}>
                  Cancel
                </button>
                <button className="product-form-button product-form-button-secondary" type="button">
                  Save Draft
                </button>
                <button
                  className="product-form-button product-form-button-primary"
                  disabled={isSaving || categoryListQuery.isLoading || categoryOptions.length === 0}
                  type="submit"
                >
                  {isSaving ? 'Saving...' : 'Save & Create Version'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CreateProductPage;
