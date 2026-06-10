import { IconArchive, IconArrowLeft, IconBox, IconCheck, IconEdit, IconPlus } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const product = {
  productId: 'prd-001',
  productCode: 'PRD-2024-001',
  productName: 'Modern Office Chair V3',
  category: 'Seating',
  description: 'Ergonomic office chair with modular color and material options.',
  status: 'ACTIVE',
};

const versions = [
  {
    productVersionId: 'ver-001',
    versionCode: 'VER-2024-001',
    versionName: 'V3.2 Walnut Fabric',
    versionType: 'Retail',
    material: 'Walnut, fabric',
    color: 'Warm Gray',
    dimensions: '620 x 980 x 620 mm',
    estimatedPrice: '$329',
    isDefault: true,
    isPublic: true,
    isProjectSpecific: false,
    status: 'ACTIVE',
  },
  {
    productVersionId: 'ver-002',
    versionCode: 'VER-2024-002',
    versionName: 'V3.1 Black Leather',
    versionType: 'Premium',
    material: 'Steel, leather',
    color: 'Black',
    dimensions: '620 x 990 x 640 mm',
    estimatedPrice: '$389',
    isDefault: false,
    isPublic: true,
    isProjectSpecific: false,
    status: 'ACTIVE',
  },
  {
    productVersionId: 'ver-003',
    versionCode: 'VER-2024-003',
    versionName: 'Custom Project A',
    versionType: 'Custom',
    material: 'Oak, linen',
    color: 'Beige',
    dimensions: '640 x 980 x 620 mm',
    estimatedPrice: '$419',
    isDefault: false,
    isPublic: false,
    isProjectSpecific: true,
    status: 'DRAFT',
  },
];

const statusClassName: Record<string, string> = {
  ACTIVE: 'bg-[#10b981]',
  DRAFT: 'bg-[#3b82f6]',
};

export function ProductVersionManagement() {
  const navigate = useNavigate();
  const { productId = product.productId } = useParams();

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Versions" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
              <div>
                <button className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280]" type="button" onClick={() => navigate('/admin/products')}>
                  <IconArrowLeft size={16} />
                  Back to Products
                </button>
                <h2 className="m-0 text-2xl font-semibold leading-8 text-[#1a1d29]">Product Versions</h2>
                <p className="mt-1 text-sm leading-5 text-[#6b7280]">Manage versions for {product.productName}.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => navigate(`/admin/products/${productId}/versions/create`)}>
                <IconPlus size={16} />
                Add Version
              </button>
            </div>

            <section className="mb-6 rounded-lg border border-[#e5e7eb] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="m-0 font-mono text-xs leading-4 text-[#6b7280]">{product.productCode}</p>
                  <h3 className="m-0 mt-1 text-xl font-semibold leading-7 text-[#1a1d29]">{product.productName}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-5 text-[#6b7280]">{product.description}</p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-sm leading-5 text-[#6b7280]">Category</p>
                  <strong className="text-[#d4a574]">{product.category}</strong>
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {versions.map((version) => (
                <article key={version.productVersionId} className="rounded-lg border border-[#e5e7eb] bg-white p-5">
                  <div className="product-management-image mb-4">
                    <IconBox size={34} />
                  </div>

                  <div className="mb-3">
                    <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">{version.versionName}</h3>
                    <p className="mt-1 font-mono text-xs leading-4 text-[#6b7280]">{version.versionCode}</p>
                  </div>

                  <div className="space-y-2 text-sm leading-5 text-[#6b7280]">
                    <p className="m-0"><strong className="text-[#1a1d29]">Type:</strong> {version.versionType}</p>
                    <p className="m-0"><strong className="text-[#1a1d29]">Material:</strong> {version.material}</p>
                    <p className="m-0"><strong className="text-[#1a1d29]">Color:</strong> {version.color}</p>
                    <p className="m-0"><strong className="text-[#1a1d29]">Dimensions:</strong> {version.dimensions}</p>
                    <p className="m-0"><strong className="text-[#1a1d29]">Estimated Price:</strong> {version.estimatedPrice}</p>
                  </div>

                  <div className="my-4 flex flex-wrap gap-2">
                    {version.isDefault ? <span className="product-management-flag">DEFAULT</span> : null}
                    {version.isPublic ? <span className="product-management-flag">PUBLIC</span> : null}
                    {version.isProjectSpecific ? <span className="product-management-flag">PROJECT</span> : null}
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium leading-4 text-white ${statusClassName[version.status]}`}>
                      {version.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#1a1d29]" type="button">
                      <IconEdit size={16} />
                      Edit
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-md bg-[#d4a574] px-3 text-sm font-medium text-white" type="button">
                      <IconCheck size={16} />
                      Set Default
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

export default ProductVersionManagement;
