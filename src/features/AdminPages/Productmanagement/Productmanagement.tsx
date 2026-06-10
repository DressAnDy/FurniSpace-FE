import { useMemo, useState } from 'react';
import { IconEdit, IconPackage, IconPlus, IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getProductServiceResultMessage } from '@/services/api';
import { useProductList } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const statusClassName: Record<string, string> = {
  ACTIVE: 'product-management-status-active',
  INACTIVE: 'product-management-status-inactive',
  ARCHIVED: 'product-management-status-archived',
};

export function Productmanagement() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const productListQuery = useProductList({ page: 1, limit: 100 });

  const filteredProducts = useMemo(() => {
    const products = productListQuery.data?.items ?? [];
    const keyword = searchValue.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.productName.toLowerCase().includes(keyword) ||
        (product.productCode ?? '').toLowerCase().includes(keyword) ||
        product.categoryName.toLowerCase().includes(keyword) ||
        (product.description ?? '').toLowerCase().includes(keyword) ||
        product.status.toLowerCase().includes(keyword)
      );
    });
  }, [productListQuery.data?.items, searchValue]);

  const visibleProducts = useMemo(() => {
    if (activeFilter === 'All') {
      return filteredProducts;
    }

    const statusMap: Record<string, string[]> = {
      Published: ['ACTIVE'],
      Archived: ['ARCHIVED'],
      Draft: ['DRAFT'],
      'Pending Approval': ['PENDING_APPROVAL', 'PENDING'],
      Approved: ['APPROVED'],
      Rejected: ['REJECTED'],
    };

    const statuses = statusMap[activeFilter] ?? [];
    return filteredProducts.filter((product) => statuses.includes(product.status));
  }, [activeFilter, filteredProducts]);

  const filterTabs = [
    { label: 'All', count: filteredProducts.length },
    { label: 'Draft', count: filteredProducts.filter((product) => String(product.status) === 'DRAFT').length },
    {
      label: 'Pending Approval',
      count: filteredProducts.filter((product) => ['PENDING', 'PENDING_APPROVAL'].includes(product.status)).length,
    },
    { label: 'Approved', count: filteredProducts.filter((product) => String(product.status) === 'APPROVED').length },
    { label: 'Published', count: filteredProducts.filter((product) => product.status === 'ACTIVE').length },
    { label: 'Rejected', count: filteredProducts.filter((product) => String(product.status) === 'REJECTED').length },
    { label: 'Archived', count: filteredProducts.filter((product) => product.status === 'ARCHIVED').length },
  ];

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Products" />

        <section className="admin-main">
          <AdminNavbar />

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

            <label className="product-management-search product-management-page-search">
              <IconSearch size={18} />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search products..."
                type="search"
              />
            </label>

            <div className="product-management-filter-tabs">
              {filterTabs.map((tab) => (
                <button
                  key={tab.label}
                  className={activeFilter === tab.label ? 'is-active' : ''}
                  type="button"
                  onClick={() => setActiveFilter(tab.label)}
                >
                  {tab.label} <span>{tab.count}</span>
                </button>
              ))}
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
                {visibleProducts.map((product) => (
                  <article key={product.productId} className="product-card">
                    <div className="product-card-media">
                      <span className={`product-card-status ${statusClassName[product.status] ?? 'product-management-status-archived'}`}>
                        {product.status}
                      </span>
                      <div className="product-card-placeholder">
                        <IconPackage size={42} />
                        <span>No image</span>
                      </div>
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
                        <button className="product-card-button product-card-button-secondary" type="button">
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
                    </div>
                  </article>
                ))}
              </section>
            ) : null}

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
