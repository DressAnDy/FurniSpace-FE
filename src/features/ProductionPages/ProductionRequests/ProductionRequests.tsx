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
  useMarkProductionRequestFeasible,
  useProductionRequests,
  useStartProductionRequest,
} from '@/services/queries';

import './ProductionRequests.css';

type RequestFilter = ProductionRequestStatus | 'ALL';

const REQUEST_PAGE_SIZE = 5;

const priorityRank: Record<Priority, number> = {
  URGENT: 5,
  HIGH: 4,
  NORMAL: 3,
  MEDIUM: 2,
  LOW: 1,
};

const filters: Array<{ label: string; value: RequestFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Feasible', value: 'FEASIBLE' },
  { label: 'In Production', value: 'IN_PRODUCTION' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function ProductionRequests() {
  const [statusFilter, setStatusFilter] = useState<RequestFilter>('PENDING_REVIEW');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const currentUserQuery = useCurrentUser();
  const requestsQuery = useProductionRequests({
    assignedTo: assignedToMe ? currentUserQuery.data?.accountId : null,
    priority: priorityFilter === 'ALL' ? null : (priorityFilter as Priority),
    status: statusFilter === 'ALL' ? null : statusFilter,
  });
  const markFeasibleMutation = useMarkProductionRequestFeasible();
  const startMutation = useStartProductionRequest();
  const rawRequests = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data?.items]);
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

          const receivedTimeDiff = getRequestReceivedTime(first.createdAt) - getRequestReceivedTime(second.createdAt);

          if (receivedTimeDiff !== 0) return receivedTimeDiff;

          return first.productionCode.localeCompare(second.productionCode);
        }),
    [rawRequests, searchText],
  );
  const requestPageCount = Math.max(Math.ceil(requests.length / REQUEST_PAGE_SIZE), 1);
  const pagedRequests = useMemo(
    () => requests.slice((requestPage - 1) * REQUEST_PAGE_SIZE, requestPage * REQUEST_PAGE_SIZE),
    [requestPage, requests],
  );

  useEffect(() => {
    setRequestPage(1);
  }, [assignedToMe, priorityFilter, searchText, statusFilter]);

  useEffect(() => {
    setRequestPage((currentPage) => Math.min(currentPage, requestPageCount));
  }, [requestPageCount]);

  async function runQuickAction(action: string, productionRequestId: string) {
    setMessage(null);

    try {
      if (action === 'Mark Feasible') {
        await markFeasibleMutation.mutateAsync({ productionRequestId, note: 'Production request reviewed as feasible.' });
        setMessage({ tone: 'success', text: 'Production request marked feasible.' });
        return;
      }

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
          <ProductionSummaryCard icon={IconClipboardList} label="Pending Review" value={rawRequests.filter((request) => request.status === 'PENDING_REVIEW').length} />
          <ProductionSummaryCard icon={IconClockCog} label="Feasible" value={rawRequests.filter((request) => request.status === 'FEASIBLE').length} />
          <ProductionSummaryCard icon={IconClockCog} label="In Production" value={rawRequests.filter((request) => request.status === 'IN_PRODUCTION').length} />
          <ProductionSummaryCard icon={IconCheck} label="Completed" value={rawRequests.filter((request) => request.status === 'COMPLETED').length} />
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
                  <th>Estimated Completion</th>
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
                    <td>{formatDate(request.estimatedCompletionDate)}</td>
                    <td>{formatDate(request.actualCompletionDate)}</td>
                    <td>
                      <div className="production-workspace-row-actions">
                        <Link to={`/production/requests/${request.productionRequestId}`}>View Detail</Link>
                        {productionRequestAllowedActions[request.status].slice(0, 2).map((action) => (
                          <button
                            className="is-secondary"
                            disabled={markFeasibleMutation.isPending || startMutation.isPending || action === 'Cancel'}
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
          {requests.length > REQUEST_PAGE_SIZE ? (
            <footer className="production-requests-pagination">
              <span>
                Page {requestPage} / {requestPageCount}
              </span>
              <div>
                <button disabled={requestPage === 1} type="button" onClick={() => setRequestPage((page) => Math.max(page - 1, 1))}>
                  Previous
                </button>
                <button disabled={requestPage === requestPageCount} type="button" onClick={() => setRequestPage((page) => Math.min(page + 1, requestPageCount))}>
                  Next
                </button>
              </div>
            </footer>
          ) : null}
        </article>
      </div>
    </ProductionLayout>
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
