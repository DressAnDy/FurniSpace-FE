import { type FormEvent, useMemo, useState } from 'react';
import { IconArchive, IconCategory, IconCheck, IconEdit, IconEye, IconPlus, IconSearch, IconTags } from '@tabler/icons-react';

import {
  getCategoryServiceResultMessage,
  normalizeCategoryOptionalText,
  normalizeCategoryRequiredText,
  type CategoryDto,
} from '@/services/api';
import { useCategoryList, useCreateCategory, useUpdateCategory } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { CreateCategoryModal } from './components';
import './Categorymanagement.css';

const statusClassName: Record<string, string> = {
  ACTIVE: 'category-management-status-active',
  INACTIVE: 'category-management-status-inactive',
  ARCHIVED: 'category-management-status-archived',
};

const categoryStatusOptions = ['', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
type CategoryStatusFilter = (typeof categoryStatusOptions)[number];
const categorySortOptions = ['NEWEST', 'NAME_ASC', 'NAME_DESC'] as const;
type CategorySortFilter = (typeof categorySortOptions)[number];

export function Categorymanagement() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>('');
  const [sortFilter, setSortFilter] = useState<CategorySortFilter>('NEWEST');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);

  const categoryListQuery = useCategoryList({ page: 1, limit: 100 });
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();

  const filteredCategories = useMemo(() => {
    const categories = categoryListQuery.data?.items ?? [];
    const keyword = searchValue.trim().toLowerCase();

    const nextCategories = categories.filter((category) => {
      const matchesKeyword = !keyword ||
        category.categoryName.toLowerCase().includes(keyword) ||
        (category.description ?? '').toLowerCase().includes(keyword) ||
        category.status.toLowerCase().includes(keyword);
      const matchesStatus = !statusFilter || category.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });

    return [...nextCategories].sort((left, right) => {
      if (sortFilter === 'NAME_ASC') {
        return left.categoryName.localeCompare(right.categoryName);
      }

      if (sortFilter === 'NAME_DESC') {
        return right.categoryName.localeCompare(left.categoryName);
      }

      return 0;
    });
  }, [categoryListQuery.data?.items, searchValue, statusFilter, sortFilter]);
  const categoryStats = useMemo(() => {
    const categories = categoryListQuery.data?.items ?? [];
    const countStatus = (targetStatus: string) => categories.filter((category) => category.status === targetStatus).length;

    return [
      { label: 'Active', value: countStatus('ACTIVE'), helper: 'Visible catalog groups', icon: IconCheck, tone: 'green' },
      { label: 'Inactive', value: countStatus('INACTIVE'), helper: 'Hidden from catalog', icon: IconCategory, tone: 'gold' },
      { label: 'Archived', value: countStatus('ARCHIVED'), helper: 'Stored historical groups', icon: IconArchive, tone: 'dark' },
    ];
  }, [categoryListQuery.data?.items]);

  const isModalOpen = isCreateModalOpen || Boolean(editingCategory);
  const modalMode = editingCategory ? 'edit' : 'create';
  const modalError = editingCategory
    ? updateCategoryMutation.isError
      ? getCategoryServiceResultMessage(updateCategoryMutation.error)
      : null
    : createCategoryMutation.isError
      ? getCategoryServiceResultMessage(createCategoryMutation.error)
      : null;
  const isSubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  const openCreateModal = () => {
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    setEditingCategory(null);
    setIsCreateModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
  };

  const openEditModal = (category: CategoryDto) => {
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    setIsCreateModalOpen(false);
    setEditingCategory(category);
  };

  const handleSubmitCategory = async (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const categoryName = normalizeCategoryRequiredText(formData.get('categoryName'));

    if (!categoryName) {
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          categoryId: editingCategory.categoryId,
          categoryName,
          description: normalizeCategoryOptionalText(formData.get('description')),
        });
      } else {
        await createCategoryMutation.mutateAsync({
          categoryName,
          description: normalizeCategoryOptionalText(formData.get('description')),
        });
      }

      closeModal();
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Product Categories" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Product Categories" />
          <div className="admin-content category-management-content">
            <div className="admin-page-heading category-management-heading">
              <div>
                <h2>Product Categories</h2>
                <p>Manage product categories and catalog groupings from backend API.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={openCreateModal}>
                <IconPlus size={16} />
                Add Category
              </button>
            </div>

            <section className="category-stat-grid" aria-label="Category status overview">
              {categoryStats.map(({ label, value, helper, icon: Icon, tone }) => (
                <article className="category-stat-card" key={label}>
                  <div className="category-stat-copy">
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>{helper}</p>
                  </div>
                  <div className={`category-stat-icon category-stat-icon-${tone}`}>
                    <Icon size={22} />
                  </div>
                </article>
              ))}
            </section>

            <section className="admin-card category-management-card">
              <div className="category-management-tools">
                <label className="admin-search category-management-search">
                  <IconSearch size={18} />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search categories..."
                    type="search"
                  />
                </label>

                <label className="category-management-filter">
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CategoryStatusFilter)}>
                    {categoryStatusOptions.map((option) => (
                      <option key={option || 'ALL'} value={option}>
                        {option || 'All statuses'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="category-management-filter">
                  <span>Sort by</span>
                  <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value as CategorySortFilter)}>
                    {categorySortOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatSortLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="category-management-total">
                  <span>Total</span>
                  <strong>{categoryListQuery.data?.total ?? filteredCategories.length}</strong>
                </div>
              </div>

              {categoryListQuery.isLoading ? <div className="category-management-state">Loading categories from API...</div> : null}

              {categoryListQuery.isError ? (
                <div className="category-management-state category-management-state-error">
                  {getCategoryServiceResultMessage(categoryListQuery.error)}
                </div>
              ) : null}

              {!categoryListQuery.isLoading && !categoryListQuery.isError && filteredCategories.length === 0 ? (
                <div className="category-management-state">No categories found.</div>
              ) : null}

              {!categoryListQuery.isLoading && !categoryListQuery.isError && filteredCategories.length > 0 ? (
                <div className="category-management-table-wrap">
                  <table className="category-management-table">
                    <thead>
                      <tr>
                        <th>Category ID</th>
                        <th>Category Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((category) => (
                        <tr key={category.categoryId}>
                          <td className="category-management-id" title={category.categoryId}>
                            {shortenId(category.categoryId)}
                          </td>
                          <td>
                            <div className="category-management-name">
                              <span>
                                <IconTags size={18} />
                              </span>
                              <div>
                                <strong>{category.categoryName}</strong>
                              </div>
                            </div>
                          </td>
                          <td className="category-management-description">{category.description ?? 'No description.'}</td>
                          <td>
                            <span className={`category-management-status ${statusClassName[category.status] ?? 'category-management-status-archived'}`}>
                              {category.status}
                            </span>
                          </td>
                          <td>
                            <div className="category-management-actions">
                              <button type="button" aria-label={`View ${category.categoryName}`} title="View category">
                                <IconEye size={16} />
                              </button>
                              <button type="button" aria-label={`Edit ${category.categoryName}`} title="Edit category" onClick={() => openEditModal(category)}>
                                <IconEdit size={16} />
                              </button>
                              <button type="button" aria-label={`Archive ${category.categoryName}`} title="No archive API available yet" disabled>
                                <IconArchive size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </div>

      <CreateCategoryModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialValues={
          editingCategory
            ? {
                categoryName: editingCategory.categoryName,
                description: editingCategory.description,
              }
            : undefined
        }
        isSubmitting={isSubmitting}
        errorMessage={modalError}
        onClose={closeModal}
        onSubmit={handleSubmitCategory}
      />
    </main>
  );
}

function shortenId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function formatSortLabel(value: CategorySortFilter) {
  if (value === 'NAME_ASC') {
    return 'Name A-Z';
  }

  if (value === 'NAME_DESC') {
    return 'Name Z-A';
  }

  return 'Newest';
}

export default Categorymanagement;
