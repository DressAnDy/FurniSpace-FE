import { IconChevronDown, IconEye, IconSearch } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { SaleNavbar, SaleSidebar, saleCopy } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { useAssignSalesToProject, useStaffProjectQueue } from '@/services/queries/useProjects';

import './ProjectRequestQueue.css';

const ALL_STATUS_VALUE = 'ALL';
const ALL_BUSINESS_TYPE_VALUE = 'ALL';

export function ProjectRequestQueue() {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const q = t.projectRequestQueue;
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(ALL_STATUS_VALUE);
  const [businessType, setBusinessType] = useState(ALL_BUSINESS_TYPE_VALUE);
  const [actionMessage, setActionMessage] = useState('');
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
      const matchesBusinessType = businessType === ALL_BUSINESS_TYPE_VALUE || request.businessType === businessType;
      const matchesStatus = status === ALL_STATUS_VALUE || request.status === status;

      return matchesKeyword && matchesBusinessType && matchesStatus;
    });
  }, [businessType, customerById, keyword, projectRequests, status]);

  async function acceptForConsultation(request: { projectId: string; status: string }) {
    setActionMessage('');

    try {
      await assignSalesMutation.mutateAsync({
        projectId: request.projectId,
        note:
          request.status === 'NEED_BASIC_INFORMATION'
            ? 'Customer provided additional basic information. Sales accepted the project for consultation.'
            : 'Sales accepted the submitted project for consultation.',
      });
      navigate(`/sales/assigned-projects/${request.projectId}`);
    } catch (error) {
      setActionMessage(getProjectServiceResultMessage(error));
    }
  }

  return (
    <div className="project-request-queue-shell">
      <SaleSidebar activeKey="projectRequestQueue" />
      <div className="project-request-queue-content">
        <SaleNavbar />

        <main className="project-request-queue-main">
          <section className="project-request-queue-heading">
            <h2>{q.title}</h2>
            <p>{q.subtitle}</p>
          </section>

          <section className="project-request-queue-filters">
            <h3>{t.common.filters}</h3>
            <div className="project-request-queue-filter-grid">
              <label className="project-request-queue-search">
                <IconSearch size={16} />
                <input
                  type="search"
                  placeholder={t.common.searchProjects}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>

              <FilterSelect
                value={status}
                onChange={setStatus}
                options={[
                  { value: ALL_STATUS_VALUE, label: t.common.allStatus },
                  { value: 'SUBMITTED', label: 'SUBMITTED' },
                  { value: 'NEED_BASIC_INFORMATION', label: 'NEED_BASIC_INFORMATION' },
                ]}
              />
              <FilterSelect
                value={businessType}
                onChange={setBusinessType}
                options={[
                  { value: ALL_BUSINESS_TYPE_VALUE, label: t.common.allBusinessTypes },
                  { value: 'Cafe', label: 'Cafe' },
                  { value: 'Fashion Store', label: 'Fashion Store' },
                  { value: 'Office', label: 'Office' },
                  { value: 'Retail', label: 'Retail' },
                  { value: 'Restaurant', label: 'Restaurant' },
                ]}
              />
            </div>
          </section>

          {actionMessage ? <section className="project-request-queue-message">{actionMessage}</section> : null}

          <section className="project-request-queue-table-card">
            <div className="project-request-table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      t.common.projectCode,
                      t.common.projectName,
                      t.common.customer,
                      t.common.businessType,
                      t.common.status,
                      q.submittedAt,
                      t.common.actions,
                    ].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectQueueQuery.isLoading ? (
                    <tr>
                      <td colSpan={7}>{t.common.loading}</td>
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
                          <strong>{customer?.fullName ?? t.common.loading}</strong>
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
                              {t.common.view}
                            </button>
                            <button
                              type="button"
                              disabled={assignSalesMutation.isPending}
                              onClick={() => void acceptForConsultation(request)}
                            >
                              {q.accept}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!projectQueueQuery.isLoading && !projectQueueQuery.isError && filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7}>{q.empty}</td>
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
  options: Array<{ value: string; label: string }>;
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
          <option key={option.value} value={option.value}>{option.label}</option>
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
