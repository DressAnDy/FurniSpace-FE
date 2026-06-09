import { IconArchive, IconEdit, IconEye, IconPackage, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const products = [
  {
    productId: 'prd-001',
    productCode: 'PRD-2024-001',
    productName: 'Modern Office Chair V3',
    category: 'Seating',
    description: 'Ergonomic office chair with breathable upholstery, adjustable height, and modular color options.',
    status: 'ACTIVE',
    versionCount: 4,
  },
  {
    productId: 'prd-002',
    productCode: 'PRD-2024-002',
    productName: 'Executive Oak Desk',
    category: 'Desks',
    description: 'Premium oak executive desk with cable routing, storage drawers, and optional finish variants.',
    status: 'ACTIVE',
    versionCount: 3,
  },
  {
    productId: 'prd-003',
    productCode: 'PRD-2024-003',
    productName: 'Conference Table Oak',
    category: 'Tables',
    description: 'Conference table system for meeting rooms with multiple dimensions and top materials.',
    status: 'ACTIVE',
    versionCount: 5,
  },
  {
    productId: 'prd-004',
    productCode: 'PRD-2024-004',
    productName: 'Outdoor Patio Set',
    category: 'Outdoor',
    description: 'Weather-resistant patio furniture set with lounge seating, table, and outdoor fabric options.',
    status: 'INACTIVE',
    versionCount: 1,
  },
];

const statusClassName: Record<string, string> = {
  ACTIVE: 'bg-[#10b981]',
  INACTIVE: 'bg-[#f59e0b]',
};

export function Productmanagement() {
  const navigate = useNavigate();

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Products" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="m-0 text-2xl font-semibold leading-8 text-[#1a1d29]">Product Management</h2>
                <p className="mt-1 text-sm leading-5 text-[#6b7280]">Manage furniture products and their required product versions.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => navigate('/admin/products/create')}>
                <IconPlus size={16} />
                Add Product
              </button>
            </div>

            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article key={product.productId} className="rounded-lg border border-[#e5e7eb] bg-white p-5">
                  <div className="product-management-image mb-4">
                    <IconPackage size={34} />
                  </div>

                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">{product.productName}</h3>
                      <p className="mt-1 font-mono text-xs leading-4 text-[#6b7280]">{product.productCode}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium leading-4 text-white ${statusClassName[product.status]}`}>
                      {product.status}
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-medium leading-5 text-[#d4a574]">{product.category}</p>
                  <p className="line-clamp-2 min-h-[40px] text-sm leading-5 text-[#6b7280]">{product.description}</p>

                  <div className="my-4 flex items-center justify-between border-y border-[#e5e7eb] py-3">
                    <span className="text-sm leading-5 text-[#6b7280]">Product Versions</span>
                    <strong className="text-lg leading-7 text-[#1a1d29]">{product.versionCount}</strong>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#d4a574] px-3 text-sm font-medium text-white"
                      type="button"
                      onClick={() => navigate(`/admin/products/${product.productId}/versions`)}
                    >
                      <IconEye size={16} />
                      View Versions
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#1a1d29]" type="button">
                      <IconEdit size={16} />
                      Edit
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#1a1d29]" type="button">
                      <IconArchive size={16} />
                      Archive
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Productmanagement;
