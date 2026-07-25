import { IconCalendarDue, IconClipboardList, IconTool } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockProductionRequests } from '@/features/ProductionPages/mock';
import { ProductionLayout, ProductionStatusBadge, ProductionSummaryCard } from '@/features/ProductionPages/productioncomponents';
import { formatDate, getProductionItemStatusLabel, getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';

export function MyProductionTasks() {
  const assignedRequests = mockProductionRequests.filter((request) => request.assignedTo === 'PD-001');
  const assignedItems = assignedRequests.flatMap((request) => request.items.map((item) => ({ item, request })));
  const upcoming = assignedItems.filter(({ item }) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED');

  return (
    <ProductionLayout activeLabel="My Tasks" searchPlaceholder="Search my production tasks...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>My Production Tasks</h2>
            <p>View and update production requests and items assigned to you.</p>
          </div>
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconClipboardList} label="Assigned Production Requests" value={assignedRequests.length} />
          <ProductionSummaryCard icon={IconTool} label="Assigned Production Items" value={assignedItems.length} />
          <ProductionSummaryCard icon={IconCalendarDue} label="Upcoming Deadlines" value={upcoming.length} />
          <ProductionSummaryCard icon={IconCalendarDue} label="Due This Week" value={upcoming.length} />
        </section>

        <section className="production-workspace-grid">
          <TaskTable title="Assigned Production Requests" rows={assignedRequests.map((request) => ({
            id: request.productionRequestId,
            project: request.projectName,
            productionCode: request.productionCode,
            item: `${request.items.length} item(s)`,
            status: getProductionRequestStatusLabel(request.status),
            rawStatus: request.status,
            priority: request.priority,
            estimatedCompletion: formatDate(request.estimatedCompletionDate),
          }))} />
          <TaskTable title="Assigned Production Items" rows={assignedItems.map(({ item, request }) => ({
            id: item.productionItemId,
            project: request.projectName,
            productionCode: request.productionCode,
            item: item.productNameSnapshot,
            status: getProductionItemStatusLabel(item.status),
            rawStatus: item.status,
            priority: request.priority,
            estimatedCompletion: formatDate(item.estimatedCompletionDate),
          }))} />
        </section>

        <TaskTable title="Upcoming Deadlines" rows={upcoming.map(({ item, request }) => ({
          id: `${request.productionRequestId}-${item.productionItemId}`,
          project: request.projectName,
          productionCode: request.productionCode,
          item: item.productNameSnapshot,
          status: getProductionItemStatusLabel(item.status),
          rawStatus: item.status,
          priority: request.priority,
          estimatedCompletion: formatDate(item.estimatedCompletionDate),
        }))} />
      </div>
    </ProductionLayout>
  );
}

type TaskRow = {
  estimatedCompletion: string;
  id: string;
  item: string;
  priority: string;
  productionCode: string;
  project: string;
  rawStatus: string;
  status: string;
};

function TaskTable({ rows, title }: { rows: TaskRow[]; title: string }) {
  return (
    <article className="production-workspace-card">
      <header>
        <div>
          <h3>{title}</h3>
          <p>Assigned production work for the current production user.</p>
        </div>
      </header>
      <div className="production-workspace-table-wrap">
        <table className="production-workspace-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Production Code</th>
              <th>Item</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Estimated Completion</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.project}</td>
                <td>{row.productionCode}</td>
                <td>{row.item}</td>
                <td><ProductionStatusBadge label={row.status} status={row.rawStatus} /></td>
                <td>{row.priority}</td>
                <td>{row.estimatedCompletion}</td>
                <td><Link className="production-workspace-action-link" to={`/production/requests/${mockProductionRequests.find((request) => request.productionCode === row.productionCode)?.productionRequestId}`}>View Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
