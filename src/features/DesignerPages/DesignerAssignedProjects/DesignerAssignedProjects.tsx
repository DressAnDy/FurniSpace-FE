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
  'PROPOSAL_DRAFTING',
  'WAITING_FOR_CUSTOMER_REVIEW',
  'REVISION_REQUESTED',
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
  const projects = projectsQuery.data?.items ?? [];
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
      <section className="mb-7">
        <h2 className="text-3xl font-semibold tracking-tight">Assigned Projects</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {projectsQuery.isLoading || currentUserQuery.isLoading ? 'Loading projects assigned to you...' : `${filteredProjects.length} of ${projects.length} assigned projects`}
        </p>
      </section>

      <section className="designer-card mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-zinc-100 px-4 text-zinc-500">
          <IconSearch size={18} />
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search project, customer..." type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-zinc-500">Filters:</span>
          <select className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-600 outline-none" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | 'All status')}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option === 'All status' ? option : formatEnumLabel(option)}</option>
            ))}
          </select>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[#f4ead8] text-[#9a713b]" type="button" aria-label="Advanced filters">
            <IconFilter size={18} />
          </button>
          <span className="text-xs font-semibold text-zinc-500">{filteredProjects.length} of {projects.length} projects</span>
        </div>
      </section>

      {projectsQuery.isError ? (
        <section className="designer-card mb-6 p-5 text-sm font-medium text-red-700">
          {getProjectServiceResultMessage(projectsQuery.error)}
        </section>
      ) : null}

      <section className="designer-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                {['Project', 'Customer', 'Type', 'Submitted', 'Status', 'Sales', 'Action'].map((head) => (
                  <th className="px-5 py-4 font-semibold" key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {currentUserQuery.isLoading || projectsQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-5 text-zinc-500" colSpan={7}>Loading assigned projects...</td>
                </tr>
              ) : null}
              {filteredProjects.map((project) => {
                const customer = accountById[project.customerId];
                const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;

                return (
                  <tr key={project.projectId}>
                    <td className="px-5 py-5">
                      <p className="font-semibold text-zinc-950">{project.projectName}</p>
                      <span className="text-xs text-zinc-500">{project.projectCode}</span>
                    </td>
                    <td className="px-5 py-5">
                      <p className="font-medium text-zinc-700">{customer?.fullName ?? 'Loading customer...'}</p>
                      <span className="text-xs text-zinc-500">{customer?.email ?? project.customerId}</span>
                    </td>
                    <td className="px-5 py-5 text-zinc-600">{project.businessType}</td>
                    <td className="px-5 py-5 text-zinc-600">{formatDate(project.submittedAt)}</td>
                    <td className="px-5 py-5"><ProjectStatusBadge status={project.status} /></td>
                    <td className="px-5 py-5">
                      <p className="font-medium text-zinc-700">{sales?.fullName ?? 'Loading sales...'}</p>
                      <span className="text-xs text-zinc-500">{sales?.email ?? project.assignedSalesId ?? '-'}</span>
                    </td>
                    <td className="px-5 py-5">
                      <Link className="text-xs font-semibold text-[#9a713b] no-underline" to={`/designer/assigned-projects/${project.projectId}`}>
                        View Project
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!currentUserQuery.isLoading && !projectsQuery.isLoading && filteredProjects.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-zinc-500" colSpan={7}>
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
