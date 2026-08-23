import { useParams } from 'react-router-dom';

import { usePublicShowcase, usePublicShowcases } from '@/services/queries';

import './PublicShowcasesPage.css';

export function PublicShowcasesPage() {
  const showcasesQuery = usePublicShowcases({ page: 1, pageSize: 24 });
  const showcases = showcasesQuery.data?.items ?? [];

  return (
    <main className="public-showcase-page">
      <header className="public-showcase-hero">
        <h1>FurniSpace Portfolio</h1>
        <p>Completed projects published by the FurniSpace team.</p>
      </header>
      {showcasesQuery.isLoading ? <p className="public-showcase-state">Loading showcases...</p> : null}
      {showcasesQuery.isError ? <p className="public-showcase-state is-error">Cannot load showcases.</p> : null}
      {!showcasesQuery.isLoading && showcases.length === 0 ? <p className="public-showcase-state">No published showcases yet.</p> : null}
      <section className="public-showcase-grid">
        {showcases.map((showcase) => {
          const coverUrl = showcase.coverMedia?.url ?? showcase.coverMedia?.publicUrl ?? showcase.media?.find((media) => media.isCover)?.url;

          return (
            <a className="public-showcase-card" href={`/showcases/${showcase.slug}`} key={showcase.showcaseId}>
              {coverUrl ? <img alt="" src={coverUrl} /> : <div className="public-showcase-card-empty" />}
              <div>
                <h2>{showcase.title ?? 'Untitled showcase'}</h2>
                <p>{showcase.summary ?? 'Completed FurniSpace project.'}</p>
              </div>
            </a>
          );
        })}
      </section>
    </main>
  );
}

export function PublicShowcaseDetailPage() {
  const { slug } = useParams();
  const showcaseQuery = usePublicShowcase(slug);
  const showcase = showcaseQuery.data;
  const media = showcase?.media ?? [];

  return (
    <main className="public-showcase-page">
      {showcaseQuery.isLoading ? <p className="public-showcase-state">Loading showcase...</p> : null}
      {showcaseQuery.isError ? <p className="public-showcase-state is-error">Cannot load this showcase.</p> : null}
      {showcase ? (
        <>
          <header className="public-showcase-hero">
            <h1>{showcase.title ?? 'Project Showcase'}</h1>
            <p>{showcase.summary ?? showcase.description ?? 'Completed FurniSpace project.'}</p>
          </header>
          {showcase.description ? <p className="public-showcase-description">{showcase.description}</p> : null}
          <section className="public-showcase-media-grid">
            {media.map((item) => {
              const mediaUrl = item.url ?? item.publicUrl;

              return mediaUrl ? (
                <figure key={item.showcaseMediaId}>
                  <img alt={item.caption ?? item.mediaType} src={mediaUrl} />
                  <figcaption>{item.caption ?? formatEnumLabel(item.mediaType)}</figcaption>
                </figure>
              ) : null;
            })}
          </section>
        </>
      ) : null}
    </main>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
