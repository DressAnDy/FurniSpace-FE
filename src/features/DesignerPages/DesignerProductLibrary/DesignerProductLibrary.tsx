import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { IconArrowLeft, IconBox, IconChevronRight, IconCube, IconLayersIntersect, IconSearch, IconX } from '@tabler/icons-react';

import { useLang } from '@/app/providers/useLang';
import { DesignerLayout, designerCopy } from '@/features/DesignerPages/designercomponents';
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

type VersionFilterKey = 'all' | 'default' | 'public' | 'projectSpecific' | 'plannerReady';

const versionFilterKeys: VersionFilterKey[] = ['all', 'default', 'public', 'projectSpecific', 'plannerReady'];

function versionFilterLabel(key: VersionFilterKey, pl: (typeof designerCopy)['en']['productLibrary']) {
  const labels: Record<VersionFilterKey, string> = {
    all: pl.filterAllTypes,
    default: pl.filterDefault,
    public: pl.filterPublic,
    projectSpecific: pl.filterProjectSpecific,
    plannerReady: pl.filterPlannerReady,
  };

  return labels[key];
}
const EMPTY_PRODUCTS: ProductListItemDto[] = [];
const MIN_PRODUCT_PAGE_SIZE = 1;
const MAX_PRODUCT_PAGE_SIZE = 100;
const DEFAULT_PRODUCT_PAGE_SIZE = 9;

