import { IconSearch, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import terraSalonUrl from '@/assets/project-list/terra-salon.png';
import { useLang } from '@/app/providers/useLang';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import { SiteFooter } from '@/shared/components';

import './ProjectListReviewPage.css';

const pageContent = {
  vi: {
    filterTitle: 'Bộ lọc',
    searchPlaceholder: 'Tìm kiếm dự án...',
    searchLabel: 'Tìm kiếm dự án',
    byCategory: 'Danh mục',
    sortBy: 'Sắp xếp',
    sortDefault: 'Mặc định',
    sortNewest: 'Mới nhất',
    sortArea: 'Diện tích lớn nhất',
    pageTitle: 'Dự Án Nổi Bật',
    filterAriaLabel: 'Bộ lọc dự án',
    clearAll: 'Xóa bộ lọc',
    noResults: 'Không tìm thấy dự án phù hợp.',
    resultCount: (n: number) => `${n} dự án`,
    categories: [
      'Khách sạn - Homestay',
      'Nhà hàng - Quán Bar',
      'Phòng khám - Nhà thuốc',
      'Quán cafe - Trà sữa',
      'Shop - Showroom',
      'Spa - Thẩm mỹ viện',
      'Văn phòng - Công ty',
    ],
    cardLabels: { category: 'Thể loại', year: 'Hoàn thành', area: 'Diện tích' },
  },
  en: {
    filterTitle: 'Filter',
    searchPlaceholder: 'Search projects...',
    searchLabel: 'Search projects',
    byCategory: 'Category',
    sortBy: 'Sort by',
    sortDefault: 'Default',
    sortNewest: 'Newest first',
    sortArea: 'Largest area',
    pageTitle: 'Featured Projects',
    filterAriaLabel: 'Project filters',
    clearAll: 'Clear filters',
    noResults: 'No projects match your filters.',
    resultCount: (n: number) => `${n} project${n !== 1 ? 's' : ''}`,
    categories: [
      'Hotels - Homestays',
      'Restaurants - Bars',
      'Clinics - Pharmacies',
      'Cafes - Tea Shops',
      'Shops - Showrooms',
      'Spas - Beauty Studios',
      'Offices - Companies',
    ],
    cardLabels: { category: 'Category', year: 'Completed', area: 'Area' },
  },
} as const;

type Category = (typeof pageContent)['vi']['categories'][number] | (typeof pageContent)['en']['categories'][number];

const allProjects = [
  { area: 105, areaLabel: '105m²', category: 0, imageUrl: terraSalonUrl, title: 'TERRA SALON', year: 2025 },
  { area: 98, areaLabel: '98m²', category: 1, imageUrl: terraSalonUrl, title: 'TERRA SALON', year: 2024 },
  { area: 105, areaLabel: '105m²', category: 2, imageUrl: terraSalonUrl, title: 'TERRA SALON', year: 2025 },
  { area: 210, areaLabel: '210m²', category: 3, imageUrl: terraSalonUrl, title: 'TERRA SALON', year: 2023 },
  { area: 88, areaLabel: '88m²', category: 4, imageUrl: terraSalonUrl, title: 'TERRA SALON', year: 2025 },
  { area: 144, areaLabel: '144m²', category: 5, imageUrl: terraSalonUrl, title: 'TERRA SALON', year: 2024 },
];

export function ProjectListReviewPage() {
  const { lang } = useLang();
  const t = pageContent[lang];

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  function toggleCategory(index: number) {
    setSelectedCategories((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  function clearAll() {
    setSelectedCategories([]);
    setSortOrder('');
    setSearchQuery('');
  }

  const hasActiveFilters = selectedCategories.length > 0 || sortOrder !== '' || searchQuery !== '';

  const filteredAndSorted = useMemo(() => {
    let result = allProjects.filter((project) => {
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(project.category);
      const searchMatch =
        searchQuery.trim() === '' ||
        t.categories[project.category].toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });

    if (sortOrder === 'newest') {
      result = [...result].sort((a, b) => b.year - a.year);
    } else if (sortOrder === 'area') {
      result = [...result].sort((a, b) => b.area - a.area);
    }

    return result;
  }, [selectedCategories, sortOrder, searchQuery, t.categories]);

  return (
    <main className="project-review-page">
      <MainNavbar activePath="/projects" classPrefix="project-review" />

      <section className="project-review-shell">
        <aside className="project-review-filter" aria-label={t.filterAriaLabel}>
          <div className="project-review-filter-header">
            <h2>{t.filterTitle}</h2>
            {hasActiveFilters && (
              <button className="project-review-clear-btn" type="button" onClick={clearAll}>
                <IconX size={13} stroke={2.5} />
                {t.clearAll}
              </button>
            )}
          </div>

          <div className="project-review-search-wrap">
            <IconSearch className="project-review-search-icon" size={15} stroke={2} />
            <input
              className="project-review-search"
              type="search"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchLabel}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="project-review-filter-section">
            <h3>{t.byCategory}</h3>
            <div className="project-review-category-list">
              {t.categories.map((category, index) => {
                const active = selectedCategories.includes(index);
                return (
                  <button
                    key={category}
                    className={`project-review-category-tag${active ? ' project-review-category-tag-active' : ''}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCategory(index)}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="project-review-filter-section">
            <h3>{t.sortBy}</h3>
            <div className="project-review-sort-options">
              {(['', 'newest', 'area'] as const).map((val) => {
                const label = val === '' ? t.sortDefault : val === 'newest' ? t.sortNewest : t.sortArea;
                return (
                  <button
                    key={val}
                    className={`project-review-sort-btn${sortOrder === val ? ' project-review-sort-btn-active' : ''}`}
                    type="button"
                    aria-pressed={sortOrder === val}
                    onClick={() => setSortOrder(val)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="project-review-content">
          <div className="project-review-content-header">
            <h1>{t.pageTitle}</h1>
            <span className="project-review-result-count">{t.resultCount(filteredAndSorted.length)}</span>
          </div>

          {filteredAndSorted.length > 0 ? (
            <div className="project-review-grid">
              {filteredAndSorted.map((project, index) => (
                <ProjectCard
                  key={`${project.title}-${index}`}
                  area={project.areaLabel}
                  cardLabels={t.cardLabels}
                  category={t.categories[project.category] as Category}
                  imageUrl={project.imageUrl}
                  title={project.title}
                  year={String(project.year)}
                />
              ))}
            </div>
          ) : (
            <div className="project-review-empty">
              <p>{t.noResults}</p>
              <button type="button" onClick={clearAll}>{t.clearAll}</button>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

type ProjectCardProps = {
  area: string;
  cardLabels: { category: string; year: string; area: string };
  compact?: boolean;
  imageUrl: string;
  category: Category;
  title: string;
  year: string;
};

function ProjectCard({ area, cardLabels, category, compact = false, imageUrl, title, year }: ProjectCardProps) {
  return (
    <Link
      className={compact ? 'product-card product-card-compact product-card-link' : 'product-card product-card-link'}
      to="/projects/detail"
    >
      <div className="product-card-image-wrap">
        <img src={imageUrl} alt={title} />
        <div className="product-card-title-pill">
          <h3>{title}</h3>
        </div>
      </div>
      <dl className="product-card-meta">
        <div>
          <dt>{cardLabels.category}</dt>
          <dd>{category}</dd>
        </div>
        <div>
          <dt>{cardLabels.year}</dt>
          <dd>{year}</dd>
        </div>
        <div>
          <dt>{cardLabels.area}</dt>
          <dd>{area}</dd>
        </div>
      </dl>
    </Link>
  );
}
