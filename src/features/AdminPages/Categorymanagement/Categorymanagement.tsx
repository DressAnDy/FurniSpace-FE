import { useState } from 'react';
import { IconArchive, IconCategory, IconEdit, IconEye, IconPlus, IconSearch } from '@tabler/icons-react';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { CreateCategoryModal } from './components';
import './Categorymanagement.css';

const categories = [
  {
    name: 'Seating',
    description: 'Chairs, sofas, benches, and seating furniture',
    status: 'ACTIVE',
    createdAt: '2024-01-10',
    updatedAt: '2024-05-15',
  },
  {
    name: 'Desks',
    description: 'Office desks, executive desks, and workstations',
    status: 'ACTIVE',
    createdAt: '2024-01-12',
    updatedAt: '2024-04-20',
  },
  {
    name: 'Tables',
    description: 'Dining tables, conference tables, and coffee tables',
    status: 'ACTIVE',
    createdAt: '2024-01-15',
    updatedAt: '2024-05-10',
  },
  {
    name: 'Storage',
    description: 'Cabinets, shelving, and storage solutions',
    status: 'ACTIVE',
    createdAt: '2024-01-18',
    updatedAt: '2024-05-05',
  },
  {
    name: 'Lighting',
    description: 'Pendant lights, floor lamps, and lighting fixtures',
    status: 'ACTIVE',
    createdAt: '2024-02-01',
    updatedAt: '2024-05-22',
  },
  {
    name: 'Outdoor',
    description: 'Outdoor furniture and patio sets',
    status: 'INACTIVE',
    createdAt: '2024-02-10',
    updatedAt: '2024-03-15',
  },
];

export function Categorymanagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateCategory = () => {
    setIsCreateModalOpen(false);
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Categories" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content">
            <div className="mb-5 flex items-start justify-between gap-6">
              <div>
                <h2 className="m-0 text-2xl font-semibold leading-8 text-[#1a1d29]">Product Categories</h2>
                <p className="mt-1 text-sm leading-5 text-[#6b7280]">Manage product categories and hierarchies</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => setIsCreateModalOpen(true)}>
                <IconPlus size={16} />
                Add Category
              </button>
            </div>

            <section className="rounded-lg border border-[#e5e7eb] bg-white p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <label className="relative mt-[21px] w-full max-w-[647px]">
                  <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
                  <input
                    className="h-10 w-full rounded-md border-0 bg-[#f3f4f6] pl-12 pr-4 text-sm text-[#1a1d29] outline-none placeholder:text-[#9ca3af]"
                    placeholder="Search categories..."
                    type="search"
                  />
                </label>
                <div className="hidden h-[85px] w-[90px] shrink-0 rounded-lg bg-[#f3f4f6] lg:block" />
              </div>

              <div className="overflow-x-auto">
                <table className="category-management-table w-full min-w-[960px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                      <th className="px-4 py-3 font-medium">Category Name</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Created At</th>
                      <th className="px-4 py-3 font-medium">Updated At</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.name} className="border-b border-[#e5e7eb] last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d4a5741a] text-[#d4a574]">
                              <IconCategory size={20} />
                            </span>
                            <span className="font-medium leading-6 text-[#1a1d29]">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6b7280]">{category.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-4 text-white ${
                              category.status === 'ACTIVE' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'
                            }`}
                          >
                            {category.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6b7280]">{category.createdAt}</td>
                        <td className="px-4 py-3 text-[#6b7280]">{category.updatedAt}</td>
                        <td className="px-4 py-3">
                          <div className="category-management-actions">
                            <button type="button" aria-label={`View ${category.name}`}>
                              <IconEye size={16} />
                            </button>
                            <button type="button" aria-label={`Edit ${category.name}`}>
                              <IconEdit size={16} />
                            </button>
                            <button type="button" aria-label={`Archive ${category.name}`}>
                              <IconArchive size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>

      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCategory}
      />
    </main>
  );
}

export default Categorymanagement;
