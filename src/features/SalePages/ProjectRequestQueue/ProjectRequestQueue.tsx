import { IconChevronDown, IconEye, IconFileText, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { useAssignSalesToProject, useStaffProjectQueue } from '@/services/queries/useProjects';

import './ProjectRequestQueue.css';

export function ProjectRequestQueue() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('Status');
  const [businessType, setBusinessType] = useState('Business Type');
  const [budgetRange, setBudgetRange] = useState('Budget Range');
  const assignSalesMutation = useAssignSalesToProject();
  const projectQueueQuery = useStaffProjectQueue({
    search: keyword,
    page: 1,
    limit: 50,
  });
  const projectRequests = projectQueueQuery.data?.items ?? [];

  const filteredRequests = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projectRequests.filter((request) => {
      const searchableFields = [request.projectCode, request.projectName, request.customerId, request.businessType, request.status];
      const matchesKeyword = !normalizedKeyword || searchableFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesBusinessType = businessType === 'Business Type' || request.businessType === businessType;
      const matchesStatus = status === 'Status' || request.status === status;
      const matchesBudget = budgetRange === 'Budget Range';

      return matchesKeyword && matchesBusinessType && matchesBudget && matchesStatus;
    });
  }, [budgetRange, businessType, keyword, projectRequests, status]);

  return (
    <div className="project-request-queue-shell">
      <SaleSidebar activeLabel="Project Request Queue" />
      <div className="project-request-queue-content">
        <SaleNavbar />

        <main className="project-request-queue-main">
          <section className="project-request-queue-heading">
            <h2>Project Request Queue</h2>
            <p>Review and manage incoming project requests from customers</p>
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
              <FilterSelect value={budgetRange} onChange={setBudgetRange} options={['Budget Range', '$30,000 - $50,000', '$40,000 - $60,000', '$50,000 - $80,000', '$60,000 - $90,000', '$80,000 - $120,000']} />
            </div>
          </section>

          <section className="project-request-queue-table-card">
            <div className="project-request-table-scroll">
              <table>
                <thead>
                  <tr>
                    {['Project Code', 'Customer', 'Business Type', 'Area', 'Budget Range', 'Attachments', 'Actions'].map((header) => (
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
                  {filteredRequests.map((request) => (
                    <tr key={request.projectId}>
                      <td className="project-request-queue-code">{request.projectCode}</td>
                      <td>
                        <strong>{request.projectName}</strong>
                        <span>{request.customerId}</span>
                      </td>
                      <td>
                        <span className="project-request-queue-type">{request.businessType}</span>
                      </td>
                      <td>-</td>
                      <td>{request.status.replace(/_/g, ' ')}</td>
                      <td>
                        <span className="project-request-queue-attachments">
                          <IconFileText size={16} />
                          -
                        </span>
                      </td>
                      <td>
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
                              note: 'Accepted from project request queue.',
                            })
                          }
                        >
                          Accept
                        </button>
                      </td>
                    </tr>
                  ))}
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

export default ProjectRequestQueue;
