import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconPackage,
  IconSearch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import {
  formatCatalogPrice,
  getProductThumbnailImage,
  getPublicDefaultVersion,
} from '@/features/MainPages/productCatalog/productCatalogUtils';
import { getProductServiceResultMessage, type ProductListItemDto } from '@/services/api';
import { useBusinessTypeList, useInfiniteProductList } from '@/services/queries';
import { SiteFooter, useTileTransition } from '@/shared/components';

import './ProductListPreviewPage.css';

const pageContent = {
  vi: {
    collectionLabel: 'Bộ sưu tập FurniSpace',
    heroTitle: 'Nội thất thiết kế',
    categoriesLabel: 'Danh mục sản phẩm',
    toolbarLabel: 'Bộ lọc sản phẩm',
    searchLabel: 'Tìm kiếm sản phẩm',
    allFilters: 'Tất cả bộ lọc',
    filters: ['Màu sắc', 'Chất liệu', 'Bộ sưu tập', 'Giá'],
    itemCount: (count: number) => `${count} sản phẩm`,
    sortLabel: 'Phù hợp nhất',
    noProducts: 'Chưa có sản phẩm public phù hợp để hiển thị.',
    loading: 'Đang tải danh sách sản phẩm...',
    categories: [
      { imageUrl: null, title: 'Mới nhất' },
      { imageUrl: null, title: 'Ghế sofa' },
      { imageUrl: null, title: 'Ghế' },
      { imageUrl: null, title: 'Bàn' },
    ],
  },
  en: {
    collectionLabel: 'FurniSpace collection',
    heroTitle: 'Design furniture',
    categoriesLabel: 'Product categories',
    toolbarLabel: 'Product filters',
    searchLabel: 'Search products',
    allFilters: 'All filters',
    filters: ['Colour', 'Material', 'Collection', 'Price'],
    itemCount: (count: number) => `${count} items`,
    sortLabel: 'Relevance',
    noProducts: 'No public standard products are available yet.',
    loading: 'Loading products...',
    categories: [
      { imageUrl: null, title: 'New arrivals' },
      { imageUrl: null, title: 'Sofas' },
      { imageUrl: null, title: 'Chairs' },
      { imageUrl: null, title: 'Tables' },
    ],
  },
} as const;

const PRODUCT_PAGE_SIZE = 12;
const INITIAL_SKELETON_COUNT = 8;
const NEXT_PAGE_SKELETON_COUNT = 4;
const PRODUCT_CARD_REVEAL_STAGGER_MS = 140;

