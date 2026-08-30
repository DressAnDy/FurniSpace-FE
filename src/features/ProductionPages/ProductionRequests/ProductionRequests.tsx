import { useEffect, useMemo, useState } from 'react';
import { IconCheck, IconClipboardList, IconClockCog } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import {
  ProductionFilterBar,
  ProductionLayout,
  ProductionStatusBadge,
  ProductionSummaryCard,
} from '@/features/ProductionPages/productioncomponents';
import type { Priority, ProductionRequestStatus } from '@/features/ProductionPages/types';
import { formatDate, getProductionRequestStatusLabel, productionRequestAllowedActions } from '@/features/ProductionPages/utils';
import { getProductionServiceResultMessage } from '@/services/api/production';
import {
  useCurrentUser,
  useProductionRequests,
  useStartProductionRequest,
} from '@/services/queries';

import './ProductionRequests.css';

type RequestFilter = ProductionRequestStatus | 'ALL';

const MIN_REQUEST_PAGE_SIZE = 1;
const MAX_REQUEST_PAGE_SIZE = 100;
const DEFAULT_REQUEST_PAGE_SIZE = 5;

const priorityRank: Record<Priority, number> = {
  URGENT: 5,
  HIGH: 4,
  NORMAL: 3,
  MEDIUM: 2,
  LOW: 1,
};

