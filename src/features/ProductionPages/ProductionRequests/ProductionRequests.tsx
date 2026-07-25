import { useMemo, useState } from 'react';
import { IconAlertTriangle, IconCheck, IconClipboardList, IconClockCog } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockProductionRequests } from '@/features/ProductionPages/mock';
import {
  ProductionFilterBar,
  ProductionLayout,
  ProductionStatusBadge,
  ProductionSummaryCard,
} from '@/features/ProductionPages/productioncomponents';
import type { ProductionRequestStatus } from '@/features/ProductionPages/types';
import { formatDate, getProductionRequestStatusLabel, productionRequestAllowedActions } from '@/features/ProductionPages/utils';

type RequestFilter = ProductionRequestStatus | 'ALL';

const filters: Array<{ label: string; value: RequestFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Feasible', value: 'FEASIBLE' },
  { label: 'In Production', value: 'IN_PRODUCTION' },
  { label: 'Blocked', value: 'BLOCKED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function ProductionRequests() {
  const [statusFilter, setStatusFilter] = useState<RequestFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [searchText, setSearchText] = useState('');
  const requests = useMemo(
    () =>
      mockProductionRequests.filter((request) => {
        const search = searchText.trim().toLowerCase();
        const matchesSearch = !search
          || request.productionCode.toLowerCase().includes(search)
          || request.projectName.toLowerCase().includes(search)
          || request.orderCode.toLowerCase().includes(search);

        return (statusFilter === 'ALL' || request.status === statusFilter)
          && (priorityFilter === 'ALL' || request.priority === priorityFilter)
          && (!assignedToMe || request.assignedTo === 'PD-001')
          && matchesSearch;
      }),
    [assignedToMe, priorityFilter, searchText, statusFilter],
  );

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

        <section className="production-workspace-filter-card">
          <ProductionFilterBar activeValue={statusFilter} filters={filters} onChange={setStatusFilter} />
          <div className="production-workspace-form-grid">
            <select className="production-workspace-select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="ALL">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <input className="production-workspace-search" placeholder="Search by production code, project, or order" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
          </div>
          <label className="production-requests-check">
            <input checked={assignedToMe} type="checkbox" onChange={(event) => setAssignedToMe(event.target.checked)} />
            <span>Assigned to me</span>
          </label>
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconClipboardList} label="Pending Review" value={mockProductionRequests.filter((request) => request.status === 'PENDING_REVIEW').length} />
          <ProductionSummaryCard icon={IconClockCog} label="In Production" value={mockProductionRequests.filter((request) => request.status === 'IN_PRODUCTION').length} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Blocked" value={mockProductionRequests.filter((request) => request.status === 'BLOCKED').length} />
          <ProductionSummaryCard icon={IconCheck} label="Completed" value={mockProductionRequests.filter((request) => request.status === 'COMPLETED').length} />
        </section>

        <article className="production-workspace-card">
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
                {requests.map((request) => (
                  <tr key={request.productionRequestId}>
                    <td>{request.productionCode}</td>
                    <td>{request.projectName}</td>
                    <td>{request.orderCode}</td>
                    <td>{request.assignedToName ?? '-'}</td>
                    <td>{request.priority}</td>
                    <td><ProductionStatusBadge label={getProductionRequestStatusLabel(request.status)} status={request.status} /></td>
                    <td>{formatDate(request.estimatedCompletionDate)}</td>
                    <td>{formatDate(request.actualCompletionDate)}</td>
                    <td>
                      <div className="production-workspace-row-actions">
                        <Link to={`/production/requests/${request.productionRequestId}`}>View Detail</Link>
                        {productionRequestAllowedActions[request.status].slice(0, 2).map((action) => (
                          <button className="is-secondary" key={action} type="button">{action}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </ProductionLayout>
  );
}
