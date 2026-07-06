import { type FormEvent, useMemo, useState } from 'react';
import { IconArchive, IconCheck, IconClock, IconEdit, IconPackage, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getProductServiceResultMessage, normalizeOptionalText, normalizeRequiredText } from '@/services/api';
import { useCategoryList, useProductList, useUpdateProduct } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const statusClassName: Record<string, string> = {
  ACTIVE: 'product-management-status-active',
  INACTIVE: 'product-management-status-inactive',
  ARCHIVED: 'product-management-status-archived',
};

const productStatusOptions = ['', 'DRAFT', 'PENDING_APPROVAL', 'PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'ARCHIVED'] as const;
type ProductStatusFilter = (typeof productStatusOptions)[number];
const productSortOptions = ['NEWEST', 'NAME_ASC', 'NAME_DESC'] as const;
type ProductSortFilter = (typeof productSortOptions)[number];

export function Productmanagement() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState<ProductSortFilter>('NEWEST');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const productListQuery = useProductList({ page: 1, limit: 100 });
  const categoryListQuery = useCategoryList({ page: 1, limit: 100 });
  const updateProductMutation = useUpdateProduct();
  const categoryOptions = categoryListQuery.data?.items ?? [];

  const filteredProducts = useMemo(() => {
    const products = productListQuery.data?.items ?? [];
    const keyword = searchValue.trim().toLowerCase();

    const nextProducts = products.filter((product) => {
      const matchesKeyword = !keyword ||
        product.productName.toLowerCase().includes(keyword) ||
        (product.productCode ?? '').toLowerCase().includes(keyword) ||
        product.categoryName.toLowerCase().includes(keyword) ||
        (product.description ?? '').toLowerCase().includes(keyword) ||
        product.status.toLowerCase().includes(keyword);
      const matchesStatus = !statusFilter || product.status === statusFilter;
      const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;

      return matchesKeyword && matchesStatus && matchesCategory;
    });

    return [...nextProducts].sort((left, right) => {
      if (sortFilter === 'NAME_ASC') {
        return left.productName.localeCompare(right.productName);
      }

      if (sortFilter === 'NAME_DESC') {
        return right.productName.localeCompare(left.productName);
      }

      return 0;
    });
  }, [categoryFilter, productListQuery.data?.items, searchValue, sortFilter, statusFilter]);

  const productStats = useMemo(() => {
    const products = productListQuery.data?.items ?? [];
    const countStatus = (statuses: string[]) => products.filter((product) => statuses.includes(product.status)).length;

    return [
      { label: 'Published', value: countStatus(['ACTIVE']), helper: 'Visible catalog items', icon: IconCheck, tone: 'green' },
      { label: 'Pending', value: countStatus(['PENDING', 'PENDING_APPROVAL']), helper: 'Waiting approval', icon: IconClock, tone: 'gold' },
      { label: 'Archived', value: countStatus(['ARCHIVED']), helper: 'Stored product records', icon: IconArchive, tone: 'dark' },
    ];
  }, [productListQuery.data?.items]);

  const categoryFilterOptions = useMemo(() => {
    const categories = new Map<string, string>();

    (productListQuery.data?.items ?? []).forEach((product) => {
      categories.set(product.categoryId, product.categoryName);
    });

    return Array.from(categories.entries()).map(([categoryId, categoryName]) => ({ categoryId, categoryName }));
  }, [productListQuery.data?.items]);

  const visibleProducts = filteredProducts;

  const totalProducts = productListQuery.data?.total ?? (productListQuery.data?.items ?? []).length;

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>, productId: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const productName = normalizeRequiredText(formData.get('product_name'));
    const categoryId = normalizeRequiredText(formData.get('category_id'));

    if (!productName || !categoryId) {
      return;
    }

    try {
      await updateProductMutation.mutateAsync({
        productId,
        categoryId,
        productName,
        description: normalizeOptionalText(formData.get('description')),
      });
      setEditingProductId(null);
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Products" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Products" />
          <div className="admin-content product-management-content">
            <div className="product-management-heading">
              <div>
                <h2>Product Management</h2>
                <p>Manage product catalog and inventory</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => navigate('/admin/products/create')}>
                <IconPlus size={16} />
                Create Product
              </button>
            </div>

            <section className="product-stat-grid" aria-label="Product status overview">
              {productStats.map(({ label, value, helper, icon: Icon, tone }) => (
                <article className="product-stat-card" key={label}>
                  <div className="product-stat-copy">
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>{helper}</p>
                  </div>
                  <div className={`product-stat-icon product-stat-icon-${tone}`}>
                    <Icon size={22} />
                  </div>
                </article>
              ))}
            </section>

            <section className="admin-card product-management-card">
              <div className="product-management-tools">
                <label className="admin-search product-management-search">
                  <IconSearch size={18} />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search products..."
                    type="search"
                  />
                </label>

                <label className="product-management-filter">
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProductStatusFilter)}>
                    {productStatusOptions.map((option) => (
                      <option key={option || 'ALL'} value={option}>
                        {option ? formatEnumLabel(option) : 'All statuses'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-management-filter">
                  <span>Category</span>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option value="">All categories</option>
                    {categoryFilterOptions.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-management-filter">
                  <span>Sort by</span>
                  <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value as ProductSortFilter)}>
                    {productSortOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatSortLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="product-management-total">
                  <span>Total</span>
                  <strong>{totalProducts}</strong>
                </div>
              </div>

              {productListQuery.isLoading ? <div className="product-management-state">Loading products from API...</div> : null}

              {productListQuery.isError ? (
                <div className="product-management-state product-management-state-error">
                  {getProductServiceResultMessage(productListQuery.error)}
                </div>
              ) : null}

              {!productListQuery.isLoading && !productListQuery.isError && visibleProducts.length === 0 ? (
                <div className="product-management-state">No products found.</div>
              ) : null}

              {!productListQuery.isLoading && !productListQuery.isError && visibleProducts.length > 0 ? (
                <section className="product-management-grid">
                  {visibleProducts.map((product) => {
                    const thumbnailUrl = product.thumbnail?.fileUrl ?? product.defaultVersion?.thumbnail?.fileUrl;

                    return (
                      <article key={product.productId} className="product-card">
                        <div className="product-card-media">
                          <span className={`product-card-status ${statusClassName[product.status] ?? 'product-management-status-archived'}`}>
                            {product.status}
                          </span>
                          {thumbnailUrl ? (
                            <img className="product-card-image" src={thumbnailUrl} alt={product.productName} />
                          ) : (
                            <div className="product-card-placeholder">
                              <IconPackage size={42} />
                              <span>No image</span>
                            </div>
                          )}
                        </div>
                        <div className="product-card-body">
                          <h3>{product.productName}</h3>
                          <p className="product-card-category">{product.categoryName}</p>
                          <p className="product-card-description">{product.description ?? 'No description.'}</p>
                          <div className="product-card-meta">
                            <span>{product.productCode ?? 'Auto-generated'}</span>
                            <strong>{product.defaultVersion ? '1 version' : '0 versions'}</strong>
                          </div>
                          <div className="product-card-actions">
                            <button
                              className="product-card-button product-card-button-secondary"
                              type="button"
                              onClick={() => setEditingProductId(product.productId)}
                            >
                              <IconEdit size={16} />
                              Edit
                            </button>
                            <button
                              className="product-card-button product-card-button-primary"
                              type="button"
                              onClick={() => navigate(`/admin/products/${product.productId}/versions`)}
                            >
                              Versions
                            </button>
                          </div>

                        {editingProductId === product.productId ? (
                          <div className="product-edit-modal-overlay">
                            <form className="product-edit-modal-panel" onSubmit={(event) => handleEditSubmit(event, product.productId)}>
                              <div className="product-card-edit-heading">
                                <div>
                                  <strong>Edit Product</strong>
                                  <p>Update product master fields for this catalog item.</p>
                                </div>
                                <button
                                  aria-label="Close edit product form"
                                  className="product-card-icon-button"
                                  type="button"
                                  onClick={() => setEditingProductId(null)}
                                >
                                  <IconX size={16} />
                                </button>
                              </div>

                              <label className="product-form-field">
                                <span>Product Name *</span>
                                <input
                                  className="admin-form-input"
                                  defaultValue={product.productName}
                                  maxLength={150}
                                  name="product_name"
                                  required
                                  type="text"
                                />
                              </label>

                              <label className="product-form-field">
                                <span>Category *</span>
                                <select
                                  className="admin-form-input"
                                  defaultValue={product.categoryId}
                                  disabled={categoryListQuery.isLoading}
                                  name="category_id"
                                  required
                                >
                                  {categoryOptions.map((category) => (
                                    <option key={category.categoryId} value={category.categoryId}>
                                      {category.categoryName}
                                    </option>
                                  ))}
                                </select>
                                {categoryListQuery.isError ? <em>{getProductServiceResultMessage(categoryListQuery.error)}</em> : null}
                              </label>

                              <label className="product-form-field">
                                <span>Description</span>
                                <textarea
                                  className="admin-form-textarea"
                                  defaultValue={product.description ?? ''}
                                  name="description"
                                />
                              </label>

                              <div className="product-form-note product-card-edit-note">
                                Product code cannot be updated from this endpoint.
                              </div>

                              {updateProductMutation.isError ? (
                                <p className="product-form-error">{getProductServiceResultMessage(updateProductMutation.error)}</p>
                              ) : null}

                              <div className="product-card-edit-actions">
                                <button className="product-form-button product-form-button-secondary" type="button" onClick={() => setEditingProductId(null)}>
                                  Cancel
                                </button>
                                <button
                                  className="product-form-button product-form-button-primary"
                                  disabled={updateProductMutation.isPending || categoryListQuery.isLoading || categoryOptions.length === 0}
                                  type="submit"
                                >
                                  {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
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
              ) : null}
            </section>

            <div className="product-management-note">
              <strong>Note:</strong> Product versions will be locked after the first inventory item is created. Only Active versions can be approved.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Productmanagement;

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSortLabel(value: ProductSortFilter) {
  if (value === 'NAME_ASC') {
    return 'Name A-Z';
  }

  if (value === 'NAME_DESC') {
    return 'Name Z-A';
  }

  return 'Newest';
}
