import {
  IconArrowRight,
  IconClipboardCheck,
  IconClock,
  IconCurrencyDollar,
  IconTools,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { ProductionLayout } from '@/features/ProductionPages/productioncomponents';
import { getCustomizationRequestServiceResultMessage, type CustomizationRequestDto } from '@/services/api/customizationRequests';
import { useProductionCustomizationRequests } from '@/services/queries';

import './ProductionDashbroad.css';

export function ProductionDashbroad() {
  const queueQuery = useProductionCustomizationRequests({ status: 'PRODUCTION_REVIEWING', page: 1, pageSize: 50 });
  const requests = queueQuery.data?.items ?? [];

  return (
    <ProductionLayout activeLabel="Dashboard" searchPlaceholder="Search production features...">
      <section className="production-dashboard-title">
        <div>
          <span>Production Workspace</span>
          <h2>Production Dashboard</h2>
          <p>Review production-visible customization requests after designer handoff.</p>
        </div>
        <Link to="/production/customization-requests">
          Open Customization Review
          <IconArrowRight size={16} />
        </Link>
      </section>

      {queueQuery.isError ? (
        <section className="production-dashboard-message production-dashboard-message-error">
          {getCustomizationRequestServiceResultMessage(queueQuery.error)}
        </section>
      ) : null}

      <section className="production-dashboard-metrics">
        <article>
          <div>
            <span>Review Queue</span>
            <strong>{queueQuery.isLoading ? '-' : (queueQuery.data?.total ?? requests.length)}</strong>
          </div>
          <IconClipboardCheck size={26} />
        </article>
        <article>
          <div>
            <span>Needs Review</span>
            <strong>{queueQuery.isLoading ? '-' : countByStatus(requests, 'PRODUCTION_REVIEWING')}</strong>
          </div>
          <IconTools size={26} />
        </article>
        <article>
          <div>
            <span>Waiting Customer</span>
            <strong>{queueQuery.isLoading ? '-' : countByStatus(requests, 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL')}</strong>
          </div>
          <IconCurrencyDollar size={26} />
        </article>
        <article>
          <div>
            <span>Not Feasible</span>
            <strong>{queueQuery.isLoading ? '-' : countByStatus(requests, 'NOT_FEASIBLE')}</strong>
          </div>
          <IconClock size={26} />
        </article>
      </section>

      <section className="production-dashboard-grid production-dashboard-grid-single">
        <article className="production-dashboard-card production-dashboard-action-card">
          <header>
            <h3>Customization Feasibility Review</h3>
            <p>Production receives a customization request after designer review and submits feasibility, material availability, extra cost, and production days.</p>
          </header>
          <div>
            <span>Queue source</span>
            <p>Requests are loaded from the production customization queue API. Handoff links with a request ID still open directly.</p>
          </div>
          <Link to="/production/customization-requests">
            Review Customization Request
            <IconArrowRight size={16} />
          </Link>
        </article>
      </section>
    </ProductionLayout>
  );
}

function countByStatus(requests: CustomizationRequestDto[], status: CustomizationRequestDto['status']) {
  return requests.filter((request) => request.status === status).length;
}