export function DesignerProductLibrary() {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<VersionFilterKey>('all');
  const [businessTypeFilterIds, setBusinessTypeFilterIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PRODUCT_PAGE_SIZE);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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
        activeFilter === 'all'
        || (activeFilter === 'default' && card.versions.some((version) => version.isDefault))
        || (activeFilter === 'public' && card.versions.some((version) => version.isPublic))
        || (activeFilter === 'projectSpecific' && card.versions.some((version) => version.isProjectSpecific))
        || (activeFilter === 'plannerReady' && card.hasModel3d);
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
  const totalPages = Math.max(Math.ceil(visibleCards.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pagedCards = visibleCards.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedCard = cards.find((card) => card.product.productId === selectedProductId) ?? null;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateFilter(filter: VersionFilterKey) {
    setActiveFilter(filter);
    setPage(1);
  }

  function openProductVersions(productId: string) {
    setSelectedProductId(productId);
  }

  function updateBusinessTypeFilter(value: string) {
    setBusinessTypeFilterIds(value ? [Number(value)] : []);
    setPage(1);
  }

  return (
    <DesignerLayout activeKey="productLibrary">
      <section className="designer-products-header">
        {selectedCard ? (
          <button className="designer-products-back" type="button" onClick={() => setSelectedProductId(null)}>
            <IconArrowLeft size={16} />
            {t.productLibrary.back}
          </button>
        ) : null}
        <h2>{selectedCard ? selectedCard.product.productName : t.productLibrary.title}</h2>
        <p>
          {selectedCard
            ? t.productLibrary.subtitleVersions(selectedCard.versions.length)
            : productListQuery.isLoading
            ? t.productLibrary.subtitleLoading
            : t.productLibrary.subtitleBrowse(visibleCards.length, cards.length)}
        </p>
      </section>

      {!selectedCard ? (
        <form
          className="designer-card designer-products-toolbar"
          role="search"
          aria-label={t.common.filters}
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="designer-products-toolbar-top">
            <label className="designer-products-search">
              <IconSearch size={18} />
              <input
                placeholder={t.productLibrary.searchPlaceholder}
                type="search"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
              />
            </label>
            <label className="designer-products-select-field">
              <span>{t.productLibrary.versionType}</span>
              <select value={activeFilter} onChange={(event) => updateFilter(event.target.value as VersionFilterKey)}>
                {versionFilterKeys.map((filter) => (
                  <option key={filter} value={filter}>
                    {versionFilterLabel(filter, t.productLibrary)}
                  </option>
                ))}
              </select>
            </label>
            <label className="designer-products-select-field">
              <span>{t.productLibrary.businessType}</span>
              <select
                disabled={businessTypeOptions.length === 0}
                value={businessTypeFilterIds.length > 0 ? String(businessTypeFilterIds[0]) : ''}
                onChange={(event) => updateBusinessTypeFilter(event.target.value)}
              >
                <option value="">{t.common.allBusinessTypes}</option>
                {businessTypeOptions.map((businessType) => (
                  <option key={businessType.id} value={businessType.id}>
                    {getBusinessTypeLabel(businessType.name)}
                  </option>
                ))}
              </select>
            </label>
            <span className="designer-products-filter-count">
              {t.productLibrary.versionsCount(visibleCards.reduce((total, card) => total + card.versions.length, 0))}
            </span>
          </div>
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
          {t.productLibrary.empty}
        </section>
      ) : null}

      {selectedCard ? (
        <ProductVersionList card={selectedCard} />
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
        <DesignerProductsPager
          page={currentPage}
          pageSize={pageSize}
          totalItems={visibleCards.length}
          totalPages={totalPages}
          onChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
        />
      ) : null}
    </DesignerLayout>
  );
}

function DesignerProductsPager({
  page,
  pageSize,
  totalPages,
  totalItems,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const safeTotalPages = Math.max(totalPages, 1);
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  function commitPage() {
    const parsed = Number.parseInt(pageDraft, 10);

    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }

    const next = Math.min(Math.max(parsed, 1), safeTotalPages);
    setPageDraft(String(next));
    if (next !== page) onChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);

    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(pageSize));
      return;
    }

    const next = Math.min(Math.max(parsed, MIN_PRODUCT_PAGE_SIZE), MAX_PRODUCT_PAGE_SIZE);
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <nav className="designer-products-pagination designer-products-batch-pager" aria-label={t.productLibrary.paginationAria}>
      <div className="designer-products-pager-meta">
        <label className="designer-products-pager-field">
          <span>{t.productLibrary.rowsPerPage}</span>
          <input
            aria-label={t.productLibrary.rowsPerPage}
            inputMode="numeric"
            max={MAX_PRODUCT_PAGE_SIZE}
            min={MIN_PRODUCT_PAGE_SIZE}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <label className="designer-products-pager-field">
          <span>{t.productLibrary.pageLabel}</span>
          <input
            aria-label={t.productLibrary.pageLabel}
            inputMode="numeric"
            max={safeTotalPages}
            min={1}
            type="number"
            value={pageDraft}
            onBlur={commitPage}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="designer-products-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="designer-products-pager-total">{t.productLibrary.productsCount(totalItems)}</span>
      </div>
      <div className="designer-products-pager-nav">
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          {t.common.previous}
        </button>
        <button disabled={page >= safeTotalPages} type="button" onClick={() => onChange(page + 1)}>
          {t.common.next}
        </button>
      </div>
    </nav>
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
  const { lang } = useLang();
  const t = designerCopy[lang];
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
          <span className="designer-pill designer-product-mode">{card.hasModel3d ? t.productLibrary.modelsReady : t.productLibrary.productVersions}</span>
          <span className="designer-product-type">{product.categoryName}</span>
        </div>
        <h3>{product.productName}</h3>
        <p className="designer-product-name">{product.description || t.productLibrary.noDescription}</p>
        <div className="designer-product-summary">
          <span>{product.productCode || product.productId}</span>
          <span>{t.productLibrary.versionCount(versions.length)}</span>
        </div>
        <button className="designer-product-open-button" type="button" onClick={() => onOpen(product.productId)}>
          {t.productLibrary.viewVersions}
          <IconChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}

