import { IconEye, IconFileText, IconSearch, IconUserCheck } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectStatusBadge, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import './AssignedProjects.css';

type AssignedProject = {
  id: string;
  projectCode: string;
  projectName: string;
  address: string;
  customerName: string;
  email: string;
  businessType: string;
  area: string;
  budgetRange: string;
  targetDate: string;
  status: string;
  attachments: number;
  assignedSales: string;
};

const assignedProjects: AssignedProject[] = [
  {
    id: 'prj-2024-156',
    projectCode: 'PRJ-2024-156',
    projectName: 'Luxury Cafe Interior',
    address: '123 Main St, Downtown',
    customerName: 'Bean & Brew Co.',
    email: 'contact@beanbrew.com',
    businessType: 'Cafe',
    area: '280 sqm',
    budgetRange: '$50,000 - $80,000',
    targetDate: '2024-08-15',
    status: 'IN_CONSULTATION',
    attachments: 12,
    assignedSales: 'Sarah Johnson',
  },
  {
    id: 'prj-2024-158',
    projectCode: 'PRJ-2024-158',
    projectName: 'Corporate Office Redesign',
    address: '789 Business Park',
    customerName: 'Tech Innovations Inc.',
    email: 'facilities@techinno.com',
    businessType: 'Office',
    area: '450 sqm',
    budgetRange: '$80,000 - $120,000',
    targetDate: '2024-09-01',
    status: 'NEED_BASIC_INFORMATION',
    attachments: 5,
    assignedSales: 'Sarah Johnson',
  },
  {
    id: 'prj-2024-159',
    projectCode: 'PRJ-2024-159',
    projectName: 'Retail Store Design',
    address: '321 Shopping District',
    customerName: 'Urban Trends',
    email: 'hello@urbantrends.com',
    businessType: 'Retail',
    area: '220 sqm',
    budgetRange: '$40,000 - $60,000',
    targetDate: '2024-08-20',
    status: 'WAITING_FOR_DESIGNER_ASSIGNMENT',
    attachments: 15,
    assignedSales: 'Sarah Johnson',
  },
];

export function AssignedProjects() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('All Status');
  const [businessType, setBusinessType] = useState('All Business Types');

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return assignedProjects.filter((project) => {
      const keywordFields = [project.projectCode, project.projectName, project.customerName, project.email, project.address];
      const matchesKeyword = !normalizedKeyword || keywordFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesStatus = status === 'All Status' || project.status === status;
      const matchesBusinessType = businessType === 'All Business Types' || project.businessType === businessType;

      return matchesKeyword && matchesStatus && matchesBusinessType;
    });
  }, [businessType, keyword, status]);

  return (
    <div className="assigned-projects-shell">
      <SaleSidebar activeLabel="Assigned Projects" />
      <div className="assigned-projects-content">
        <SaleNavbar />
        <main className="assigned-projects-main">
          <section className="assigned-projects-heading">
            <div>
              <h2>Assigned Projects</h2>
              <p>Track customer projects currently assigned to your sales workspace</p>
            </div>
            <div className="assigned-projects-summary">
              <IconUserCheck size={20} />
              <span>{assignedProjects.length} assigned</span>
            </div>
          </section>

          <section className="assigned-projects-filters">
            <h3>Filters</h3>
            <div className="assigned-projects-filter-grid">
              <label className="assigned-projects-search">
                <IconSearch size={17} />
                <input type="search" placeholder="Search projects..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All Status</option>
                <option>IN_CONSULTATION</option>
                <option>NEED_BASIC_INFORMATION</option>
                <option>WAITING_FOR_DESIGNER_ASSIGNMENT</option>
              </select>
              <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                <option>All Business Types</option>
                <option>Cafe</option>
                <option>Office</option>
                <option>Retail</option>
              </select>
            </div>
          </section>

          <section className="assigned-projects-table-card">
            <div className="assigned-projects-table-scroll">
              <table>
                <thead>
                  <tr>
                    {['Project Code', 'Project Name', 'Customer', 'Business Type', 'Area', 'Budget Range', 'Target Date', 'Status', 'Attachments', 'Assigned Sales', 'Actions'].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="assigned-projects-code">{project.projectCode}</td>
                      <td>
                        <strong>{project.projectName}</strong>
                        <span>{project.address}</span>
                      </td>
                      <td>
                        <strong>{project.customerName}</strong>
                        <span>{project.email}</span>
                      </td>
                      <td>
                        <span className="assigned-projects-type">{project.businessType}</span>
                      </td>
                      <td>{project.area}</td>
                      <td>{project.budgetRange}</td>
                      <td>{project.targetDate}</td>
                      <td>
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td>
                        <span className="assigned-projects-attachments">
                          <IconFileText size={16} />
                          {project.attachments}
                        </span>
                      </td>
                      <td>{project.assignedSales}</td>
                      <td>
                        <button type="button" onClick={() => navigate(`/sales/assigned-projects/${project.id}`)}>
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
