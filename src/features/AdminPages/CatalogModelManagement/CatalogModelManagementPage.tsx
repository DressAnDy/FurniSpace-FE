import { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconBox,
  IconCheck,
  IconCube,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { useProductList } from '@/services/queries';
import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';

import { getPlannerReadiness, getVersionFile } from './catalogModel.utils';
import './CatalogModelManagement.css';

type ReadinessFilter = 'ALL' | 'READY' | 'INCOMPLETE';
const catalogSortOptions = ['NEWEST', 'NAME_ASC', 'NAME_DESC'] as const;
type CatalogSortFilter = (typeof catalogSortOptions)[number];

export function CatalogModelManagementPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('ALL');
  const [sortFilter, setSortFilter] = useState<CatalogSortFilter>('NEWEST');
  const productsQuery = useProductList({ limit: 100, page: 1 });
  const products = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data?.items],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextProducts = products.filter((product) => {
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

    return [...nextProducts].sort((left, right) => {
      if (sortFilter === 'NAME_ASC') {
        return left.productName.localeCompare(right.productName);
      }

      if (sortFilter === 'NAME_DESC') {
        return right.productName.localeCompare(left.productName);
      }

      return 0;
    });
  }, [products, query, readinessFilter, sortFilter]);

  const readyCount = products.filter((product) => getPlannerReadiness(product.status, product.defaultVersion).isReady).length;
  const attentionCount = Math.max(products.length - readyCount, 0);
  const catalogStats = [
    { label: 'Products', value: products.length, helper: 'Catalog items reviewed', icon: IconCube, tone: 'dark' },
    { label: 'Planner ready', value: readyCount, helper: 'Ready for Room Planner', icon: IconCheck, tone: 'green' },
    { label: 'Need attention', value: attentionCount, helper: 'Missing model assets', icon: IconAlertTriangle, tone: 'gold' },
  ];

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="3D Model & File Library" />
        <section className="admin-main">
          <AdminNavbar activeLabel="3D Model & File Library" />
          <div className="admin-content catalog-model-content">
            <header className="product-management-heading catalog-model-heading">
              <div>
                <h2>3D Models</h2>
                <p>Review Product Version assets and prepare models for Room Planner.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => navigate('/admin/products')}>
                <IconBox size={16} />
                Manage Products
              </button>
            </header>

            <section className="product-stat-grid" aria-label="3D catalog summary">
              {catalogStats.map(({ label, value, helper, icon: Icon, tone }) => (
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

            <section className="admin-card product-management-card catalog-model-card">
              <div className="product-management-tools catalog-model-tools">
                <label className="admin-search product-management-search catalog-model-search">
                  <IconSearch size={18} />
                  <input
                    placeholder="Search product, version or category"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>

                <label className="product-management-filter">
                  <span>Readiness</span>
                  <select value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value as ReadinessFilter)}>
                    {(['ALL', 'READY', 'INCOMPLETE'] as const).map((filter) => (
                      <option key={filter} value={filter}>
                        {formatReadinessLabel(filter)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-management-filter">
                  <span>Sort by</span>
                  <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value as CatalogSortFilter)}>
                    {catalogSortOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatCatalogSortLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="product-management-total">
                  <span>Total</span>
                  <strong>{products.length}</strong>
                </div>
              </div>

              {productsQuery.isLoading && <div className="product-management-state">Loading catalog from API...</div>}

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
                        <span>{product.productCode ?? 'No product code'} - {product.categoryName}</span>
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
                          onClick={() => version && navigate(`/admin/catalog/models/workspace/${product.productId}/${version.productVersionId}`)}
                        >
                          Open workspace
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatReadinessLabel(value: ReadinessFilter) {
  if (value === 'READY') {
    return 'Planner ready';
  }

  if (value === 'INCOMPLETE') {
    return 'Need attention';
  }

  return 'All readiness';
}

function formatCatalogSortLabel(value: CatalogSortFilter) {
  if (value === 'NAME_ASC') {
    return 'Name A-Z';
  }

  if (value === 'NAME_DESC') {
    return 'Name Z-A';
  }

  return 'Newest';
}
