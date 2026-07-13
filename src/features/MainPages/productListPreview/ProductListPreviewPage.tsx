import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconHeart,
  IconPackage,
  IconSearch,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import {
  formatCatalogPrice,
  getProductThumbnailImage,
  getPublicDefaultVersion,
} from '@/features/MainPages/productCatalog/productCatalogUtils';
import { getProductServiceResultMessage, type ProductListItemDto } from '@/services/api';
import { useProductList } from '@/services/queries';
import { SiteFooter } from '@/shared/components';

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

export function ProductListPreviewPage() {
  const { lang } = useLang();
  const t = pageContent[lang];
  const productListQuery = useProductList({ page: 1, limit: 100 });
  const products = (productListQuery.data?.items ?? []).filter((product) => getPublicDefaultVersion(product));

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

        {productListQuery.isLoading ? <div className="product-list-preview-state">{t.loading}</div> : null}
        {productListQuery.isError ? <div className="product-list-preview-state is-error">{getProductServiceResultMessage(productListQuery.error)}</div> : null}
        {!productListQuery.isLoading && !productListQuery.isError && products.length === 0 ? (
          <div className="product-list-preview-state">{t.noProducts}</div>
        ) : null}

        <div className="product-list-preview-grid">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

type ProductCardProps = {
  product: ProductListItemDto;
};

function ProductCard({ product }: ProductCardProps) {
  const defaultVersion = getPublicDefaultVersion(product);
  const imageUrl = getProductThumbnailImage(product);

  return (
    <article className="product-list-preview-card">
      <Link className="product-list-preview-card-link" to={`/products/detail?productId=${product.productId}`}>
        <div className="product-list-preview-card-media">
          {imageUrl ? (
            <ProductCardImage alt={product.productName} src={imageUrl} />
          ) : (
            <div className="product-list-preview-card-placeholder">
              <IconPackage size={52} stroke={1.4} />
              <span>No image</span>
            </div>
          )}
          <div className="product-list-preview-card-actions">
            <button aria-label={`Save ${product.productName}`} type="button" onClick={(event) => event.preventDefault()}>
              <IconHeart size={19} stroke={1.8} />
            </button>
          </div>
        </div>

        <div className="product-list-preview-card-body">
          <div>
            <h2>{product.productName}</h2>
            <p>{product.description ?? product.categoryName}</p>
          </div>
          <strong>{formatCatalogPrice(defaultVersion?.estimatedPrice)}</strong>
        </div>
      </Link>
    </article>
  );
}

type ProductCardImageProps = {
  alt: string;
  src: string;
};

function ProductCardImage({ alt, src }: ProductCardImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="product-list-preview-card-placeholder">
        <IconPackage size={52} stroke={1.4} />
        <span>No image</span>
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setHasError(true)} />;
}
