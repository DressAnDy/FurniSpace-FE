import { useState } from 'react';
import { IconSearch, IconUser, IconX } from '@tabler/icons-react';

import {
  getAccountServiceResultMessage,
  type AvailableDesignerDto,
  type DesignerCapacityState,
  type DesignerProjectBucket,
} from '@/services/api';
import { useDesignerAssignedProjects, useDesignerWorkload, useDesignerWorkloadSummary } from '@/services/queries';

const CAPACITY_OPTIONS: Array<{ value: '' | DesignerCapacityState; label: string }> = [
  { value: '', label: 'All capacity' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'FULL', label: 'Full' },
  { value: 'OVER', label: 'Over' },
];

const SORT_OPTIONS = [
  { value: 'DesignActiveCountDesc', label: 'Active projects (desc)' },
  { value: 'AvailableSlotDesc', label: 'Available slots (desc)' },
] as const;

const BUCKET_OPTIONS: Array<{ value: '' | DesignerProjectBucket; label: string }> = [
  { value: '', label: 'All buckets' },
  { value: 'DESIGN_ACTIVE', label: 'Design active' },
  { value: 'POST_DESIGN', label: 'Post design' },
  { value: 'TERMINAL', label: 'Terminal' },
  { value: 'OTHER', label: 'Other' },
];

