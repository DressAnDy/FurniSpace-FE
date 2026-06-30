import { IconPlus, IconSearch, IconSettings2 } from '@tabler/icons-react';
import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import './DesignerProductLibrary.css';

const productVersions = [
  { mode: 'Default', type: 'Seating', name: 'Natural Rattan / Dark Brown', product: 'Cafe Chair Rattan Series', code: 'PRD-001-V01', material: 'Natural Rattan + Steel', color: 'Natural / Dark Brown', size: 'W 45 x D 50 x H 80 cm', price: 'Rp 1,200,000' },
  { mode: 'Public', type: 'Seating', name: 'Black Rattan / Matte', product: 'Cafe Chair Rattan Series', code: 'PRD-001-V02', material: 'Synthetic Rattan + Steel', color: 'Matte Black', size: 'W 45 x D 50 x H 80 cm', price: 'Rp 980,000' },
  { mode: 'Default', type: 'Tables', name: 'Marble Top - White', product: 'Round Bistro Table', code: 'PRD-008-V01', material: 'Marble + Cast Iron Base', color: 'White Marble / Black Base', size: '60 cm dia. x H 72 cm', price: 'Rp 3,800,000' },
  { mode: 'Project Specific', type: 'Tables', name: 'Terrazzo - Milano Cafe', product: 'Round Bistro Table', code: 'PRD-008-V03', material: 'Terrazzo + Brass Base', color: 'Terrazzo White-Gold / Brass', size: '60 cm dia. x H 72 cm', price: 'Rp 5,200,000' },
  { mode: 'Default', type: 'Storage', name: 'Oak + Clear Glass', product: 'Retail Display Cabinet', code: 'PRD-014-V01', material: 'Solid Oak + Tempered Glass', color: 'Natural Oak / Clear', size: 'W 90 x D 40 x H 180 cm', price: 'Rp 8,500,000' },
  { mode: 'Public', type: 'Storage', name: 'Matte Black + Smoked Glass', product: 'Retail Display Cabinet', code: 'PRD-014-V02', material: 'Steel + Smoked Glass', color: 'Matte Black / Smoked', size: 'W 90 x D 40 x H 180 cm', price: 'Rp 7,800,000' },
  { mode: 'Default', type: 'Lighting', name: 'Brushed Gold - 3 Heads', product: 'Pendant Brass Cluster', code: 'PRD-022-V01', material: 'Brass + Blown Glass', color: 'Brushed Gold / Amber Glass', size: 'Cluster W 60 cm / Drop H 120 cm', price: 'Rp 4,200,000' },
  { mode: 'Public', type: 'Lighting', name: 'Warm White Linear', product: 'Retail Track Light', code: 'PRD-030-V02', material: 'Aluminum + LED', color: 'White / Warm 3000K', size: 'L 120 cm', price: 'Rp 2,100,000' },
  { mode: 'Default', type: 'Decor', name: 'Stone Texture Panel', product: 'Feature Wall Panel', code: 'PRD-041-V01', material: 'Composite Stone', color: 'Travertine Beige', size: 'W 60 x H 120 cm', price: 'Rp 1,650,000' },
];

export function DesignerProductLibrary() {
  return (
    <DesignerLayout activeLabel="Product Library">
      <section className="designer-products-header"><h2>Product Library</h2><p>10 product versions - Browse and add to proposals</p></section>
      <section className="designer-card designer-products-toolbar">
        <label className="designer-products-search"><IconSearch size={18} /><input placeholder="Search product, material, code..." type="search" /></label>
        <div className="designer-products-filters">
          {['All Types', 'Default', 'Public', 'Project Specific'].map((filter) => <button key={filter} type="button">{filter}</button>)}
          <span>10 versions</span>
        </div>
      </section>
      <section className="designer-products-grid">
        {productVersions.map((product) => (
          <article className="designer-card designer-product-card" key={product.code}>
            <div className="designer-product-preview" />
            <div className="designer-product-body">
              <div className="designer-product-badges"><span className="designer-pill designer-product-mode">{product.mode}</span><span className="designer-product-type">{product.type}</span></div>
              <h3>{product.name}</h3><p className="designer-product-name">{product.product}</p><p className="designer-product-code">{product.code}</p>
              <dl className="designer-product-specs"><ProductSpec label="Material" value={product.material} /><ProductSpec label="Color" value={product.color} /><ProductSpec label="Size" value={product.size} /></dl>
              <div className="designer-product-footer"><strong>{product.price}</strong><div className="designer-product-actions"><button className="designer-product-icon-button" type="button" aria-label="Customize product"><IconSettings2 size={17} /></button><button className="designer-product-add-button" type="button"><IconPlus size={15} />Add</button></div></div>
            </div>
          </article>
        ))}
      </section>
    </DesignerLayout>
  );
}

function ProductSpec({ label, value }: { label: string; value: string }) {
  return <div className="designer-product-spec-row"><dt>{label}</dt><dd>{value}</dd></div>;
}
