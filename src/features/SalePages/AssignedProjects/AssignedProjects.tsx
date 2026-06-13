import { IconEye, IconFileText, IconSearch, IconUserCheck } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectStatusBadge, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { useCurrentUser } from '@/services/queries/useAuth';
import { useProjectList } from '@/services/queries/useProjects';

import './AssignedProjects.css';

export function AssignedProjects() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('All Status');
  const [businessType, setBusinessType] = useState('All Business Types');
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const assignedProjectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      search: keyword,
      page: 1,
      limit: 50,
    },
    {
      enabled: Boolean(currentUser?.accountId),
    },
  );
  const assignedProjects = assignedProjectsQuery.data?.items ?? [];

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return assignedProjects.filter((project) => {
      const keywordFields = [project.projectCode, project.projectName, project.customerId, project.businessType, project.status];
      const matchesKeyword = !normalizedKeyword || keywordFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesStatus = status === 'All Status' || project.status === status;
      const matchesBusinessType = businessType === 'All Business Types' || project.businessType === businessType;
      const hasMovedOutOfQueue = project.status !== 'SUBMITTED' && project.status !== 'NEED_BASIC_INFORMATION';

      return matchesKeyword && matchesStatus && matchesBusinessType && hasMovedOutOfQueue;
    });
  }, [assignedProjects, businessType, keyword, status]);

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
              <span>{filteredProjects.length} assigned</span>
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
                <option>WAITING_FOR_DESIGNER_ASSIGNMENT</option>
                <option>MEASUREMENT_REQUIRED</option>
                <option>SPACE_VERIFIED</option>
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
                  {currentUserQuery.isLoading || assignedProjectsQuery.isLoading ? (
                    <tr>
                      <td colSpan={11}>Loading assigned projects...</td>
                    </tr>
                  ) : null}
                  {currentUserQuery.isError || assignedProjectsQuery.isError ? (
                    <tr>
                      <td colSpan={11}>Could not load assigned projects.</td>
                    </tr>
                  ) : null}
                  {filteredProjects.map((project) => (
                    <tr key={project.projectId}>
                      <td className="assigned-projects-code">{project.projectCode}</td>
                      <td>
                        <strong>{project.projectName}</strong>
                        <span>{project.submittedAt ? `Submitted ${formatDate(project.submittedAt)}` : '-'}</span>
                      </td>
                      <td>
                        <strong>{project.customerId}</strong>
                        <span>Customer account</span>
                      </td>
                      <td>
                        <span className="assigned-projects-type">{project.businessType}</span>
                      </td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td>
                        <span className="assigned-projects-attachments">
                          <IconFileText size={16} />
                          -
                        </span>
                      </td>
                      <td>{currentUser?.fullName ?? project.assignedSalesId ?? '-'}</td>
                      <td>
                        <button type="button" onClick={() => navigate(`/sales/assigned-projects/${project.projectId}`)}>
                          <IconEye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!currentUserQuery.isLoading && !assignedProjectsQuery.isLoading && !currentUserQuery.isError && !assignedProjectsQuery.isError && filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={11}>No projects have moved into consultation yet.</td>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