export function ProductListPreviewPage() {
  const { lang } = useLang();
  const t = pageContent[lang];
  const [businessTypeFilterIds, setBusinessTypeFilterIds] = useState<number[]>([]);
  const productListQuery = useInfiniteProductList({ page: 1, limit: PRODUCT_PAGE_SIZE, businessTypeIds: businessTypeFilterIds });
  const businessTypeListQuery = useBusinessTypeList({ page: 1, limit: 100 });
  const businessTypeOptions = businessTypeListQuery.data?.items.filter((businessType) => businessType.status) ?? [];
  const productBatches = useMemo(
    () => (productListQuery.data?.pages ?? []).map((page) => page.items.filter((product) => getPublicDefaultVersion(product))),
    [productListQuery.data?.pages],
  );
  const products = productBatches.flat();

  function toggleBusinessTypeFilter(businessTypeId: number) {
    setBusinessTypeFilterIds((currentIds) =>
      currentIds.includes(businessTypeId)
        ? currentIds.filter((id) => id !== businessTypeId)
        : [...currentIds, businessTypeId],
    );
  }

  return (
    <main className="product-list-preview-page">
      <MainNavbar activePath="/products" classPrefix="product-list-preview" />

      <section className="product-list-preview-hero">
        <div className="product-list-preview-copy">
          <p>{t.collectionLabel}</p>
          <h1>{t.heroTitle}</h1>
        </div>

        <div className="product-list-preview-categories" aria-label={t.categoriesLabel}>
          {t.categories.map((category) => (
            <button className="product-list-preview-category" key={category.title} type="button">
              <span>{category.title}</span>
              {category.imageUrl ? <img src={category.imageUrl} alt="" /> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="product-list-preview-toolbar" aria-label={t.toolbarLabel}>
        <div className="product-list-preview-filter-row">
          <button className="product-list-preview-filter" type="button">
            <IconAdjustmentsHorizontal size={18} stroke={1.7} />
            <span>{t.allFilters}</span>
          </button>
          {t.filters.map((filter) => (
            <button className="product-list-preview-filter" key={filter} type="button">
              <span>{filter}</span>
              <IconChevronDown size={17} stroke={1.7} />
            </button>
          ))}
          {businessTypeOptions.map((businessType) => (
            <button
              className={`product-list-preview-filter product-list-preview-filter-toggle${businessTypeFilterIds.includes(businessType.id) ? ' is-active' : ''}`}
              key={businessType.id}
              type="button"
              onClick={() => toggleBusinessTypeFilter(businessType.id)}
            >
              <span>{businessType.name}</span>
            </button>
          ))}
          {businessTypeFilterIds.length > 0 ? (
            <button className="product-list-preview-filter" type="button" onClick={() => setBusinessTypeFilterIds([])}>
              <span>Clear</span>
            </button>
          ) : null}
        </div>

        <button className="product-list-preview-search" aria-label={t.searchLabel} type="button">
          <IconSearch size={20} stroke={1.8} />
        </button>
      </section>

      <section className="product-list-preview-results">
        <div className="product-list-preview-results-head">
          <p>{t.itemCount(products.length)}</p>
          <button type="button">
            <span>{t.sortLabel}</span>
            <IconChevronDown size={18} stroke={1.8} />
          </button>
        </div>

        {productListQuery.isLoading ? (
          <div className="product-list-preview-grid">
            <ProductGridSkeleton count={INITIAL_SKELETON_COUNT} label={t.loading} />
          </div>
        ) : null}
        {productListQuery.isError ? <div className="product-list-preview-state is-error">{getProductServiceResultMessage(productListQuery.error)}</div> : null}
        {businessTypeListQuery.isError ? <div className="product-list-preview-state is-error">Could not load business type filters.</div> : null}
        {!productListQuery.isLoading && !productListQuery.isError && products.length === 0 ? (
          <div className="product-list-preview-state">{t.noProducts}</div>
        ) : null}

        {!productListQuery.isLoading && !productListQuery.isError && products.length > 0 ? (
          <div className="product-list-preview-grid">
            {productBatches.map((batch, batchIndex) => (
              <AnimatedProductBatch batchIndex={batchIndex} key={productListQuery.data?.pages[batchIndex]?.page ?? batchIndex} products={batch} />
            ))}
            {productListQuery.isFetchingNextPage ? <ProductGridSkeleton count={NEXT_PAGE_SKELETON_COUNT} /> : null}
          </div>
        ) : null}

        <ProductLoadMoreSentinel
          disabled={productListQuery.isLoading || productListQuery.isFetchingNextPage || !productListQuery.hasNextPage}
          onIntersect={() => {
            if (!productListQuery.isFetchingNextPage && productListQuery.hasNextPage) {
              void productListQuery.fetchNextPage();
            }
          }}
        />
      </section>

      <SiteFooter />
    </main>
  );
}

type AnimatedProductBatchProps = {
  batchIndex: number;
  products: ProductListItemDto[];
};

function AnimatedProductBatch({ batchIndex, products }: AnimatedProductBatchProps) {
  return (
    <>
      {products.map((product, index) => (
        <ProductCard
          eagerImage={batchIndex === 0 && index < 4}
          key={product.productId}
          product={product}
          revealIndex={index}
        />
      ))}
    </>
  );
}

type ProductCardProps = {
  eagerImage?: boolean;
  product: ProductListItemDto;
  revealIndex: number;
};

function ProductCard({ eagerImage = false, product, revealIndex }: ProductCardProps) {
  const defaultVersion = getPublicDefaultVersion(product);
  const imageUrl = getProductThumbnailImage(product);
  const { isTransitioning, transitionTo } = useTileTransition();
  const detailPath = `/products/detail?productId=${product.productId}`;
  const revealStyle = {
    '--product-card-reveal-delay': `${Math.min(revealIndex, PRODUCT_PAGE_SIZE - 1) * PRODUCT_CARD_REVEAL_STAGGER_MS}ms`,
  } as CSSProperties;

  function handleCardClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();

    if (isTransitioning) {
      return;
    }

    void transitionTo({
      originElement: event.currentTarget,
      to: detailPath,
    });
  }

  return (
    <article className="product-list-preview-card product-list-preview-card-reveal" style={revealStyle}>
      <Link className="product-list-preview-card-link" to={detailPath} onClick={handleCardClick} aria-disabled={isTransitioning}>
        <div className="product-list-preview-card-media">
          {imageUrl ? (
            <ProductCardImage alt={product.productName} eager={eagerImage} src={imageUrl} />
          ) : (
            <div className="product-list-preview-card-placeholder">
              <IconPackage size={52} stroke={1.4} />
              <span>No image</span>
            </div>
          )}
        </div>

        <div className="product-list-preview-card-body">
          <div>
            <h2>{product.productName}</h2>
            <p>{product.description ?? product.categoryName}</p>
            {product.businessTypes?.length ? (
              <div className="product-list-preview-card-tags">
                {product.businessTypes.slice(0, 3).map((businessType) => (
                  <span key={businessType.id}>{businessType.name}</span>
                ))}
              </div>
            ) : null}
          </div>
          <strong>{formatCatalogPrice(defaultVersion?.estimatedPrice)}</strong>
        </div>
      </Link>
    </article>
  );
}

type ProductCardImageProps = {
  alt: string;
  eager?: boolean;
  src: string;
};

function ProductCardImage({ alt, eager = false, src }: ProductCardImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="product-list-preview-card-placeholder">
        <IconPackage size={52} stroke={1.4} />
        <span>No image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setHasError(true)}
    />
  );
}

type ProductGridSkeletonProps = {
  count: number;
  label?: string;
};

function ProductGridSkeleton({ count, label }: ProductGridSkeletonProps) {
  return (
    <>
      {label ? <span className="product-list-preview-skeleton-label">{label}</span> : null}
      {Array.from({ length: count }, (_, index) => (
        <article aria-hidden="true" className="product-list-preview-card product-list-preview-card-skeleton" key={index}>
          <div className="product-list-preview-card-media">
            <span className="product-list-preview-skeleton-image" />
          </div>
          <div className="product-list-preview-card-body">
            <span className="product-list-preview-skeleton-line product-list-preview-skeleton-line-title" />
            <span className="product-list-preview-skeleton-line" />
            <span className="product-list-preview-skeleton-line product-list-preview-skeleton-line-price" />
          </div>
        </article>
      ))}
    </>
  );
}

type ProductLoadMoreSentinelProps = {
  disabled: boolean;
  onIntersect: () => void;
};

function ProductLoadMoreSentinel({ disabled, onIntersect }: ProductLoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasRequestedRef = useRef(false);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || disabled) {
      return undefined;
    }

    hasRequestedRef.current = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!hasRequestedRef.current && entries.some((entry) => entry.isIntersecting)) {
          hasRequestedRef.current = true;
          onIntersectRef.current();
        }
      },
      { rootMargin: '520px 0px' },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [disabled]);

  return <div className="product-list-preview-sentinel" ref={sentinelRef} aria-hidden="true" />;
}
