import { IconChevronDown, IconEye, IconFileText, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import './ProjectRequestQueue.css';

type ProjectRequest = {
  id: string;
  projectCode: string;
  customerName: string;
  email: string;
  businessType: string;
  area: string;
  budgetRange: string;
  attachments: number;
};

const projectRequests: ProjectRequest[] = [
  {
    id: 'prj-2024-156',
    projectCode: 'PRJ-2024-156',
    customerName: 'Bean & Brew Co.',
    email: 'contact@beanbrew.com',
    businessType: 'Cafe',
    area: '280 sqm',
    budgetRange: '$50,000 - $80,000',
    attachments: 12,
  },
  {
    id: 'prj-2024-157',
    projectCode: 'PRJ-2024-157',
    customerName: 'Chic Style Ltd.',
    email: 'info@chicstyle.com',
    businessType: 'Fashion Store',
    area: '180 sqm',
    budgetRange: '$30,000 - $50,000',
    attachments: 8,
  },
  {
    id: 'prj-2024-158',
    projectCode: 'PRJ-2024-158',
    customerName: 'Tech Innovations Inc.',
    email: 'facilities@techinno.com',
    businessType: 'Office',
    area: '450 sqm',
    budgetRange: '$80,000 - $120,000',
    attachments: 5,
  },
  {
    id: 'prj-2024-159',
    projectCode: 'PRJ-2024-159',
    customerName: 'Urban Trends',
    email: 'hello@urbantrends.com',
    businessType: 'Retail',
    area: '220 sqm',
    budgetRange: '$40,000 - $60,000',
    attachments: 15,
  },
  {
    id: 'prj-2024-160',
    projectCode: 'PRJ-2024-160',
    customerName: 'Gourmet Bistro',
    email: 'owner@gourmetbistro.com',
    businessType: 'Restaurant',
    area: '320 sqm',
    budgetRange: '$60,000 - $90,000',
    attachments: 10,
  },
];

export function ProjectRequestQueue() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('Status');
  const [businessType, setBusinessType] = useState('Business Type');
  const [budgetRange, setBudgetRange] = useState('Budget Range');

  const filteredRequests = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projectRequests.filter((request) => {
      const searchableFields = [request.projectCode, request.customerName, request.email, request.businessType, request.area, request.budgetRange];
      const matchesKeyword = !normalizedKeyword || searchableFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesBusinessType = businessType === 'Business Type' || request.businessType === businessType;
      const matchesBudget = budgetRange === 'Budget Range' || request.budgetRange === budgetRange;

      return matchesKeyword && matchesBusinessType && matchesBudget && status;
    });
  }, [budgetRange, businessType, keyword, status]);

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

              <FilterSelect value={status} onChange={setStatus} options={['Status', 'Submitted', 'In Consultation', 'Waiting For Designer']} />
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
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="project-request-queue-code">{request.projectCode}</td>
                      <td>
                        <strong>{request.customerName}</strong>
                        <span>{request.email}</span>
                      </td>
                      <td>
                        <span className="project-request-queue-type">{request.businessType}</span>
                      </td>
                      <td>{request.area}</td>
                      <td>{request.budgetRange}</td>
                      <td>
                        <span className="project-request-queue-attachments">
                          <IconFileText size={16} />
                          {request.attachments}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/project-requests/${request.id}`)}
                        >
                          <IconEye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
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
