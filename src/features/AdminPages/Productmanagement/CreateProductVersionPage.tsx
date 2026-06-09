import { type FormEvent } from 'react';
import { IconArrowLeft, IconBox, IconUpload } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const product = {
  productId: 'prd-001',
  productCode: 'PRD-2024-001',
  productName: 'Modern Office Chair V3',
  category: 'Seating',
};

export function CreateProductVersionPage() {
  const navigate = useNavigate();
  const { productId = product.productId } = useParams();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/admin/products/${productId}/versions`);
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Versions" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content">
            <div className="mb-6">
              <button className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280]" type="button" onClick={() => navigate(`/admin/products/${productId}/versions`)}>
                <IconArrowLeft size={16} />
                Back to Versions
              </button>
              <h2 className="m-0 text-2xl font-semibold leading-8 text-[#1a1d29]">Create Product Version</h2>
              <p className="mt-1 text-sm leading-5 text-[#6b7280]">Version code is generated automatically by backend.</p>
            </div>

            <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSubmit}>
              <section className="space-y-6">
                <div className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                  <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Parent Product</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="m-0 text-xs leading-4 text-[#6b7280]">Product Code</p>
                      <strong className="font-mono text-sm text-[#1a1d29]">{product.productCode}</strong>
                    </div>
                    <div>
                      <p className="m-0 text-xs leading-4 text-[#6b7280]">Product Name</p>
                      <strong className="text-sm text-[#1a1d29]">{product.productName}</strong>
                    </div>
                    <div>
                      <p className="m-0 text-xs leading-4 text-[#6b7280]">Category</p>
                      <strong className="text-sm text-[#d4a574]">{product.category}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d4a5741a] text-[#d4a574]">
                      <IconBox size={22} />
                    </span>
                    <div>
                      <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Version Details</h3>
                      <p className="m-0 text-sm leading-5 text-[#6b7280]">Define the first sellable/configurable version.</p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Version Name</span>
                      <input className="admin-form-input" name="version_name" placeholder="V1.0 Walnut Fabric" required type="text" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Version Type</span>
                      <select className="admin-form-input" name="version_type" defaultValue="Retail">
                        <option value="Retail">Retail</option>
                        <option value="Premium">Premium</option>
                        <option value="Custom">Custom</option>
                        <option value="Project">Project</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Material</span>
                      <input className="admin-form-input" name="material" placeholder="Oak, fabric, steel..." type="text" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Color</span>
                      <input className="admin-form-input" name="color" placeholder="Warm Gray" type="text" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Width</span>
                      <input className="admin-form-input" name="width" placeholder="620" type="number" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Height</span>
                      <input className="admin-form-input" name="height" placeholder="980" type="number" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Depth</span>
                      <input className="admin-form-input" name="depth" placeholder="620" type="number" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Estimated Price</span>
                      <input className="admin-form-input" name="estimated_price" placeholder="$0" type="text" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium leading-5 text-[#1a1d29]">Status</span>
                      <select className="admin-form-input" name="status" defaultValue="DRAFT">
                        <option value="DRAFT">DRAFT</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <label className="product-management-checkbox">
                      <input name="is_default" type="checkbox" />
                      Default version
                    </label>
                    <label className="product-management-checkbox">
                      <input name="is_public" type="checkbox" defaultChecked />
                      Public
                    </label>
                    <label className="product-management-checkbox">
                      <input name="is_project_specific" type="checkbox" />
                      Project specific
                    </label>
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                  <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Version Image</h3>
                  <div className="product-management-upload mt-4">
                    <IconUpload size={28} />
                    <p>Upload version image</p>
                    <span>Use preview or render image</span>
                  </div>
                </section>

                <section className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                  <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Save Version</h3>
                  <p className="mt-2 text-sm leading-5 text-[#6b7280]">After saving, you will return to this product's version list.</p>
                  <button className="mt-5 h-10 w-full rounded-md bg-[#d4a574] px-5 text-sm font-medium text-white" type="submit">
                    Save Product Version
                  </button>
                </section>
              </aside>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CreateProductVersionPage;
