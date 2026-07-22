import { type FormEvent, useMemo, useState } from 'react';
import { IconArchive, IconCategory, IconCheck, IconEdit, IconEye, IconPlus, IconSearch, IconTags } from '@tabler/icons-react';

import {
  getBusinessTypeServiceResultMessage,
  getCategoryServiceResultMessage,
  normalizeCategoryOptionalText,
  normalizeCategoryRequiredText,
  type BusinessTypeDto,
  type CategoryDto,
} from '@/services/api';
import {
  useBusinessTypeList,
  useCategoryList,
  useCreateBusinessType,
  useCreateCategory,
  useUpdateBusinessType,
  useUpdateBusinessTypeStatus,
  useUpdateCategory,
} from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { CreateBusinessTypeModal, CreateCategoryModal } from './components';
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
type ManagementTab = 'categories' | 'business-types';

export function Categorymanagement() {
  const [activeTab, setActiveTab] = useState<ManagementTab>('categories');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>('');
  const [sortFilter, setSortFilter] = useState<CategorySortFilter>('NEWEST');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBusinessTypeModalOpen, setIsBusinessTypeModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessTypeDto | null>(null);

  const categoryListQuery = useCategoryList({ page: 1, limit: 100 });
  const businessTypeListQuery = useBusinessTypeList({ page: 1, limit: 100, includeInactive: true });
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const createBusinessTypeMutation = useCreateBusinessType();
  const updateBusinessTypeMutation = useUpdateBusinessType();
  const updateBusinessTypeStatusMutation = useUpdateBusinessTypeStatus();

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
  const filteredBusinessTypes = useMemo(() => {
    const businessTypes = businessTypeListQuery.data?.items ?? [];
    const keyword = searchValue.trim().toLowerCase();

    const nextBusinessTypes = businessTypes.filter((businessType) => {
      const businessStatus = businessType.status ? 'ACTIVE' : 'INACTIVE';
      const matchesKeyword = !keyword ||
        businessType.name.toLowerCase().includes(keyword) ||
        businessType.code.toLowerCase().includes(keyword) ||
        businessStatus.toLowerCase().includes(keyword);
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'ACTIVE' && businessType.status) ||
        (statusFilter === 'INACTIVE' && !businessType.status);

      return matchesKeyword && matchesStatus;
    });

    return [...nextBusinessTypes].sort((left, right) => {
      if (sortFilter === 'NAME_ASC') {
        return left.name.localeCompare(right.name);
      }

      if (sortFilter === 'NAME_DESC') {
        return right.name.localeCompare(left.name);
      }

      return 0;
    });
  }, [businessTypeListQuery.data?.items, searchValue, sortFilter, statusFilter]);
  const businessTypeStats = useMemo(() => {
    const businessTypes = businessTypeListQuery.data?.items ?? [];
    const activeCount = businessTypes.filter((businessType) => businessType.status).length;
    const inactiveCount = businessTypes.length - activeCount;

    return [
      { label: 'Active', value: activeCount, helper: 'Available for products', icon: IconCheck, tone: 'green' },
      { label: 'Inactive', value: inactiveCount, helper: 'Hidden from filters', icon: IconCategory, tone: 'gold' },
      { label: 'Total', value: businessTypes.length, helper: 'Business environments', icon: IconTags, tone: 'dark' },
    ];
  }, [businessTypeListQuery.data?.items]);

  const isModalOpen = isCreateModalOpen || Boolean(editingCategory);
  const isBusinessModalOpen = isBusinessTypeModalOpen || Boolean(editingBusinessType);
  const modalMode = editingCategory ? 'edit' : 'create';
  const businessModalMode = editingBusinessType ? 'edit' : 'create';
  const modalError = editingCategory
    ? updateCategoryMutation.isError
      ? getCategoryServiceResultMessage(updateCategoryMutation.error)
      : null
    : createCategoryMutation.isError
      ? getCategoryServiceResultMessage(createCategoryMutation.error)
      : null;
  const businessModalError = editingBusinessType
    ? updateBusinessTypeMutation.isError
      ? getBusinessTypeServiceResultMessage(updateBusinessTypeMutation.error)
      : null
    : createBusinessTypeMutation.isError
      ? getBusinessTypeServiceResultMessage(createBusinessTypeMutation.error)
      : null;
  const isSubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isBusinessSubmitting = createBusinessTypeMutation.isPending || updateBusinessTypeMutation.isPending;
  const activeStats = activeTab === 'categories' ? categoryStats : businessTypeStats;
  const activeTotal = activeTab === 'categories'
    ? categoryListQuery.data?.total ?? filteredCategories.length
    : businessTypeListQuery.data?.total ?? filteredBusinessTypes.length;

  const openCreateModal = () => {
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    setEditingCategory(null);
    setIsCreateModalOpen(true);
  };
  const openCreateBusinessTypeModal = () => {
    createBusinessTypeMutation.reset();
    updateBusinessTypeMutation.reset();
    setEditingBusinessType(null);
    setIsBusinessTypeModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
  };
  const closeBusinessTypeModal = () => {
    setIsBusinessTypeModalOpen(false);
    setEditingBusinessType(null);
    createBusinessTypeMutation.reset();
    updateBusinessTypeMutation.reset();
  };

  const openEditModal = (category: CategoryDto) => {
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    setIsCreateModalOpen(false);
    setEditingCategory(category);
  };
  const openEditBusinessTypeModal = (businessType: BusinessTypeDto) => {
    createBusinessTypeMutation.reset();
    updateBusinessTypeMutation.reset();
    setIsBusinessTypeModalOpen(false);
    setEditingBusinessType(businessType);
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
  const handleSubmitBusinessType = async (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const code = normalizeBusinessTypeCode(formData.get('code'));
    const name = normalizeCategoryRequiredText(formData.get('name'));
    const status = formData.get('status') === 'on';

    if (!code || !name) {
      return;
    }

    try {
      if (editingBusinessType) {
        await updateBusinessTypeMutation.mutateAsync({
          id: editingBusinessType.id,
          code,
          name,
          status,
        });
      } else {
        await createBusinessTypeMutation.mutateAsync({
          code,
          name,
          status,
        });
      }

      closeBusinessTypeModal();
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  const handleToggleBusinessTypeStatus = async (businessType: BusinessTypeDto) => {
    try {
      await updateBusinessTypeStatusMutation.mutateAsync({
        id: businessType.id,
        status: !businessType.status,
      });
    } catch {
      // Error state is rendered near the table.
    }
  };

  const handleOpenCreate = () => {
    if (activeTab === 'business-types') {
      openCreateBusinessTypeModal();
      return;
    }

    openCreateModal();
  };

  const handleTabChange = (tab: ManagementTab) => {
    setActiveTab(tab);
    setSearchValue('');
    setStatusFilter('');
    setSortFilter('NEWEST');
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
                <h2>Catalog Taxonomy</h2>
                <p>Manage product categories and business type groupings from backend API.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={handleOpenCreate}>
                <IconPlus size={16} />
                {activeTab === 'categories' ? 'Add Category' : 'Add Business Type'}
              </button>
            </div>

            <div className="category-management-tabs" role="tablist" aria-label="Catalog taxonomy views">
              <button className={activeTab === 'categories' ? 'is-active' : ''} type="button" role="tab" onClick={() => handleTabChange('categories')}>
                Categories
              </button>
              <button className={activeTab === 'business-types' ? 'is-active' : ''} type="button" role="tab" onClick={() => handleTabChange('business-types')}>
                Business Types
              </button>
            </div>

            <section className="category-stat-grid" aria-label="Category status overview">
              {activeStats.map(({ label, value, helper, icon: Icon, tone }) => (
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
                    placeholder={activeTab === 'categories' ? 'Search categories...' : 'Search business types...'}
                    type="search"
                  />
                </label>

                <label className="category-management-filter">
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CategoryStatusFilter)}>
                    {(activeTab === 'categories' ? categoryStatusOptions : categoryStatusOptions.filter((option) => option !== 'ARCHIVED')).map((option) => (
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
                  <strong>{activeTotal}</strong>
                </div>
              </div>

              {activeTab === 'categories' && categoryListQuery.isLoading ? <div className="category-management-state">Loading categories from API...</div> : null}
              {activeTab === 'business-types' && businessTypeListQuery.isLoading ? <div className="category-management-state">Loading business types from API...</div> : null}

              {activeTab === 'categories' && categoryListQuery.isError ? (
                <div className="category-management-state category-management-state-error">
                  {getCategoryServiceResultMessage(categoryListQuery.error)}
                </div>
              ) : null}
              {activeTab === 'business-types' && businessTypeListQuery.isError ? (
                <div className="category-management-state category-management-state-error">
                  {getBusinessTypeServiceResultMessage(businessTypeListQuery.error)}
                </div>
              ) : null}
              {activeTab === 'business-types' && updateBusinessTypeStatusMutation.isError ? (
                <div className="category-management-state category-management-state-error">
                  {getBusinessTypeServiceResultMessage(updateBusinessTypeStatusMutation.error)}
                </div>
              ) : null}

              {activeTab === 'categories' && !categoryListQuery.isLoading && !categoryListQuery.isError && filteredCategories.length === 0 ? (
                <div className="category-management-state">No categories found.</div>
              ) : null}
              {activeTab === 'business-types' && !businessTypeListQuery.isLoading && !businessTypeListQuery.isError && filteredBusinessTypes.length === 0 ? (
                <div className="category-management-state">No business types found.</div>
              ) : null}

              {activeTab === 'categories' && !categoryListQuery.isLoading && !categoryListQuery.isError && filteredCategories.length > 0 ? (
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
              {activeTab === 'business-types' && !businessTypeListQuery.isLoading && !businessTypeListQuery.isError && filteredBusinessTypes.length > 0 ? (
                <div className="category-management-table-wrap">
                  <table className="category-management-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Business Type</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinessTypes.map((businessType) => (
                        <tr key={businessType.id}>
                          <td className="category-management-id">{businessType.id}</td>
                          <td>
                            <div className="category-management-name">
                              <span>
                                <IconTags size={18} />
                              </span>
                              <div>
                                <strong>{businessType.name}</strong>
                              </div>
                            </div>
                          </td>
                          <td className="category-management-id">{businessType.code}</td>
                          <td>
                            <span className={`category-management-status ${businessType.status ? 'category-management-status-active' : 'category-management-status-inactive'}`}>
                              {businessType.status ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td>
                            <div className="category-management-actions">
                              <button type="button" aria-label={`Edit ${businessType.name}`} title="Edit business type" onClick={() => openEditBusinessTypeModal(businessType)}>
                                <IconEdit size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label={`${businessType.status ? 'Deactivate' : 'Activate'} ${businessType.name}`}
                                title={businessType.status ? 'Deactivate business type' : 'Activate business type'}
                                disabled={updateBusinessTypeStatusMutation.isPending}
                                onClick={() => void handleToggleBusinessTypeStatus(businessType)}
                              >
                                {businessType.status ? <IconArchive size={16} /> : <IconCheck size={16} />}
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
      <CreateBusinessTypeModal
        isOpen={isBusinessModalOpen}
        mode={businessModalMode}
        initialValues={
          editingBusinessType
            ? {
                code: editingBusinessType.code,
                name: editingBusinessType.name,
                status: editingBusinessType.status,
              }
            : undefined
        }
        isSubmitting={isBusinessSubmitting}
        errorMessage={businessModalError}
        onClose={closeBusinessTypeModal}
        onSubmit={handleSubmitBusinessType}
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

function normalizeBusinessTypeCode(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export default Categorymanagement;
