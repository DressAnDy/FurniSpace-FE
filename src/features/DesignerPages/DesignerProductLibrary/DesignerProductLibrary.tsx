import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { IconArrowLeft, IconBox, IconChevronRight, IconCube, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import {
  formatCatalogPrice,
  getCatalogFileUrl,
  getProductCoverImage,
  getVersionModelFile,
  getVersionPreviewImage,
} from '@/features/MainPages/productCatalog/productCatalogUtils';
import { getProductById, getProductServiceResultMessage, type ProductDetailDto, type ProductListItemDto, type ProductVersionDto } from '@/services/api';
import { productQueryKeys, useBusinessTypeList, useProductList } from '@/services/queries';

import './DesignerProductLibrary.css';

type VersionFilter = 'All Types' | 'Default' | 'Public' | 'Project Specific' | 'Planner Ready';

const versionFilters: VersionFilter[] = ['All Types', 'Default', 'Public', 'Project Specific', 'Planner Ready'];
const EMPTY_PRODUCTS: ProductListItemDto[] = [];

export function DesignerProductLibrary() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<VersionFilter>('All Types');
  const [businessTypeFilterIds, setBusinessTypeFilterIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const navigate = useNavigate();
  const productListQuery = useProductList({ page: 1, limit: 100, businessTypeIds: businessTypeFilterIds });
  const businessTypeListQuery = useBusinessTypeList({ page: 1, limit: 100 });
  const businessTypeOptions = businessTypeListQuery.data?.items.filter((businessType) => businessType.status) ?? [];
  const products = productListQuery.data?.items ?? EMPTY_PRODUCTS;
  const productDetailQueries = useQueries({
    queries: products.map((product) => ({
      queryKey: productQueryKeys.detail(product.productId),
      queryFn: () => getProductById(product.productId),
      enabled: Boolean(product.productId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const cards = useMemo(() => {
    return products
      .map((product, index) => mapProductToLibraryCard(product, productDetailQueries[index]?.data, Boolean(productDetailQueries[index]?.isLoading)))
      .filter((card): card is ProductLibraryCardData => Boolean(card));
  }, [productDetailQueries, products]);
  const visibleCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesFilter =
        activeFilter === 'All Types'
        || (activeFilter === 'Default' && card.versions.some((version) => version.isDefault))
        || (activeFilter === 'Public' && card.versions.some((version) => version.isPublic))
        || (activeFilter === 'Project Specific' && card.versions.some((version) => version.isProjectSpecific))
        || (activeFilter === 'Planner Ready' && card.hasModel3d);
      const matchesSearch =
        !normalizedSearch
        || [
          card.product.productName,
          card.product.productCode ?? '',
          card.product.categoryName,
          card.product.businessTypes?.map((businessType) => `${businessType.name} ${businessType.code}`).join(' ') ?? '',
          card.product.description ?? '',
          ...card.versions.flatMap((version) => [
            version.versionName,
            version.versionCode,
            version.material ?? '',
            version.color ?? '',
            formatEnumLabel(version.versionType),
          ]),
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, cards, search]);
  const totalPages = Math.max(Math.ceil(visibleCards.length / 6), 1);
  const pagedCards = visibleCards.slice((page - 1) * 6, page * 6);
  const selectedCard = cards.find((card) => card.product.productId === selectedProductId) ?? null;

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateFilter(filter: VersionFilter) {
    setActiveFilter(filter);
    setPage(1);
  }

  function openProductVersions(productId: string) {
    setSelectedProductId(productId);
  }

  function toggleBusinessTypeFilter(businessTypeId: number) {
    setBusinessTypeFilterIds((currentIds) =>
      currentIds.includes(businessTypeId)
        ? currentIds.filter((id) => id !== businessTypeId)
        : [...currentIds, businessTypeId],
    );
    setPage(1);
  }

  return (
    <DesignerLayout activeLabel="Product Library">
      <section className="designer-products-header">
        {selectedCard ? (
          <button className="designer-products-back" type="button" onClick={() => setSelectedProductId(null)}>
            <IconArrowLeft size={16} />
            Back to Product Library
          </button>
        ) : null}
        <h2>{selectedCard ? selectedCard.product.productName : 'Product Library'}</h2>
        <p>
          {selectedCard
            ? `${selectedCard.versions.length} product versions - Select the version and model for your proposal`
            : productListQuery.isLoading
            ? 'Loading products from catalog...'
            : `${visibleCards.length} of ${cards.length} products - Browse versions and 3D models`}
        </p>
      </section>

      {!selectedCard ? (
        <form
          className="designer-card designer-products-toolbar"
          role="search"
          aria-label="Filter product library"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="designer-products-toolbar-top">
            <label className="designer-products-search">
              <IconSearch size={18} />
              <input
                placeholder="Search product, material, code..."
                type="search"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
              />
            </label>
            <span className="designer-products-filter-count">
              {visibleCards.reduce((total, card) => total + card.versions.length, 0)} versions
            </span>
          </div>

          <div className="designer-products-filter-row">
            <span className="designer-products-filter-label" id="designer-products-version-filter-label">
              Version type
            </span>
            <fieldset className="designer-products-filter-options" aria-labelledby="designer-products-version-filter-label">
              {versionFilters.map((filter) => (
                <button
                  aria-pressed={activeFilter === filter}
                  className={activeFilter === filter ? 'is-active' : ''}
                  key={filter}
                  type="button"
                  onClick={() => updateFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </fieldset>
          </div>

          {businessTypeOptions.length > 0 ? (
            <div className="designer-products-filter-row">
              <span className="designer-products-filter-label" id="designer-products-business-filter-label">
                Business type
              </span>
              <fieldset className="designer-products-filter-options" aria-labelledby="designer-products-business-filter-label">
                {businessTypeOptions.map((businessType) => (
                  <button
                    aria-pressed={businessTypeFilterIds.includes(businessType.id)}
                    className={businessTypeFilterIds.includes(businessType.id) ? 'is-active' : ''}
                    key={businessType.id}
                    type="button"
                    onClick={() => toggleBusinessTypeFilter(businessType.id)}
                  >
                    {getBusinessTypeLabel(businessType.name)}
                  </button>
                ))}
                {businessTypeFilterIds.length > 0 ? (
                  <button className="designer-products-filter-clear" type="button" onClick={() => setBusinessTypeFilterIds([])}>
                    <IconX size={13} />
                    Clear
                  </button>
                ) : null}
              </fieldset>
            </div>
          ) : null}
        </form>
      ) : null}

      {productListQuery.isError ? (
        <section className="designer-card designer-products-state designer-products-state-error">
          {getProductServiceResultMessage(productListQuery.error)}
        </section>
      ) : null}

      {productDetailQueries.some((query) => query.isError) ? (
        <section className="designer-card designer-products-state designer-products-state-error">
          {getProductServiceResultMessage(productDetailQueries.find((query) => query.isError)?.error)}
        </section>
      ) : null}

      {!selectedCard && !productListQuery.isLoading && !productListQuery.isError && visibleCards.length === 0 ? (
        <section className="designer-card designer-products-state">
          No products match the current filters.
        </section>
      ) : null}

      {selectedCard ? (
        <ProductVersionList card={selectedCard} onCreateVersion={(productId) => navigate(`/designer/product-library/${productId}/versions/create`)} />
      ) : (
        <section className="designer-products-grid">
          {productListQuery.isLoading
            ? Array.from({ length: 6 }, (_, index) => (
                <article className="designer-card designer-product-card designer-product-card-loading" key={index}>
                  <div className="designer-product-preview" />
                  <div className="designer-product-body">
                    <div className="designer-product-loading-line" />
                    <div className="designer-product-loading-line short" />
                    <div className="designer-product-loading-block" />
                  </div>
                </article>
              ))
            : pagedCards.map((card) => <ProductCard card={card} key={card.product.productId} onOpen={openProductVersions} />)}
        </section>
      )}

      {!selectedCard && !productListQuery.isLoading && visibleCards.length > 0 ? (
        <nav className="designer-products-pagination" aria-label="Product library pagination">
          <span>Page {page} of {totalPages}</span>
          <div>
            <button disabled={page === 1} type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))}>
              Previous
            </button>
            <button disabled={page === totalPages} type="button" onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
              Next
            </button>
          </div>
        </nav>
      ) : null}
    </DesignerLayout>
  );
}

type ProductLibraryCardData = {
  hasModel3d: boolean;
  imageUrl: string | null;
  isLoadingDetail: boolean;
  product: ProductDetailDto | ProductListItemDto;
  versions: ProductVersionDto[];
};

function mapProductToLibraryCard(product: ProductListItemDto, detail: ProductDetailDto | undefined, isLoadingDetail: boolean): ProductLibraryCardData | null {
  const hydratedProduct = detail ?? product;
  const versions = sortProductVersions(detail?.versions?.length ? detail.versions : product.defaultVersion ? [product.defaultVersion] : []);
  const primaryVersion = getPrimaryVersion(versions);

  if (!primaryVersion && !isLoadingDetail) {
    return null;
  }

  return {
    hasModel3d: versions.some((version) => Boolean(getVersionModelFile(version))),
    imageUrl: getProductCoverImage(hydratedProduct, primaryVersion),
    isLoadingDetail,
    product: hydratedProduct,
    versions,
  };
}

function ProductCard({ card, onOpen }: { card: ProductLibraryCardData; onOpen: (productId: string) => void }) {
  const { product, versions } = card;

  return (
    <article className="designer-card designer-product-card">
      <div className="designer-product-preview">
        {card.imageUrl ? (
          <img alt={product.productName} src={card.imageUrl} />
        ) : (
          <IconBox size={34} />
        )}
      </div>
      <div className="designer-product-body">
        <div className="designer-product-badges">
          <span className="designer-pill designer-product-mode">{card.hasModel3d ? '3D Models Ready' : 'Product Versions'}</span>
          <span className="designer-product-type">{product.categoryName}</span>
        </div>
        <h3>{product.productName}</h3>
        <p className="designer-product-name">{product.description || 'No description yet.'}</p>
        <p className="designer-product-code">{product.productCode || product.productId}</p>
        <div className="designer-product-summary">
          <span>{versions.length} version{versions.length === 1 ? '' : 's'}</span>
          <span>{card.hasModel3d ? 'Has MODEL_3D' : 'No model yet'}</span>
        </div>
        <button className="designer-product-open-button" type="button" onClick={() => onOpen(product.productId)}>
          View versions
          <IconChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}

function ProductVersionList({ card, onCreateVersion }: { card: ProductLibraryCardData; onCreateVersion: (productId: string) => void }) {
  const { product, versions } = card;
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const previewVersion = versions.find((version) => version.productVersionId === previewVersionId) ?? null;
  const previewModelFile = getVersionModelFile(previewVersion);
  const previewImageUrl = getVersionPreviewImage(previewVersion) ?? card.imageUrl ?? undefined;

  return (
    <section className="designer-product-version-panel">
      <div className="designer-card designer-product-version-summary-card">
        <div className="designer-product-version-summary-media">
          {card.imageUrl ? <img alt={product.productName} src={card.imageUrl} /> : <IconBox size={34} />}
        </div>
        <div>
          <span>{product.categoryName}</span>
          <h3>{product.productName}</h3>
          <p>{product.description || 'No description yet.'}</p>
          <div className="designer-product-summary">
            <span>{versions.length} version{versions.length === 1 ? '' : 's'}</span>
            <span>{card.hasModel3d ? 'Has MODEL_3D' : 'No model yet'}</span>
            {(product.businessTypes ?? []).map((businessType) => (
              <span key={businessType.id}>{getBusinessTypeLabel(businessType.name)}</span>
            ))}
          </div>
          <button className="designer-product-create-version-button" type="button" onClick={() => onCreateVersion(product.productId)}>
            <IconPlus size={15} />
            Create version
          </button>
        </div>
      </div>

      {card.isLoadingDetail && versions.length === 0 ? (
        <section className="designer-card designer-products-state">Loading product versions...</section>
      ) : null}

      {!card.isLoadingDetail && versions.length === 0 ? (
        <section className="designer-card designer-products-state">No product versions found.</section>
      ) : null}

      <section className="designer-product-version-grid">
        {versions.map((version) => (
          <VersionRow
            product={product}
            version={version}
            key={version.productVersionId}
            onPreview={() => {
              setPreviewVersionId(version.productVersionId);
              setViewerStatus('idle');
              setViewerError(null);
            }}
          />
        ))}
      </section>

      {previewVersion ? (
        <div className="designer-product-model-modal-overlay">
          <section className="designer-card designer-product-model-modal" aria-label={`${previewVersion.versionName} 3D model preview`}>
            <div className="designer-product-model-modal-heading">
              <div>
                <strong>{previewVersion.versionName}</strong>
                <p>
                  {viewerStatus === 'error'
                    ? viewerError
                    : previewModelFile
                      ? 'Drag to rotate, scroll to zoom.'
                      : 'No MODEL_3D file is attached to this version.'}
                </p>
              </div>
              <button type="button" aria-label="Close 3D model preview" onClick={() => setPreviewVersionId(null)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="designer-product-model-canvas">
              <ModelViewer
                fallbackImageUrl={previewImageUrl}
                height="100%"
                modelUrl={getCatalogFileUrl(previewModelFile) ?? undefined}
                showGrid={false}
                onStatusChange={(status, error) => {
                  setViewerStatus(status);
                  setViewerError(error);
                }}
              />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function VersionRow({
  product,
  version,
  onPreview,
}: {
  product: ProductDetailDto | ProductListItemDto;
  version: ProductVersionDto;
  onPreview: () => void;
}) {
  const modelFile = getVersionModelFile(version);
  const thumbnailUrl = getVersionPreviewImage(version) ?? getProductCoverImage(product, version);

  return (
    <div className="designer-product-version-row">
      <div className="designer-product-version-media">
        <span className="designer-product-version-status">{version.status}</span>
        {thumbnailUrl ? <img alt={version.versionName} src={thumbnailUrl} /> : <IconBox size={34} />}
      </div>
      <div className="designer-product-version-head">
        <div>
          <strong>{version.versionName}</strong>
          <span>{version.versionCode}</span>
        </div>
        <span className={`designer-product-model-pill ${modelFile ? 'is-ready' : ''}`}>
          <IconCube size={13} />
          {modelFile ? '3D Ready' : 'No 3D'}
        </span>
      </div>
      <div className="designer-product-version-tags">
        {getVersionBadges(version).map((badge) => (
          <span key={badge}>{badge}</span>
        ))}
      </div>
      <dl className="designer-product-version-specs">
        <ProductSpec label="Material" value={version.material || '-'} />
        <ProductSpec label="Color" value={version.color || '-'} />
        <ProductSpec label="Size" value={formatDimensions(version)} />
      </dl>
      <div className="designer-product-footer">
        <strong>{formatCatalogPrice(version.estimatedPrice)}</strong>
        <div className="designer-product-actions">
          <button className="designer-product-asset-button" type="button" onClick={onPreview}>
            <IconCube size={15} />
            3D Assets
          </button>
          <button className="designer-product-add-button" type="button" aria-label={`Add ${version.versionName} from ${product.productName}`}>
            <IconPlus size={15} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="designer-product-spec-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function sortProductVersions(versions: ProductVersionDto[]) {
  return [...versions].sort((first, second) => {
    if (first.isDefault !== second.isDefault) {
      return first.isDefault ? -1 : 1;
    }

    if (first.isPublic !== second.isPublic) {
      return first.isPublic ? -1 : 1;
    }

    return first.versionName.localeCompare(second.versionName);
  });
}

function getPrimaryVersion(versions: ProductVersionDto[]) {
  return versions.find((version) => version.isDefault) ?? versions[0] ?? null;
}

function getVersionBadges(version: ProductVersionDto) {
  const badges = [formatEnumLabel(version.versionType)];

  if (version.isDefault) badges.push('Default');
  if (version.isPublic) badges.push('Public');
  if (version.isProjectSpecific) badges.push('Project');

  return badges;
}

function formatDimensions(version: ProductVersionDto) {
  const dimensions = [
    version.width ? `W ${version.width}` : null,
    version.depth ? `D ${version.depth}` : null,
    version.height ? `H ${version.height}` : null,
  ].filter(Boolean);

  return dimensions.length > 0 ? `${dimensions.join(' x ')} cm` : '-';
}

const businessTypeLabels: Record<string, string> = {
  'cua hang ban nhac cu': 'Musical Instrument Store',
  'cua hang lam dep': 'Beauty Salon',
  'cua hang thoi trang': 'Fashion Store',
  'cua hang tien loi': 'Convenience Store',
  khac: 'Other',
  'kiosk ban le': 'Retail Kiosk',
  'nha hang': 'Restaurant',
  'quan ca phe': 'Coffee Shop',
  showroom: 'Showroom',
  spa: 'Spa',
};

function getBusinessTypeLabel(name: string) {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');

  return businessTypeLabels[normalized] ?? name.trim().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