const filters: Array<{ label: string; value: RequestFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Production', value: 'IN_PRODUCTION' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function ProductionRequests() {
  const [statusFilter, setStatusFilter] = useState<RequestFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(DEFAULT_REQUEST_PAGE_SIZE);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const currentUserQuery = useCurrentUser();
  const requestsQuery = useProductionRequests({
    assignedTo: assignedToMe ? currentUserQuery.data?.accountId : null,
    priority: priorityFilter === 'ALL' ? null : (priorityFilter as Priority),
    status: statusFilter === 'ALL' ? null : statusFilter,
  });
  const allStatusRequestsQuery = useProductionRequests({
    assignedTo: assignedToMe ? currentUserQuery.data?.accountId : null,
    priority: priorityFilter === 'ALL' ? null : (priorityFilter as Priority),
    status: null,
  });
  const startMutation = useStartProductionRequest();
  const rawRequests = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data?.items]);
  const allStatusRequests = useMemo(() => allStatusRequestsQuery.data?.items ?? [], [allStatusRequestsQuery.data?.items]);
  const requests = useMemo(
    () =>
      rawRequests
        .filter((request) => {
          const search = searchText.trim().toLowerCase();
          const matchesSearch = !search
            || request.productionCode.toLowerCase().includes(search)
            || request.projectName.toLowerCase().includes(search)
            || request.orderCode.toLowerCase().includes(search);

          return matchesSearch;
        })
        .sort((first, second) => {
          const priorityDiff = priorityRank[second.priority] - priorityRank[first.priority];

          if (priorityDiff !== 0) return priorityDiff;

          const deadlineDiff = getProductionDeadlineTime(first.productionDeadline) - getProductionDeadlineTime(second.productionDeadline);

          if (deadlineDiff !== 0) return deadlineDiff;

          const receivedTimeDiff = getRequestReceivedTime(first.createdAt) - getRequestReceivedTime(second.createdAt);

          if (receivedTimeDiff !== 0) return receivedTimeDiff;

          return first.productionCode.localeCompare(second.productionCode);
        }),
    [rawRequests, searchText],
  );
  const requestPageCount = Math.max(Math.ceil(requests.length / requestPageSize) || 1, 1);
  const pagedRequests = useMemo(
    () => requests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize),
    [requestPage, requestPageSize, requests],
  );

  useEffect(() => {
    setRequestPage(1);
  }, [assignedToMe, priorityFilter, searchText, statusFilter, requestPageSize]);

  useEffect(() => {
    setRequestPage((currentPage) => Math.min(currentPage, requestPageCount));
  }, [requestPageCount]);

  async function runQuickAction(action: string, productionRequestId: string) {
    setMessage(null);

    try {
      if (action === 'Start Production') {
        await startMutation.mutateAsync({ productionRequestId });
        setMessage({ tone: 'success', text: 'Production request started.' });
      }
    } catch (error) {
      setMessage({ tone: 'error', text: getProductionServiceResultMessage(error) });
    }
  }

  return (
    <ProductionLayout activeLabel="Production Requests" searchPlaceholder="Search production requests...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Production Requests</h2>
            <p>Manage confirmed order production requests, track request status, priority, assigned staff, and completion timeline.</p>
          </div>
        </section>

        {message ? <section className={`production-workspace-message production-workspace-message-${message.tone}`}>{message.text}</section> : null}
        {requestsQuery.isError ? (
          <section className="production-workspace-message production-workspace-message-error">{getProductionServiceResultMessage(requestsQuery.error)}</section>
        ) : null}

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconClipboardList} label="Pending" value={allStatusRequests.filter((request) => request.status === 'PENDING').length} />
          <ProductionSummaryCard icon={IconClockCog} label="In Production" value={allStatusRequests.filter((request) => request.status === 'IN_PRODUCTION').length} />
          <ProductionSummaryCard icon={IconCheck} label="Completed" value={allStatusRequests.filter((request) => request.status === 'COMPLETED').length} />
        </section>

        <section className="production-workspace-filter-card">
          <div className="production-workspace-filter-group">
            <span className="production-workspace-filter-label">Request status</span>
            <ProductionFilterBar activeValue={statusFilter} filters={filters} onChange={setStatusFilter} />
          </div>
          <div className="production-workspace-filter-controls">
            <label>
              <span>Priority</span>
              <select className="production-workspace-select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="ALL">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
            <label className="production-workspace-filter-search">
              <span>Search</span>
              <input className="production-workspace-search" placeholder="Search by production code, project, or order" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            </label>
          </div>
          <label className="production-requests-check">
            <input checked={assignedToMe} type="checkbox" onChange={(event) => setAssignedToMe(event.target.checked)} />
            <span>Assigned to me</span>
          </label>
        </section>

        <article className="production-workspace-card production-requests-queue">
          <header>
            <div>
              <h3>Production Request Queue</h3>
              <p>Valid actions are shown by current request status.</p>
            </div>
          </header>
          <div className="production-workspace-table-wrap">
            <table className="production-workspace-table">
              <thead>
                <tr>
                  <th>Production Code</th>
                  <th>Project</th>
                  <th>Order Code</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Production Deadline</th>
                  <th>Actual Completion</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.isLoading ? (
                  <tr>
                    <td colSpan={9}>Loading production requests...</td>
                  </tr>
                ) : null}
                {!requestsQuery.isLoading && requests.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No production request matched current filters.</td>
                  </tr>
                ) : null}
                {pagedRequests.map((request) => (
                  <tr key={request.productionRequestId}>
                    <td>
                      <code className="production-requests-code" title={request.productionCode}>
                        {formatCompactCode(request.productionCode)}
                      </code>
                    </td>
                    <td>
                      <span className="production-requests-project" title={request.projectName}>
                        {request.projectName}
                      </span>
                    </td>
                    <td>
                      <code className="production-requests-code" title={request.orderCode}>
                        {formatCompactCode(request.orderCode)}
                      </code>
                    </td>
                    <td>{request.assignedToName ?? '-'}</td>
                    <td>{request.priority}</td>
                    <td><ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} /></td>
                    <td>{formatDate(request.productionDeadline)}</td>
                    <td>{formatDate(request.actualCompletionDate)}</td>
                    <td>
                      <div className="production-workspace-row-actions">
                        <Link to={`/production/requests/${request.productionRequestId}`}>View Detail</Link>
                        {productionRequestAllowedActions[request.status].filter((action) => action !== 'Cancel').slice(0, 2).map((action) => (
                          <button
                            className="is-secondary"
                            disabled={startMutation.isPending}
                            key={action}
                            type="button"
                            onClick={() => void runQuickAction(action, request.productionRequestId)}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!requestsQuery.isLoading ? (
            <ProductionRequestsPager
              page={requestPage}
              pageSize={requestPageSize}
              totalItems={requests.length}
              totalPages={requestPageCount}
              onChange={setRequestPage}
              onPageSizeChange={(nextSize) => {
                setRequestPageSize(nextSize);
                setRequestPage(1);
              }}
            />
          ) : null}
        </article>
      </div>
    </ProductionLayout>
  );
}

function ProductionRequestsPager({
  page,
  pageSize,
  totalPages,
  totalItems,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
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
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }

    const next = Math.min(Math.max(parsed, 1), safeTotalPages);
    setPageDraft(String(next));
    if (next !== page) onChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(pageSize));
      return;
    }

    const next = Math.min(Math.max(parsed, MIN_REQUEST_PAGE_SIZE), MAX_REQUEST_PAGE_SIZE);
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <div className="admin-financial-pager production-requests-queue-pager">
      <div className="admin-financial-pager-meta">
        <label className="admin-financial-pager-field">
          <span>Rows / page</span>
          <input
            aria-label="Rows per page"
            inputMode="numeric"
            max={MAX_REQUEST_PAGE_SIZE}
            min={MIN_REQUEST_PAGE_SIZE}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <label className="admin-financial-pager-field">
          <span>Page</span>
          <input
            aria-label="Page"
            inputMode="numeric"
            max={safeTotalPages}
            min={1}
            type="number"
            value={pageDraft}
            onBlur={commitPage}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="admin-financial-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="admin-financial-pager-total">{totalItems} total</span>
      </div>
      <div className="admin-financial-pager-nav">
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button disabled={page >= safeTotalPages} type="button" onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function formatCompactCode(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= 14) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

function getRequestReceivedTime(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function getProductionDeadlineTime(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}
