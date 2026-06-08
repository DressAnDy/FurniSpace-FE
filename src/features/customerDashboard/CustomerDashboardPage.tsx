import {
  IconArrowRight,
  IconBell,
  IconBox,
  IconCheck,
  IconClipboardText,
  IconFileText,
  IconHelp,
  IconHome,
  IconMessageCircle,
  IconPlus,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';

import warmScandinavianUrl from '@/assets/customer-dashboard/warm-scandinavian.png';

import './CustomerDashboardPage.css';

const navigation = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'My Projects' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover' },
];

const journeySteps = [
  { label: 'Request Submitted', status: 'complete' },
  { label: 'Consultation', status: 'complete' },
  { label: 'Space Verified', status: 'complete' },
  { label: 'Design Proposal', status: 'complete' },
  { label: 'Customer Review', status: 'current' },
  { label: 'Quotation', status: 'pending' },
  { label: 'Order Confirmed', status: 'pending' },
];

const quickActions = [
  {
    badge: '2 New',
    description: '2 new proposals are waiting for your review',
    icon: <IconClipboardText size={22} stroke={1.7} />,
    tone: 'gold',
    title: 'Review Design Proposals',
  },
  {
    badge: '1 Unread',
    description: 'Message from designer about your café project',
    icon: <IconMessageCircle size={22} stroke={1.7} />,
    tone: 'stone',
    title: 'Project Chat',
  },
  {
    description: 'Share your thoughts on the Scandinavian concept',
    icon: <IconHelp size={22} stroke={1.7} />,
    tone: 'mint',
    title: 'Submit Feedback',
  },
];

const updates = [
  {
    date: '3/6/2026',
    description: 'Michael Torres has published a new design proposal "Warm Scandinavian Concept" for Brew & Bean Café Interior',
    title: 'New Proposal Published',
  },
  {
    date: '5/6/2026',
    description: 'Michael Torres responded to your feedback on the main dining area layout',
    title: 'Designer Replied to Feedback',
  },
  {
    date: '5/6/2026',
    description: "Your customization request 'Extended Counter Length' has been accepted and added to the proposal",
    title: 'Customization Request Accepted',
  },
];

const reviewItems = [
  {
    imageUrl: warmScandinavianUrl,
    meta: '$58.000 • 4 Scenes',
    title: 'Warm Scandinavian Concept',
  },
  {
    imageUrl: '',
    meta: '$52.000 • 3 Scenes',
    title: 'Industrial Modern Concept',
  },
];

export function CustomerDashboardPage() {
  return (
    <main className="customer-dashboard-page">
      <TopNavigation />

      <div className="customer-dashboard-main">
        <section className="customer-dashboard-welcome">
          <h1>Welcome back, Alex!</h1>
          <p>Your interior design journey is in progress. Let&apos;s continue transforming your space.</p>
        </section>

        <section className="customer-dashboard-project-card">
          <div className="customer-dashboard-project-head">
            <div>
              <div className="customer-dashboard-title-row">
                <h2>Your Active Project</h2>
                <span className="customer-dashboard-status">Awaiting Your Review</span>
              </div>
              <p>Track progress and take next steps</p>
            </div>
            <button type="button">
              Open Project
              <IconArrowRight size={16} stroke={1.8} />
            </button>
          </div>

          <div className="customer-dashboard-project-meta">
            <div>
              <span>Project Name</span>
              <strong>Brew & Bean Café Interior</strong>
            </div>
            <div>
              <span>Business Type</span>
              <strong>Café</strong>
            </div>
            <div>
              <span>Budget Range</span>
              <strong>$45.000 - $65.000</strong>
            </div>
          </div>

          <div className="customer-dashboard-journey">
            <h3>Project Journey</h3>
            <ol>
              {journeySteps.map((step, index) => (
                <li className={`customer-dashboard-step customer-dashboard-step-${step.status}`} key={step.label}>
                  <span>{step.status === 'complete' ? <IconCheck size={15} stroke={2.4} /> : index + 1}</span>
                  <p>{step.label}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="customer-dashboard-action-required">
            <IconHelp size={16} stroke={1.8} />
            <div>
              <strong>Action Required: Review Design Proposals</strong>
              <p>Your designer has published 2 new design proposals. Please review and provide feedback.</p>
            </div>
            <button type="button">Review Now</button>
          </div>
        </section>

        <section className="customer-dashboard-section">
          <h2>Quick Actions</h2>
          <div className="customer-dashboard-quick-grid">
            {quickActions.map((action) => (
              <article className="customer-dashboard-quick-card" key={action.title}>
                <div className={`customer-dashboard-quick-icon customer-dashboard-quick-icon-${action.tone}`}>
                  {action.icon}
                </div>
                {action.badge ? <span>{action.badge}</span> : null}
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <button type="button">
                  Take Action
                  <IconArrowRight size={14} stroke={1.8} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="customer-dashboard-two-column">
          <DashboardPanel title="Recent Updates">
            <div className="customer-dashboard-updates">
              {updates.map((update) => (
                <article key={update.title}>
                  <span />
                  <div>
                    <h3>{update.title}</h3>
                    <p>{update.description}</p>
                    <time>{update.date}</time>
                  </div>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Pending Your Review">
            <div className="customer-dashboard-review-list">
              {reviewItems.map((item) => (
                <article key={item.title}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className="customer-dashboard-empty-thumb" />}
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.meta}</p>
                    <span>Published</span>
                  </div>
                </article>
              ))}
            </div>
          </DashboardPanel>
        </section>

        <section className="customer-dashboard-help">
          <div className="customer-dashboard-help-icon">
            <IconMessageCircle size={28} stroke={1.8} />
          </div>
          <div>
            <h2>Need Help?</h2>
            <p>Our team is here to assist you throughout your interior design journey.</p>
            <div>
              <button type="button">Contact Your Team</button>
              <button type="button">View Help Center</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TopNavigation() {
  return (
    <header className="customer-dashboard-topnav">
      <a className="customer-dashboard-logo" href="/">
        <span>
          <IconBox size={19} stroke={1.8} />
        </span>
        <strong>FurniSpace</strong>
      </a>

      <nav aria-label="Customer navigation">
        {navigation.map((item) => (
          <a href={`#${item.label}`} key={item.label}>
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="customer-dashboard-userbar">
        <button className="customer-dashboard-create" type="button">
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <button className="customer-dashboard-bell" aria-label="Notifications" type="button">
          <IconBell size={20} stroke={1.8} />
          <span />
        </button>
        <div className="customer-dashboard-user">
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

type DashboardPanelProps = {
  children: React.ReactNode;
  title: string;
};

function DashboardPanel({ children, title }: DashboardPanelProps) {
  return (
    <section className="customer-dashboard-panel">
      <div className="customer-dashboard-panel-head">
        <h2>{title}</h2>
        <a href={`#${title}`}>View All</a>
      </div>
      {children}
    </section>
  );
}
