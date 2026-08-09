import { useState } from 'react';
import { IconSearch, IconUser, IconX } from '@tabler/icons-react';

import {
  getAccountServiceResultMessage,
  type SalesCapacityState,
  type SalesFuturePressureState,
  type SalesProjectBucket,
  type SalesWorkloadDto,
} from '@/services/api';
import {
  useSalesAssignedProjects,
  useSalesWorkload,
  useSalesWorkloadSummary,
  useUnassignedIntakeProjects,
} from '@/services/queries';

const CAPACITY_OPTIONS: Array<{ value: '' | SalesCapacityState; label: string }> = [
  { value: '', label: 'All capacity' },
  { value: 'AVAILABLE_NOW', label: 'Available now' },
  { value: 'FULL_NOW', label: 'Full now' },
  { value: 'OVER_NOW', label: 'Over now' },
];

const PRESSURE_OPTIONS: Array<{ value: '' | SalesFuturePressureState; label: string }> = [
  { value: '', label: 'All pressure' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const SORT_OPTIONS = [
  { value: 'FuturePressureScoreDesc', label: 'Future pressure (desc)' },
  { value: 'SalesActiveCountDesc', label: 'Sales active (desc)' },
  { value: 'AvailableSlotAsc', label: 'Available slots (asc)' },
] as const;

const BUCKET_OPTIONS: Array<{ value: '' | SalesProjectBucket; label: string }> = [
  { value: '', label: 'All buckets' },
  { value: 'CURRENT_ACTIVE', label: 'Current active' },
  { value: 'INTAKE', label: 'Intake' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'DESIGN_MONITOR', label: 'Design monitor' },
  { value: 'FULFILLMENT', label: 'Fulfillment' },
  { value: 'TERMINAL', label: 'Terminal' },
  { value: 'OTHER', label: 'Other' },
  { value: 'HIGH_PRESSURE_SOURCE', label: 'High pressure source' },
];

export function SalesWorkloadPanel() {
  const [searchValue, setSearchValue] = useState('');
  const [capacityState, setCapacityState] = useState<'' | SalesCapacityState>('');
  const [futurePressureState, setFuturePressureState] = useState<'' | SalesFuturePressureState>('');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('FuturePressureScoreDesc');
  const [page, setPage] = useState(1);
  const [selectedSales, setSelectedSales] = useState<SalesWorkloadDto | null>(null);
  const [projectBucket, setProjectBucket] = useState<'' | SalesProjectBucket>('');
  const [projectPage, setProjectPage] = useState(1);
  const [showUnassignedIntake, setShowUnassignedIntake] = useState(false);
  const [intakePage, setIntakePage] = useState(1);

  const summaryQuery = useSalesWorkloadSummary();
  const workloadQuery = useSalesWorkload({
    page,
    pageSize: 20,
    search: searchValue || null,
    capacityState: capacityState || null,
    futurePressureState: futurePressureState || null,
    sortBy,
  });
  const projectsQuery = useSalesAssignedProjects(
    {
      salesId: selectedSales?.accountId ?? '',
      page: projectPage,
      pageSize: 20,
      bucket: projectBucket || null,
    },
    { enabled: Boolean(selectedSales?.accountId) },
  );
  const intakeQuery = useUnassignedIntakeProjects(
    { page: intakePage, pageSize: 20 },
    { enabled: showUnassignedIntake },
  );

  const salesItems = workloadQuery.data?.items ?? [];
  const summary = summaryQuery.data;
  const projects = projectsQuery.data?.items ?? [];
  const intakeItems = intakeQuery.data?.items ?? [];

  return (
    <div className="workload-panel">
      <section className="workload-summary-grid" aria-label="Sales workload summary">
        <SummaryCard label="Active sales" value={summary?.totalActiveSales} />
        <SummaryCard label="Available now" value={summary?.availableNowCount} tone="green" />
        <SummaryCard label="Full now" value={summary?.fullNowCount} tone="amber" />
        <SummaryCard label="Over now" value={summary?.overNowCount} tone="red" />
        <SummaryCard label="High future pressure" value={summary?.highFuturePressureCount} tone="red" />
        <SummaryCard
          label="Sales-active projects"
          value={summary?.totalSalesActiveProjects}
          note={`Soft cap ${summary?.maxActiveProjects ?? 5} / sales`}
        />
        <button
          type="button"
          className="workload-summary-card workload-summary-action"
          onClick={() => {
            setShowUnassignedIntake(true);
            setIntakePage(1);
          }}
        >
          <span>Unassigned intake</span>
          <strong>{summary?.unassignedIntakeCount ?? '—'}</strong>
          <p>Open queue</p>
        </button>
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
              placeholder="Search sales by email, name, or phone..."
              type="search"
            />
          </label>

          <label className="user-management-filter">
            <span>Capacity</span>
            <select
              value={capacityState}
              onChange={(event) => {
                setCapacityState(event.target.value as '' | SalesCapacityState);
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
            <span>Future pressure</span>
            <select
              value={futurePressureState}
              onChange={(event) => {
                setFuturePressureState(event.target.value as '' | SalesFuturePressureState);
                setPage(1);
              }}
            >
              {PRESSURE_OPTIONS.map((option) => (
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

        {workloadQuery.isLoading ? <div className="user-management-state">Loading sales workload...</div> : null}

        {workloadQuery.isError ? (
          <div className="user-management-state user-management-state-error">
            {getAccountServiceResultMessage(workloadQuery.error)}
          </div>
        ) : null}

        {!workloadQuery.isLoading && !workloadQuery.isError && salesItems.length === 0 ? (
          <div className="user-management-state">No sales accounts matched the current filters.</div>
        ) : null}

        {!workloadQuery.isLoading && !workloadQuery.isError && salesItems.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="user-management-table workload-table">
                <thead>
                  <tr>
                    <th>Sales</th>
                    <th>Active / Cap</th>
                    <th>Slots</th>
                    <th>Capacity</th>
                    <th>Pressure</th>
                    <th>Pipeline</th>
                    <th>Attention</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {salesItems.map((sales) => (
                    <tr key={sales.accountId}>
                      <td>
                        <div className="user-management-user">
                          <div className="user-management-avatar">
                            {sales.avatarUrl ? <img src={sales.avatarUrl} alt="" /> : <IconUser size={16} />}
                          </div>
                          <div className="workload-user-copy">
                            <span>{sales.fullName}</span>
                            <small>{sales.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {sales.salesActiveCount}/{sales.maxActiveProjects}
                        <small className="workload-sub">
                          Intake {sales.intakeCount} · Commercial {sales.commercialCount}
                        </small>
                      </td>
                      <td className={sales.availableSlot < 0 ? 'workload-slot-over' : undefined}>{sales.availableSlot}</td>
                      <td>
                        <CapacityBadge state={sales.capacityState} />
                      </td>
                      <td>
                        <PressureBadge state={sales.futurePressureState} score={sales.futurePressureScore} />
                      </td>
                      <td>
                        <small className="workload-sub">
                          Design {sales.designMonitorCount} · Fulfill {sales.fulfillmentCount} · Life{' '}
                          {sales.lifecycleAssignedCount}
                        </small>
                      </td>
                      <td>
                        <div className="workload-attention">
                          <span title="Approaching commercial">AC {sales.approachingCommercialCount}</span>
                          <span title="Production attention">PA {sales.productionAttentionCount}</span>
                          <span title="Delivery attention">DA {sales.deliveryAttentionCount}</span>
                        </div>
                      </td>
                      <td>
                        <div className="workload-row-actions">
                          <button
                            className="admin-button admin-button-secondary workload-row-action"
                            type="button"
                            onClick={() => {
                              setSelectedSales(sales);
                              setProjectBucket('');
                              setProjectPage(1);
                            }}
                          >
                            Projects
                          </button>
                          <button
                            className="admin-button admin-button-secondary workload-row-action"
                            type="button"
                            onClick={() => {
                              setSelectedSales(sales);
                              setProjectBucket('HIGH_PRESSURE_SOURCE');
                              setProjectPage(1);
                            }}
                          >
                            High pressure
                          </button>
                        </div>
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

      {selectedSales ? (
        <div className="user-modal-overlay" role="presentation" onClick={() => setSelectedSales(null)}>
          <div
            className="user-modal-panel workload-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-projects-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-header">
              <div>
                <h3 id="sales-projects-title">{selectedSales.fullName}</h3>
                <p>Assigned projects · soft cap {selectedSales.maxActiveProjects}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedSales(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="workload-detail-meta">
              <span>
                Sales active: {selectedSales.salesActiveCount} (intake {selectedSales.intakeCount} + commercial{' '}
                {selectedSales.commercialCount})
              </span>
              <span>Slots: {selectedSales.availableSlot}</span>
              <CapacityBadge state={selectedSales.capacityState} />
              <PressureBadge state={selectedSales.futurePressureState} score={selectedSales.futurePressureScore} />
            </div>

            {selectedSales.futurePressureBreakdown ? (
              <div className="workload-breakdown">
                <span>MR {selectedSales.futurePressureBreakdown.measurementRequiredCount}</span>
                <span>SV {selectedSales.futurePressureBreakdown.spaceVerifiedCount}</span>
                <span>PC {selectedSales.futurePressureBreakdown.proposalConsultingCount}</span>
                <span>IP {selectedSales.futurePressureBreakdown.inProductionCount}</span>
                <span>PB {selectedSales.futurePressureBreakdown.productionBlockedCount}</span>
                <span>RD {selectedSales.futurePressureBreakdown.readyForDeliveryCount}</span>
                <span>DL {selectedSales.futurePressureBreakdown.deliveringCount}</span>
                <span>DD {selectedSales.futurePressureBreakdown.deliveredCount}</span>
              </div>
            ) : null}

            <label className="user-management-filter workload-detail-filter">
              <span>Bucket</span>
              <select
                value={projectBucket}
                onChange={(event) => {
                  setProjectBucket(event.target.value as '' | SalesProjectBucket);
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
                        <th>Designer</th>
                        <th>Bucket</th>
                        <th>Weight</th>
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
                          <td>{project.designerName ?? '-'}</td>
                          <td>
                            <span className="workload-bucket">{formatLabel(project.bucket)}</span>
                          </td>
                          <td>{project.pressureWeight.toFixed(2)}</td>
                          <td>{formatDateTime(project.salesAssignedAt)}</td>
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

      {showUnassignedIntake ? (
        <div className="user-modal-overlay" role="presentation" onClick={() => setShowUnassignedIntake(false)}>
          <div
            className="user-modal-panel workload-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unassigned-intake-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-header">
              <div>
                <h3 id="unassigned-intake-title">Unassigned intake</h3>
                <p>SUBMITTED projects without assigned sales</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setShowUnassignedIntake(false)}>
                <IconX size={18} />
              </button>
            </div>

            {intakeQuery.isLoading ? <div className="user-management-state">Loading unassigned intake...</div> : null}
            {intakeQuery.isError ? (
              <div className="user-management-state user-management-state-error">
                {getAccountServiceResultMessage(intakeQuery.error)}
              </div>
            ) : null}
            {!intakeQuery.isLoading && !intakeQuery.isError && intakeItems.length === 0 ? (
              <div className="user-management-state">No unassigned intake projects.</div>
            ) : null}

            {!intakeQuery.isLoading && !intakeQuery.isError && intakeItems.length > 0 ? (
              <>
                <div className="admin-table-wrap">
                  <table className="user-management-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Project</th>
                        <th>Business type</th>
                        <th>Customer</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intakeItems.map((project) => (
                        <tr key={project.projectId}>
                          <td className="user-management-id">{project.projectCode}</td>
                          <td>{project.projectName}</td>
                          <td>{project.businessType ?? '-'}</td>
                          <td>{project.customerName ?? '-'}</td>
                          <td>{formatDateTime(project.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={intakeQuery.data?.page ?? intakePage}
                  totalPages={intakeQuery.data?.totalPages ?? 1}
                  hasPreviousPage={intakeQuery.data?.hasPreviousPage ?? false}
                  hasNextPage={intakeQuery.data?.hasNextPage ?? false}
                  onPrevious={() => setIntakePage((current) => Math.max(1, current - 1))}
                  onNext={() => setIntakePage((current) => current + 1)}
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

function CapacityBadge({ state }: { state?: SalesCapacityState | string | null }) {
  const normalized = (state ?? 'AVAILABLE_NOW').toUpperCase();
  return <span className={`workload-capacity workload-capacity-${normalized.toLowerCase()}`}>{formatLabel(normalized)}</span>;
}

function PressureBadge({ state, score }: { state?: SalesFuturePressureState | string | null; score?: number }) {
  const normalized = (state ?? 'LOW').toUpperCase();
  return (
    <span className={`workload-pressure workload-pressure-${normalized.toLowerCase()}`}>
      {formatLabel(normalized)}
      {typeof score === 'number' ? ` · ${score.toFixed(1)}` : ''}
    </span>
  );
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
