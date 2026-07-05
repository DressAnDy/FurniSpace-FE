import { useMemo, useState } from 'react';
import {
  IconBox,
  IconCheck,
  IconCube,
  IconSearch,
  IconSettings,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getProductServiceResultMessage } from '@/services/api';
import { useProductList } from '@/services/queries';
import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';

import { getPlannerReadiness, getVersionFile } from './catalogModel.utils';
import { CATALOG_MOCK_ENABLED, MOCK_CATALOG_LIST_ITEMS } from './catalogModel.mock';
import './CatalogModelManagement.css';

type ReadinessFilter = 'ALL' | 'READY' | 'INCOMPLETE';

export function CatalogModelManagementPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('ALL');
  const productsQuery = useProductList({ limit: 100, page: 1 }, !CATALOG_MOCK_ENABLED);
  const products = useMemo(
    () => (CATALOG_MOCK_ENABLED ? MOCK_CATALOG_LIST_ITEMS : productsQuery.data?.items ?? []),
    [productsQuery.data?.items],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const readiness = getPlannerReadiness(product.status, product.defaultVersion);
      const matchesQuery = !normalizedQuery || [
        product.productName,
        product.productCode,
        product.categoryName,
        product.defaultVersion?.versionName,
        product.defaultVersion?.versionCode,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      const matchesReadiness = readinessFilter === 'ALL' ||
        (readinessFilter === 'READY' ? readiness.isReady : !readiness.isReady);

      return matchesQuery && matchesReadiness;
    });
  }, [products, query, readinessFilter]);
  const readyCount = products.filter((product) => getPlannerReadiness(product.status, product.defaultVersion).isReady).length;

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="3D Model & File Library" />
        <section className="admin-main">
          <AdminNavbar />
          <div className="admin-content catalog-model-content">
            <header className="catalog-model-heading">
              <div>
                <span className="catalog-model-eyebrow">Catalog Management</span>
                <h2>3D Models</h2>
                <p>Review Product Version assets and prepare models for Room Planner.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => navigate('/admin/products')}>
                <IconBox size={16} />
                Manage Products
              </button>
            </header>

            <section className="catalog-model-summary" aria-label="3D catalog summary">
              <div><span>Products</span><strong>{products.length}</strong></div>
              <div><span>Planner ready</span><strong>{readyCount}</strong></div>
              <div><span>Need attention</span><strong>{Math.max(products.length - readyCount, 0)}</strong></div>
            </section>

            {CATALOG_MOCK_ENABLED && (
              <div className="catalog-demo-banner">
                Demo data is active. Set <code>VITE_CATALOG_USE_MOCK_DATA=false</code> when the Catalog API is available.
              </div>
            )}

            <div className="catalog-model-controls">
              <label className="catalog-model-search">
                <IconSearch size={18} />
                <input
                  placeholder="Search product, version or category"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="catalog-model-filter" role="group" aria-label="Planner readiness filter">
                {(['ALL', 'READY', 'INCOMPLETE'] as const).map((filter) => (
                  <button
                    className={readinessFilter === filter ? 'is-active' : ''}
                    key={filter}
                    type="button"
                    onClick={() => setReadinessFilter(filter)}
                  >
                    {filter === 'INCOMPLETE' ? 'Need attention' : filter.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {!CATALOG_MOCK_ENABLED && productsQuery.isLoading && <div className="catalog-model-state">Loading catalog from API...</div>}
            {!CATALOG_MOCK_ENABLED && productsQuery.isError && (
              <div className="catalog-model-state is-error">{getProductServiceResultMessage(productsQuery.error)}</div>
            )}
            {(!productsQuery.isLoading || CATALOG_MOCK_ENABLED) && (!productsQuery.isError || CATALOG_MOCK_ENABLED) && filteredProducts.length === 0 && (
              <div className="catalog-model-state">No products match the current filter.</div>
            )}

            <section className="catalog-model-table" aria-label="Product Version model readiness">
              {filteredProducts.map((product) => {
                const version = product.defaultVersion;
                const readiness = getPlannerReadiness(product.status, version);
                const modelFile = getVersionFile(version, 'MODEL_3D');
                const thumbnailUrl = version?.thumbnail?.fileUrl ?? product.thumbnail?.fileUrl;

                return (
                  <article className="catalog-model-row" key={product.productId}>
                    <div className="catalog-model-thumb">
                      {thumbnailUrl ? <img alt={product.productName} src={thumbnailUrl} /> : <IconCube size={30} />}
                    </div>
                    <div className="catalog-model-identity">
                      <strong>{product.productName}</strong>
                      <span>{product.productCode ?? 'No product code'} · {product.categoryName}</span>
                    </div>
                    <div className="catalog-model-version">
                      <span>Default version</span>
                      <strong>{version?.versionName ?? 'Not created'}</strong>
                      <small>{version?.versionCode ?? 'Add a version first'}</small>
                    </div>
                    <div className="catalog-model-file">
                      <span>MODEL_3D</span>
                      <strong>{modelFile?.originalFileName ?? 'Missing'}</strong>
                    </div>
                    <div className={readiness.isReady ? 'catalog-ready-status is-ready' : 'catalog-ready-status is-warning'}>
                      {readiness.isReady ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
                      <span>{readiness.isReady ? 'Planner ready' : `${readiness.issues.length} issue(s)`}</span>
                    </div>
                    <div className="catalog-model-actions">
                      <button
                        aria-label={`Manage versions for ${product.productName}`}
                        title="Manage versions"
                        type="button"
                        onClick={() => navigate(`/admin/products/${product.productId}/versions`)}
                      >
                        <IconSettings size={18} />
                      </button>
                      <button
                        disabled={!version}
                        type="button"
                        onClick={() => version && navigate(`/admin/catalog/models/${product.productId}/${version.productVersionId}`)}
                      >
                        Open workspace
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
