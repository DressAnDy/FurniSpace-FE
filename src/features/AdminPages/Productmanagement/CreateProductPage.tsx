import { type FormEvent } from 'react';
import { IconArrowLeft, IconPackage, IconUpload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

export function CreateProductPage() {
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const createdProductId = 'prd-new';
    navigate(`/admin/products/${createdProductId}/versions/create`);
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Products" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
              <div>
                <button className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280]" type="button" onClick={() => navigate('/admin/products')}>
                  <IconArrowLeft size={16} />
                  Back to Products
                </button>
                <h2 className="m-0 text-2xl font-semibold leading-8 text-[#1a1d29]">Create Product</h2>
                <p className="mt-1 text-sm leading-5 text-[#6b7280]">Create the product first. A product version is required next.</p>
              </div>
            </div>

            <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSubmit}>
              <section className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d4a5741a] text-[#d4a574]">
                    <IconPackage size={22} />
                  </span>
                  <div>
                    <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Product Information</h3>
                    <p className="m-0 text-sm leading-5 text-[#6b7280]">Product code is generated automatically by backend.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="text-sm font-medium leading-5 text-[#1a1d29]">Product Name</span>
                    <input className="admin-form-input" name="product_name" placeholder="Enter product name" required type="text" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium leading-5 text-[#1a1d29]">Category</span>
                    <select className="admin-form-input" name="category_id" defaultValue="" required>
                      <option value="" disabled>
                        Select category
                      </option>
                      <option value="cat-seating">Seating</option>
                      <option value="cat-desks">Desks</option>
                      <option value="cat-tables">Tables</option>
                      <option value="cat-storage">Storage</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium leading-5 text-[#1a1d29]">Description</span>
                    <textarea className="admin-form-textarea" name="description" placeholder="Describe product purpose, use cases, and catalog notes" />
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
              </section>

              <aside className="space-y-6">
                <section className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                  <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Product Image</h3>
                  <div className="product-management-upload mt-4">
                    <IconUpload size={28} />
                    <p>Upload product image</p>
                    <span>PNG, JPG, or WebP</span>
                  </div>
                </section>

                <section className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                  <h3 className="m-0 text-lg font-semibold leading-7 text-[#1a1d29]">Next Step</h3>
                  <p className="mt-2 text-sm leading-5 text-[#6b7280]">After saving, you will create the first product version immediately.</p>
                  <button className="mt-5 h-10 w-full rounded-md bg-[#d4a574] px-5 text-sm font-medium text-white" type="submit">
                    Save Product
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

export default CreateProductPage;
