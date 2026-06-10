import { type FormEvent } from 'react';
import { IconArrowLeft, IconPackage, IconUpload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getProductServiceResultMessage, normalizeOptionalText, normalizeRequiredText } from '@/services/api';
import { useCategoryList, useCreateProduct } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

export function CreateProductPage() {
  const navigate = useNavigate();
  const categoryListQuery = useCategoryList({ page: 1, limit: 100 });
  const createProductMutation = useCreateProduct();
  const categoryOptions = categoryListQuery.data?.items ?? [];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const productName = normalizeRequiredText(formData.get('product_name'));
    const categoryId = normalizeRequiredText(formData.get('category_id'));

    if (!productName || !categoryId) {
      return;
    }

    try {
      const createdProduct = await createProductMutation.mutateAsync({
        categoryId,
        productName,
        description: normalizeOptionalText(formData.get('description')),
      });

      navigate(`/admin/products/${createdProduct.productId}/versions/create`);
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
              <section className="product-form-card">
                <div className="product-form-note">
                  <strong>Note:</strong> Product code will be generated automatically. After creating the product, you will be prompted to create at least one
                  product version.
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

                    <label className="product-form-field">
                      <span>Status</span>
                      <select className="admin-form-input" defaultValue="ACTIVE" disabled>
                        <option value="ACTIVE">Active</option>
                      </select>
                    </label>
                  </div>

                  <label className="product-form-field product-form-field-full">
                    <span>Description</span>
                    <textarea className="admin-form-textarea" name="description" placeholder="Describe product purpose, use cases, and catalog notes" />
                  </label>
                </div>

                <div className="product-form-section">
                  <h3>Product Preview Images</h3>
                  <label className="product-form-field product-form-field-full">
                    <span>Main Product Image</span>
                    <div className="product-upload-main">
                      <IconUpload size={46} />
                      <strong>Drag and drop or click to upload</strong>
                      <small>PNG, JPG up to 10MB</small>
                    </div>
                  </label>

                  <label className="product-form-field product-form-field-full">
                    <span>Additional Product Images</span>
                    <div className="product-upload-grid">
                      {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="product-upload-tile">
                          <IconUpload size={28} />
                          <span>Upload</span>
                        </div>
                      ))}
                    </div>
                  </label>
                </div>

                {createProductMutation.isError ? (
                  <p className="product-form-error">{getProductServiceResultMessage(createProductMutation.error)}</p>
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
                  disabled={createProductMutation.isPending || categoryListQuery.isLoading || categoryOptions.length === 0}
                  type="submit"
                >
                  {createProductMutation.isPending ? 'Saving...' : 'Save & Create Version'}
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
