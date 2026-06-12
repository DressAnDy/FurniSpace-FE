import {
  IconChevronRight,
  IconHelpCircle,
  IconPencil,
  IconRulerMeasure,
  IconShoppingBag,
  IconTable,
  IconTools,
} from '@tabler/icons-react';

import diningRoomUrl from '@/assets/product-detail-shop/dining-room.png';
import roomDetailUrl from '@/assets/product-detail-shop/room-detail.png';
import tableAngleUrl from '@/assets/product-detail-shop/table-angle.png';
import tableCloseupUrl from '@/assets/product-detail-shop/table-closeup.png';
import tableMainUrl from '@/assets/product-detail-shop/table-main.png';
import tableRoomUrl from '@/assets/product-detail-shop/table-room.png';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import { SiteFooter } from '@/shared/components';

import './ProductDetailPage.css';

const options = [
  {
    icon: <IconRulerMeasure size={21} stroke={1.6} />,
    label: 'Size',
    value: 'H74½xW85xL160cm',
  },
  {
    icon: <IconTable size={23} stroke={1.6} />,
    label: 'Tabletop',
    value: 'dark oak veneer',
  },
  {
    icon: <IconTools size={23} stroke={1.6} />,
    label: 'Leg',
    value: 'dark oak veneer',
  },
];

const accordions = [
  { icon: <IconHelpCircle size={21} stroke={1.6} />, title: 'Product details' },
  { icon: <IconPencil size={21} stroke={1.6} />, title: 'Measurements' },
  { icon: <IconHelpCircle size={21} stroke={1.6} />, title: 'Need help? Ask a question' },
];

export function ProductDetailPage() {
  return (
    <main className="product-detail-page">
      <MainNavbar activePath="/products" classPrefix="product-detail" />

      <section className="product-detail-shell">
        <div className="product-detail-gallery">
          <figure className="product-detail-hero-image">
            <img src={tableMainUrl} alt="Axo series dining table front view" />
          </figure>

          <div className="product-detail-gallery-row">
            <figure>
              <img src={tableAngleUrl} alt="Axo series dining table side view" />
            </figure>
            <figure className="product-detail-video-tile">
              <button aria-label="Play product video" type="button">
                <IconChevronRight size={18} stroke={2} />
              </button>
            </figure>
          </div>

          <div className="product-detail-gallery-row product-detail-gallery-row-wide">
            <figure>
              <img src={roomDetailUrl} alt="Dining room product detail" />
            </figure>
            <figure>
              <img src={diningRoomUrl} alt="Axo series dining table in dining room" />
            </figure>
          </div>

          <figure className="product-detail-wide-image">
            <img src={tableRoomUrl} alt="Axo series dining table interior styling" />
          </figure>

          <figure className="product-detail-wide-image product-detail-show-more">
            <img src={tableCloseupUrl} alt="Axo series tabletop close up" />
            <button type="button">Show more</button>
          </figure>
        </div>

        <aside className="product-detail-panel" aria-label="Product purchase options">
          <div className="product-detail-title">
            <h1>axoseries</h1>
            <p>axo series dining table</p>
          </div>

          <section className="product-detail-options" aria-label="Choose your design">
            <h2>Choose your design</h2>
            {options.map((option) => (
              <button className="product-detail-option" key={option.label} type="button">
                <span className="product-detail-option-icon">{option.icon}</span>
                <span className="product-detail-option-copy">
                  <span>{option.label}</span>
                  <strong>{option.value}</strong>
                </span>
                <span className="product-detail-option-change">Change</span>
                <IconChevronRight size={16} stroke={1.8} />
              </button>
            ))}
          </section>

          <section className="product-detail-price">
            <p>Rec. retail price</p>
            <strong>36,990,000 ₫</strong>
            <span>From 36,990,000 ₫</span>
          </section>

          <button className="product-detail-cart-button" type="button">
            <IconShoppingBag size={16} stroke={1.7} />
            Add to cart
          </button>

          <section className="product-detail-delivery">
            <div>
              <span>Expected delivery</span>
              <strong>3-4 weeks</strong>
            </div>
            <p>Quality takes time - most of our furniture is made to order and thoughtfully crafted just for you.</p>
          </section>

          <div className="product-detail-accordion-list">
            {accordions.map((item) => (
              <button className="product-detail-accordion" key={item.title} type="button">
                <span>{item.icon}</span>
                <strong>{item.title}</strong>
                <IconChevronRight size={16} stroke={1.8} />
              </button>
            ))}
          </div>
        </aside>
      </section>

      <SiteFooter />
    </main>
  );
}

