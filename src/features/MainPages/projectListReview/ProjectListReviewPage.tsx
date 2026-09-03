import { IconSearch, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import type { ProjectShowcaseDto, ProjectShowcaseListParams } from '@/services/api/showcases';
import { usePublicShowcases } from '@/services/queries';
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

type Category = string;
const projectCategoryFilters = ['Cafe', 'Retail', 'Office', 'Restaurant', 'Showroom'] as const;

export function ProjectListReviewPage() {
  const { lang } = useLang();
  const t = pageContent[lang];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const showcaseParams = useMemo<ProjectShowcaseListParams>(() => ({
    businessType: selectedCategory,
    page,
    pageSize: 6,
    search: searchQuery,
  }), [page, searchQuery, selectedCategory]);
  const showcasesQuery = usePublicShowcases(showcaseParams);
  const showcases = showcasesQuery.data?.items ?? [];
  const totalPages = showcasesQuery.data?.totalPages ?? 1;

  function toggleCategory(category: string) {
    setSelectedCategory((current) => (current === category ? null : category));
    setPage(1);
  }

  function clearAll() {
    setSelectedCategory(null);
    setSearchQuery('');
    setPage(1);
  }

  const hasActiveFilters = Boolean(selectedCategory) || searchQuery !== '';

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="project-review-filter-section">
            <h3>{t.byCategory}</h3>
            <div className="project-review-category-list">
              {projectCategoryFilters.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    className={`project-review-category-tag${active ? ' project-review-category-tag-active' : ''}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="project-review-content">
          <div className="project-review-content-header">
            <h1>{t.pageTitle}</h1>
          </div>

          {showcasesQuery.isLoading ? (
            <div className="project-review-empty">
              <p>Loading projects...</p>
            </div>
          ) : null}
          {showcasesQuery.isError ? (
            <div className="project-review-empty">
              <p>Cannot load published projects.</p>
              <button type="button" onClick={() => void showcasesQuery.refetch()}>Retry</button>
            </div>
          ) : null}
          {!showcasesQuery.isLoading && !showcasesQuery.isError && showcases.length > 0 ? (
            <div className="project-review-grid">
              {showcases.map((project) => (
                <ProjectCard
                  key={project.showcaseId}
                  area={formatArea(project.totalAreaSqm)}
                  cardLabels={t.cardLabels}
                  category={project.businessType ?? 'Project'}
                  imageUrl={getShowcaseCover(project)}
                  slug={project.slug}
                  title={project.title ?? project.projectName ?? 'Project Showcase'}
                  year={formatYear(project)}
                />
              ))}
            </div>
          ) : null}
          {!showcasesQuery.isLoading && !showcasesQuery.isError && showcases.length === 0 ? (
            <div className="project-review-empty">
              <p>{t.noResults}</p>
              <button type="button" onClick={clearAll}>{t.clearAll}</button>
            </div>
          ) : null}
          {!showcasesQuery.isLoading && !showcasesQuery.isError && totalPages > 1 ? (
            <div className="project-review-pagination">
              <button disabled={page <= 1 || showcasesQuery.isFetching} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages || showcasesQuery.isFetching} type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </button>
            </div>
          ) : null}
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
  imageUrl: string | null;
  category: Category;
  slug?: string | null;
  title: string;
  year: string;
};

function ProjectCard({ area, cardLabels, category, compact = false, imageUrl, slug, title, year }: ProjectCardProps) {
  return (
    <Link
      className={compact ? 'product-card product-card-compact product-card-link' : 'product-card product-card-link'}
      to={slug ? `/public/showcases/${slug}` : '/projects/detail'}
    >
      <div className="product-card-image-wrap">
        {imageUrl ? <img src={imageUrl} alt={title} /> : null}
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

function getShowcaseCover(showcase: ProjectShowcaseDto) {
  return showcase.coverUrl
    ?? showcase.coverMedia?.url
    ?? showcase.coverMedia?.publicUrl
    ?? showcase.coverMedia?.fileUrl
    ?? showcase.media?.find((media) => media.isCover)?.url
    ?? showcase.media?.find((media) => media.isCover)?.publicUrl
    ?? showcase.media?.find((media) => media.isCover)?.fileUrl
    ?? showcase.media?.[0]?.url
    ?? showcase.media?.[0]?.publicUrl
    ?? showcase.media?.[0]?.fileUrl
    ?? null;
}

function formatArea(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} m2`;
}

function formatYear(showcase: ProjectShowcaseDto) {
  if (typeof showcase.completionYear === 'number') return String(showcase.completionYear);
  if (!showcase.completedDate) return '-';

  const date = new Date(showcase.completedDate);

  return Number.isNaN(date.getTime()) ? '-' : String(date.getFullYear());
}