export function DesignerWorkloadPanel() {
  const [searchValue, setSearchValue] = useState('');
  const [capacityState, setCapacityState] = useState<'' | DesignerCapacityState>('');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('DesignActiveCountDesc');
  const [page, setPage] = useState(1);
  const [selectedDesigner, setSelectedDesigner] = useState<AvailableDesignerDto | null>(null);
  const [projectBucket, setProjectBucket] = useState<'' | DesignerProjectBucket>('');
  const [projectPage, setProjectPage] = useState(1);

  const summaryQuery = useDesignerWorkloadSummary();
  const workloadQuery = useDesignerWorkload({
    page,
    pageSize: 20,
    search: searchValue || null,
    capacityState: capacityState || null,
    sortBy,
  });
  const projectsQuery = useDesignerAssignedProjects(
    {
      designerId: selectedDesigner?.accountId ?? '',
      page: projectPage,
      pageSize: 20,
      bucket: projectBucket || null,
    },
    { enabled: Boolean(selectedDesigner?.accountId) },
  );

  const designers = workloadQuery.data?.items ?? [];
  const summary = summaryQuery.data;
  const projects = projectsQuery.data?.items ?? [];

  return (
    <div className="workload-panel">
      <section className="workload-summary-grid" aria-label="Designer workload summary">
        <SummaryCard label="Active designers" value={summary?.totalActiveDesigners} />
        <SummaryCard label="Available" value={summary?.availableCount} tone="green" />
        <SummaryCard label="Full" value={summary?.fullCount} tone="amber" />
        <SummaryCard label="Over capacity" value={summary?.overCount} tone="red" />
        <SummaryCard
          label="Design-active projects"
          value={summary?.totalDesignActiveProjects}
          note={`Soft cap ${summary?.maxActiveProjects ?? 2} / designer`}
        />
      </section>

      <section className="admin-card user-management-card">
        <div className="user-management-tools workload-tools">
          <label className="admin-search user-management-search">
            <IconSearch size={18} />
            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setPage(1);
              }}
              placeholder="Search designer by email, name, or phone..."
              type="search"
            />
          </label>

          <label className="user-management-filter">
            <span>Capacity</span>
            <select
              value={capacityState}
              onChange={(event) => {
                setCapacityState(event.target.value as '' | DesignerCapacityState);
                setPage(1);
              }}
            >
              {CAPACITY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="user-management-filter">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as (typeof SORT_OPTIONS)[number]['value']);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="user-management-total">
            <span>Total</span>
            <strong>{workloadQuery.data?.totalItems ?? 0}</strong>
          </div>
        </div>

        {summaryQuery.isError ? (
          <div className="user-management-state user-management-state-error">
            {getAccountServiceResultMessage(summaryQuery.error)}
          </div>
        ) : null}

        {workloadQuery.isLoading ? <div className="user-management-state">Loading designer workload...</div> : null}

        {workloadQuery.isError ? (
          <div className="user-management-state user-management-state-error">
            {getAccountServiceResultMessage(workloadQuery.error)}
          </div>
        ) : null}

        {!workloadQuery.isLoading && !workloadQuery.isError && designers.length === 0 ? (
          <div className="user-management-state">No designers matched the current filters.</div>
        ) : null}

        {!workloadQuery.isLoading && !workloadQuery.isError && designers.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="user-management-table workload-table">
                <thead>
                  <tr>
                    <th>Designer</th>
                    <th>Email</th>
                    <th>Design active</th>
                    <th>Lifecycle</th>
                    <th>Slots</th>
                    <th>Capacity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {designers.map((designer) => (
                    <tr key={designer.accountId}>
                      <td>
                        <div className="user-management-user">
                          <div className="user-management-avatar">
                            {designer.avatarUrl ? <img src={designer.avatarUrl} alt="" /> : <IconUser size={16} />}
                          </div>
                          <span>{designer.fullName}</span>
                        </div>
                      </td>
                      <td>{designer.email}</td>
                      <td>
                        {designer.designActiveCount ?? designer.currentActiveProjectCount}/{designer.maxActiveProjects}
                      </td>
                      <td>{designer.lifecycleAssignedCount ?? 0}</td>
                      <td className={designer.availableSlot < 0 ? 'workload-slot-over' : undefined}>
                        {designer.availableSlot}
                      </td>
                      <td>
                        <CapacityBadge state={designer.capacityState} />
                      </td>
                      <td>
                        <button
                          className="admin-button admin-button-secondary workload-row-action"
                          type="button"
                          onClick={() => {
                            setSelectedDesigner(designer);
                            setProjectBucket('');
                            setProjectPage(1);
                          }}
                        >
                          Projects
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={workloadQuery.data?.page ?? page}
              totalPages={workloadQuery.data?.totalPages ?? 1}
              hasPreviousPage={workloadQuery.data?.hasPreviousPage ?? false}
              hasNextPage={workloadQuery.data?.hasNextPage ?? false}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        ) : null}
      </section>

      {selectedDesigner ? (
        <div className="user-modal-overlay" role="presentation" onClick={() => setSelectedDesigner(null)}>
          <div
            className="user-modal-panel workload-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="designer-projects-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-header">
              <div>
                <h3 id="designer-projects-title">{selectedDesigner.fullName}</h3>
                <p>Assigned projects · soft cap {selectedDesigner.maxActiveProjects}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedDesigner(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="workload-detail-meta">
              <span>
                Design active: {selectedDesigner.designActiveCount ?? selectedDesigner.currentActiveProjectCount}
              </span>
              <span>Available slots: {selectedDesigner.availableSlot}</span>
              <CapacityBadge state={selectedDesigner.capacityState} />
            </div>

            <label className="user-management-filter workload-detail-filter">
              <span>Bucket</span>
              <select
                value={projectBucket}
                onChange={(event) => {
                  setProjectBucket(event.target.value as '' | DesignerProjectBucket);
                  setProjectPage(1);
                }}
              >
                {BUCKET_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {projectsQuery.isLoading ? <div className="user-management-state">Loading projects...</div> : null}
            {projectsQuery.isError ? (
              <div className="user-management-state user-management-state-error">
                {getAccountServiceResultMessage(projectsQuery.error)}
              </div>
            ) : null}
            {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 ? (
              <div className="user-management-state">No assigned projects in this bucket.</div>
            ) : null}

            {!projectsQuery.isLoading && !projectsQuery.isError && projects.length > 0 ? (
              <>
                <div className="admin-table-wrap">
                  <table className="user-management-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Customer</th>
                        <th>Sales</th>
                        <th>Bucket</th>
                        <th>Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.projectId}>
                          <td className="user-management-id">{project.projectCode}</td>
                          <td>{project.projectName}</td>
                          <td>{project.status}</td>
                          <td>{project.customerName ?? '-'}</td>
                          <td>{project.salesName ?? '-'}</td>
                          <td>
                            <span className="workload-bucket">{formatLabel(project.bucket)}</span>
                          </td>
                          <td>{formatDateTime(project.designerAssignedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={projectsQuery.data?.page ?? projectPage}
                  totalPages={projectsQuery.data?.totalPages ?? 1}
                  hasPreviousPage={projectsQuery.data?.hasPreviousPage ?? false}
                  hasNextPage={projectsQuery.data?.hasNextPage ?? false}
                  onPrevious={() => setProjectPage((current) => Math.max(1, current - 1))}
                  onNext={() => setProjectPage((current) => current + 1)}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value?: number;
  note?: string;
  tone?: 'green' | 'amber' | 'red';
}) {
  return (
    <article className={`workload-summary-card${tone ? ` workload-summary-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

function CapacityBadge({ state }: { state?: DesignerCapacityState | string | null }) {
  const normalized = (state ?? 'AVAILABLE').toUpperCase();
  return <span className={`workload-capacity workload-capacity-${normalized.toLowerCase()}`}>{formatLabel(normalized)}</span>;
}

function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="workload-pagination">
      <button type="button" className="admin-button admin-button-secondary" disabled={!hasPreviousPage} onClick={onPrevious}>
        Previous
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button type="button" className="admin-button admin-button-secondary" disabled={!hasNextPage} onClick={onNext}>
        Next
      </button>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
