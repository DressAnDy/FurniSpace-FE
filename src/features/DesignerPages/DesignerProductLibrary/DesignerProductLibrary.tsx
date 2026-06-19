import { IconPlus, IconSearch, IconSettings2 } from '@tabler/icons-react';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';

import './DesignerProductLibrary.css';

const productVersions = [
  { mode: 'Default', type: 'Seating', name: 'Natural Rattan / Dark Brown', product: 'Café Chair Rattan Series', code: 'PRD-001-V01', material: 'Natural Rattan + Steel', color: 'Natural / Dark Brown', size: 'W 45 × D 50 × H 80 cm', price: 'Rp 1,200,000' },
  { mode: 'Public', type: 'Seating', name: 'Black Rattan / Matte', product: 'Café Chair Rattan Series', code: 'PRD-001-V02', material: 'Synthetic Rattan + Steel', color: 'Matte Black', size: 'W 45 × D 50 × H 80 cm', price: 'Rp 980,000' },
  { mode: 'Default', type: 'Tables', name: 'Marble Top - White', product: 'Round Bistro Table', code: 'PRD-008-V01', material: 'Marble + Cast Iron Base', color: 'White Marble / Black Base', size: 'Ø 60 × H 72 cm', price: 'Rp 3,800,000' },
  { mode: 'Project Specific', type: 'Tables', name: 'Terrazzo - Milano Café', product: 'Round Bistro Table', code: 'PRD-008-V03', material: 'Terrazzo + Brass Base', color: 'Terrazzo White-Gold / Brass', size: 'Ø 60 × H 72 cm', price: 'Rp 5,200,000' },
  { mode: 'Default', type: 'Storage', name: 'Oak + Clear Glass', product: 'Retail Display Cabinet', code: 'PRD-014-V01', material: 'Solid Oak + Tempered Glass', color: 'Natural Oak / Clear', size: 'W 90 × D 40 × H 180 cm', price: 'Rp 8,500,000' },
  { mode: 'Public', type: 'Storage', name: 'Matte Black + Smoked Glass', product: 'Retail Display Cabinet', code: 'PRD-014-V02', material: 'Steel + Smoked Glass', color: 'Matte Black / Smoked', size: 'W 90 × D 40 × H 180 cm', price: 'Rp 7,800,000' },
  { mode: 'Default', type: 'Lighting', name: 'Brushed Gold - 3 Heads', product: 'Pendant Brass Cluster', code: 'PRD-022-V01', material: 'Brass + Blown Glass', color: 'Brushed Gold / Amber Glass', size: 'Cluster W 60 cm / Drop H 120 cm', price: 'Rp 4,200,000' },
  { mode: 'Public', type: 'Lighting', name: 'Warm White Linear', product: 'Retail Track Light', code: 'PRD-030-V02', material: 'Aluminum + LED', color: 'White / Warm 3000K', size: 'L 120 cm', price: 'Rp 2,100,000' },
  { mode: 'Default', type: 'Decor', name: 'Stone Texture Panel', product: 'Feature Wall Panel', code: 'PRD-041-V01', material: 'Composite Stone', color: 'Travertine Beige', size: 'W 60 × H 120 cm', price: 'Rp 1,650,000' },
];

export function DesignerProductLibrary() {
  return (
    <DesignerLayout activeLabel="Product Library">
      <section className="mb-7">
        <h2 className="text-3xl font-semibold tracking-tight">Product Library</h2>
        <p className="mt-2 text-sm text-zinc-500">10 product versions · Browse and add to proposals</p>
      </section>

      <section className="designer-card mb-6 flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-zinc-100 px-4 text-zinc-500">
          <IconSearch size={18} />
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search product, material, code..." type="search" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {['All Types', 'Default', 'Public', 'Project Specific'].map((filter) => (
            <button className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600" key={filter} type="button">{filter}</button>
          ))}
          <span className="text-xs font-semibold text-zinc-500">10 versions</span>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {productVersions.map((product) => (
          <article className="designer-card overflow-hidden" key={product.code}>
            <div className="h-32 bg-gradient-to-br from-[#f6ead9] via-white to-[#ded7ce]" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="designer-pill px-3 py-1 text-xs font-semibold">{product.mode}</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{product.type}</span>
              </div>
              <h3 className="text-[15px] font-semibold text-zinc-950">{product.name}</h3>
              <p className="mt-1 text-sm text-zinc-600">{product.product}</p>
              <p className="mt-1 text-xs font-semibold text-zinc-400">{product.code}</p>
              <dl className="mt-5 space-y-2 text-xs">
                <ProductSpec label="Material" value={product.material} />
                <ProductSpec label="Color" value={product.color} />
                <ProductSpec label="Size" value={product.size} />
              </dl>
              <div className="mt-5 flex items-center justify-between gap-3">
                <strong className="text-lg font-semibold">{product.price}</strong>
                <div className="flex items-center gap-2">
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-600" type="button" aria-label="Customize product">
                    <IconSettings2 size={17} />
                  </button>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#c7a15f] px-4 text-xs font-semibold text-[#171717]" type="button">
                    <IconPlus size={15} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </DesignerLayout>
  );
}

function ProductSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="font-semibold text-zinc-500">{label}</dt>
      <dd className="m-0 text-zinc-800">{value}</dd>
    </div>
  );
}
