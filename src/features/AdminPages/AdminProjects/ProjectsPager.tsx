import { useEffect, useState } from 'react';

import { useLang } from '@/app/providers/useLang';

import { adminCopy } from '../admincomponents/adminI18n';

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function ProjectsPager({
  page,
  pageSize,
  totalItems,
  totalPages,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const { lang } = useLang();
  const t = adminCopy[lang].common;
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  function commitPage() {
    const parsed = Number.parseInt(pageDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), totalPages) : page;
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : pageSize;
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <div className="admin-projects-pager">
      <div className="admin-projects-pager-meta">
        <label className="admin-projects-pager-field">
          <span>{t.rows}</span>
          <input
            aria-label={t.rows}
            min={1}
            max={100}
            type="number"
            value={sizeDraft}
            disabled={disabled}
            onChange={(event) => setSizeDraft(event.target.value)}
            onBlur={commitPageSize}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </label>
        <label className="admin-projects-pager-field">
          <span>{t.page}</span>
          <input
            aria-label={t.page}
            min={1}
            max={totalPages}
            type="number"
            value={pageDraft}
            disabled={disabled}
            onChange={(event) => setPageDraft(event.target.value)}
            onBlur={commitPage}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span className="admin-projects-pager-of">/ {totalPages}</span>
        </label>
        <span className="admin-projects-pager-total">
          {totalItems} {lang === 'vi' ? 'dòng' : 'rows'}
        </span>
      </div>
      <div className="admin-projects-pager-nav">
        <button type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          {t.previous}
        </button>
        <button type="button" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t.next}
        </button>
      </div>
    </div>
  );
}
