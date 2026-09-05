import { IconEye, IconSearch, IconUserCheck } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { ProjectStatusBadge, SaleNavbar, SaleSidebar, saleCopy } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import type { ProjectStatus } from '@/services/api/projects';
import { useCurrentUser } from '@/services/queries/useAuth';
import { useProjectList } from '@/services/queries/useProjects';

import './AssignedProjects.css';

const PAGE_SIZE = 5;
const ALL_STATUS_VALUE = 'ALL';
const ALL_BUSINESS_TYPE_VALUE = 'ALL';
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

export function AssignedProjects() {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const a = t.assignedProjects;
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProjectStatus | typeof ALL_STATUS_VALUE>(ALL_STATUS_VALUE);
  const [businessType, setBusinessType] = useState(ALL_BUSINESS_TYPE_VALUE);
  const [page, setPage] = useState(1);
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const assignedProjectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      search: keyword,
      page: 1,
      limit: 50,
    },
    {
      enabled: Boolean(currentUser?.accountId),
    },
  );
  const assignedProjects = useMemo(
    () => assignedProjectsQuery.data?.items ?? [],
    [assignedProjectsQuery.data?.items],
  );
  const accountIds = useMemo(
    () =>
      Array.from(
        new Set(
          assignedProjects
            .flatMap((project) => [project.customerId, project.assignedDesignerId])
            .filter((accountId): accountId is string => Boolean(accountId)),
        ),
      ),
    [assignedProjects],
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
  const businessTypeOptions = useMemo(
    () => Array.from(new Set(assignedProjects.map((project) => project.businessType).filter(Boolean))).sort(),
    [assignedProjects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return assignedProjects
      .filter((project) => {
        const customer = accountById[project.customerId];
        const designer = project.assignedDesignerId ? accountById[project.assignedDesignerId] : null;
        const keywordFields = [
          project.projectCode,
          project.projectName,
          project.customerId,
          project.businessType,
          project.status,
          customer?.fullName ?? '',
          customer?.email ?? '',
          designer?.fullName ?? '',
          designer?.email ?? '',
        ];
        const matchesKeyword = !normalizedKeyword || keywordFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
        const matchesStatus = status === ALL_STATUS_VALUE || project.status === status;
        const matchesBusinessType = businessType === ALL_BUSINESS_TYPE_VALUE || project.businessType === businessType;

        return matchesKeyword && matchesStatus && matchesBusinessType;
      })
      .sort((left, right) => {
        const leftRank = projectStatusRank.get(left.status) ?? projectStatusPriority.length;
        const rightRank = projectStatusRank.get(right.status) ?? projectStatusPriority.length;

        if (leftRank !== rightRank) return leftRank - rightRank;

        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      });
  }, [accountById, assignedProjects, businessType, keyword, status]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = useMemo(
    () => filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredProjects],
  );

  useEffect(() => {
    setPage(1);
  }, [keyword, status, businessType]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="assigned-projects-shell">
      <SaleSidebar activeKey="assignedProjects" />
      <div className="assigned-projects-content">
        <SaleNavbar />
        <main className="assigned-projects-main">
          <section className="assigned-projects-heading">
            <div>
              <h2>{a.title}</h2>
              <p>{a.subtitle}</p>
            </div>
            <div className="assigned-projects-summary">
              <IconUserCheck size={20} />
              <span>{a.assignedCount(filteredProjects.length)}</span>
            </div>
          </section>

          <section className="assigned-projects-filters">
            <div className="assigned-projects-filter-grid">
              <label className="assigned-projects-search">
                <IconSearch size={17} />
                <input
                  type="search"
                  placeholder={t.common.searchProjects}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | typeof ALL_STATUS_VALUE)}>
                <option value={ALL_STATUS_VALUE}>{t.common.allStatus}</option>
                {projectStatusPriority.map((projectStatus) => (
                  <option key={projectStatus} value={projectStatus}>{formatStatusLabel(projectStatus)}</option>
                ))}
              </select>
              <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                <option value={ALL_BUSINESS_TYPE_VALUE}>{t.common.allBusinessTypes}</option>
                {businessTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="assigned-projects-table-card">
            <div className="assigned-projects-table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      t.common.projectCode,
                      t.common.projectName,
                      t.common.customer,
                      t.common.businessType,
                      t.common.status,
                      a.assignedSales,
                      t.common.actions,
                    ].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentUserQuery.isLoading || assignedProjectsQuery.isLoading ? (
                    <tr>
                      <td colSpan={7}>{t.common.loading}</td>
                    </tr>
                  ) : null}
                  {currentUserQuery.isError || assignedProjectsQuery.isError ? (
                    <tr>
                      <td colSpan={7}>Could not load assigned projects.</td>
                    </tr>
                  ) : null}
                  {pagedProjects.map((project) => {
                    const customer = accountById[project.customerId];
                    const designer = project.assignedDesignerId ? accountById[project.assignedDesignerId] : null;

                    return (
                      <tr key={project.projectId}>
                        <td className="assigned-projects-code">{project.projectCode}</td>
                        <td>
                          <strong>{project.projectName}</strong>
                          <span>{project.submittedAt ? `Submitted ${formatDate(project.submittedAt)}` : '-'}</span>
                        </td>
                        <td>
                          <strong>{customer?.fullName ?? t.common.loading}</strong>
                          <span>{customer?.email ?? project.customerId}</span>
                        </td>
                        <td>
                          <span className="assigned-projects-type">{project.businessType}</span>
                        </td>
                        <td>
                          <ProjectStatusBadge status={project.status} />
                        </td>
                        <td>
                          <strong>{project.assignedDesignerId ? designer?.fullName ?? t.common.loading : t.common.unassigned}</strong>
                          {project.assignedDesignerId ? <span>{designer?.email ?? project.assignedDesignerId}</span> : null}
                        </td>
                        <td className="assigned-projects-action-cell">
                          <button type="button" onClick={() => navigate(`/sales/assigned-projects/${project.projectId}`)}>
                            <IconEye size={16} />
                            {t.common.view}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!currentUserQuery.isLoading &&
                  !assignedProjectsQuery.isLoading &&
                  !currentUserQuery.isError &&
                  !assignedProjectsQuery.isError &&
                  filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7}>{a.empty}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {filteredProjects.length > 0 ? (
              <div className="assigned-projects-pagination">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  {t.common.previous}
                </button>
                <span>
                  {t.common.page} {currentPage} / {totalPages}
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
        </main>
      </div>
    </div>
  );
}

function formatStatusLabel(status: string) {
  return status
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
