import {
  IconArrowRight,
  IconBell,
  IconBox,
  IconCalendar,
  IconChevronRight,
  IconCurrencyDollar,
  IconFileText,
  IconFilter,
  IconHome,
  IconMapPin,
  IconMessageCircle,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react';

import './CustomerProjectListPage.css';

const navigation = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'Home' },
  { active: true, icon: <IconFileText size={15} stroke={1.8} />, label: 'My Projects' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover' },
];

const projects = [
  {
    area: '120 sqm',
    budget: '$45.000 - $65.000',
    code: 'PRJ-2026-001',
    designer: 'Michael Torres',
    location: '123 Downtown Avenue, Central Distr',
    sales: 'Sarah Chen',
    status: 'Awaiting Your Review',
    statusTone: 'gold',
    target: '15/8/2026',
    title: 'Brew & Bean Café Interior',
    type: 'Café',
  },
  {
    area: '200 sqm',
    budget: '$80.000 - $120.000',
    code: 'PRJ-2026-002',
    designer: 'Elena Martinez',
    location: '456 Fashion District, Uptown M',
    sales: 'James Wilson',
    status: 'Proposal Selected',
    statusTone: 'green',
    target: '30/9/2026',
    title: 'Luxe Fashion Showroom',
    type: 'Fashion Retail',
  },
  {
    area: '350 sqm',
    budget: '$95.000 - $140.000',
    code: 'PRJ-2026-003',
    designer: 'David Kim',
    location: '789 Innovation Park, Tech Distr',
    sales: 'Lisa Anderson',
    status: 'In Production',
    statusTone: 'stone',
    target: '15/10/2026',
    title: 'TechHub Coworking Office',
    type: 'Office',
  },
];

export function CustomerProjectListPage() {
  return (
    <main className="customer-project-list-page">
      <TopNavigation />

      <div className="customer-project-list-main">
        <div className="customer-project-list-breadcrumb">
          <a href="/">
            <IconHome size={16} stroke={1.8} />
          </a>
          <IconChevronRight size={16} stroke={1.8} />
          <span>My Projects</span>
        </div>

        <section className="customer-project-list-heading">
          <div>
            <h1>My Projects</h1>
            <p>View and manage all your interior design projects</p>
          </div>
          <button type="button">Create New Project</button>
        </section>

        <section className="customer-project-list-filters" aria-label="Project filters">
          <label>
            <IconSearch size={17} stroke={1.8} />
            <input type="search" placeholder="Search projects..." />
          </label>
          <select defaultValue="">
            <option value="">Status</option>
            <option value="review">Awaiting review</option>
            <option value="selected">Proposal selected</option>
            <option value="production">In production</option>
          </select>
          <select defaultValue="">
            <option value="">Project type</option>
            <option value="cafe">Café</option>
            <option value="retail">Fashion Retail</option>
            <option value="office">Office</option>
          </select>
          <button type="button">
            <IconFilter size={17} stroke={1.8} />
            More Filters
          </button>
        </section>

        <section className="customer-project-list-grid" aria-label="Projects">
          {projects.map((project) => (
            <ProjectCard key={project.code} {...project} />
          ))}
        </section>

        <footer className="customer-project-list-pagination">
          <p>
            Showing <strong>1-3</strong> of <strong>12</strong> projects
          </p>
          <div>
            <button disabled type="button">
              Previous
            </button>
            <button className="customer-project-list-page-active" type="button">
              1
            </button>
            <button type="button">2</button>
            <button type="button">3</button>
            <button type="button">Next</button>
          </div>
        </footer>
      </div>
    </main>
  );
}

type ProjectCardProps = {
  area: string;
  budget: string;
  code: string;
  designer: string;
  location: string;
  sales: string;
  status: string;
  statusTone: string;
  target: string;
  title: string;
  type: string;
};

function ProjectCard({
  area,
  budget,
  code,
  designer,
  location,
  sales,
  status,
  statusTone,
  target,
  title,
  type,
}: ProjectCardProps) {
  return (
    <article className="customer-project-list-card">
      <div className="customer-project-list-card-cover">
        <div>
          <strong>{type}</strong>
          <span>{area}</span>
        </div>
        <span className={`customer-project-list-status customer-project-list-status-${statusTone}`}>
          {status}
        </span>
      </div>

      <div className="customer-project-list-card-body">
        <h2>{title}</h2>
        <p className="customer-project-list-code">{code}</p>

        <div className="customer-project-list-detail-stack">
          <p>
            <IconMapPin size={16} stroke={1.8} />
            {location}
          </p>
          <p>
            <IconCurrencyDollar size={16} stroke={1.8} />
            {budget}
          </p>
          <p>
            <IconCalendar size={16} stroke={1.8} />
            Target: {target}
          </p>
        </div>

        <div className="customer-project-list-people">
          <div>
            <IconUsers size={16} stroke={1.8} />
            <span>Sales</span>
            <strong>{sales}</strong>
          </div>
          <div>
            <IconUsers size={16} stroke={1.8} />
            <span>Designer</span>
            <strong>{designer}</strong>
          </div>
        </div>

        <div className="customer-project-list-stage">
          <span>Current Stage</span>
          <strong>Customer Review</strong>
        </div>

        <button type="button">
          Open Project
          <IconArrowRight size={16} stroke={1.8} />
        </button>
      </div>
    </article>
  );
}

function TopNavigation() {
  return (
    <header className="customer-project-list-topnav">
      <a className="customer-project-list-logo" href="/">
        <span>
          <IconBox size={19} stroke={1.8} />
        </span>
        <strong>FurniSpace</strong>
      </a>

      <nav aria-label="Customer navigation">
        {navigation.map((item) => (
          <a className={item.active ? 'customer-project-list-nav-active' : undefined} href={`#${item.label}`} key={item.label}>
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="customer-project-list-userbar">
        <button className="customer-project-list-create" type="button">
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <button className="customer-project-list-bell" aria-label="Notifications" type="button">
          <IconBell size={20} stroke={1.8} />
          <span />
        </button>
        <div className="customer-project-list-user">
          <div>
            <strong>Alex Thompson</strong>
            <span>Customer</span>
          </div>
          <span>AT</span>
        </div>
      </div>
    </header>
  );
}
