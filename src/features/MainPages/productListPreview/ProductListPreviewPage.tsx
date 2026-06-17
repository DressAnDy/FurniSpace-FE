import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconHeart,
  IconSearch,
} from '@tabler/icons-react';

import categoryChairsUrl from '@/assets/product-list/category-chairs.png';
import categoryNewArrivalsUrl from '@/assets/product-list/category-new-arrivals.png';
import categorySofasUrl from '@/assets/product-list/category-sofas.png';
import categoryTablesUrl from '@/assets/product-list/category-tables.png';
import diningTableUrl from '@/assets/product-list/dining-table.png';
import sofaUrl from '@/assets/product-list/sofa.png';
import tableUrl from '@/assets/product-list/table.png';
import { useLang } from '@/app/providers/LangContext';
import { MainNavbar } from '@/features/MainPages/maincomponents';
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
    itemCount: '518 sản phẩm',
    sortLabel: 'Phù hợp nhất',
    newBadge: 'Mới',
    fromPrefix: 'Từ ',
    categories: [
      { imageUrl: categoryNewArrivalsUrl, title: 'Mới nhất' },
      { imageUrl: categorySofasUrl, title: 'Ghế sofa' },
      { imageUrl: categoryChairsUrl, title: 'Ghế' },
      { imageUrl: categoryTablesUrl, title: 'Bàn' },
    ],
    products: [
      { badge: 'Mới', imageUrl: tableUrl, material: 'Gỗ sồi, mây, thép', price: '36.990.000 ₫', title: 'Bàn Phụ', swatches: ['oak', 'linen', 'black'] },
      { badge: 'Mới', imageUrl: diningTableUrl, material: 'Gỗ sồi nguyên khối, da', price: '93.790.000 ₫', title: 'Bàn Ăn', swatches: ['natural', 'cream', 'charcoal'] },
      { imageUrl: sofaUrl, material: 'Vải boucle, gỗ sồi, mút', price: 'Từ 71.290.000 ₫', title: 'Ghế Sofa', swatches: ['boucle', 'tan', 'graphite'] },
      { imageUrl: tableUrl, material: 'Gỗ óc chó, gốm sứ', price: '42.500.000 ₫', title: 'Bàn Trà', swatches: ['walnut', 'stone', 'black'] },
      { imageUrl: diningTableUrl, material: 'Gỗ sồi, kim loại', price: '64.990.000 ₫', title: 'Bàn Ăn Tròn', swatches: ['natural', 'cream', 'graphite'] },
      { badge: 'Mới', imageUrl: sofaUrl, material: 'Vải lanh, gỗ tần bì', price: '78.900.000 ₫', title: 'Sofa Modular', swatches: ['boucle', 'tan', 'charcoal'] },
      { imageUrl: tableUrl, material: 'Gỗ sồi hun khói, đồng thau', price: '29.490.000 ₫', title: 'Bàn Phòng Khách', swatches: ['walnut', 'brass', 'linen'] },
      { imageUrl: diningTableUrl, material: 'Đá cẩm thạch, gỗ sồi', price: '88.200.000 ₫', title: 'Bàn Mở Rộng', swatches: ['stone', 'oak', 'black'] },
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
    itemCount: '518 items',
    sortLabel: 'Relevance',
    newBadge: 'New',
    fromPrefix: 'From ',
    categories: [
      { imageUrl: categoryNewArrivalsUrl, title: 'New arrivals' },
      { imageUrl: categorySofasUrl, title: 'Sofas' },
      { imageUrl: categoryChairsUrl, title: 'Chairs' },
      { imageUrl: categoryTablesUrl, title: 'Tables' },
    ],
    products: [
      { badge: 'New', imageUrl: tableUrl, material: 'Oak, rattan, steel', price: '36,990,000 ₫', title: 'Side Table', swatches: ['oak', 'linen', 'black'] },
      { badge: 'New', imageUrl: diningTableUrl, material: 'Solid oak, leather', price: '93,790,000 ₫', title: 'Dining Table', swatches: ['natural', 'cream', 'charcoal'] },
      { imageUrl: sofaUrl, material: 'Boucle, oak, foam', price: 'From 71,290,000 ₫', title: 'Sofa', swatches: ['boucle', 'tan', 'graphite'] },
      { imageUrl: tableUrl, material: 'Walnut, ceramic', price: '42,500,000 ₫', title: 'Coffee Table', swatches: ['walnut', 'stone', 'black'] },
      { imageUrl: diningTableUrl, material: 'Oak veneer, metal', price: '64,990,000 ₫', title: 'Round Dining Table', swatches: ['natural', 'cream', 'graphite'] },
      { badge: 'New', imageUrl: sofaUrl, material: 'Linen, ash wood', price: '78,900,000 ₫', title: 'Modular Sofa', swatches: ['boucle', 'tan', 'charcoal'] },
      { imageUrl: tableUrl, material: 'Smoked oak, brass', price: '29,490,000 ₫', title: 'Lounge Table', swatches: ['walnut', 'brass', 'linen'] },
      { imageUrl: diningTableUrl, material: 'Marble, oak', price: '88,200,000 ₫', title: 'Extension Table', swatches: ['stone', 'oak', 'black'] },
    ],
  },
} as const;

export function ProductListPreviewPage() {
  const { lang } = useLang();
  const t = pageContent[lang];

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
              <img src={category.imageUrl} alt="" />
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
          <p>{t.itemCount}</p>
          <button type="button">
            <span>{t.sortLabel}</span>
            <IconChevronDown size={18} stroke={1.8} />
          </button>
        </div>

        <div className="product-list-preview-grid">
          {t.products.map((product) => (
            <ProductCard key={`${product.title}-${product.price}`} newBadgeLabel={t.newBadge} {...product} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

type ProductCardProps = {
  badge?: string;
  imageUrl: string;
  material: string;
  newBadgeLabel: string;
  price: string;
  swatches: readonly string[];
  title: string;
};

function ProductCard({ badge, imageUrl, material, newBadgeLabel, price, swatches, title }: ProductCardProps) {
  return (
    <article className="product-list-preview-card">
      <div className="product-list-preview-card-media">
        {badge ? <span className="product-list-preview-badge">{newBadgeLabel}</span> : null}
        <img src={imageUrl} alt={title} />
        <div className="product-list-preview-card-actions">
          <button aria-label={`Save ${title}`} type="button">
            <IconHeart size={19} stroke={1.8} />
          </button>
        </div>
      </div>

      <div className="product-list-preview-card-body">
        <div>
          <h2>{title}</h2>
          <p>{material}</p>
        </div>
        <div className="product-list-preview-card-swatches" aria-label={`${title} colors`}>
          {swatches.map((swatch) => (
            <span className={`product-list-preview-swatch-${swatch}`} key={swatch} />
          ))}
        </div>
        <strong>{price}</strong>
      </div>
    </article>
  );
}

