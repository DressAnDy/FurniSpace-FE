import { useMemo, useState, type FormEvent } from 'react';
import {
  IconAlertTriangle,
  IconBox,
  IconCheck,
  IconCube,
  IconPlus,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import {
  getLayoutAssetServiceResultMessage,
  type LayoutAssetFileType,
  type LayoutAssetType,
} from '@/services/api/layoutAssets';
import { useCreateLayoutAsset, useProductList, useUploadLayoutAssetFile } from '@/services/queries';
import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';
import { useLang } from '@/app/providers/useLang';
import { adminCopy } from '@/features/AdminPages/admincomponents/adminI18n';

import { getPlannerReadiness } from './catalogModel.utils';
import './CatalogModelManagement.css';

type ReadinessFilter = 'ALL' | 'READY' | 'INCOMPLETE';
const catalogSortOptions = ['NEWEST', 'NAME_ASC', 'NAME_DESC'] as const;
type CatalogSortFilter = (typeof catalogSortOptions)[number];
const layoutAssetTypes: LayoutAssetType[] = [
  'WALL_MATERIAL',
  'FLOOR_MATERIAL',
  'STAIR',
  'DOOR',
  'WINDOW',
  'COLUMN',
  'BEAM',
  'DECORATIVE_WALL',
  'DECORATIVE_FLOOR',
  'DECORATIVE_OBJECT',
  'OTHER',
];

export function CatalogModelManagementPage() {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('ALL');
  const [sortFilter, setSortFilter] = useState<CatalogSortFilter>('NEWEST');
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [assetMessage, setAssetMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const productsQuery = useProductList({ limit: 100, page: 1 });
  const createLayoutAssetMutation = useCreateLayoutAsset();
  const uploadLayoutAssetFileMutation = useUploadLayoutAssetFile();
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
        <AdminSidebar activeKey="catalogModels" />
        <section className="admin-main">
          <AdminNavbar activeLabel={t.nav.catalogModels} />
          <div className="admin-content catalog-model-content">
            <header className="product-management-heading catalog-model-heading">
              <div>
                <h2>{t.catalogModels.title}</h2>
                <p>Review Product Version assets and prepare models for Room Planner.</p>
              </div>
              <div className="catalog-model-heading-actions">
                <button className="admin-button admin-button-secondary" type="button" onClick={() => setIsCreateAssetModalOpen(true)}>
                  <IconPlus size={16} />
                  New Layout Asset
                </button>
                <button className="admin-button admin-button-primary" type="button" onClick={() => navigate('/admin/products')}>
                  <IconBox size={16} />
                  Manage Products
                </button>
              </div>
            </header>

            {assetMessage ? <p className={`catalog-model-message catalog-model-message-${assetMessage.tone}`}>{assetMessage.text}</p> : null}

            <nav className="catalog-model-tabs" aria-label="Catalog model sections">
              <button className="is-active" type="button">
                Product Models
              </button>
              <button type="button" onClick={() => navigate('/admin/catalog/layout-assets')}>
                Layout Assets
              </button>
            </nav>

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

              <section className="catalog-model-table" aria-label="Product Version model library">
                {filteredProducts.map((product) => {
                  const version = product.defaultVersion;
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

      {isCreateAssetModalOpen ? (
        <CreateLayoutAssetModal
          isPending={createLayoutAssetMutation.isPending || uploadLayoutAssetFileMutation.isPending}
          onClose={() => setIsCreateAssetModalOpen(false)}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const assetName = String(formData.get('assetName') ?? '').trim();
            const assetType = String(formData.get('assetType') ?? 'DECORATIVE_OBJECT') as LayoutAssetType;

            if (!assetName) {
              setAssetMessage({ tone: 'error', text: 'Asset name is required.' });
              return;
            }

            try {
              const asset = await createLayoutAssetMutation.mutateAsync({
                assetCode: String(formData.get('assetCode') ?? '').trim(),
                assetName,
                assetType,
                description: String(formData.get('description') ?? '').trim(),
                layoutAssetType: assetType,
                name: assetName,
                status: 'ACTIVE',
              });
              const uploadInputs = [
                { file: getOptionalFile(formData, 'previewFile'), fileType: 'PREVIEW' },
                { file: getOptionalFile(formData, 'modelFile'), fileType: 'MODEL_3D' },
                { file: getOptionalFile(formData, 'textureFile'), fileType: 'TEXTURE' },
              ].filter((input): input is { file: File; fileType: LayoutAssetFileType } => Boolean(input.file));

              for (const input of uploadInputs) {
                await uploadLayoutAssetFileMutation.mutateAsync({
                  file: input.file,
                  fileType: input.fileType,
                  layoutAssetId: asset.layoutAssetId,
                });
              }

              form.reset();
              setIsCreateAssetModalOpen(false);
              setAssetMessage({
                tone: 'success',
                text: uploadInputs.length
                  ? 'Layout asset created and files uploaded.'
                  : 'Layout asset created. You can upload model, preview, or texture files later in Layout Assets.',
              });
            } catch (error) {
              setAssetMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
            }
          }}
          onViewLibrary={() => navigate('/admin/catalog/layout-assets')}
        />
      ) : null}
    </main>
  );
}

function CreateLayoutAssetModal({
  isPending,
  onClose,
  onSubmit,
  onViewLibrary,
}: {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onViewLibrary: () => void;
}) {
  return (
    <div className="catalog-model-modal-backdrop" role="presentation">
      <form className="catalog-model-create-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <h3>New Layout Asset</h3>
            <p>Create materials and decorative assets for Designer Room Planner.</p>
          </div>
          <button aria-label="Close create layout asset modal" type="button" onClick={onClose}>x</button>
        </header>

        <div className="catalog-model-form">
          <label>
            <span>Asset Name</span>
            <input name="assetName" placeholder="Decorative column, wood floor, wall panel..." />
          </label>
          <label>
            <span>Asset Code</span>
            <input name="assetCode" placeholder="Optional" />
          </label>
          <label>
            <span>Type</span>
            <select name="assetType" defaultValue="DECORATIVE_OBJECT">
              {layoutAssetTypes.map((type) => (
                <option key={type} value={type}>{formatEnumLabel(type)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Description</span>
            <textarea name="description" placeholder="Usage notes for Room Planner" />
          </label>
          <div className="catalog-model-file-fields">
            <label>
              <span>Preview Image</span>
              <input accept="image/*" name="previewFile" type="file" />
            </label>
            <label>
              <span>3D Model File</span>
              <input accept=".glb,.gltf,.obj,.fbx,.usdz,model/*" name="modelFile" type="file" />
            </label>
            <label>
              <span>Texture File</span>
              <input accept="image/*" name="textureFile" type="file" />
            </label>
          </div>
        </div>

        <footer>
          <button className="admin-button admin-button-secondary" type="button" onClick={onViewLibrary}>
            Open Layout Assets
          </button>
          <div>
            <button className="admin-button admin-button-secondary" disabled={isPending} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="admin-button admin-button-primary" disabled={isPending} type="submit">
              {isPending ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function getOptionalFile(formData: FormData, name: string) {
  const file = formData.get(name);

  return file instanceof File && file.size > 0 ? file : null;
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

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
