import { IconEye, IconSearch, IconUserCheck } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectStatusBadge, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import { useCurrentUser } from '@/services/queries/useAuth';
import { useProjectList } from '@/services/queries/useProjects';

import './AssignedProjects.css';

const PAGE_SIZE = 5;

export function AssignedProjects() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('All Status');
  const [businessType, setBusinessType] = useState('All Business Types');
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

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return assignedProjects.filter((project) => {
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
      const matchesStatus = status === 'All Status' || project.status === status;
      const matchesBusinessType = businessType === 'All Business Types' || project.businessType === businessType;
      const hasMovedIntoSalesWorkspace = project.status !== 'SUBMITTED';

      return matchesKeyword && matchesStatus && matchesBusinessType && hasMovedIntoSalesWorkspace;
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
      <SaleSidebar activeLabel="Assigned Projects" />
      <div className="assigned-projects-content">
        <SaleNavbar />
        <main className="assigned-projects-main">
          <section className="assigned-projects-heading">
            <div>
              <h2>Assigned Projects</h2>
              <p>Track customer projects currently assigned to your sales workspace</p>
            </div>
            <div className="assigned-projects-summary">
              <IconUserCheck size={20} />
              <span>{filteredProjects.length} assigned</span>
            </div>
          </section>

          <section className="assigned-projects-filters">
            <h3>Filters</h3>
            <div className="assigned-projects-filter-grid">
              <label className="assigned-projects-search">
                <IconSearch size={17} />
                <input
                  type="search"
                  placeholder="Search projects..."
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All Status</option>
                <option>IN_CONSULTATION</option>
                <option>NEED_BASIC_INFORMATION</option>
                <option>WAITING_FOR_DESIGNER_ASSIGNMENT</option>
                <option>MEASUREMENT_REQUIRED</option>
                <option>SPACE_VERIFIED</option>
              </select>
              <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                <option>All Business Types</option>
                <option>Cafe</option>
                <option>Office</option>
                <option>Retail</option>
              </select>
            </div>
          </section>

          <section className="assigned-projects-table-card">
            <div className="assigned-projects-table-scroll">
              <table>
                <thead>
                  <tr>
                    {['Project Code', 'Project Name', 'Customer', 'Business Type', 'Status', 'Assigned Sales', 'Actions'].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentUserQuery.isLoading || assignedProjectsQuery.isLoading ? (
                    <tr>
                      <td colSpan={7}>Loading assigned projects...</td>
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
                          <strong>{customer?.fullName ?? 'Loading customer...'}</strong>
                          <span>{customer?.email ?? project.customerId}</span>
                        </td>
                        <td>
                          <span className="assigned-projects-type">{project.businessType}</span>
                        </td>
                        <td>
                          <ProjectStatusBadge status={project.status} />
                        </td>
                        <td>
                          <strong>{project.assignedDesignerId ? designer?.fullName ?? 'Loading designer...' : 'Unassigned'}</strong>
                          {project.assignedDesignerId ? <span>{designer?.email ?? project.assignedDesignerId}</span> : null}
                        </td>
                        <td className="assigned-projects-action-cell">
                          <button type="button" onClick={() => navigate(`/sales/assigned-projects/${project.projectId}`)}>
                            <IconEye size={16} />
                            View
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
                      <td colSpan={7}>No projects have moved into the sales workspace yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {filteredProjects.length > 0 ? (
              <div className="assigned-projects-pagination">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </button>
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
