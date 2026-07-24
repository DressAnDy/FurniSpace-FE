import { IconArrowRight, IconBriefcase, IconCalendarEvent, IconClipboardCheck, IconMessageCircle, IconPencilCog, IconStack2, IconTrendingUp } from '@tabler/icons-react';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';

import './DesignerDashbroad.css';

const metricGroups = [
  {
    title: 'Project',
    subtitle: 'Assigned project workload',
    icon: IconBriefcase,
    items: [
      { label: 'Assigned Projects', value: '7', note: '+2 this week', icon: IconBriefcase },
      { label: 'Waiting for Design', value: '2', note: '1 urgent', icon: IconPencilCog },
    ],
  },
  {
    title: 'Design',
    subtitle: 'Proposal and feedback progress',
    icon: IconStack2,
    items: [
      { label: 'Proposals In Progress', value: '5', note: '3 need review', icon: IconStack2 },
      { label: 'Feedback Pending', value: '3', note: '2 open', icon: IconMessageCircle },
      { label: 'Completed Designs', value: '28', note: '+5 this month', icon: IconTrendingUp },
    ],
  },
  {
    title: 'Schedule',
    subtitle: 'Upcoming design appointments',
    icon: IconCalendarEvent,
    items: [
      { label: 'Upcoming Schedules', value: '4', note: '1 today', icon: IconCalendarEvent },
      { label: 'Confirmed Sessions', value: '3', note: '+1 confirmed', icon: IconClipboardCheck },
    ],
  },
];

const activeProjects = [
  { title: 'Milano Cafe Interior', client: 'PT Kopi Nusantara - PRJ-2024-081', type: 'Cafe', target: '2024-08-15', status: 'In Design', progress: 45 },
  { title: 'Luxe Fashion Showroom', client: 'CV Mode Elegan - PRJ-2024-076', type: 'Fashion Store', target: '2024-08-22', status: 'Revision', progress: 62 },
  { title: 'Meridian Office HQ', client: 'PT Meridian Solusi - PRJ-2024-069', type: 'Office', target: '2024-09-10', status: 'Proposal Sent', progress: 80 },
  { title: 'Urban Furniture Gallery', client: 'PT Mebel Urban - PRJ-2024-058', type: 'Showroom', target: '2024-09-28', status: 'In Design', progress: 28 },
];

const feedback = [
  { text: 'Counter placement blocks natural light. Move to east wall.', project: 'Luxe Fashion Showroom - Minimalist Gold v2.1 - 2024-07-20', status: 'OPEN' },
  { text: 'Lighting too bright. Prefer warmer accent-based lighting.', project: 'Luxe Fashion Showroom - Minimalist Gold v2.1 - 2024-07-19', status: 'IN_REVIEW' },
  { text: 'Meeting pods on L2 need acoustic panels.', project: 'Meridian Office HQ - Executive Suite v1.4 - 2024-07-18', status: 'IN_REVIEW' },
];

export function DesignerDashbroad() {
  return (
    <DesignerLayout activeLabel="Dashboard">
      <div className="designer-dashboard-page">
        <section className="designer-dashboard-heading">
          <div>
            <h2>Welcome back, David</h2>
            <p>Thursday, 24 July 2024 - You have 3 feedback items and 2 projects waiting for design.</p>
          </div>
          <button className="designer-dashboard-primary-action" type="button">
            View Assigned Projects <IconArrowRight size={16} />
          </button>
        </section>

        <section className="designer-dashboard-metrics">
          {metricGroups.map(({ icon: GroupIcon, items, subtitle, title }) => (
            <article className="designer-card designer-dashboard-metric-group" key={title}>
              <header className="designer-dashboard-metric-group-head">
                <div>
                  <h3>{title}</h3>
                  <p>{subtitle}</p>
                </div>
                <span className="designer-dashboard-metric-group-icon"><GroupIcon size={22} /></span>
              </header>
              <div className="designer-dashboard-metric-list">
                {items.map(({ icon: MetricIcon, label, note, value }) => (
                  <div className="designer-dashboard-metric-item" key={label}>
                    <span className="designer-dashboard-metric-icon"><MetricIcon size={20} /></span>
                    <div>
                      <p>{label}</p>
                      <strong>{value}</strong>
                    </div>
                    <em>{note}</em>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="designer-dashboard-content-grid">
          <article className="designer-card designer-dashboard-table-card">
            <header className="designer-dashboard-card-header"><h3>Active Projects</h3><button type="button">All Projects</button></header>
            <div className="designer-dashboard-table-scroll">
              <table className="designer-dashboard-table">
                <thead><tr><th>Project</th><th>Type</th><th>Target</th><th>Status</th><th>Progress</th><th>Action</th></tr></thead>
                <tbody>
                  {activeProjects.map((project) => (
                    <tr key={project.title}>
                      <td><p className="designer-dashboard-project-name">{project.title}</p><span className="designer-dashboard-muted">{project.client}</span></td>
                      <td>{project.type}</td><td>{project.target}</td>
                      <td><span className="designer-pill designer-dashboard-status">{project.status}</span></td>
                      <td><div className="designer-dashboard-progress"><div><span style={{ width: `${project.progress}%` }} /></div><span>{project.progress}%</span></div></td>
                      <td><button className="designer-dashboard-link-button" type="button">Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="designer-card designer-dashboard-feedback-card">
            <header className="designer-dashboard-card-header"><h3>Recent Feedback</h3><button type="button">Review All</button></header>
            <div className="designer-dashboard-feedback-list">
              {feedback.map((item) => (
                <div className="designer-dashboard-feedback-item" key={item.text}>
                  <div className="designer-dashboard-feedback-heading"><p>{item.text}</p><span>{item.status}</span></div>
                  <p className="designer-dashboard-muted">{item.project}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DesignerLayout>
  );
}
