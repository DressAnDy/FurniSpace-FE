import { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCheck,
  IconClipboardText,
  IconCreditCard,
  IconMessageCircle,
  IconPackage,
  IconReceipt,
  IconTool,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { mockCustomerPayments, mockCustomerProductionRequests, mockCustomerTrackingProjects } from '@/features/CustomerPages/mock';
import {
  CustomerNavbar,
  CustomerStatusBadge,
  CustomerSummaryCard,
  CustomerTimeline,
} from '@/features/CustomerPages/customercomponents';
import type { CustomerProductionTrackingItem, CustomerProductionTrackingRequest, CustomerTrackingProject } from '@/features/CustomerPages/types';
import {
  formatCustomerDate,
  formatCustomerMoney,
  getProjectStatusLabel,
  paymentStatusLabels,
  paymentTypeLabels,
} from '@/features/CustomerPages/utils';

import './Tracking.css';

const productionItemStatusLabels: Record<CustomerProductionTrackingItem['status'], string> = {
  PENDING: 'Waiting to start',
  IN_PRODUCTION: 'In production',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked - team is resolving this issue',
  CANCELLED: 'Unavailable - Sales will coordinate adjustment',
};

export function Tracking() {
  const activeDefault = mockCustomerTrackingProjects.find((project) => ['IN_PRODUCTION', 'PRODUCTION_BLOCKED', 'READY_FOR_DELIVERY'].includes(project.status))
    ?? mockCustomerTrackingProjects[0];
  const [selectedProjectId, setSelectedProjectId] = useState(activeDefault.projectId);
  const project = mockCustomerTrackingProjects.find((item) => item.projectId === selectedProjectId) ?? activeDefault;
  const productionRequest = mockCustomerProductionRequests.find((request) => request.projectId === project.projectId)
    ?? mockCustomerProductionRequests[0];
  const productionItems = productionRequest.items;
  const blockedOrCancelledItems = productionItems.filter((item) => item.status === 'BLOCKED' || item.status === 'CANCELLED');
  const pendingPayment = useMemo(
    () => mockCustomerPayments.find((payment) => payment.projectId === project.projectId && ['PENDING', 'PROCESSING'].includes(payment.status)),
    [project.projectId],
  );

  return (
    <main className="customer-workspace-page customer-tracking-page">
      <CustomerNavbar activeLabel="Tracking" classPrefix="customer-tracking" />
      <div className="customer-workspace-main">
        <section className="customer-workspace-heading">
          <div>
            <p className="customer-workspace-eyebrow">Customer Workspace</p>
            <h1>Project Tracking</h1>
            <p>Track the production and delivery progress of each confirmed item in your project.</p>
          </div>
        </section>

        <section className="customer-workspace-grid">
          <article className="customer-workspace-card">
            <header>
              <div>
                <h2>Active Project / Current Order</h2>
                <p>Switch between confirmed projects and follow the production request tied to the current order.</p>
              </div>
              <select className="customer-tracking-selector" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                {mockCustomerTrackingProjects.map((item) => (
                  <option key={item.projectId} value={item.projectId}>{item.projectName}</option>
                ))}
              </select>
            </header>
            <ProjectSummary project={project} productionRequest={productionRequest} />
          </article>

          <article className="customer-tracking-status-banner">
            <CustomerStatusBadge label={getProjectStatusLabel(productionRequest.status)} status={productionRequest.status} />
            <h2>{productionRequest.productionCode}</h2>
            <p>{productionRequest.note ?? 'Production request is being prepared by the FurniSpace team.'}</p>
            <strong>Estimated completion: {formatCustomerDate(productionRequest.estimatedCompletionDate)}</strong>
            <Link className="customer-workspace-button" to="/customer/chat">Contact Team</Link>
          </article>
        </section>

        <section className="customer-workspace-summary-grid">
          <CustomerSummaryCard icon={IconPackage} label="Total Items" value={productionItems.length} />
          <CustomerSummaryCard icon={IconTool} label="In Production" value={countItems(productionItems, 'IN_PRODUCTION')} />
          <CustomerSummaryCard icon={IconCheck} label="Completed" value={countItems(productionItems, 'COMPLETED')} />
          <CustomerSummaryCard icon={IconAlertTriangle} label="Blocked / Cancelled" value={blockedOrCancelledItems.length} />
        </section>

        {blockedOrCancelledItems.length > 0 ? (
          <article className="customer-tracking-warning-panel">
            <header>
              <IconAlertTriangle size={22} />
              <div>
                <h2>Blocked Item Warning</h2>
                <p>The team is reviewing these item-level production issues. No partial quantity progress is shown in MVP.</p>
              </div>
              <Link className="customer-workspace-link" to="/customer/chat">Contact Team</Link>
            </header>
            <div className="customer-workspace-list">
              {blockedOrCancelledItems.map((item) => (
                <ItemWarning key={item.productionItemId} item={item} />
              ))}
            </div>
          </article>
        ) : null}

        <article className="customer-workspace-card">
          <header>
            <div>
              <h2>Production Items Tracking</h2>
              <p>Each production item is completed for its full quantity or cancelled as unavailable.</p>
            </div>
          </header>
          <div className="customer-tracking-item-grid">
            {productionItems.map((item) => (
              <ProductionItemCard item={item} key={item.productionItemId} />
            ))}
          </div>
        </article>

        <section className="customer-workspace-grid">
          <article className="customer-workspace-card">
            <header>
              <div>
                <h2>Ready for Delivery Summary</h2>
                <p>Delivery coordination starts after all producible items are completed and packed.</p>
              </div>
            </header>
            <div className="customer-workspace-field-grid">
              <Field label="Production Request" value={productionRequest.productionCode} />
              <Field label="Completed Items" value={`${countItems(productionItems, 'COMPLETED')} item(s)`} />
              <Field label="Estimated Completion" value={formatCustomerDate(productionRequest.estimatedCompletionDate)} />
              <Field label="Delivery Schedule" value={formatCustomerDate(productionRequest.deliveryScheduleDate)} />
            </div>
          </article>

          <article className="customer-workspace-card">
            <header>
              <div>
                <h2>Related Information</h2>
                <p>Production-oriented records connected to this order.</p>
              </div>
            </header>
            <div className="customer-tracking-related-grid">
              <RelatedCard icon={IconReceipt} title="Current Order" summary={productionRequest.orderCode} status={productionRequest.status} path="/customer/orders" />
              <RelatedCard icon={IconClipboardText} title="Production Request" summary={productionRequest.productionCode} status={productionRequest.status} path="/customer/tracking" />
              <RelatedCard
                icon={IconCreditCard}
                title="Pending Payment"
                summary={pendingPayment ? `${paymentTypeLabels[pendingPayment.paymentType]} - ${formatCustomerMoney(pendingPayment.amount, pendingPayment.currency)}` : 'No pending payment'}
                status={pendingPayment?.status ?? 'PAID'}
                path="/user-profile?tab=payments"
              />
              <RelatedCard icon={IconCalendarEvent} title="Delivery Schedule" summary={formatCustomerDate(productionRequest.deliveryScheduleDate)} status="READY_FOR_DELIVERY" path="/customer/schedules" />
              <RelatedCard icon={IconMessageCircle} title="Project Chat" summary="Message Sales or Production support" status="IN_PRODUCTION" path="/customer/chat" />
            </div>
          </article>
        </section>

        <article className="customer-workspace-card customer-tracking-project-overview">
          <header>
            <div>
              <h2>Project Status Overview</h2>
              <p>High-level project status remains secondary to item-level production tracking.</p>
            </div>
          </header>
          <CustomerTimeline status={project.status} />
        </article>

        <article className="customer-workspace-card">
          <header>
            <div>
              <h2>Recent Production Updates</h2>
              <p>Latest production item events from the current production request.</p>
            </div>
          </header>
          <div className="customer-workspace-list">
            {getRecentProductionUpdates(productionRequest).map((activity, index) => (
              <div className="customer-workspace-list-item" key={`${activity}-${index}`}>
                <strong>{activity}</strong>
                <small>{formatCustomerDate(`2026-07-${22 + index}T09:00:00`)}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

function ProjectSummary({ productionRequest, project }: { productionRequest: CustomerProductionTrackingRequest; project: CustomerTrackingProject }) {
  return (
    <div className="customer-workspace-field-grid">
      <Field label="Project name" value={project.projectName} />
      <Field label="Project code" value={project.projectCode} />
      <Field label="Current order" value={productionRequest.orderCode} />
      <Field label="Business type" value={project.businessType} />
      <Field label="Project address" value={project.projectAddress ?? '-'} />
      <Field label="Budget range" value={`${formatCustomerMoney(project.budgetMin)} - ${formatCustomerMoney(project.budgetMax)}`} />
      <div className="customer-workspace-field">
        <span>Project status</span>
        <strong><CustomerStatusBadge label={getProjectStatusLabel(productionRequest.status)} status={productionRequest.status} /></strong>
      </div>
      <div className="customer-workspace-field">
        <span>Production request</span>
        <strong>{productionRequest.productionCode}</strong>
      </div>
    </div>
  );
}

function ProductionItemCard({ item }: { item: CustomerProductionTrackingItem }) {
  return (
    <article className={`customer-tracking-item-card customer-tracking-item-card-${item.status.toLowerCase()}`}>
      <header>
        <div>
          <span>{item.productionItemId}</span>
          <h3>{item.productNameSnapshot}</h3>
          <p>{item.productVersionNameSnapshot ?? '-'}</p>
        </div>
        <CustomerStatusBadge label={productionItemStatusLabels[item.status]} status={item.status} />
      </header>
      <div className="customer-workspace-field-grid">
        <Field label="Quantity" value={String(item.quantity)} />
        <Field label="Estimated completion date" value={formatCustomerDate(item.estimatedCompletionDate)} />
        <Field label="Completed date" value={formatCustomerDate(item.completedAt)} />
        <Field label="Material note" value={item.materialNote ?? '-'} />
        <Field label="Production note" value={item.productionNote ?? '-'} />
        {item.status === 'CANCELLED' ? <Field label="Cancellation reason" value={item.cancellationReason ?? '-'} /> : null}
      </div>
      {item.status === 'BLOCKED' || item.status === 'CANCELLED' ? <ItemWarning item={item} /> : null}
    </article>
  );
}

function ItemWarning({ item }: { item: CustomerProductionTrackingItem }) {
  if (item.status === 'CANCELLED') {
    return (
      <div className="customer-tracking-item-warning customer-tracking-item-warning-danger">
        <strong>{item.cancellationReason ?? 'This item is unavailable.'}</strong>
        <p>This item cannot be produced as planned. Sales will coordinate an adjustment or alternative option.</p>
      </div>
    );
  }

  return (
    <div className="customer-tracking-item-warning">
      <strong>{item.materialNote ?? 'Production issue reported.'}</strong>
      <p>{item.productionNote ?? 'The team is resolving this issue and will contact you if action is required.'}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RelatedCard({ icon: IconComponent, path, status, summary, title }: { icon: typeof IconClipboardText; path: string; status: string; summary: string; title: string }) {
  return (
    <Link className="customer-tracking-related-card" to={path}>
      <IconComponent size={22} />
      <strong>{title}</strong>
      <p>{summary}</p>
      <CustomerStatusBadge label={paymentStatusLabels[status as keyof typeof paymentStatusLabels] ?? getProjectStatusLabel(status)} status={status} />
    </Link>
  );
}

function countItems(items: CustomerProductionTrackingItem[], status: CustomerProductionTrackingItem['status']) {
  return items.filter((item) => item.status === status).length;
}

function getRecentProductionUpdates(productionRequest: CustomerProductionTrackingRequest) {
  const itemUpdates = productionRequest.items.map((item) => {
    if (item.status === 'BLOCKED') return `${item.productNameSnapshot} blocked due to ${item.materialNote?.toLowerCase() ?? 'a production issue'}`;
    if (item.status === 'COMPLETED') return `${item.productNameSnapshot} completed`;
    if (item.status === 'IN_PRODUCTION') return `${item.productNameSnapshot} moved to In Production`;
    if (item.status === 'CANCELLED') return `${item.productNameSnapshot} marked unavailable for production`;

    return `${item.productNameSnapshot} is waiting to start`;
  });

  return [
    ...itemUpdates,
    productionRequest.status === 'READY_FOR_DELIVERY' || productionRequest.status === 'COMPLETED'
      ? 'Production request completed'
      : 'Production request updated',
    'Delivery schedule created',
  ];
}
