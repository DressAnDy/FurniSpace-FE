import { IconFilter, IconSearch, IconX } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { DesignerLayout, designerCopy } from '@/features/DesignerPages/designercomponents';
import { ProjectStatusBadge } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import { getProjectServiceResultMessage, type ProjectStatus } from '@/services/api/projects';
import { useCurrentUser, useProjectList } from '@/services/queries';

import './DesignerAssignedProjects.css';

const PAGE_SIZE = 5;
const ALL_STATUS = '__ALL_STATUS__';
const ALL_BUSINESS_TYPES = '__ALL_BUSINESS_TYPES__';

const projectStatusPriority: ProjectStatus[] = [
  'SUBMITTED',
  'IN_CONSULTATION',
  'NEED_BASIC_INFORMATION',
  'WAITING_FOR_DESIGNER_ASSIGNMENT',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_CONSULTING',
  'PROPOSAL_SELECTED',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
  'COMPLETED',
];
const projectStatusRank = new Map<ProjectStatus, number>(
  projectStatusPriority.map((projectStatus, index) => [projectStatus, index]),
);

const statusOptions: Array<ProjectStatus | typeof ALL_STATUS> = [
  ALL_STATUS,
  ...projectStatusPriority,
];

export function DesignerAssignedProjects() {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProjectStatus | typeof ALL_STATUS>(ALL_STATUS);
  const [businessType, setBusinessType] = useState(ALL_BUSINESS_TYPES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedDesignerId: currentUser?.accountId,
      search: keyword,
      page: 1,
      limit: 50,
    },
    {
      enabled: Boolean(currentUser?.accountId),
    },
  );
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const accountIds = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .flatMap((project) => [project.customerId, project.assignedSalesId])
            .filter((accountId): accountId is string => Boolean(accountId)),
        ),
      ),
    [projects],
  );
  const accountQueries = useQueries({
    queries: accountIds.map((accountId) => ({
      queryKey: ['accounts', 'detail', accountId],
      queryFn: () => getAccountById(accountId),
      enabled: Boolean(accountId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const accountById = useMemo(() => {
    return accountQueries.reduce<Record<string, AccountDto>>((lookup, query, index) => {
      const account = query.data;

      if (account) {
        lookup[accountIds[index]] = account;
      }

      return lookup;
    }, {});
  }, [accountIds, accountQueries]);
  const businessTypeOptions = useMemo(() => {
    const types = Array.from(
      new Set(
        projects
          .map((project) => project.businessType?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((first, second) => first.localeCompare(second));

    return [ALL_BUSINESS_TYPES, ...types];
  }, [projects]);
  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projects
      .filter((project) => {
        const customer = accountById[project.customerId];
        const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;
        const matchesStatus = status === ALL_STATUS || project.status === status;
        const matchesBusinessType = businessType === ALL_BUSINESS_TYPES || project.businessType === businessType;
        const matchesKeyword =
          !normalizedKeyword ||
          [project.projectCode, project.projectName, project.businessType, project.status, customer?.fullName ?? '', customer?.email ?? '', sales?.fullName ?? '', sales?.email ?? ''].some((value) =>
            value.toLowerCase().includes(normalizedKeyword),
          );

        return matchesStatus && matchesBusinessType && matchesKeyword;
      })
      .sort((left, right) => {
        const leftRank = projectStatusRank.get(left.status) ?? projectStatusPriority.length;
        const rightRank = projectStatusRank.get(right.status) ?? projectStatusPriority.length;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      });
  }, [accountById, businessType, keyword, projects, status]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = useMemo(
    () => filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredProjects],
  );
  const activeFilterCount = Number(status !== ALL_STATUS) + Number(businessType !== ALL_BUSINESS_TYPES);
  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    setPage(1);
  }, [keyword, status, businessType]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!isFilterOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!filterPanelRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFilterOpen]);

  function clearFilters() {
    setStatus(ALL_STATUS);
    setBusinessType(ALL_BUSINESS_TYPES);
  }

  return (
    <DesignerLayout activeKey="assignedProjects">
      <section className="designer-assigned-header">
        <h2>{t.assignedProjects.title}</h2>
        <p>
          {projectsQuery.isLoading || currentUserQuery.isLoading
            ? t.assignedProjects.subtitleLoading
            : t.assignedProjects.subtitleCount(filteredProjects.length, projects.length)}
        </p>
      </section>

      <section className="designer-card designer-assigned-toolbar">
        <label className="designer-assigned-search">
          <IconSearch size={18} />
          <input placeholder={t.assignedProjects.searchPlaceholder} type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </label>
        <div className="designer-assigned-filters">
          <span>{t.assignedProjects.filtersLabel}</span>
          <div className="designer-assigned-filter-menu" ref={filterPanelRef}>
            <button
              aria-expanded={isFilterOpen}
              aria-haspopup="dialog"
              className={hasActiveFilters || isFilterOpen ? 'designer-assigned-filter-button is-active' : 'designer-assigned-filter-button'}
              type="button"
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              <IconFilter size={18} />
              {hasActiveFilters ? <span className="designer-assigned-filter-count">{activeFilterCount}</span> : null}
            </button>

            {isFilterOpen ? (
              <div className="designer-assigned-filter-panel" role="dialog" aria-label={t.assignedProjects.projectFiltersAria}>
                <div className="designer-assigned-filter-panel-header">
                  <strong>{t.assignedProjects.filterProjects}</strong>
                  <button aria-label={t.assignedProjects.closeFilters} type="button" onClick={() => setIsFilterOpen(false)}>
                    <IconX size={16} />
                  </button>
                </div>

                <label>
                  <span>{t.assignedProjects.status}</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | typeof ALL_STATUS)}>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === ALL_STATUS ? t.common.allStatus : formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{t.assignedProjects.businessType}</span>
                  <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                    {businessTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === ALL_BUSINESS_TYPES ? t.common.allBusinessTypes : option}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="designer-assigned-filter-panel-actions">
                  <button disabled={!hasActiveFilters} type="button" onClick={clearFilters}>
                    {t.common.clear}
                  </button>
                  <button type="button" onClick={() => setIsFilterOpen(false)}>
                    {t.common.done}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <span>{t.assignedProjects.countOfProjects(filteredProjects.length, projects.length)}</span>
        </div>
      </section>

      {hasActiveFilters ? (
        <section className="designer-assigned-active-filters">
          {status !== ALL_STATUS ? (
            <button type="button" onClick={() => setStatus(ALL_STATUS)}>
              {t.assignedProjects.statusChip(formatEnumLabel(status))}
              <IconX size={14} />
            </button>
          ) : null}
          {businessType !== ALL_BUSINESS_TYPES ? (
            <button type="button" onClick={() => setBusinessType(ALL_BUSINESS_TYPES)}>
              {t.assignedProjects.typeChip(businessType)}
              <IconX size={14} />
            </button>
          ) : null}
          <button className="designer-assigned-clear-all" type="button" onClick={clearFilters}>
            {t.assignedProjects.clearAll}
          </button>
        </section>
      ) : null}

      {projectsQuery.isError ? (
        <section className="designer-card designer-assigned-message designer-assigned-error">
          {getProjectServiceResultMessage(projectsQuery.error)}
        </section>
      ) : null}

      <section className="designer-card designer-assigned-table-card">
        <div className="designer-assigned-table-scroll">
          <table className="designer-assigned-table">
            <thead>
              <tr>
                {[
                  t.assignedProjects.cols.project,
                  t.assignedProjects.cols.customer,
                  t.assignedProjects.cols.type,
                  t.assignedProjects.cols.submitted,
                  t.assignedProjects.cols.status,
                  t.assignedProjects.cols.sales,
                  t.assignedProjects.cols.action,
                ].map((head) => (
                  <th key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentUserQuery.isLoading || projectsQuery.isLoading ? (
                <tr>
                  <td className="designer-assigned-empty" colSpan={7}>{t.assignedProjects.loading}</td>
                </tr>
              ) : null}
              {pagedProjects.map((project) => {
                const customer = accountById[project.customerId];
                const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;

                return (
                  <tr key={project.projectId}>
                    <td>
                      <p className="designer-assigned-primary">{project.projectName}</p>
                      <span className="designer-assigned-secondary">{project.projectCode}</span>
                    </td>
                    <td>
                      <p className="designer-assigned-account">{customer?.fullName ?? t.assignedProjects.loadingCustomer}</p>
                      <span className="designer-assigned-secondary">{customer?.email ?? project.customerId}</span>
                    </td>
                    <td>{project.businessType}</td>
                    <td>{formatDate(project.submittedAt)}</td>
                    <td className="designer-assigned-status-cell"><ProjectStatusBadge status={project.status} /></td>
                    <td>
                      <p className="designer-assigned-account">{sales?.fullName ?? t.assignedProjects.loadingSales}</p>
                      <span className="designer-assigned-secondary">{sales?.email ?? project.assignedSalesId ?? t.common.dash}</span>
                    </td>
                    <td>
                      <Link className="designer-assigned-view-link" to={`/designer/assigned-projects/${project.projectId}`}>
                        {t.assignedProjects.viewProject}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!currentUserQuery.isLoading && !projectsQuery.isLoading && filteredProjects.length === 0 ? (
                <tr>
                  <td className="designer-assigned-empty" colSpan={7}>
                    {t.assignedProjects.empty}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {filteredProjects.length > 0 ? (
          <div className="designer-assigned-pagination">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              {t.common.previous}
            </button>
            <span>
              {t.common.pageOf(currentPage, totalPages)}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t.common.next}
            </button>
          </div>
        ) : null}
      </section>
    </DesignerLayout>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
