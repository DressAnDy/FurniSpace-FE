import { IconFilter, IconSearch } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { ProjectStatusBadge } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import { getProjectServiceResultMessage, type ProjectStatus } from '@/services/api/projects';
import { useCurrentUser, useProjectList } from '@/services/queries';

import './DesignerAssignedProjects.css';

const statusOptions: Array<ProjectStatus | 'All status'> = [
  'All status',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_CONSULTING',
  'PROPOSAL_SELECTED',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
];

export function DesignerAssignedProjects() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'All status'>('All status');
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
  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projects.filter((project) => {
      const customer = accountById[project.customerId];
      const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;
      const matchesStatus = status === 'All status' || project.status === status;
      const matchesKeyword =
        !normalizedKeyword ||
        [project.projectCode, project.projectName, project.businessType, project.status, customer?.fullName ?? '', customer?.email ?? '', sales?.fullName ?? '', sales?.email ?? ''].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        );

      return matchesStatus && matchesKeyword;
    });
  }, [accountById, keyword, projects, status]);

  return (
    <DesignerLayout activeLabel="Assigned Projects">
      <section className="designer-assigned-header">
        <h2>Assigned Projects</h2>
        <p>
          {projectsQuery.isLoading || currentUserQuery.isLoading ? 'Loading projects assigned to you...' : `${filteredProjects.length} of ${projects.length} assigned projects`}
        </p>
      </section>

      <section className="designer-card designer-assigned-toolbar">
        <label className="designer-assigned-search">
          <IconSearch size={18} />
          <input placeholder="Search project, customer..." type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </label>
        <div className="designer-assigned-filters">
          <span>Filters:</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | 'All status')}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option === 'All status' ? option : formatEnumLabel(option)}</option>
            ))}
          </select>
          <button className="designer-assigned-filter-button" type="button" aria-label="Advanced filters">
            <IconFilter size={18} />
          </button>
          <span>{filteredProjects.length} of {projects.length} projects</span>
        </div>
      </section>

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
                {['Project', 'Customer', 'Type', 'Submitted', 'Status', 'Sales', 'Action'].map((head) => (
                  <th key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentUserQuery.isLoading || projectsQuery.isLoading ? (
                <tr>
                  <td className="designer-assigned-empty" colSpan={7}>Loading assigned projects...</td>
                </tr>
              ) : null}
              {filteredProjects.map((project) => {
                const customer = accountById[project.customerId];
                const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;

                return (
                  <tr key={project.projectId}>
                    <td>
                      <p className="designer-assigned-primary">{project.projectName}</p>
                      <span className="designer-assigned-secondary">{project.projectCode}</span>
                    </td>
                    <td>
                      <p className="designer-assigned-account">{customer?.fullName ?? 'Loading customer...'}</p>
                      <span className="designer-assigned-secondary">{customer?.email ?? project.customerId}</span>
                    </td>
                    <td>{project.businessType}</td>
                    <td>{formatDate(project.submittedAt)}</td>
                    <td><ProjectStatusBadge status={project.status} /></td>
                    <td>
                      <p className="designer-assigned-account">{sales?.fullName ?? 'Loading sales...'}</p>
                      <span className="designer-assigned-secondary">{sales?.email ?? project.assignedSalesId ?? '-'}</span>
                    </td>
                    <td>
                      <Link className="designer-assigned-view-link" to={`/designer/assigned-projects/${project.projectId}`}>
                        View Project
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!currentUserQuery.isLoading && !projectsQuery.isLoading && filteredProjects.length === 0 ? (
                <tr>
                  <td className="designer-assigned-empty" colSpan={7}>
                    You do not have assigned projects matching these filters yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