function ProductVersionList({ card }: { card: ProductLibraryCardData }) {
  const { lang } = useLang();
  const t = designerCopy[lang];
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
        <div className="designer-product-version-summary-copy">
          <span className="designer-product-version-summary-category">{product.categoryName}</span>
          <h3>{product.productName}</h3>
          <p>{product.description || t.productLibrary.noDescription}</p>
          <div className="designer-product-summary">
            <span className="designer-product-summary-count">
              <IconLayersIntersect size={13} stroke={1.9} />
              {t.productLibrary.versionCount(versions.length)}
            </span>
            <span className={`designer-product-summary-model ${card.hasModel3d ? 'is-ready' : ''}`}>
              <IconCube size={13} stroke={1.9} />
              {card.hasModel3d ? t.productLibrary.modelReady : t.productLibrary.noModel}
            </span>
            {(product.businessTypes ?? []).map((businessType) => (
              <span className="designer-product-summary-business" key={businessType.id}>
                {getBusinessTypeLabel(businessType.name)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {card.isLoadingDetail && versions.length === 0 ? (
        <section className="designer-card designer-products-state">{t.productLibrary.loadingVersions}</section>
      ) : null}

      {!card.isLoadingDetail && versions.length === 0 ? (
        <section className="designer-card designer-products-state">{t.productLibrary.noVersions}</section>
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
                      ? t.productLibrary.previewHint
                      : t.productLibrary.noModelFile}
                </p>
              </div>
              <button type="button" aria-label={t.productLibrary.closePreview} onClick={() => setPreviewVersionId(null)}>
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
}: Readonly<{
  product: ProductDetailDto | ProductListItemDto;
  version: ProductVersionDto;
  onPreview: () => void;
}>) {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const modelFile = getVersionModelFile(version);
  const thumbnailUrl = getVersionPreviewImage(version) ?? getProductCoverImage(product, version);

  return (
    <div className="designer-product-version-row">
      <div className="designer-product-version-media">
        <span className={`designer-product-version-status ${version.status === 'ACTIVE' ? 'is-active' : ''}`}>{version.status}</span>
        {thumbnailUrl ? <img alt={version.versionName} src={thumbnailUrl} /> : <IconBox size={34} />}
      </div>
      <div className="designer-product-version-body">
        <div className="designer-product-version-head">
          <div>
            <strong title={version.versionName}>{version.versionName}</strong>
            <span title={version.versionCode}>{version.versionCode}</span>
          </div>
          <span className={`designer-product-model-pill ${modelFile ? 'is-ready' : ''}`}>
            <IconCube size={13} />
            {modelFile ? t.productLibrary.ready3d : t.productLibrary.no3d}
          </span>
        </div>
        <div className="designer-product-version-tags">
          {getVersionBadges(version, t.productLibrary).map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
        <dl className="designer-product-version-specs">
          <ProductSpec label={t.productLibrary.material} value={version.material || t.common.dash} />
          <ProductSpec label={t.productLibrary.color} value={version.color || t.common.dash} />
          <ProductSpec label={t.productLibrary.size} value={formatDimensions(version, t.common.dash)} />
        </dl>
        <div className="designer-product-footer">
          <div className="designer-product-version-price">
            <small>{t.productLibrary.estimatedPrice}</small>
            <strong>{formatCatalogPrice(version.estimatedPrice)}</strong>
          </div>
          <div className="designer-product-actions">
            <button className="designer-product-asset-button" type="button" onClick={onPreview}>
              <IconCube size={15} />
              {t.productLibrary.assets3d}
            </button>
          </div>
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

function getVersionBadges(version: ProductVersionDto, pl: (typeof designerCopy)['en']['productLibrary']) {
  const badges = [formatEnumLabel(version.versionType)];

  if (version.isDefault) badges.push(pl.badgeDefault);
  if (version.isPublic) badges.push(pl.badgePublic);
  if (version.isProjectSpecific) badges.push(pl.badgeProject);

  return badges;
}

function formatDimensions(version: ProductVersionDto, emptyLabel: string) {
  const dimensions = [
    version.width ? `W ${version.width}` : null,
    version.depth ? `D ${version.depth}` : null,
    version.height ? `H ${version.height}` : null,
  ].filter(Boolean);

  return dimensions.length > 0 ? `${dimensions.join(' x ')} cm` : emptyLabel;
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
