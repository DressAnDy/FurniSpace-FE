import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { ProjectShowcaseDto, ProjectShowcaseListParams } from '@/services/api/showcases';
import { usePublicShowcase, usePublicShowcases } from '@/services/queries';

import './PublicShowcasesPage.css';

type SortMode = 'newest' | 'name';

export function PublicShowcasesPage() {
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);
  const listParams = useMemo<ProjectShowcaseListParams>(() => ({
    businessType: businessType === 'ALL' ? null : businessType,
    page,
    pageSize: 12,
    search,
    sort: sortMode === 'name' ? 'name_asc' : 'completedDate_desc',
  }), [businessType, page, search, sortMode]);
  const showcasesQuery = usePublicShowcases(listParams);
  const showcases = useMemo(() => showcasesQuery.data?.items ?? [], [showcasesQuery.data?.items]);
  const categories = useMemo(() => getCategories(showcases), [showcases]);
  const totalPages = showcasesQuery.data?.totalPages ?? 1;

  return (
    <main className="public-showcase-page public-showcase-list-page">
      <header className="public-showcase-list-hero">
        <p>FurniSpace Portfolio</p>
        <h1>Du an cua FurniSpace</h1>
      </header>

      <div className="public-showcase-list-layout">
        <aside className="public-showcase-filter">
          <h2>Filter</h2>
          <input
            aria-label="Search showcases"
            placeholder="Search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <strong>By Category</strong>
          <div className="public-showcase-category-list">
            <label>
              <input checked={businessType === 'ALL'} type="radio" onChange={() => {
                setBusinessType('ALL');
                setPage(1);
              }} />
              <span>All Projects</span>
            </label>
            {categories.map((item) => (
              <label key={item}>
                <input checked={businessType === item} type="radio" onChange={() => {
                  setBusinessType(item);
                  setPage(1);
                }} />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <strong>Sort by</strong>
          <select value={sortMode} onChange={(event) => {
            setSortMode(event.target.value as SortMode);
            setPage(1);
          }}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </aside>

        <section className="public-showcase-results">
          {showcasesQuery.isLoading ? <p className="public-showcase-state">Loading showcases...</p> : null}
          {showcasesQuery.isError ? <p className="public-showcase-state is-error">Cannot load showcases.</p> : null}
          {!showcasesQuery.isLoading && showcases.length === 0 ? <p className="public-showcase-state">No published showcases match this filter.</p> : null}
          <div className="public-showcase-grid">
            {showcases.map((showcase) => {
              const coverUrl = getShowcaseCover(showcase);
              const introduction = getShowcaseIntroduction(showcase);

              return (
                <Link className="public-showcase-card" to={`/public/showcases/${showcase.slug}`} key={showcase.showcaseId}>
                  {coverUrl ? <img alt={showcase.title ?? 'Project showcase'} src={coverUrl} /> : <div className="public-showcase-card-empty" />}
                  <div className="public-showcase-card-title">
                    <h2>{showcase.title ?? showcase.projectName ?? 'Untitled showcase'}</h2>
                  </div>
                  {introduction ? <p className="public-showcase-card-summary">{introduction}</p> : null}
                  <dl>
                    <div>
                      <dt>The loai</dt>
                      <dd>{showcase.businessType ?? 'Project'}</dd>
                    </div>
                    <div>
                      <dt>Hoan thanh</dt>
                      <dd>{formatShowcaseDate(showcase.completedDate) ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>Dien tich</dt>
                      <dd>{formatArea(showcase.totalAreaSqm) ?? '-'}</dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>
          {totalPages > 1 ? (
            <div className="public-showcase-pagination">
              <button disabled={page <= 1 || showcasesQuery.isFetching} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages || showcasesQuery.isFetching} type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PublicShowcaseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const showcaseQuery = usePublicShowcase(slug);
  const showcase = showcaseQuery.data;
  const media = useMemo(
    () => [...(showcase?.media ?? [])].sort((first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0)),
    [showcase?.media],
  );
  const projectMeta = showcase ? getShowcaseProjectMeta(showcase) : [];
  const sidebarMeta = showcase ? getShowcaseSidebarMeta(showcase, projectMeta) : [];
  const introduction = showcase ? getShowcaseIntroduction(showcase) : null;

  return (
    <main className="public-showcase-page public-showcase-detail-page">
      {showcaseQuery.isLoading ? <p className="public-showcase-state">Loading showcase...</p> : null}
      {showcaseQuery.isError ? <p className="public-showcase-state is-error">Cannot load this showcase.</p> : null}
      {showcase ? (
        <>
          <button className="public-showcase-back-button" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
          <section className="public-showcase-detail-layout">
            <aside className="public-showcase-info">
              <p>Project Information</p>
              <h1>{showcase.title ?? showcase.projectName ?? 'Project Showcase'}</h1>
              <dl>
                {sidebarMeta.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {showcase.review?.comment ? (
                <blockquote>{showcase.review.comment}</blockquote>
              ) : null}
            </aside>

            <section className="public-showcase-gallery">
              <section className="public-showcase-story-section">
                <h2>Project Introduction</h2>
                <p>{introduction ?? 'Completed FurniSpace project.'}</p>
              </section>

              <section className="public-showcase-story-section">
                <h2>Design Images</h2>
              </section>
              <div className="public-showcase-media-grid">
                {media.map((item) => {
                  const mediaUrl = item.url ?? item.publicUrl ?? item.fileUrl;

                  return mediaUrl ? (
                    <figure className={item.isCover ? 'is-cover' : undefined} key={item.showcaseMediaId}>
                      <img alt={item.caption ?? item.mediaType} src={mediaUrl} />
                    </figure>
                  ) : null;
                })}
              </div>
            </section>
          </section>
        </>
      ) : null}
    </main>
  );
}

function getCategories(showcases: ProjectShowcaseDto[]) {
  return Array.from(new Set(showcases.map((showcase) => showcase.businessType).filter((value): value is string => Boolean(value)))).sort();
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

function getShowcaseIntroduction(showcase: ProjectShowcaseDto) {
  return showcase.introduction?.trim() || showcase.description?.trim() || showcase.summary?.trim() || null;
}

function getShowcaseProjectMeta(showcase: ProjectShowcaseDto) {
  return [
    { label: 'Completed', value: formatShowcaseDate(showcase.completedDate) },
    { label: 'Area', value: formatArea(showcase.totalAreaSqm) },
    { label: 'Floors', value: typeof showcase.numberOfFloors === 'number' ? `${showcase.numberOfFloors}` : null },
    { label: 'Location', value: showcase.projectAddress },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
}

function getShowcaseSidebarMeta(showcase: ProjectShowcaseDto, projectMeta: Array<{ label: string; value: string }>) {
  return [
    { label: 'Category', value: showcase.businessType ?? 'Project' },
    { label: 'Project', value: showcase.projectName ?? '-' },
    { label: 'Completion Year', value: showcase.completionYear ? String(showcase.completionYear) : formatCompletionYear(showcase.completedDate) ?? '-' },
    ...projectMeta,
  ];
}

function formatShowcaseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCompletionYear(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
}

function formatArea(value?: number | null) {
  if (typeof value !== 'number') return null;

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} m2`;
}

