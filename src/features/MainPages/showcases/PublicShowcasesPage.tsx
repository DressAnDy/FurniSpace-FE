import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { ProjectShowcaseDto } from '@/services/api/showcases';
import { usePublicShowcase, usePublicShowcases } from '@/services/queries';

import './PublicShowcasesPage.css';

type SortMode = 'newest' | 'name';

export function PublicShowcasesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const showcasesQuery = usePublicShowcases({ page: 1, pageSize: 24 });
  const showcases = useMemo(() => showcasesQuery.data?.items ?? [], [showcasesQuery.data?.items]);
  const categories = useMemo(() => getCategories(showcases), [showcases]);
  const visibleShowcases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return showcases
      .filter((showcase) => category === 'ALL' || showcase.businessType === category)
      .filter((showcase) => {
        if (!query) return true;

        return [showcase.title, showcase.projectName, showcase.summary, showcase.businessType]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));
      })
      .sort((first, second) => {
        if (sortMode === 'name') return (first.title ?? first.projectName ?? '').localeCompare(second.title ?? second.projectName ?? '');
        return new Date(second.publishedAt ?? second.updatedAt ?? 0).getTime() - new Date(first.publishedAt ?? first.updatedAt ?? 0).getTime();
      });
  }, [category, search, showcases, sortMode]);

  return (
    <main className="public-showcase-page public-showcase-list-page">
      <header className="public-showcase-list-hero">
        <p>FurniSpace Portfolio</p>
        <h1>Du an cua FurniSpace</h1>
      </header>

      <div className="public-showcase-list-layout">
        <aside className="public-showcase-filter">
          <h2>Filter</h2>
          <input aria-label="Search showcases" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
          <strong>By Category</strong>
          <div className="public-showcase-category-list">
            <label>
              <input checked={category === 'ALL'} type="radio" onChange={() => setCategory('ALL')} />
              <span>All Projects</span>
            </label>
            {categories.map((item) => (
              <label key={item}>
                <input checked={category === item} type="radio" onChange={() => setCategory(item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <strong>Sort by</strong>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </aside>

        <section className="public-showcase-results">
          {showcasesQuery.isLoading ? <p className="public-showcase-state">Loading showcases...</p> : null}
          {showcasesQuery.isError ? <p className="public-showcase-state is-error">Cannot load showcases.</p> : null}
          {!showcasesQuery.isLoading && visibleShowcases.length === 0 ? <p className="public-showcase-state">No published showcases match this filter.</p> : null}
          <div className="public-showcase-grid">
            {visibleShowcases.map((showcase) => {
              const coverUrl = getShowcaseCover(showcase);

              return (
                <Link className="public-showcase-card" to={`/public/showcases/${showcase.slug}`} key={showcase.showcaseId}>
                  {coverUrl ? <img alt={showcase.title ?? 'Project showcase'} src={coverUrl} /> : <div className="public-showcase-card-empty" />}
                  <div className="public-showcase-card-title">
                    <h2>{showcase.title ?? showcase.projectName ?? 'Untitled showcase'}</h2>
                  </div>
                  <dl>
                    <div>
                      <dt>The loai</dt>
                      <dd>{showcase.businessType ?? 'Project'}</dd>
                    </div>
                    <div>
                      <dt>Hoan thanh</dt>
                      <dd>{showcase.publishedAt ? new Date(showcase.publishedAt).getFullYear() : '-'}</dd>
                    </div>
                    <div>
                      <dt>Trang thai</dt>
                      <dd>{formatEnumLabel(showcase.status)}</dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PublicShowcaseDetailPage() {
  const { slug } = useParams();
  const showcaseQuery = usePublicShowcase(slug);
  const showcase = showcaseQuery.data;
  const media = showcase?.media ?? [];
  const heroMedia = showcase ? getShowcaseCover(showcase) : null;

  return (
    <main className="public-showcase-page public-showcase-detail-page">
      {showcaseQuery.isLoading ? <p className="public-showcase-state">Loading showcase...</p> : null}
      {showcaseQuery.isError ? <p className="public-showcase-state is-error">Cannot load this showcase.</p> : null}
      {showcase ? (
        <>
          <section className="public-showcase-detail-hero">
            {heroMedia ? <img alt={showcase.title ?? 'Project showcase'} src={heroMedia} /> : <div />}
          </section>
          <section className="public-showcase-detail-layout">
            <aside className="public-showcase-info">
              <p>Thong tin du an</p>
              <h1>{showcase.title ?? showcase.projectName ?? 'Project Showcase'}</h1>
              <p>{showcase.summary ?? 'Completed FurniSpace project.'}</p>
              <dl>
                <div>
                  <dt>The loai</dt>
                  <dd>{showcase.businessType ?? '-'}</dd>
                </div>
                <div>
                  <dt>Thoi gian</dt>
                  <dd>{showcase.publishedAt ? new Date(showcase.publishedAt).getFullYear() : '-'}</dd>
                </div>
                <div>
                  <dt>Du an</dt>
                  <dd>{showcase.projectName ?? '-'}</dd>
                </div>
              </dl>
              {showcase.review?.comment ? (
                <blockquote>{showcase.review.comment}</blockquote>
              ) : null}
            </aside>

            <section className="public-showcase-gallery">
              <h2>Hinh thiet ke</h2>
              {showcase.description ? <p>{showcase.description}</p> : null}
              <div className="public-showcase-media-grid">
                {media.map((item) => {
                  const mediaUrl = item.url ?? item.publicUrl;

                  return mediaUrl ? (
                    <figure key={item.showcaseMediaId}>
                      <img alt={item.caption ?? item.mediaType} src={mediaUrl} />
                      <figcaption>{item.caption ?? formatEnumLabel(item.mediaType)}</figcaption>
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
  return showcase.coverMedia?.url
    ?? showcase.coverMedia?.publicUrl
    ?? showcase.media?.find((media) => media.isCover)?.url
    ?? showcase.media?.find((media) => media.isCover)?.publicUrl
    ?? showcase.coverUrl
    ?? showcase.media?.[0]?.url
    ?? showcase.media?.[0]?.publicUrl
    ?? null;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
