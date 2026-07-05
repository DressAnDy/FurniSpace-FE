import { IconChevronDown, IconEye, IconSearch } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import { useAssignSalesToProject, useStaffProjectQueue } from '@/services/queries/useProjects';

import './ProjectRequestQueue.css';

export function ProjectRequestQueue() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('Status');
  const [businessType, setBusinessType] = useState('Business Type');
  const assignSalesMutation = useAssignSalesToProject();
  const projectQueueQuery = useStaffProjectQueue({
    search: keyword,
    page: 1,
    limit: 50,
  });
  const projectRequests = useMemo(
    () => projectQueueQuery.data?.items ?? [],
    [projectQueueQuery.data?.items],
  );
  const customerIds = useMemo(
    () => Array.from(new Set(projectRequests.map((request) => request.customerId).filter(Boolean))),
    [projectRequests],
  );
  const customerQueries = useQueries({
    queries: customerIds.map((customerId) => ({
      queryKey: ['accounts', 'detail', customerId],
      queryFn: () => getAccountById(customerId),
      enabled: Boolean(customerId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const customerById = useMemo(() => {
    return customerQueries.reduce<Record<string, AccountDto>>((lookup, query, index) => {
      const customer = query.data;

      if (customer) {
        lookup[customerIds[index]] = customer;
      }

      return lookup;
    }, {});
  }, [customerIds, customerQueries]);

  const filteredRequests = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projectRequests.filter((request) => {
      const customer = customerById[request.customerId];
      const searchableFields = [
        request.projectCode,
        request.projectName,
        request.customerId,
        request.businessType,
        request.status,
        customer?.fullName ?? '',
        customer?.email ?? '',
      ];
      const matchesKeyword = !normalizedKeyword || searchableFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesBusinessType = businessType === 'Business Type' || request.businessType === businessType;
      const matchesStatus = status === 'Status' || request.status === status;

      return matchesKeyword && matchesBusinessType && matchesStatus;
    });
  }, [businessType, customerById, keyword, projectRequests, status]);

  return (
    <div className="project-request-queue-shell">
      <SaleSidebar activeLabel="Project Request Queue" />
      <div className="project-request-queue-content">
        <SaleNavbar />

        <main className="project-request-queue-main">
          <section className="project-request-queue-heading">
            <h2>Project Request Queue</h2>
            <p>Review submitted requests and accept them for consultation</p>
          </section>

          <section className="project-request-queue-filters">
            <h3>Filters</h3>
            <div className="project-request-queue-filter-grid">
              <label className="project-request-queue-search">
                <IconSearch size={16} />
                <input
                  type="search"
                  placeholder="Search projects..."
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>

              <FilterSelect value={status} onChange={setStatus} options={['Status', 'SUBMITTED', 'NEED_BASIC_INFORMATION']} />
              <FilterSelect value={businessType} onChange={setBusinessType} options={['Business Type', 'Cafe', 'Fashion Store', 'Office', 'Retail', 'Restaurant']} />
            </div>
          </section>

          <section className="project-request-queue-table-card">
            <div className="project-request-table-scroll">
              <table>
                <thead>
                  <tr>
                    {['Project Code', 'Project Name', 'Customer', 'Business Type', 'Status', 'Submitted At', 'Actions'].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectQueueQuery.isLoading ? (
                    <tr>
                      <td colSpan={7}>Loading project requests...</td>
                    </tr>
                  ) : null}
                  {projectQueueQuery.isError ? (
                    <tr>
                      <td colSpan={7}>Could not load project requests.</td>
                    </tr>
                  ) : null}
                  {filteredRequests.map((request) => {
                    const customer = customerById[request.customerId];

                    return (
                      <tr key={request.projectId}>
                        <td className="project-request-queue-code">{request.projectCode}</td>
                        <td>
                          <strong>{request.projectName}</strong>
                        </td>
                        <td>
                          <strong>{customer?.fullName ?? 'Loading customer...'}</strong>
                          <span>{customer?.email ?? request.customerId}</span>
                        </td>
                        <td>
                          <span className="project-request-queue-type">{request.businessType}</span>
                        </td>
                        <td>
                          <span className="project-request-queue-status">{request.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td>{formatDate(request.submittedAt)}</td>
                        <td className="project-request-queue-action-cell">
                          <div className="project-request-queue-actions">
                            <button
                              type="button"
                              onClick={() => navigate(`/sales/project-requests/${request.projectId}`)}
                            >
                              <IconEye size={16} />
                              View
                            </button>
                            <button
                              type="button"
                              disabled={assignSalesMutation.isPending}
                              onClick={() =>
                                assignSalesMutation.mutate({
                                  projectId: request.projectId,
                                  note:
                                    request.status === 'NEED_BASIC_INFORMATION'
                                      ? 'Customer provided additional basic information. Sales accepted the project for consultation.'
                                      : 'Sales accepted the submitted project for consultation.',
                                })
                              }
                            >
                              Accept for Consultation
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!projectQueueQuery.isLoading && !projectQueueQuery.isError && filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No submitted or information-needed projects found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function FilterSelect({ value, onChange, options }: FilterSelectProps) {
  return (
    <label className="project-request-queue-select-wrap">
      <select
        className="project-request-queue-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <IconChevronDown className="project-request-queue-select-icon" size={16} />
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export default ProjectRequestQueue;
