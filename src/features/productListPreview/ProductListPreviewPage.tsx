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
import { SiteFooter } from '@/shared/components';

import './ProductListPreviewPage.css';

const navigation = ['Trang chủ', 'Về chúng tôi', 'Dự án', 'Dịch vụ'];

const categories = [
  { imageUrl: categoryNewArrivalsUrl, title: 'New arrivals' },
  { imageUrl: categorySofasUrl, title: 'Sofas' },
  { imageUrl: categoryChairsUrl, title: 'Chairs' },
  { imageUrl: categoryTablesUrl, title: 'Tables' },
];

const filters = ['All filters', 'Colour', 'Material', 'Collection', 'Price'];

const products = [
  {
    badge: 'New',
    imageUrl: tableUrl,
    material: 'Oak, rattan, steel',
    price: '36,990,000 ₫',
    title: 'Side Table',
    swatches: ['oak', 'linen', 'black'],
  },
  {
    badge: 'New',
    imageUrl: diningTableUrl,
    material: 'Solid oak, leather',
    price: '93,790,000 ₫',
    title: 'Dining Table',
    swatches: ['natural', 'cream', 'charcoal'],
  },
  {
    imageUrl: sofaUrl,
    material: 'Boucle, oak, foam',
    price: 'From 71,290,000 ₫',
    title: 'Sofa',
    swatches: ['boucle', 'tan', 'graphite'],
  },
  {
    imageUrl: tableUrl,
    material: 'Walnut, ceramic',
    price: '42,500,000 ₫',
    title: 'Coffee Table',
    swatches: ['walnut', 'stone', 'black'],
  },
  {
    imageUrl: diningTableUrl,
    material: 'Oak veneer, metal',
    price: '64,990,000 ₫',
    title: 'Round Dining Table',
    swatches: ['natural', 'cream', 'graphite'],
  },
  {
    badge: 'New',
    imageUrl: sofaUrl,
    material: 'Linen, ash wood',
    price: '78,900,000 ₫',
    title: 'Modular Sofa',
    swatches: ['boucle', 'tan', 'charcoal'],
  },
  {
    imageUrl: tableUrl,
    material: 'Smoked oak, brass',
    price: '29,490,000 ₫',
    title: 'Lounge Table',
    swatches: ['walnut', 'brass', 'linen'],
  },
  {
    imageUrl: diningTableUrl,
    material: 'Marble, oak',
    price: '88,200,000 ₫',
    title: 'Extension Table',
    swatches: ['stone', 'oak', 'black'],
  },
];

export function ProductListPreviewPage() {
  return (
    <main className="product-list-preview-page">
      <Header />

      <section className="product-list-preview-hero">
        <div className="product-list-preview-copy">
          <p>FurniSpace collection</p>
          <h1>Design furniture</h1>
        </div>

        <div className="product-list-preview-categories" aria-label="Danh mục sản phẩm">
          {categories.map((category) => (
            <button className="product-list-preview-category" key={category.title} type="button">
              <span>{category.title}</span>
              <img src={category.imageUrl} alt="" />
            </button>
          ))}
        </div>
      </section>

      <section className="product-list-preview-toolbar" aria-label="Bộ lọc sản phẩm">
        <div className="product-list-preview-filter-row">
          {filters.map((filter, index) => (
            <button className="product-list-preview-filter" key={filter} type="button">
              {index === 0 ? <IconAdjustmentsHorizontal size={18} stroke={1.7} /> : null}
              <span>{filter}</span>
              {index > 0 ? <IconChevronDown size={17} stroke={1.7} /> : null}
            </button>
          ))}
        </div>

        <button className="product-list-preview-search" aria-label="Search products" type="button">
          <IconSearch size={20} stroke={1.8} />
        </button>
      </section>

      <section className="product-list-preview-results">
        <div className="product-list-preview-results-head">
          <p>518 items</p>
          <button type="button">
            <span>Relevance</span>
            <IconChevronDown size={18} stroke={1.8} />
          </button>
        </div>

        <div className="product-list-preview-grid">
          {products.map((product) => (
            <ProductCard key={`${product.title}-${product.price}`} {...product} />
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
  price: string;
  swatches: string[];
  title: string;
};

function ProductCard({ badge, imageUrl, material, price, swatches, title }: ProductCardProps) {
  return (
    <article className="product-list-preview-card">
      <div className="product-list-preview-card-media">
        {badge ? <span className="product-list-preview-badge">{badge}</span> : null}
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

function Header() {
  return (
    <header className="product-list-preview-header">
      <a className="product-list-preview-brand" href="/">
        <span className="product-list-preview-brand-mark">F</span>
        <span className="product-list-preview-brand-divider" />
        <span>FurniSpace</span>
      </a>

      <nav className="product-list-preview-nav" aria-label="Điều hướng chính">
        {navigation.map((item) => (
          <a key={item} href={`#${item}`}>
            {item}
          </a>
        ))}
        <a className="product-list-preview-nav-active" href="#thiet-ke-3d">
          Thiết kế 3D
        </a>
      </nav>
    </header>
  );
}
